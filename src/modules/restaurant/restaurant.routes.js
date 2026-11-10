const express = require("express");
const restaurantController = require("./restaurant.controller");
const authMiddleware = require("../auth/auth.middleware");
const { uploadImage } = require("../shared/upload.middleware");

const router = express.Router();

// Públicas: qualquer pessoa vê restaurantes e cardápios
router.get("/restaurants", restaurantController.getRestaurants); // ?search=&category=
router.get("/restaurants/categories", restaurantController.getCategories);
router.get("/restaurants/:id", restaurantController.getRestaurantById);
router.get("/restaurants/:id/reviews", restaurantController.getReviews);

// Só usuários logados; alterar e excluir só o dono (conferido no service)
router.post("/restaurants", authMiddleware, restaurantController.createRestaurant);
router.put("/restaurants/:id", authMiddleware, restaurantController.updateRestaurant);
router.delete("/restaurants/:id", authMiddleware, restaurantController.deleteRestaurant);

router.post(
    "/restaurants/:id/image",
    authMiddleware,
    uploadImage("image"),
    restaurantController.uploadImage
);
router.delete("/restaurants/:id/image", authMiddleware, restaurantController.removeImage);

// Restaurantes do usuário logado
router.get("/my-restaurants", authMiddleware, restaurantController.getMyRestaurants);
router.get("/my-restaurant", authMiddleware, restaurantController.getMyRestaurant);

module.exports = router;
