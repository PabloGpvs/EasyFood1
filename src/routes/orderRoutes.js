const express = require("express");
const orderController = require("../controllers/orderController");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/orders", authMiddleware, orderController.createOrder);

router.get("/orders", authMiddleware, orderController.getOrders);

router.get("/orders/:id", authMiddleware, orderController.getOrderById);

router.get(
    "/restaurants/:restaurantId/orders",
    authMiddleware,
    orderController.getOrdersByRestaurant
);

router.put(
    "/orders/:id/status",
    authMiddleware,
    orderController.updateOrderStatus
);

module.exports = router;