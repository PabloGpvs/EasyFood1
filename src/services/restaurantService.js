const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function getRestaurants() {

    return prisma.restaurant.findMany({

        orderBy: {
            id: "asc"
        }

    });

}

async function getRestaurantById(id) {

    return prisma.restaurant.findUnique({

        where: { id },

        include: {
            products: true
        }

    });

}

async function createRestaurant(data, ownerId) {

    return prisma.restaurant.create({

        data: {
    name: data.name,
    category: data.category,
    imageUrl: data.imageUrl,
    ownerId: ownerId
    }

    });

}

async function updateRestaurant(id, data) {

    const existing = await prisma.restaurant.findUnique({

        where: { id }

    });

    if (!existing) {

        return null;

    }

    return prisma.restaurant.update({

        where: { id },

        data

    });

}

async function deleteRestaurant(id) {

    const existing = await prisma.restaurant.findUnique({

        where: { id }

    });

    if (!existing) {

        return false;

    }

    await prisma.restaurant.delete({

        where: { id }

    });

    return true;

}

module.exports = {

    getRestaurants,
    getRestaurantById,
    createRestaurant,
    updateRestaurant,
    deleteRestaurant

};