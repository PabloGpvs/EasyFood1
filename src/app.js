const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./modules/auth/auth.routes");
const restaurantRoutes = require("./modules/restaurant/restaurant.routes");
const dishRoutes = require("./modules/dishes/dish.routes");
const orderRoutes = require("./modules/orders/order.routes");
const eventRoutes = require("./modules/events/events.routes");
const { UPLOADS_DIR } = require("./modules/shared/image.service");

const app = express();

app.use(cors());
app.use(express.json());

// Telas (HTML/CSS) e imagens enviadas
app.use(express.static(path.join(__dirname, "../public")));
// Os nomes das imagens são únicos (UUID) e nunca mudam: o navegador pode
// guardar em cache por bastante tempo. Ao trocar a foto, o caminho muda.
app.use("/uploads", express.static(UPLOADS_DIR, {
    maxAge: "30d",
    immutable: true,
    index: false
}));

// Cada módulo registra as próprias rotas
app.use(authRoutes);
app.use(restaurantRoutes);
app.use(dishRoutes);
app.use(orderRoutes);
app.use(eventRoutes);

app.use((req, res) => {
    res.status(404).json({
        error: "Rota não encontrada."
    });
});

// Tratamento central de erros: HttpError vira a resposta com o status dele,
// o resto vira 500 sem expor detalhes internos.
// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
    if (error.type === "entity.parse.failed") {
        return res.status(400).json({ error: "JSON inválido no corpo da requisição." });
    }

    if (error.retryAfter) {
        res.set("Retry-After", String(error.retryAfter));
    }

    if (error.status && error.status < 500) {
        return res.status(error.status).json({ error: error.message });
    }

    console.error(error);

    res.status(500).json({
        error: "Erro interno no servidor."
    });
});

module.exports = app;
