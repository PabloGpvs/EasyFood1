const prisma = require("../../database/prisma");

// ADMIN é o dono da plataforma: pode gerenciar qualquer restaurante, prato e pedido.
const ADMIN = "ADMIN";

// Papéis que podem cadastrar e gerenciar restaurantes
function canManageRestaurants(role) {
    return role === "DONO" || role === ADMIN;
}

// O papel é lido do banco a cada checagem (pode mudar depois do login)
async function isAdmin(userId) {
    if (!userId) return false;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    });

    return user?.role === ADMIN;
}

module.exports = { ADMIN, canManageRestaurants, isAdmin };
