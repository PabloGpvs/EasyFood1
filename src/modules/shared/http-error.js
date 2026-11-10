// Erro com status HTTP. Os services lançam este erro e o controller
// (ou o middleware de erros do app.js) devolve a resposta adequada.
class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

module.exports = HttpError;
