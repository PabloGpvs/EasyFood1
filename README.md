# EasyFood API

API REST desenvolvida com Node.js, Express, Prisma e PostgreSQL.

## Arquitetura

Cliente
↓
Routes
↓
Controller
↓
Service
↓
Prisma
↓
PostgreSQL

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

## Banco de dados

Crie o banco `easyfood` no PostgreSQL.

Depois execute:

```bash
npx prisma generate
npx prisma migrate dev --name init
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

## Endpoints

### Listar restaurantes

```http
GET /restaurants
```

### Buscar restaurante por ID

```http
GET /restaurants/1
```

### Cadastrar restaurante

```http
POST /restaurants
Content-Type: application/json

{
  "name": "Pizza Fácil",
  "category": "Pizza",
  "rating": 4.5
}
```

### Atualizar restaurante

```http
PUT /restaurants/1
Content-Type: application/json

{
  "name": "Pizza Fácil 2",
  "rating": 4.8
}
```

### Excluir restaurante

```http
DELETE /restaurants/1
```

## Erros comuns

- Se aparecer erro de conexão com PostgreSQL, confira o `DATABASE_URL` no `.env`.
- Se a porta 3000 estiver ocupada, altere `PORT` no `.env`.
- Se aparecer erro relacionado ao Prisma Client, execute `npx prisma generate`.
