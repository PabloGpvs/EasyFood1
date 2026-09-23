-- Adiciona a coluna permitindo NULL temporariamente
ALTER TABLE "Restaurant"
ADD COLUMN "ownerId" INTEGER;

-- Define o usuário 1 como dono do restaurante existente
UPDATE "Restaurant"
SET "ownerId" = 1
WHERE "id" = 1;

-- Torna a coluna obrigatória
ALTER TABLE "Restaurant"
ALTER COLUMN "ownerId" SET NOT NULL;

-- Cria a restrição única
CREATE UNIQUE INDEX "Restaurant_ownerId_key"
ON "Restaurant"("ownerId");

-- Cria a relação com User
ALTER TABLE "Restaurant"
ADD CONSTRAINT "Restaurant_ownerId_fkey"
FOREIGN KEY ("ownerId")
REFERENCES "User"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;