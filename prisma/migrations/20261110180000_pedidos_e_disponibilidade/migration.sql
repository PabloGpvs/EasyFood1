-- Prato pode ser marcado como esgotado sem ser excluído
ALTER TABLE "Product" ADD COLUMN "available" BOOLEAN NOT NULL DEFAULT true;

-- Endereço de entrega e observação do pedido
ALTER TABLE "Order" ADD COLUMN "address" TEXT;
ALTER TABLE "Order" ADD COLUMN "note" TEXT;
