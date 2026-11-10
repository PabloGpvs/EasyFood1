const orderService = require("./order.service");

function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

async function createOrder(req, res, next) {
    try {
        const order = await orderService.createOrder(req.body, req.user.id);
        res.status(201).json(order);
    } catch (error) {
        next(error);
    }
}

async function getOrders(req, res, next) {
    try {
        res.json(await orderService.getOrders(req.user.id));
    } catch (error) {
        next(error);
    }
}

async function getOrderById(req, res, next) {
    try {
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({ error: "ID inválido." });
        }

        res.json(await orderService.getOrderById(id, req.user.id));
    } catch (error) {
        next(error);
    }
}

async function getOrdersByRestaurant(req, res, next) {
    try {
        const restaurantId = parseId(req.params.restaurantId);

        if (!restaurantId) {
            return res.status(400).json({ error: "ID do restaurante inválido." });
        }

        const status = typeof req.query.status === "string" ? req.query.status.trim() : "";

        res.json(await orderService.getOrdersByRestaurant(restaurantId, req.user.id, status));
    } catch (error) {
        next(error);
    }
}

async function updateOrderStatus(req, res, next) {
    try {
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({ error: "ID inválido." });
        }

        res.json(await orderService.updateOrderStatus(id, req.body.status, req.user.id));
    } catch (error) {
        next(error);
    }
}

async function cancelOrder(req, res, next) {
    try {
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({ error: "ID inválido." });
        }

        res.json(await orderService.cancelOrder(id, req.user.id));
    } catch (error) {
        next(error);
    }
}

async function reviewOrder(req, res, next) {
    try {
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({ error: "ID inválido." });
        }

        res.status(201).json(await orderService.reviewOrder(id, req.user.id, req.body || {}));
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createOrder,
    getOrders,
    getOrderById,
    getOrdersByRestaurant,
    updateOrderStatus,
    cancelOrder,
    reviewOrder
};
