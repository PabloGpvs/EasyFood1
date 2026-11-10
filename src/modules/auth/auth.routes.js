const express = require("express");
const authController = require("./auth.controller");
const authMiddleware = require("./auth.middleware");
const { uploadImage } = require("../shared/upload.middleware");

const router = express.Router();

router.post("/auth/register", authController.register);
router.post("/auth/login", authController.login);
router.get("/auth/me", authMiddleware, authController.me);
router.patch("/auth/me", authMiddleware, authController.updateMe);
router.put("/auth/me/password", authMiddleware, authController.changePassword);
router.post("/auth/me/become-owner", authMiddleware, authController.becomeOwner);

// Endereços salvos
router.get("/auth/me/addresses", authMiddleware, authController.getAddresses);
router.post("/auth/me/addresses", authMiddleware, authController.addAddress);
router.delete("/auth/me/addresses/:id", authMiddleware, authController.removeAddress);

// Recuperar senha (link por e-mail)
router.post("/auth/forgot-password", authController.forgotPassword);
router.post("/auth/reset-password", authController.resetPassword);

// Foto de perfil: o usuário é sempre o dono do token, nunca um id enviado
router.post(
    "/auth/me/image",
    authMiddleware,
    uploadImage("image"),
    authController.uploadMyImage
);
router.delete("/auth/me/image", authMiddleware, authController.removeMyImage);

// Perfil público (nome e foto). A lista de todos os usuários foi removida:
// expunha o e-mail de todo mundo para qualquer pessoa logada.
router.get("/users/:id", authController.getUserById);

// Rotas antigas, mantidas para não quebrar quem ainda as usa
router.post("/users", authController.register);
router.post("/login", authController.login);

module.exports = router;
