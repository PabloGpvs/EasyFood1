const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

// Cada restaurante precisa de um dono, e cada dono so pode ter um restaurante.
const exemplos = [
  {
    dono: "Dono Pizza", email: "pizza@easyfood.com", name: "Pizza Fácil", category: "Pizza",
    pratos: [
      { name: "Pizza Margherita", description: "Molho de tomate, muçarela e manjericão", price: 49.9, category: "Pizza" },
      { name: "Pizza Calabresa", description: "Calabresa fatiada e cebola", price: 52.9, category: "Pizza" }
    ]
  },
  {
    dono: "Dono Burger", email: "burger@easyfood.com", name: "Burger House", category: "Hambúrguer",
    pratos: [
      { name: "Cheeseburger", description: "Pão brioche, blend 160g e cheddar", price: 32.9, category: "Lanche" },
      { name: "Batata Frita", description: "Porção média", price: 18.9, category: "Acompanhamento" }
    ]
  },
  {
    dono: "Dono Sushi", email: "sushi@easyfood.com", name: "Sushi Brasil", category: "Japonês",
    pratos: [
      { name: "Combinado 20 peças", description: "Sashimi, niguiri e uramaki", price: 79.9, category: "Combinado" },
      { name: "Temaki Salmão", description: "Salmão e cream cheese", price: 29.9, category: "Temaki" }
    ]
  }
];

async function main() {
  const senhaHash = await bcrypt.hash("123456", 10);

  for (const ex of exemplos) {
    const dono = await prisma.user.upsert({
      where: { email: ex.email },
      update: { role: "DONO" },
      create: { name: ex.dono, email: ex.email, password: senhaHash, role: "DONO" }
    });

    let restaurante = await prisma.restaurant.findFirst({ where: { ownerId: dono.id } });
    if (!restaurante) {
      restaurante = await prisma.restaurant.create({
        data: { name: ex.name, category: ex.category, ownerId: dono.id }
      });
    }

    // Cria os pratos de exemplo só se o restaurante ainda não tiver cardápio
    const totalPratos = await prisma.dish.count({ where: { restaurantId: restaurante.id } });
    if (totalPratos === 0) {
      await prisma.dish.createMany({
        data: ex.pratos.map((prato) => ({ ...prato, restaurantId: restaurante.id }))
      });
    }
  }

  // Conta de administrador: dona da plataforma, gerencia tudo
  await prisma.user.upsert({
    where: { email: "pablo@easyfood.com" },
    update: { name: "Pablo Gabriel", role: "ADMIN", password: await bcrypt.hash("1909", 10) },
    create: { name: "Pablo Gabriel", email: "pablo@easyfood.com", password: await bcrypt.hash("1909", 10), role: "ADMIN" }
  });

  console.log("Restaurantes e pratos de exemplo cadastrados com sucesso!");
  console.log("Administrador: pablo@easyfood.com (senha 1909)");
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
