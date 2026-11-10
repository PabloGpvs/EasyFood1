const express = require("express");
const orderController = require("./order.controller");
const authMiddleware = require("../auth/auth.middleware");

const router = express.Router();

router.post("/orders", authMiddleware, orderController.createOrder);
router.get("/orders", authMiddleware, orderController.getOrders);
router.get("/orders/:id", authMiddleware, orderController.getOrderById);
router.put("/orders/:id/status", authMiddleware, orderController.updateOrderStatus);
router.patch("/orders/:id/cancel", authMiddleware, orderController.cancelOrder);
router.post("/orders/:id/review", authMiddleware, orderController.reviewOrder);

// ?status=PENDENTE filtra por status
router.get(
    "/restaurants/:restaurantId/orders",
    authMiddleware,
    orderController.getOrdersByRestaurant
);

module.exports = router;
