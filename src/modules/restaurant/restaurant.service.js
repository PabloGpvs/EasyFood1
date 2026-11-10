const prisma = require("../../database/prisma");
const imageService = require("../shared/image.service");
const HttpError = require("../shared/http-error");
const { isAdmin, canManageRestaurants } = require("../shared/permissions");
const { isOpenNow } = require("../shared/business-hours");

/**
 * Acrescenta dados calculados: aberto agora? nota média e quantidade de avaliações.
 */
async function decorate(restaurants) {
    const list = Array.isArray(restaurants) ? restaurants : [restaurants];

    if (list.length === 0) {
        return restaurants;
    }

    const ratings = await prisma.review.groupBy({
        by: ["restaurantId"],
        where: { restaurantId: { in: list.map(r => r.id) } },
        _avg: { rating: true },
        _count: { rating: true }
    });

    const decorated = list.map(restaurant => {
        const rating = ratings.find(item => item.restaurantId === restaurant.id);

        return {
            ...restaurant,
            isOpen: isOpenNow(restaurant.opensAt, restaurant.closesAt),
            ratingAvg: rating ? Number(rating._avg.rating.toFixed(1)) : null,
            ratingCount: rating ? rating._count.rating : 0
        };
    });

    return Array.isArray(restaurants) ? decorated : decorated[0];
}

/**
 * Lista restaurantes, com busca opcional por nome/categoria.
 * @param {{ search?: string, category?: string }} filters
 */
async function getRestaurants({ search, category } = {}) {
    const where = {};

    if (search) {
        where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } }
        ];
    }

    if (category) {
        where.category = { equals: category, mode: "insensitive" };
    }

    const restaurants = await prisma.restaurant.findMany({
        where,
        orderBy: { name: "asc" }
    });

    return decorate(restaurants);
}

// Categorias existentes, para os filtros da página inicial
async function getCategories() {
    const rows = await prisma.restaurant.findMany({
        distinct: ["category"],
        select: { category: true },
        orderBy: { category: "asc" }
    });

    return rows.map(row => row.category);
}

async function getRestaurantById(id) {
    const restaurant = await prisma.restaurant.findUnique({
        where: { id },
        include: {
            dishes: { orderBy: [{ category: "asc" }, { name: "asc" }] }
        }
    });

    return restaurant ? decorate(restaurant) : null;
}

// Últimas avaliações do restaurante (com o nome e a foto de quem avaliou)
async function getReviews(id) {
    return prisma.review.findMany({
        where: { restaurantId: id },
        orderBy: { id: "desc" },
        take: 30,
        include: { user: { select: { name: true, imageUrl: true } } }
    });
}

// Todos os restaurantes do usuário logado (um dono pode ter vários)
// O administrador enxerga todos os restaurantes da plataforma
async function getRestaurantsByOwner(ownerId) {
    const admin = await isAdmin(ownerId);
    const restaurants = await prisma.restaurant.findMany({
        where: admin ? {} : { ownerId },
        orderBy: { id: "asc" }
    });

    return decorate(restaurants);
}

// ownerId não é único, por isso findFirst (com findUnique o Prisma dava erro)
async function getRestaurantByOwner(ownerId) {
    const admin = await isAdmin(ownerId);
    return prisma.restaurant.findFirst({
        where: admin ? {} : { ownerId },
        orderBy: { id: "asc" }
    });
}

async function createRestaurant(data, ownerId) {
    const owner = await prisma.user.findUnique({ where: { id: ownerId } });

    if (!owner || !canManageRestaurants(owner.role)) {
        throw new HttpError(403, "Ative o modo restaurante em \"Minha conta\" para cadastrar restaurantes.");
    }

    const restaurant = await prisma.restaurant.create({
        data: { ...data, ownerId }
    });

    return decorate(restaurant);
}

/**
 * Busca o restaurante e garante que o usuário é o dono.
 * 404 se não existir, 403 se for de outra pessoa.
 */
async function findOwnedRestaurant(id, userId) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id } });

    if (!restaurant) {
        throw new HttpError(404, "Restaurante não encontrado.");
    }

    if (restaurant.ownerId !== userId && !(await isAdmin(userId))) {
        throw new HttpError(403, "Você não tem permissão para alterar este restaurante.");
    }

    return restaurant;
}

async function updateRestaurant(id, data, userId) {
    await findOwnedRestaurant(id, userId);

    const restaurant = await prisma.restaurant.update({
        where: { id },
        data
    });

    return decorate(restaurant);
}

async function deleteRestaurant(id, userId) {
    const restaurant = await findOwnedRestaurant(id, userId);

    const dishes = await prisma.dish.count({ where: { restaurantId: id } });

    if (dishes > 0) {
        throw new HttpError(409, "Remova os pratos do cardápio antes de excluir o restaurante.");
    }

    await prisma.restaurant.delete({ where: { id } });
    await imageService.remove(restaurant.imageUrl);
}

/**
 * Troca a foto/logo do restaurante. Mesmo image.service de usuários e pratos.
 */
async function updateRestaurantImage(id, file, userId) {
    const restaurant = await findOwnedRestaurant(id, userId);

    return imageService.replace({
        buffer: file.buffer,
        folder: "restaurants",
        oldPath: restaurant.imageUrl,
        saveToDatabase: imageUrl => prisma.restaurant.update({
            where: { id },
            data: { imageUrl }
        })
    });
}

async function removeRestaurantImage(id, userId) {
    const restaurant = await findOwnedRestaurant(id, userId);

    const updated = await prisma.restaurant.update({
        where: { id },
        data: { imageUrl: null }
    });

    await imageService.remove(restaurant.imageUrl);

    return updated;
}

module.exports = {
    getRestaurants,
    getCategories,
    getRestaurantById,
    getReviews,
    getRestaurantsByOwner,
    getRestaurantByOwner,
    createRestaurant,
    updateRestaurant,
    deleteRestaurant,
    updateRestaurantImage,
    removeRestaurantImage
};
