const { EventEmitter } = require("events");

// Barramento de eventos dentro do servidor. Os services avisam quando algo
// acontece (ex.: pedido criado) e quem estiver ouvindo (o módulo de eventos em
// tempo real) repassa para os navegadores. Quem emite não sabe quem escuta.
const bus = new EventEmitter();

// Muitas abas abertas = muitos ouvintes; não é vazamento de memória
bus.setMaxListeners(0);

/**
 * Avisa que um pedido mudou.
 * @param {"criado"|"status"} type
 * @param {{ id: number, status: string, userId: number|null, restaurantId: number|null }} order
 */
function emitOrder(type, order) {
    bus.emit("order", {
        type,
        order: {
            id: order.id,
            status: order.status,
            userId: order.userId,
            restaurantId: order.restaurantId
        }
    });
}

module.exports = {
    bus,
    emitOrder
};
