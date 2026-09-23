const express = require("express");
const restaurantController = require("../controllers/restaurantController");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

router.get("/restaurants", restaurantController.getRestaurants);
router.get("/restaurants/:id", restaurantController.getRestaurantById);
router.post(
    "/restaurants",
    authMiddleware,
    restaurantController.createRestaurant
);
router.put("/restaurants/:id", restaurantController.updateRestaurant);
router.delete("/restaurants/:id", restaurantController.deleteRestaurant);

module.exports = router;