const productService = require("../services/productService");

async function getProducts(req, res) {
    try {
        const products = await productService.getProducts();

        res.json(products);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Erro ao buscar produtos."
        });
    }
}

async function getProductById(req, res) {
    try {
        const id = Number(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({
                error: "ID inválido."
            });
        }

        const product = await productService.getProductById(id);

        if (!product) {
            return res.status(404).json({
                error: "Produto não encontrado."
            });
        }

        res.json(product);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Erro ao buscar produto."
        });
    }
}

async function createProduct(req, res) {
    try {
        const { name, description, price, category, restaurantId } = req.body;

        if (!name || price === undefined || !category || !restaurantId) {
            return res.status(400).json({
                error: "Nome, preço, categoria e restaurante são obrigatórios."
            });
        }

        const product = await productService.createProduct({
            name,
            description,
            price: Number(price),
            category,
            restaurantId: Number(restaurantId)
        });

        res.status(201).json(product);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Erro ao criar produto."
        });
    }
}

async function updateProduct(req, res) {
    try {
        const id = Number(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({
                error: "ID inválido."
            });
        }

        const { name, description, price, category, restaurantId } = req.body;

        const product = await productService.updateProduct(id, {
            name,
            description,
            price: Number(price),
            category,
            restaurantId: Number(restaurantId)
        });

        if (!product) {
            return res.status(404).json({
                error: "Produto não encontrado."
            });
        }

        res.json(product);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Erro ao atualizar produto."
        });
    }
}

async function deleteProduct(req, res) {
    try {
        const id = Number(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({
                error: "ID inválido."
            });
        }

        const deleted = await productService.deleteProduct(id);

        if (!deleted) {
            return res.status(404).json({
                error: "Produto não encontrado."
            });
        }

        res.json({
            message: "Produto excluído com sucesso."
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Erro ao excluir produto."
        });
    }
}

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
};