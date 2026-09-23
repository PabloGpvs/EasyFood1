const express = require("express");
const cors = require("cors");
const path = require("path");
const restaurantRoutes = require("./routes/restaurantRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const userRoutes = require("./routes/userRoutes");
const app = express();

app.use(cors());

app.use(express.json());

app.use(express.static(path.join(__dirname, "../public")));

app.get("/style.css", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/style.css"));
});

app.get("/", (req, res) => {

    res.sendFile(path.join(__dirname, "../public/index.html"));

});

app.use(restaurantRoutes);
app.use(productRoutes);
app.use(orderRoutes);
app.use(userRoutes);

app.use((req, res) => {

    res.status(404).json({

        error: "Rota não encontrada."

    });

});

module.exports = app;