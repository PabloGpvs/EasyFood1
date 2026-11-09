-- Adiciona a imagem do restaurante (campo imageUrl do schema)
ALTER TABLE "Restaurant" ADD COLUMN "imageUrl" TEXT;

-- Um dono pode ter varios restaurantes: remove a restricao unica do ownerId
DROP INDEX "Restaurant_ownerId_key";
