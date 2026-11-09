const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

// Cada restaurante precisa de um dono, e cada dono so pode ter um restaurante.
const exemplos = [
  { dono: "Dono Pizza", email: "pizza@easyfood.com", name: "Pizza Fácil", category: "Pizza" },
  { dono: "Dono Burger", email: "burger@easyfood.com", name: "Burger House", category: "Hambúrguer" },
  { dono: "Dono Sushi", email: "sushi@easyfood.com", name: "Sushi Brasil", category: "Japonês" }
];

async function main() {
  const senhaHash = await bcrypt.hash("123456", 10);

  for (const ex of exemplos) {
    const dono = await prisma.user.upsert({
      where: { email: ex.email },
      update: {},
      create: { name: ex.dono, email: ex.email, password: senhaHash }
    });

    const existente = await prisma.restaurant.findFirst({ where: { ownerId: dono.id } });
    if (!existente) {
      await prisma.restaurant.create({
        data: { name: ex.name, category: ex.category, ownerId: dono.id }
      });
    }
  }

  console.log("Restaurantes de exemplo cadastrados com sucesso!");
  console.log("Logins dos donos: pizza@easyfood.com, burger@easyfood.com, sushi@easyfood.com (senha 123456)");
}

main()
  .catch((error) => {
    console.error("Erro ao executar o seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
