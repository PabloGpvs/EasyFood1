-- Atividade 8: caminho da imagem de perfil do usuário
ALTER TABLE "User" ADD COLUMN "imageUrl" TEXT;

-- Atividade 8: caminho da imagem do prato (o modelo Dish usa a tabela "Product")
ALTER TABLE "Product" ADD COLUMN "imageUrl" TEXT;
