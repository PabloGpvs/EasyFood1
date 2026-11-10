# ADR 001 — Módulos, correção do cadastro de pratos e serviço de imagens

**Status:** aceito
**Data:** 10/11/2026 (Atividade 8)

## Contexto

O EasyFood estava organizado por camada (`controllers/`, `routes/`, `services/`), com os pratos modelados como `Product` e rota `POST /products`. A atividade pede:

- o cadastro de pratos em `POST /restaurants/:restaurantId/dishes`;
- upload de imagem para o perfil do usuário e para os pratos;
- um único serviço de imagens reutilizado pelos módulos.

## Problemas encontrados no código anterior

1. **Cadastro de pratos fora do restaurante.** O prato era criado em `POST /products` com o `restaurantId` no corpo, sem conferir se o restaurante existia (o erro de chave estrangeira virava `500`) e sem exigir login. Qualquer pessoa podia cadastrar prato em qualquer restaurante.
2. **`/my-restaurant` quebrado.** A migration `sincronizar_restaurante` removeu o índice único de `ownerId` (um dono pode ter vários restaurantes), mas o código continuou usando `findUnique({ where: { ownerId } })`. O Prisma só aceita `findUnique` em campos únicos, então a rota passou a dar erro.
3. **Várias conexões com o banco.** Cada service, e alguns controllers dentro de cada requisição, criava um `new PrismaClient()`, abrindo conexões novas sem necessidade.
4. **Segredo do JWT fixo no código**, repetido em dois arquivos.

## Decisão

- **Módulos** em `src/modules`: `auth`, `restaurant`, `dishes`, `orders` e `shared`. Cada um tem `*.routes.js`, `*.controller.js` e `*.service.js`.
- **Pratos**: o modelo passou a se chamar `Dish`, mas continua usando a tabela `Product` (`@@map("Product")`). O nome no código ficou alinhado ao domínio sem precisar migrar dados. O prato é criado em `POST /restaurants/:restaurantId/dishes`. O service confere se o restaurante existe (`404`) e se o usuário logado é o dono (`403`), e liga o prato pela relação (`restaurant: { connect: { id } }`).
- **`/my-restaurant`** passou a usar `findFirst`.
- **Uma conexão**: `src/database/prisma.js` exporta um único `PrismaClient`.
- **JWT** lido de `JWT_SECRET` (`.env`), definido em um único lugar (`auth.service.js`).
- **Imagens**:
  - `shared/upload.middleware.js` (Multer): recebe um arquivo em memória e aceita só JPEG, PNG ou WebP, até o limite de tamanho.
  - `shared/image.service.js` (Sharp): redimensiona, converte para WebP, salva em `uploads/<tipo>/` e devolve o caminho público. Não sabe se a imagem é de usuário ou de prato.
  - `auth.service` e `dish.service` chamam o mesmo `imageService.processAndSave(...)`.

## Melhorias no upload

Depois da primeira versão, o upload foi revisado:

- **Formato conferido pelo conteúdo.** O Multer só olha o `Content-Type`, que o cliente escolhe. Agora o `image.service` lê o arquivo com o Sharp e só aceita se for JPEG, PNG ou WebP de verdade (um GIF com nome `.jpg` recebe `415`).
- **Limite de resolução** (40 megapixels). Um PNG pequeno pode descompactar para uma imagem enorme e travar o servidor ("bomba de descompressão"); isso agora recebe `413`.
- **Fluxo de troca único** (`imageService.replace`): processa a nova imagem, salva no banco e só então apaga a antiga. Se o banco falhar, apaga a nova. Usuário, prato e restaurante usam o mesmo fluxo.
- **Remover foto:** `DELETE /auth/me/image`, `DELETE /dishes/:dishId/image` e `DELETE /restaurants/:id/image`.
- **Foto do restaurante:** `POST /restaurants/:id/image`, reaproveitando o mesmo middleware e serviço. Antes era só um campo de URL digitada.
- **Privacidade:** o Sharp remove os metadados (EXIF, incluindo GPS) ao converter para WebP.
- **Cache:** `/uploads` é servido com cache de 30 dias. Como cada imagem tem nome único (UUID), trocar a foto muda o caminho e o navegador nunca mostra a antiga.
- **Telas:** avatar com troca/remoção de foto, prévia antes de enviar, validação no navegador (tipo e tamanho) e gestão de fotos no painel. O `public/js/imagens.js` concentra essa lógica no front, do mesmo jeito que o `image.service` no back.

## Reflexões (Parte 6)

**Por que reutilizar o mesmo serviço de imagens?**
A regra de otimizar e salvar é a mesma para qualquer imagem. Com um só lugar, uma mudança (por exemplo, trocar o disco por um bucket S3 ou por uma função serverless) é feita uma vez e vale para todos os módulos. Também não há duas versões da mesma lógica divergindo com o tempo.

**Controller x Service.**
O controller cuida do HTTP: lê `params`, `body`, `req.user` e `req.file`, valida o formato da entrada e escolhe o status da resposta. O service cuida da regra de negócio: o prato existe? o usuário é o dono? processa a imagem, grava no banco, apaga a imagem antiga. O service não conhece `req` nem `res`.

**Por que não processar nas rotas?**
A rota só declara o caminho e a ordem dos middlewares (`auth → upload → controller`). Colocar o processamento ali misturaria responsabilidades, impediria a reutilização e dificultaria os testes.

**Como o middleware de autenticação protege a foto de perfil?**
`POST /auth/me/image` não recebe id. O `authMiddleware` valida o token e coloca o usuário em `req.user`, e o service atualiza exatamente `req.user.id`. Sem token válido a requisição para em `401`, antes mesmo de o arquivo ser lido.

**E se o processamento da imagem falhar?**
Se o Sharp não conseguir ler o arquivo, o service lança `HttpError(422)`. Nada é gravado e o banco não muda. Se a imagem foi salva mas a atualização no banco falhar, o arquivo novo é apagado para não ficar órfão. A imagem antiga só é removida depois que o banco foi atualizado.

**A arquitetura permite crescer sem mexer em tudo?**
Sim, e isso foi testado na prática: a foto do restaurante entrou com um preset novo no `image.service` e duas rotas no módulo `restaurant`, sem mudar nada em `auth` ou `dishes`. Um módulo novo é registrado com uma linha no `app.js`.
