const { PrismaClient } = require("@prisma/client");

// Uma única conexão com o banco, compartilhada por todos os módulos.
// Antes cada service (e alguns controllers) criava o seu próprio PrismaClient,
// abrindo várias conexões com o PostgreSQL sem necessidade.
const prisma = new PrismaClient();

module.exports = prisma;
