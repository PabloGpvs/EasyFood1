const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function createUser(data) {
    const senhaHash = await bcrypt.hash(data.password, 10);

    return prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            password: senhaHash
        }
    });
}

async function getUsers() {
return prisma.user.findMany({
    orderBy: {
        id: "asc"
    },
    select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true
    }
});

}

async function getUserById(id) {
    return prisma.user.findUnique({
        where: {
            id
        },
        select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            updatedAt: true
        }
    });
}

async function loginUser(email, password) {
    const user = await prisma.user.findUnique({
        where: {
            email
        }
    });

    if (!user) {
        return null;
    }

    const senhaCorreta = await bcrypt.compare(password, user.password);

    if (!senhaCorreta) {
        return null;
    }

    return user;
}

module.exports = {
    createUser,
    getUsers,
    getUserById,
    loginUser
};