const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("./auth.service");

// Valida o token JWT e coloca o usuário em req.user ({ id, email }).
// Toda rota que altera dados de um usuário usa req.user.id, e nunca um id
// vindo do corpo ou da URL, para que ninguém altere dados de outra pessoa.
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            error: "Token não informado."
        });
    }

    const [type, token] = authHeader.split(" ");

    if (type !== "Bearer" || !token) {
        return res.status(401).json({
            error: "Formato do token inválido. Use: Bearer <token>."
        });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);

        req.user = { id: payload.id, email: payload.email };

        next();
    } catch (error) {
        return res.status(401).json({
            error: "Token inválido ou expirado."
        });
    }
}

module.exports = authMiddleware;
