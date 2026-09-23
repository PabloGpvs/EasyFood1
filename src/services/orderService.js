const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function createOrder(data, userId) {

console.log("USER ID RECEBIDO NO SERVICE:", userId);

    const items = await Promise.all(
        data.items.map(async item => {
            const product = await prisma.product.findUnique({
                where: {
                    id: item.productId
                }
            });

            if (!product) {
                throw new Error(`Produto ${item.productId} não encontrado.`);
            }

            return {
                productId: product.id,
                quantity: item.quantity,
                price: product.price
            };
        })
    );

    const total = items.reduce((soma, item) => {
        return soma + item.price * item.quantity;
    }, 0);

    const order = await prisma.order.create({
        data: {
    total: Number(total.toFixed(2)),
    userId: userId,
    items: {
        create: items
    }
    },
        include: {
            items: {
                include: {
                    product: true
                }
            }
        }
    });

    return order;
}

async function getOrders(userId) {
    return prisma.order.findMany({
        where: {
            userId: userId
        },
        orderBy: {
            id: "asc"
        },
        include: {
            items: {
                include: {
                    product: true
                }
            }
        }
    });
}

async function updateOrderStatus(id, status) {
    const statusPermitidos = [
    "PENDENTE",
    "PREPARANDO",
    "SAIU_PARA_ENTREGA",
    "ENTREGUE",
    "CANCELADO"
];

if (!statusPermitidos.includes(status)) {
    throw new Error("Status inválido.");
}
    const order = await prisma.order.findUnique({
        where: {
            id: id
        }
    });

    if (!order) {
        return null;
    }

    return prisma.order.update({
        where: {
            id: id
        },
        data: {
            status: status
        }
    });
}

async function getOrdersByRestaurant(restaurantId) {

    return prisma.order.findMany({
        where: {
            items: {
                some: {
                    product: {
                        restaurantId: Number(restaurantId)
                    }
                }
            }
        },

        orderBy: {
            id: "asc"
        },

        include: {
            items: {
                include: {
                    product: true
                }
            }
        }
    });
}

module.exports = {
    createOrder,
    getOrders,
    updateOrderStatus,
    getOrdersByRestaurant
};
