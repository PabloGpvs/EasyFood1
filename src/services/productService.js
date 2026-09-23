const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function getProducts() {
    return prisma.product.findMany({
        orderBy: {
            id: "asc"
        }
    });
}

async function getProductById(id) {
    return prisma.product.findUnique({
        where: { id }
    });
}

async function createProduct(data) {
    return prisma.product.create({
        data: {
            ...data,
            updatedAt: new Date()
        }
    });
}

async function updateProduct(id, data) {
    const existing = await prisma.product.findUnique({
        where: { id }
    });

    if (!existing) {
        return null;
    }

    return prisma.product.update({
        where: { id },
        data
    });
}

async function deleteProduct(id) {
    const existing = await prisma.product.findUnique({
        where: { id }
    });

    if (!existing) {
        return false;
    }

    await prisma.product.delete({
        where: { id }
    });

    return true;
}

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
};