const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.restaurant.createMany({
    data: [
      {
        name: "Pizza Fácil",
        category: "Pizza",
        rating: 4.5
      },
      {
        name: "Burger House",
        category: "Hambúrguer",
        rating: 4.2
      },
      {
        name: "Sushi Brasil",
        category: "Japonês",
        rating: 4.7
      }
    ]
  });

  console.log("Restaurantes de exemplo cadastrados com sucesso!");
}

main()
  .catch((error) => {
    console.error("Erro ao executar o seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });