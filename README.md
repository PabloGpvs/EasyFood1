# EasyFood API

API REST desenvolvida com Node.js, Express, Prisma e PostgreSQL.

## Funcionalidades

**Cliente**
- Conta com foto, troca de nome e senha, endereços salvos e recuperação de senha por e-mail.
- Busca e filtro de restaurantes, com nota média, taxa de entrega, pedido mínimo e aviso de "fechado".
- Carrinho salvo no navegador, endereço, observação e pagamento na entrega (Pix, cartão ou dinheiro com troco).
- "Meus pedidos" com status em tempo real, cancelamento enquanto pendente e avaliação (1 a 5 estrelas) depois da entrega.

**Dono de restaurante**
- Conta do tipo "dono" (escolhida no cadastro ou ativada em "Minha conta").
- Painel com: dados, foto, taxa, pedido mínimo e horário; cardápio com fotos, edição e "esgotado"; pedidos em tempo real com filtro por status.

## Arquitetura

A aplicação é organizada em módulos. Cada módulo tem rotas, controller e service:

```
src/
├── app.js
├── database/
│   └── prisma.js              # uma única conexão Prisma para todo o projeto
└── modules/
    ├── auth/                  # cadastro, login, JWT e foto de perfil
    ├── restaurant/            # restaurantes
    ├── dishes/                # pratos (cardápio) e imagem do prato
    ├── orders/                # pedidos e avaliações
    ├── events/                # tempo real (Server-Sent Events)
    └── shared/
        ├── image.service.js       # otimiza (Sharp) e salva imagens
        ├── upload.middleware.js   # recebe o arquivo (Multer)
        ├── email.service.js       # envia e-mails (Nodemailer)
        ├── events.js              # barramento de eventos interno
        ├── business-hours.js      # aberto/fechado pelo horário
        ├── rate-limit.js          # limite de tentativas de login
        └── http-error.js          # erro com status HTTP
```

No navegador, `public/js/` faz o mesmo papel do `shared/`: `app.js` (sessão, API, formatação), `ui.js` (avisos e confirmações) e `imagens.js` (upload).

Fluxo de uma requisição: Rota → Middlewares (JWT, upload) → Controller → Service → Prisma → PostgreSQL.

O `image.service.js` é usado tanto pelo módulo `auth` (foto de perfil) quanto pelo módulo `dishes` (foto do prato).

## Requisitos

- Node.js instalado
- PostgreSQL instalado e funcionando

## Instalação

1. Abra o terminal na pasta do projeto.
2. Execute:

```bash
npm install
```

3. Copie `.env.example` para `.env`.
4. No `.env`, coloque os dados do seu PostgreSQL.

Exemplo:

```env
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/easyfood?schema=public"
PORT=3000
```

### Variáveis do `.env`

| Variável | Para quê |
| --- | --- |
| `DATABASE_URL` | Conexão com o PostgreSQL |
| `PORT` | Porta do servidor (padrão 3000) |
| `JWT_SECRET` | Segredo dos tokens de login. **Defina um valor próprio** |
| `UPLOAD_MAX_SIZE_MB` | Tamanho máximo das imagens (padrão 5) |
| `APP_URL` | Endereço do site, usado no link do e-mail de senha (padrão: o endereço acessado) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Envio de e-mail. Sem isso, o e-mail aparece no terminal do servidor |
| `EASYFOOD_TIMEZONE` | Fuso dos horários de funcionamento (padrão `America/Sao_Paulo`) |

## Banco de dados

Crie o banco `easyfood` no PostgreSQL.

Depois execute:

```bash
npx prisma generate
npx prisma migrate dev
```

Para inserir os restaurantes de exemplo:

```bash
npm run seed
```

## Executar

```bash
npm start
```

Se tudo estiver certo, aparecerá:

```text
Servidor rodando na porta 3000
```

## Testes

Com o banco configurado e o seed aplicado:

```bash
npm test
```

O teste sobe o servidor na porta 3099 e confere a Atividade 8 (Parte 5), as imagens, a segurança, as regras de pedido, a conta, a recuperação de senha e o tempo real. Ele cria um restaurante temporário e o apaga no final.

## Endpoints

🔒 = exige `Authorization: Bearer <token>`

### Autenticação e usuário

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/auth/register` | Cadastra usuário (`name`, `email` válido, `password` com 6+ caracteres) |
| POST | `/auth/login` | Retorna `token` e `user`. Após 5 senhas erradas, bloqueia por 15 min (`429`) |
| GET | `/auth/me` 🔒 | Dados do usuário logado (inclui `imageUrl`) |
| POST | `/auth/me/image` 🔒 | Envia/troca a foto de perfil (campo `image`) |
| DELETE | `/auth/me/image` 🔒 | Remove a foto de perfil |

| PATCH | `/auth/me` 🔒 | Altera o nome |
| PUT | `/auth/me/password` 🔒 | Troca a senha (`currentPassword`, `newPassword`) |
| POST | `/auth/me/become-owner` 🔒 | Ativa o modo restaurante (vira `DONO`) |
| GET/POST | `/auth/me/addresses` 🔒 | Lista / salva endereço (`label`, `street`) |
| DELETE | `/auth/me/addresses/:id` 🔒 | Remove endereço |
| POST | `/auth/forgot-password` | Envia o link de nova senha por e-mail |
| POST | `/auth/reset-password` | Define a nova senha (`token`, `password`) |
| GET | `/users/:id` | Perfil público (nome e foto, sem e-mail) |

As rotas antigas `POST /users` e `POST /login` continuam funcionando.

### Restaurantes

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/restaurants?search=&category=` | Lista restaurantes, com busca e filtro opcionais |
| GET | `/restaurants/categories` | Categorias existentes |
| GET | `/restaurants/:id/reviews` | Avaliações do restaurante |
| GET | `/restaurants/:id` | Restaurante com o cardápio (`dishes`) |
| POST | `/restaurants` 🔒 | Cadastra restaurante para o usuário logado |
| PUT | `/restaurants/:id` 🔒 | Atualiza nome, categoria, `deliveryFee`, `minOrder`, `opensAt`, `closesAt` (só o dono) |
| DELETE | `/restaurants/:id` 🔒 | Exclui (só o dono, e só sem pratos) |
| GET | `/my-restaurants` 🔒 | Todos os restaurantes do usuário logado |
| GET | `/my-restaurant` 🔒 | Restaurante do usuário logado |
| POST | `/restaurants/:id/image` 🔒 | Envia/troca a foto do restaurante (só o dono) |
| DELETE | `/restaurants/:id/image` 🔒 | Remove a foto do restaurante |

### Pratos

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/restaurants/:restaurantId/dishes` | Cardápio (cada prato com `imageUrl`) |
| POST | `/restaurants/:restaurantId/dishes` 🔒 | Cadastra prato (só o dono do restaurante) |
| GET | `/dishes/:dishId` | Um prato |
| PUT | `/dishes/:dishId` 🔒 | Atualiza prato (inclui `available: false` para esgotado) |
| DELETE | `/dishes/:dishId` 🔒 | Exclui prato (se não estiver em pedidos) |
| POST | `/dishes/:dishId/image` 🔒 | Envia/troca a imagem do prato (campo `image`) |
| DELETE | `/dishes/:dishId/image` 🔒 | Remove a imagem do prato |

Exemplo de cadastro de prato:

```http
POST /restaurants/1/dishes
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Pizza Portuguesa",
  "description": "Presunto, ovo e cebola",
  "price": 54.9,
  "category": "Pizza"
}
```

### Pedidos

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/orders` 🔒 | Cria pedido: `address`, `note`, `paymentMethod` (`PIX`, `CARTAO`, `DINHEIRO`), `changeFor`, `items: [{ dishId, quantity }]` |
| GET | `/orders` 🔒 | Pedidos do usuário logado (mais recentes primeiro) |
| GET | `/orders/:id` 🔒 | Um pedido (só o cliente ou o dono do restaurante) |
| PATCH | `/orders/:id/cancel` 🔒 | Cliente cancela enquanto estiver `PENDENTE` |
| GET | `/restaurants/:restaurantId/orders?status=` 🔒 | Pedidos do restaurante (só o dono) |
| PUT | `/orders/:id/status` 🔒 | Muda o status (só o dono; pedidos entregues/cancelados não mudam mais) |
| POST | `/orders/:id/review` 🔒 | Avalia o pedido entregue (`rating` 1 a 5, `comment`) |
| GET | `/events?token=` | Tempo real (Server-Sent Events): avisos de pedido criado e de mudança de status |

Regras do pedido: restaurante aberto, todos os pratos do mesmo restaurante, nenhum esgotado, subtotal acima do pedido mínimo, até 50 unidades por prato, troco maior que o total. O preço e a taxa de entrega sempre vêm do banco.

## Upload de imagens

- Envie como `multipart/form-data`, no campo `image`.
- Formatos aceitos: JPEG, PNG ou WebP. Tamanho máximo: 5 MB (`UPLOAD_MAX_SIZE_MB` no `.env`) e 40 megapixels.
- O formato é conferido pelo **conteúdo** do arquivo, não pelo nome: um GIF renomeado para `.jpg` é recusado.
- A imagem é otimizada com Sharp: corrige a rotação de fotos de celular, recorta no tamanho certo, remove metadados (EXIF/GPS) e converte para WebP.

| Tipo | Pasta | Tamanho final |
| --- | --- | --- |
| Perfil | `uploads/users` | 400 x 400 |
| Prato | `uploads/dishes` | 800 x 600 |
| Restaurante | `uploads/restaurants` | 600 x 600 |

- O caminho fica salvo no banco (`imageUrl`) e a imagem abre no navegador em `http://localhost:3000/uploads/...`.
- Ao trocar ou remover uma foto, o arquivo antigo é apagado.
- Cada imagem tem nome único, então o navegador pode guardar em cache (30 dias).

Nas telas:
- **Página inicial:** clique no seu avatar (canto superior direito) para trocar ou remover a foto de perfil. O cadastro de restaurante aceita uma foto, com prévia.
- **Painel do restaurante:** troque a foto do restaurante, cadastre pratos com foto e troque ou remova a foto de cada prato.

Exemplo com curl:

```bash
curl -X POST http://localhost:3000/dishes/1/image \
  -H "Authorization: Bearer SEU_TOKEN" \
  -F "image=@pizza.jpg"
```

| Situação | Resposta |
| --- | --- |
| Sem token ou token inválido | `401` |
| Prato de outro restaurante | `403` |
| Prato inexistente | `404` |
| Arquivo maior que o limite (MB ou megapixels) | `413` |
| Formato não aceito (PDF, GIF...) | `415` |
| Arquivo corrompido / não é imagem de verdade | `422` |
| Nenhum arquivo enviado | `400` |

## Erros comuns

- Se aparecer erro de conexão com PostgreSQL, confira o `DATABASE_URL` no `.env`.
- Se a porta 3000 estiver ocupada, altere `PORT` no `.env`.
- Se aparecer erro relacionado ao Prisma Client, execute `npx prisma generate`.
