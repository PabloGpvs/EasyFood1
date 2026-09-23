const userService = require("../services/userService");
const jwt = require("jsonwebtoken");

async function createUser(req, res) {

    try {

        const user = await userService.createUser(req.body);

        res.status(201).json(user);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Erro ao criar usuário."
        });

    }

}

async function getUsers(req, res) {

    try {

        const users = await userService.getUsers();

        res.json(users);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Erro ao buscar usuários."
        });

    }

}

async function getUserById(req, res) {

    try {

        const id = Number(req.params.id);

        const user = await userService.getUserById(id);

        if (!user) {

            return res.status(404).json({
                error: "Usuário não encontrado."
            });

        }

        res.json(user);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Erro ao buscar usuário."
        });

    }

}

async function loginUser(req, res) {
    try {
        const { email, password } = req.body;

        const resultado =
            await userService.loginUser(email, password);

        if (!resultado) {
            return res.status(401).json({
                error: "Email ou senha inválidos."
            });
        }

        const token = jwt.sign(
            {
                id: resultado.id,
                email: resultado.email
            },
            "easyfood_segredo",
            {
                expiresIn: "2h"
            }
        );

        res.json({
            token: token,
            user: resultado
        });

    } catch (error) {
        console.error(error);
        res.status(401).json({
            error: error.message
        });
    }
}

async function getMyRestaurant(req, res) {

    try {
        console.log("USUARIO LOGADO NO MY-RESTAURANT:", req.user);

        const { PrismaClient } = require("@prisma/client");

        const prisma = new PrismaClient();

        const restaurant = await prisma.restaurant.findUnique({
            where: {
                ownerId: req.user.id
            }
        });

        if (!restaurant) {

            return res.status(404).json({
                error: "Você não possui um restaurante cadastrado."
            });

        }

        res.json(restaurant);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Erro ao buscar restaurante."
        });

    }

}

module.exports = {
    createUser,
    getUsers,
    getUserById,
    loginUser,
    getMyRestaurant
};