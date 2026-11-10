const restaurantService = require("./restaurant.service");
const { isValidTime } = require("../shared/business-hours");

function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function invalidId(res) {
    return res.status(400).json({ error: "O ID deve ser um número inteiro positivo." });
}

// Lê e valida os dados do restaurante. Com partial = true (edição), só valida o que veio.
function readRestaurantBody(body, partial = false) {
    const { name, category, deliveryFee, minOrder, opensAt, closesAt } = body || {};
    const data = {};

    for (const [field, label, value] of [["deliveryFee", "Taxa de entrega", deliveryFee], ["minOrder", "Pedido mínimo", minOrder]]) {
        if (value === undefined || value === "") continue;

        const number = Number(value);

        if (!Number.isFinite(number) || number < 0 || number > 1000) {
            return { error: `${label} deve ser um valor entre 0 e 1000.` };
        }

        data[field] = Number(number.toFixed(2));
    }

    // Horário: os dois juntos, ou os dois vazios (= sempre aberto)
    if (opensAt !== undefined || closesAt !== undefined) {
        const open = opensAt || null;
        const close = closesAt || null;

        if (Boolean(open) !== Boolean(close)) {
            return { error: "Informe o horário de abertura e o de fechamento (ou deixe os dois vazios)." };
        }

        if (open && (!isValidTime(open) || !isValidTime(close))) {
            return { error: "Use o formato HH:MM nos horários (ex.: 18:00)." };
        }

        data.opensAt = open;
        data.closesAt = close;
    }

    for (const [field, label, value] of [["name", "Nome", name], ["category", "Categoria", category]]) {
        if (value === undefined && partial) continue;

        if (typeof value !== "string" || value.trim().length < 2) {
            return { error: `${label} é obrigatório (pelo menos 2 letras).` };
        }

        if (value.trim().length > 80) {
            return { error: `${label} deve ter no máximo 80 caracteres.` };
        }

        data[field] = value.trim();
    }

    return { data };
}

async function getRestaurants(req, res, next) {
    try {
        const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
        const category = typeof req.query.category === "string" ? req.query.category.trim() : "";

        res.json(await restaurantService.getRestaurants({ search, category }));
    } catch (error) {
        next(error);
    }
}

async function getCategories(req, res, next) {
    try {
        res.json(await restaurantService.getCategories());
    } catch (error) {
        next(error);
    }
}

async function getRestaurantById(req, res, next) {
    try {
        const id = parseId(req.params.id);

        if (!id) return invalidId(res);

        const restaurant = await restaurantService.getRestaurantById(id);

        if (!restaurant) {
            return res.status(404).json({ error: "Restaurante não encontrado." });
        }

        res.json(restaurant);
    } catch (error) {
        next(error);
    }
}

async function getReviews(req, res, next) {
    try {
        const id = parseId(req.params.id);

        if (!id) return invalidId(res);

        res.json(await restaurantService.getReviews(id));
    } catch (error) {
        next(error);
    }
}

async function getMyRestaurants(req, res, next) {
    try {
        res.json(await restaurantService.getRestaurantsByOwner(req.user.id));
    } catch (error) {
        next(error);
    }
}

async function getMyRestaurant(req, res, next) {
    try {
        const restaurant = await restaurantService.getRestaurantByOwner(req.user.id);

        if (!restaurant) {
            return res.status(404).json({ error: "Você não possui um restaurante cadastrado." });
        }

        res.json(restaurant);
    } catch (error) {
        next(error);
    }
}

async function createRestaurant(req, res, next) {
    try {
        const { data, error } = readRestaurantBody(req.body);

        if (error) {
            return res.status(400).json({ error });
        }

        const { imageUrl } = req.body;

        data.imageUrl = typeof imageUrl === "string" && imageUrl.trim() ? imageUrl.trim() : null;

        res.status(201).json(await restaurantService.createRestaurant(data, req.user.id));
    } catch (error) {
        next(error);
    }
}

async function updateRestaurant(req, res, next) {
    try {
        const id = parseId(req.params.id);

        if (!id) return invalidId(res);

        const { data, error } = readRestaurantBody(req.body, true);

        if (error) {
            return res.status(400).json({ error });
        }

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: "Informe pelo menos um campo para atualizar." });
        }

        res.json(await restaurantService.updateRestaurant(id, data, req.user.id));
    } catch (error) {
        next(error);
    }
}

async function deleteRestaurant(req, res, next) {
    try {
        const id = parseId(req.params.id);

        if (!id) return invalidId(res);

        await restaurantService.deleteRestaurant(id, req.user.id);

        res.status(204).send();
    } catch (error) {
        next(error);
    }
}

async function uploadImage(req, res, next) {
    try {
        const id = parseId(req.params.id);

        if (!id) return invalidId(res);

        res.json(await restaurantService.updateRestaurantImage(id, req.file, req.user.id));
    } catch (error) {
        next(error);
    }
}

async function removeImage(req, res, next) {
    try {
        const id = parseId(req.params.id);

        if (!id) return invalidId(res);

        res.json(await restaurantService.removeRestaurantImage(id, req.user.id));
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getRestaurants,
    getCategories,
    getRestaurantById,
    getReviews,
    getMyRestaurants,
    getMyRestaurant,
    createRestaurant,
    updateRestaurant,
    deleteRestaurant,
    uploadImage,
    removeImage
};
