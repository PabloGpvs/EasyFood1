const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            error: "Token não informado."
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const usuario = jwt.verify(token, "easyfood_segredo");

        req.user = usuario;

        next();
    } catch (error) {
        return res.status(401).json({
            error: "Token inválido ou expirado."
        });
    }
}

module.exports = authMiddleware;