const express = require("express");
const dishController = require("./dish.controller");
const authMiddleware = require("../auth/auth.middleware");
const { uploadImage } = require("../shared/upload.middleware");

const router = express.Router();

// Cardápio de um restaurante
router.get("/restaurants/:restaurantId/dishes", dishController.getMenu);
router.post("/restaurants/:restaurantId/dishes", authMiddleware, dishController.createDish);

router.get("/dishes", dishController.getDishes);
router.get("/dishes/:dishId", dishController.getDishById);
router.put("/dishes/:dishId", authMiddleware, dishController.updateDish);
router.delete("/dishes/:dishId", authMiddleware, dishController.deleteDish);

// Imagem do prato: autenticação -> Multer -> controller -> image.service
router.post(
    "/dishes/:dishId/image",
    authMiddleware,
    uploadImage("image"),
    dishController.uploadImage
);
router.delete("/dishes/:dishId/image", authMiddleware, dishController.removeImage);

module.exports = router;
