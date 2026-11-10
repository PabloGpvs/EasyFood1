-- Tipo de conta e recuperação de senha
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'CLIENTE';
ALTER TABLE "User" ADD COLUMN "resetTokenHash" TEXT;
ALTER TABLE "User" ADD COLUMN "resetTokenExpires" TIMESTAMP(3);

-- Quem já tem restaurante vira DONO
UPDATE "User" SET "role" = 'DONO'
WHERE "id" IN (SELECT "ownerId" FROM "Restaurant");

-- Taxa de entrega, pedido mínimo e horário de funcionamento
ALTER TABLE "Restaurant" ADD COLUMN "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Restaurant" ADD COLUMN "minOrder" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Restaurant" ADD COLUMN "opensAt" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN "closesAt" TEXT;

-- Pedido: subtotal, taxa, pagamento e restaurante
ALTER TABLE "Order" ADD COLUMN "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT 'PIX';
ALTER TABLE "Order" ADD COLUMN "changeFor" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN "restaurantId" INTEGER;

-- Pedidos antigos: subtotal = total, e o restaurante vem dos itens
UPDATE "Order" SET "subtotal" = "total";
UPDATE "Order" o SET "restaurantId" = (
    SELECT p."restaurantId"
    FROM "OrderItem" i
    JOIN "Product" p ON p."id" = i."productId"
    WHERE i."orderId" = o."id"
    LIMIT 1
);

ALTER TABLE "Order" ADD CONSTRAINT "Order_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Endereços salvos
CREATE TABLE "Address" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Avaliações
CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Review_orderId_key" ON "Review"("orderId");

ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
