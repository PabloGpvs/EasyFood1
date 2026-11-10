const prisma = require("../../database/prisma");
const imageService = require("../shared/image.service");
const HttpError = require("../shared/http-error");
const { isAdmin } = require("../shared/permissions");

async function findRestaurantOrFail(restaurantId) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });

    if (!restaurant) {
        throw new HttpError(404, "Restaurante não encontrado.");
    }

    return restaurant;
}

// Só o dono do restaurante (ou o administrador) pode mexer no cardápio
async function ensureOwner(restaurant, userId) {
    if (restaurant.ownerId !== userId && !(await isAdmin(userId))) {
        throw new HttpError(403, "Você não tem permissão para alterar o cardápio deste restaurante.");
    }
}

async function findDishOrFail(dishId) {
    const dish = await prisma.dish.findUnique({
        where: { id: dishId },
        include: { restaurant: true }
    });

    if (!dish) {
        throw new HttpError(404, "Prato não encontrado.");
    }

    return dish;
}

function withoutRestaurant(dish) {
    const { restaurant, ...rest } = dish;
    return rest;
}

async function getDishes() {
    return prisma.dish.findMany({ orderBy: { id: "asc" } });
}

// Cardápio do restaurante (cada prato já traz o seu imageUrl)
async function getMenu(restaurantId) {
    await findRestaurantOrFail(restaurantId);

    return prisma.dish.findMany({
        where: { restaurantId },
        orderBy: [{ category: "asc" }, { name: "asc" }]
    });
}

async function getDishById(dishId) {
    return withoutRestaurant(await findDishOrFail(dishId));
}

async function createDish(restaurantId, data, userId) {
    const restaurant = await findRestaurantOrFail(restaurantId);
    await ensureOwner(restaurant, userId);

    // O restaurante vem da URL (/restaurants/:restaurantId/dishes) e é ligado
    // pela relação. updatedAt é preenchido pelo Prisma (@updatedAt).
    return prisma.dish.create({
        data: {
            name: data.name,
            description: data.description ?? null,
            price: data.price,
            category: data.category,
            available: data.available ?? true,
            restaurant: { connect: { id: restaurantId } }
        }
    });
}

async function updateDish(dishId, data, userId) {
    const dish = await findDishOrFail(dishId);
    await ensureOwner(dish.restaurant, userId);

    return prisma.dish.update({
        where: { id: dishId },
        data
    });
}

async function deleteDish(dishId, userId) {
    const dish = await findDishOrFail(dishId);
    await ensureOwner(dish.restaurant, userId);

    const orders = await prisma.orderItem.count({ where: { dishId } });

    if (orders > 0) {
        throw new HttpError(409, "Este prato já aparece em pedidos e não pode ser excluído.");
    }

    await prisma.dish.delete({ where: { id: dishId } });
    await imageService.remove(dish.imageUrl);
}

/**
 * Troca a imagem do prato. Usa o mesmo image.service da foto de perfil.
 */
async function updateDishImage(dishId, file, userId) {
    const dish = await findDishOrFail(dishId);
    await ensureOwner(dish.restaurant, userId);

    return imageService.replace({
        buffer: file.buffer,
        folder: "dishes",
        oldPath: dish.imageUrl,
        saveToDatabase: imageUrl => prisma.dish.update({
            where: { id: dishId },
            data: { imageUrl }
        })
    });
}

async function removeDishImage(dishId, userId) {
    const dish = await findDishOrFail(dishId);
    await ensureOwner(dish.restaurant, userId);

    const updated = await prisma.dish.update({
        where: { id: dishId },
        data: { imageUrl: null }
    });

    await imageService.remove(dish.imageUrl);

    return updated;
}

module.exports = {
    getDishes,
    getMenu,
    getDishById,
    createDish,
    updateDish,
    deleteDish,
    updateDishImage,
    removeDishImage
};
