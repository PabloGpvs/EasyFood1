const prisma = require("../../database/prisma");
const HttpError = require("../shared/http-error");
const { emitOrder } = require("../shared/events");
const { isOpenNow } = require("../shared/business-hours");
const { isAdmin } = require("../shared/permissions");

const STATUS = ["PENDENTE", "PREPARANDO", "SAIU_PARA_ENTREGA", "ENTREGUE", "CANCELADO"];
const FINAL_STATUS = ["ENTREGUE", "CANCELADO"];
const MAX_QUANTITY = 50;
const PAYMENT_METHODS = ["PIX", "CARTAO", "DINHEIRO"];

const includeItems = {
    restaurant: { select: { id: true, name: true, imageUrl: true } },
    review: true,
    items: {
        include: {
            dish: {
                include: {
                    restaurant: { select: { id: true, name: true, imageUrl: true } }
                }
            }
        }
    }
};

function cleanText(value, { field, min = 0, max }) {
    if (value === undefined || value === null) {
        value = "";
    }

    if (typeof value !== "string") {
        throw new HttpError(400, `${field} deve ser um texto.`);
    }

    const text = value.trim();

    if (text.length < min) {
        throw new HttpError(400, min === 1 ? `${field} é obrigatório.` : `${field} deve ter pelo menos ${min} caracteres.`);
    }

    if (text.length > max) {
        throw new HttpError(400, `${field} deve ter no máximo ${max} caracteres.`);
    }

    return text || null;
}

async function createOrder(data, userId) {
    if (!data || !Array.isArray(data.items) || data.items.length === 0) {
        throw new HttpError(400, "Informe pelo menos um item no pedido.");
    }

    const address = cleanText(data.address, { field: "Endereço de entrega", min: 5, max: 200 });
    const note = cleanText(data.note, { field: "Observação", max: 200 });

    const paymentMethod = data.paymentMethod ?? "PIX";

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
        throw new HttpError(400, "Forma de pagamento inválida (PIX, CARTAO ou DINHEIRO).");
    }

    // Junta itens repetidos do mesmo prato
    const quantities = new Map();

    for (const item of data.items) {
        // dishId é o nome novo; productId continua aceito
        const dishId = Number(item.dishId ?? item.productId);
        const quantity = Number(item.quantity);

        if (!Number.isInteger(dishId) || !Number.isInteger(quantity) || quantity <= 0) {
            throw new HttpError(400, "Cada item precisa de dishId e quantity (inteiro maior que zero).");
        }

        quantities.set(dishId, (quantities.get(dishId) || 0) + quantity);
    }

    const dishes = await prisma.dish.findMany({
        where: { id: { in: [...quantities.keys()] } }
    });

    for (const dishId of quantities.keys()) {
        if (!dishes.some(dish => dish.id === dishId)) {
            throw new HttpError(404, `Prato ${dishId} não encontrado.`);
        }
    }

    const restaurantIds = new Set(dishes.map(dish => dish.restaurantId));

    if (restaurantIds.size > 1) {
        throw new HttpError(400, "Um pedido só pode ter pratos de um restaurante.");
    }

    const restaurant = await prisma.restaurant.findUnique({
        where: { id: dishes[0].restaurantId }
    });

    if (!isOpenNow(restaurant.opensAt, restaurant.closesAt)) {
        throw new HttpError(409, `${restaurant.name} está fechado agora. Funciona das ${restaurant.opensAt} às ${restaurant.closesAt}.`);
    }

    const unavailable = dishes.filter(dish => !dish.available);

    if (unavailable.length > 0) {
        throw new HttpError(409, `Esgotado: ${unavailable.map(dish => dish.name).join(", ")}. Remova do carrinho para continuar.`);
    }

    // O preço vem do banco, nunca do navegador
    const items = dishes.map(dish => {
        const quantity = quantities.get(dish.id);

        if (quantity > MAX_QUANTITY) {
            throw new HttpError(400, `Quantidade máxima por prato: ${MAX_QUANTITY}.`);
        }

        return { dishId: dish.id, quantity, price: dish.price };
    });

    const round = value => Number(value.toFixed(2));

    const subtotal = round(items.reduce((sum, item) => sum + item.price * item.quantity, 0));

    if (subtotal < restaurant.minOrder) {
        throw new HttpError(400, `O pedido mínimo deste restaurante é R$ ${restaurant.minOrder.toFixed(2).replace(".", ",")}.`);
    }

    const deliveryFee = restaurant.deliveryFee;
    const total = round(subtotal + deliveryFee);

    // Troco: só para dinheiro, e precisa ser maior que o total
    let changeFor = null;

    if (paymentMethod === "DINHEIRO" && data.changeFor !== undefined && data.changeFor !== null && data.changeFor !== "") {
        changeFor = Number(data.changeFor);

        if (!Number.isFinite(changeFor) || changeFor < total) {
            throw new HttpError(400, "O valor para troco deve ser maior ou igual ao total do pedido.");
        }

        changeFor = round(changeFor);
    }

    const order = await prisma.order.create({
        data: {
            subtotal,
            deliveryFee,
            total,
            address,
            note,
            paymentMethod,
            changeFor,
            userId,
            restaurantId: restaurant.id,
            items: { create: items }
        },
        include: includeItems
    });

    emitOrder("criado", order);

    return order;
}

// Pedidos do cliente, mais recentes primeiro
async function getOrders(userId) {
    return prisma.order.findMany({
        where: { userId },
        orderBy: { id: "desc" },
        include: includeItems
    });
}

async function findOrderOrFail(id) {
    const order = await prisma.order.findUnique({
        where: { id },
        include: includeItems
    });

    if (!order) {
        throw new HttpError(404, "Pedido não encontrado.");
    }

    return order;
}

async function userOwnsOrderRestaurant(order, userId) {
    if (await isAdmin(userId)) return true;

    const restaurantIds = order.restaurantId
        ? [order.restaurantId]
        : [...new Set(order.items.map(item => item.dish.restaurantId))];

    const owned = await prisma.restaurant.findFirst({
        where: { id: { in: restaurantIds }, ownerId: userId }
    });

    return Boolean(owned);
}

// Só o cliente que fez o pedido ou o dono do restaurante podem ver
async function getOrderById(id, userId) {
    const order = await findOrderOrFail(id);

    if (order.userId !== userId && !(await userOwnsOrderRestaurant(order, userId))) {
        throw new HttpError(403, "Você não tem permissão para ver este pedido.");
    }

    return order;
}

async function getOrdersByRestaurant(restaurantId, userId, status) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });

    if (!restaurant) {
        throw new HttpError(404, "Restaurante não encontrado.");
    }

    if (restaurant.ownerId !== userId && !(await isAdmin(userId))) {
        throw new HttpError(403, "Você não tem permissão para acessar este restaurante.");
    }

    if (status && !STATUS.includes(status)) {
        throw new HttpError(400, "Status inválido.");
    }

    return prisma.order.findMany({
        where: {
            restaurantId,
            ...(status ? { status } : {})
        },
        orderBy: { id: "desc" },
        include: {
            ...includeItems,
            user: { select: { id: true, name: true } }
        }
    });
}

// Dono do restaurante muda o andamento do pedido
async function updateOrderStatus(id, status, userId) {
    if (!STATUS.includes(status)) {
        throw new HttpError(400, "Status inválido.");
    }

    const order = await findOrderOrFail(id);

    if (!(await userOwnsOrderRestaurant(order, userId))) {
        throw new HttpError(403, "Você não tem permissão para alterar este pedido.");
    }

    if (FINAL_STATUS.includes(order.status) && order.status !== status) {
        throw new HttpError(409, "Este pedido já foi finalizado e não pode mais mudar de status.");
    }

    const updated = await prisma.order.update({
        where: { id },
        data: { status }
    });

    emitOrder("status", updated);

    return updated;
}

// Cliente cancela o próprio pedido enquanto o restaurante não começou a preparar
async function cancelOrder(id, userId) {
    const order = await findOrderOrFail(id);

    if (order.userId !== userId) {
        throw new HttpError(403, "Você só pode cancelar os seus pedidos.");
    }

    if (order.status !== "PENDENTE") {
        throw new HttpError(409, "Só é possível cancelar pedidos que ainda estão pendentes.");
    }

    const updated = await prisma.order.update({
        where: { id },
        data: { status: "CANCELADO" },
        include: includeItems
    });

    emitOrder("status", updated);

    return updated;
}

// Cliente avalia o restaurante depois que o pedido foi entregue
async function reviewOrder(id, userId, { rating, comment }) {
    const order = await findOrderOrFail(id);

    if (order.userId !== userId) {
        throw new HttpError(403, "Você só pode avaliar os seus pedidos.");
    }

    if (order.status !== "ENTREGUE") {
        throw new HttpError(409, "Só dá para avaliar depois que o pedido for entregue.");
    }

    if (order.review) {
        throw new HttpError(409, "Este pedido já foi avaliado.");
    }

    const stars = Number(rating);

    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
        throw new HttpError(400, "A nota deve ser de 1 a 5 estrelas.");
    }

    const restaurantId = order.restaurantId ?? order.items[0]?.dish.restaurantId;

    return prisma.review.create({
        data: {
            rating: stars,
            comment: cleanText(comment, { field: "Comentário", max: 300 }),
            userId,
            restaurantId,
            orderId: id
        }
    });
}

module.exports = {
    STATUS,
    PAYMENT_METHODS,
    createOrder,
    getOrders,
    getOrderById,
    getOrdersByRestaurant,
    updateOrderStatus,
    cancelOrder,
    reviewOrder
};
