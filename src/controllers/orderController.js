const orderService = require("../services/orderService");

async function createOrder(req, res) {
    try {

        console.log("USUARIO AUTENTICADO:", req.user);

        const order = await orderService.createOrder(
    req.body,
    req.user.id
        );

        res.status(201).json(order);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Erro ao criar pedido."
        });
    }
}

async function getOrders(req, res) {
    try {
        const orders = await orderService.getOrders(req.user.id);

        res.json(orders);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Erro ao buscar pedidos."
        });
    }
}

async function updateOrderStatus(req, res) {
    try {
        const id = Number(req.params.id);
        const status = req.body.status;

        const { PrismaClient } = require("@prisma/client");
        const prisma = new PrismaClient();

        const order = await prisma.order.findUnique({
            where: {
                id: id
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        if (!order) {
            return res.status(404).json({
                error: "Pedido não encontrado."
            });
        }

        const restaurante = order.items.some(item =>
            item.product.restaurantId
        );

        const restaurantIds = [
            ...new Set(
                order.items.map(item => item.product.restaurantId)
            )
        ];

        const restaurantDoUsuario =
            await prisma.restaurant.findFirst({
                where: {
                    id: {
                        in: restaurantIds
                    },
                    ownerId: req.user.id
                }
            });

        if (!restaurantDoUsuario) {
            return res.status(403).json({
                error: "Você não tem permissão para alterar este pedido."
            });
        }

        const pedidoAtualizado =
            await orderService.updateOrderStatus(id, status);

        res.json(pedidoAtualizado);

    } catch (error) {
        console.error(error);

        if (error.message === "Status inválido.") {
            return res.status(400).json({
                error: "Status inválido."
            });
        }

        res.status(500).json({
            error: "Erro ao atualizar status do pedido."
        });
    }
}

async function getOrderById(req, res) {
    try {
        const id = Number(req.params.id);

        const { PrismaClient } = require("@prisma/client");
        const prisma = new PrismaClient();

        const order = await prisma.order.findUnique({
            where: {
                id: id
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        if (!order) {
            return res.status(404).json({
                error: "Pedido não encontrado."
            });
        }

        res.json(order);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Erro ao buscar pedido."
        });
    }
}

async function getOrdersByRestaurant(req, res) {
    try {
        const restaurantId = Number(req.params.restaurantId);

        const { PrismaClient } = require("@prisma/client");
        const prisma = new PrismaClient();

        const restaurant = await prisma.restaurant.findUnique({
            where: {
                id: restaurantId
            }
        });

        if (!restaurant) {
            return res.status(404).json({
                error: "Restaurante não encontrado."
            });
        }

        if (restaurant.ownerId !== req.user.id) {
            return res.status(403).json({
                error: "Você não tem permissão para acessar este restaurante."
            });
        }

        const orders =
            await orderService.getOrdersByRestaurant(restaurantId);

        res.json(orders);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Erro ao buscar pedidos do restaurante."
        });
    }
}

module.exports = {
    createOrder,
    getOrders,
    getOrderById,
    updateOrderStatus,
    getOrdersByRestaurant
};