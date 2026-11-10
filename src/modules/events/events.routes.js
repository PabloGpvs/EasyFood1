const express = require("express");
const jwt = require("jsonwebtoken");
const prisma = require("../../database/prisma");
const { bus } = require("../shared/events");
const { JWT_SECRET } = require("../auth/auth.service");

const router = express.Router();

/**
 * Atualizações em tempo real (Server-Sent Events).
 *
 * O navegador abre GET /events?token=... e fica conectado. Quando um pedido é
 * criado ou muda de status, o servidor avisa na hora:
 * - o cliente que fez o pedido;
 * - o dono do restaurante do pedido.
 *
 * O EventSource do navegador não envia cabeçalhos, por isso o token vai na URL.
 */
router.get("/events", async (req, res) => {
    let user;

    try {
        user = jwt.verify(String(req.query.token || ""), JWT_SECRET);
    } catch {
        return res.status(401).json({ error: "Token inválido ou expirado." });
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
    const admin = dbUser?.role === "ADMIN";

    const owned = await prisma.restaurant.findMany({
        where: admin ? {} : { ownerId: user.id },
        select: { id: true }
    });

    const restaurantIds = new Set(owned.map(r => r.id));

    res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
    });
    res.flushHeaders();

    const send = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    send("conectado", { userId: user.id });

    const onOrder = ({ type, order }) => {
        const isCustomer = order.userId === user.id;
        const isOwner = admin || restaurantIds.has(order.restaurantId);

        if (isCustomer || isOwner) {
            send("pedido", { type, order, papel: isOwner ? "restaurante" : "cliente" });
        }
    };

    bus.on("order", onOrder);

    // Mantém a conexão viva (proxies costumam fechar conexões paradas)
    const ping = setInterval(() => res.write(": ping\n\n"), 25000);

    req.on("close", () => {
        clearInterval(ping);
        bus.off("order", onOrder);
    });
});

module.exports = router;
