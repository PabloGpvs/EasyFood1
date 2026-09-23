const express = require("express");
const userController = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/users", userController.createUser);
router.get("/users", authMiddleware, userController.getUsers);
router.get("/users/:id", userController.getUserById);
router.post("/login", userController.loginUser);

router.get(
    "/my-restaurant",
    authMiddleware,
    userController.getMyRestaurant
);

module.exports = router;