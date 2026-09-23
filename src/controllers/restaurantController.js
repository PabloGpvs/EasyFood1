const restaurantService = require("../services/restaurantService");

async function getRestaurants(req, res) {
    try {
        const restaurants = await restaurantService.getRestaurants();

        return res.json(restaurants);

    } catch (error) {
        console.error("Erro ao buscar restaurantes:", error);

        return res.status(500).json({
            error: "Não foi possível buscar os restaurantes."
        });
    }
}

async function getRestaurantById(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                error: "O ID deve ser um número inteiro positivo."
            });
        }

        const restaurant = await restaurantService.getRestaurantById(id);

        if (!restaurant) {
            return res.status(404).json({
                error: "Restaurante não encontrado."
            });
        }

        return res.json(restaurant);

    } catch (error) {
        console.error("Erro ao buscar restaurante:", error);

        return res.status(500).json({
            error: "Não foi possível buscar o restaurante."
        });
    }
}

async function createRestaurant(req, res) {

    try {

        const { name, category, imageUrl } = req.body;

        if (!name || !category) {

            return res.status(400).json({
                error: "Os campos name e category são obrigatórios."
            });

        }

        if (
            typeof name !== "string" ||
            typeof category !== "string"
        ) {

            return res.status(400).json({
                error: "name e category devem ser textos."
            });

        }

        const restaurant =
            await restaurantService.createRestaurant(
                {
                name: name.trim(),
                category: category.trim(),
                imageUrl: imageUrl ? imageUrl.trim() : null
            },
                req.user.id
            );

        return res.status(201).json(restaurant);

    } catch (error) {

        console.error("Erro ao criar restaurante:", error);

        return res.status(500).json({
            error: "Não foi possível cadastrar o restaurante."
        });

    }

}

async function updateRestaurant(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                error: "O ID deve ser um número inteiro positivo."
            });
        }

        const { name, category } = req.body;

        if (name === undefined && category === undefined) {
            return res.status(400).json({
                error: "Informe pelo menos um campo para atualizar."
            });
        }

        const data = {};

        if (name !== undefined) {
            if (
                typeof name !== "string" ||
                !name.trim()
            ) {
                return res.status(400).json({
                    error: "name deve ser um texto não vazio."
                });
            }

            data.name = name.trim();
        }

        if (category !== undefined) {
            if (
                typeof category !== "string" ||
                !category.trim()
            ) {
                return res.status(400).json({
                    error: "category deve ser um texto não vazio."
                });
            }

            data.category = category.trim();
        }

        const restaurant =
            await restaurantService.updateRestaurant(id, data);

        if (!restaurant) {
            return res.status(404).json({
                error: "Restaurante não encontrado."
            });
        }

        return res.json(restaurant);

    } catch (error) {
        console.error("Erro ao atualizar restaurante:", error);

        return res.status(500).json({
            error: "Não foi possível atualizar o restaurante."
        });
    }
}

async function deleteRestaurant(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                error: "O ID deve ser um número inteiro positivo."
            });
        }

        const deleted =
            await restaurantService.deleteRestaurant(id);

        if (!deleted) {
            return res.status(404).json({
                error: "Restaurante não encontrado."
            });
        }

        return res.status(204).send();

    } catch (error) {
        console.error("Erro ao excluir restaurante:", error);

        return res.status(500).json({
            error: "Não foi possível excluir o restaurante."
        });
    }
}

module.exports = {
    getRestaurants,
    getRestaurantById,
    createRestaurant,
    updateRestaurant,
    deleteRestaurant
};