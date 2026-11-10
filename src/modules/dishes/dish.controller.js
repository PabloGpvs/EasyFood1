const dishService = require("./dish.service");

function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

// Valida os dados do prato. Com partial = true (PUT), só valida o que veio.
function readDishBody(body, partial = false) {
    const { name, description, price, category, available } = body || {};
    const data = {};

    if (name !== undefined || !partial) {
        if (typeof name !== "string" || !name.trim()) {
            return { error: "name é obrigatório e deve ser um texto." };
        }
        data.name = name.trim();
    }

    if (category !== undefined || !partial) {
        if (typeof category !== "string" || !category.trim()) {
            return { error: "category é obrigatório e deve ser um texto." };
        }
        data.category = category.trim();
    }

    if (price !== undefined || !partial) {
        const value = Number(price);

        if (price === null || price === "" || !Number.isFinite(value) || value < 0) {
            return { error: "price é obrigatório e deve ser um número maior ou igual a zero." };
        }
        data.price = value;
    }

    if (description !== undefined) {
        if (description !== null && typeof description !== "string") {
            return { error: "description deve ser um texto." };
        }
        data.description = description ? description.trim() : null;
    }

    // Esgotado / disponível
    if (available !== undefined) {
        if (typeof available !== "boolean") {
            return { error: "available deve ser true ou false." };
        }
        data.available = available;
    }

    return { data };
}

async function getDishes(req, res, next) {
    try {
        res.json(await dishService.getDishes());
    } catch (error) {
        next(error);
    }
}

async function getMenu(req, res, next) {
    try {
        const restaurantId = parseId(req.params.restaurantId);

        if (!restaurantId) {
            return res.status(400).json({ error: "ID do restaurante inválido." });
        }

        res.json(await dishService.getMenu(restaurantId));
    } catch (error) {
        next(error);
    }
}

async function getDishById(req, res, next) {
    try {
        const dishId = parseId(req.params.dishId);

        if (!dishId) {
            return res.status(400).json({ error: "ID do prato inválido." });
        }

        res.json(await dishService.getDishById(dishId));
    } catch (error) {
        next(error);
    }
}

async function createDish(req, res, next) {
    try {
        const restaurantId = parseId(req.params.restaurantId);

        if (!restaurantId) {
            return res.status(400).json({ error: "ID do restaurante inválido." });
        }

        const { data, error } = readDishBody(req.body);

        if (error) {
            return res.status(400).json({ error });
        }

        const dish = await dishService.createDish(restaurantId, data, req.user.id);

        res.status(201).json(dish);
    } catch (error) {
        next(error);
    }
}

async function updateDish(req, res, next) {
    try {
        const dishId = parseId(req.params.dishId);

        if (!dishId) {
            return res.status(400).json({ error: "ID do prato inválido." });
        }

        const { data, error } = readDishBody(req.body, true);

        if (error) {
            return res.status(400).json({ error });
        }

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: "Informe pelo menos um campo para atualizar." });
        }

        res.json(await dishService.updateDish(dishId, data, req.user.id));
    } catch (error) {
        next(error);
    }
}

async function deleteDish(req, res, next) {
    try {
        const dishId = parseId(req.params.dishId);

        if (!dishId) {
            return res.status(400).json({ error: "ID do prato inválido." });
        }

        await dishService.deleteDish(dishId, req.user.id);

        res.status(204).send();
    } catch (error) {
        next(error);
    }
}

async function uploadImage(req, res, next) {
    try {
        const dishId = parseId(req.params.dishId);

        if (!dishId) {
            return res.status(400).json({ error: "ID do prato inválido." });
        }

        const dish = await dishService.updateDishImage(dishId, req.file, req.user.id);

        res.json(dish);
    } catch (error) {
        next(error);
    }
}

async function removeImage(req, res, next) {
    try {
        const dishId = parseId(req.params.dishId);

        if (!dishId) {
            return res.status(400).json({ error: "ID do prato inválido." });
        }

        res.json(await dishService.removeDishImage(dishId, req.user.id));
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getDishes,
    getMenu,
    getDishById,
    createDish,
    updateDish,
    deleteDish,
    uploadImage,
    removeImage
};
