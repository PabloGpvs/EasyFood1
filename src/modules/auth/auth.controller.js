const authService = require("./auth.service");

// O controller só lida com HTTP: lê a requisição, chama o service e responde.
// Erros (HttpError ou inesperados) seguem para o middleware de erros do app.js.

async function register(req, res, next) {
    try {
        const user = await authService.register(req.body);
        res.status(201).json(user);
    } catch (error) {
        next(error);
    }
}

async function login(req, res, next) {
    try {
        const { email, password } = req.body;
        const result = await authService.login(email, password, req.ip);
        res.json(result);
    } catch (error) {
        next(error);
    }
}

async function me(req, res, next) {
    try {
        const user = await authService.getUserById(req.user.id);

        if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        res.json(user);
    } catch (error) {
        next(error);
    }
}

async function uploadMyImage(req, res, next) {
    try {
        // req.user vem do token (authMiddleware) e req.file do Multer
        const user = await authService.updateProfileImage(req.user.id, req.file);
        res.json(user);
    } catch (error) {
        next(error);
    }
}

async function removeMyImage(req, res, next) {
    try {
        res.json(await authService.removeProfileImage(req.user.id));
    } catch (error) {
        next(error);
    }
}

async function getUserById(req, res, next) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: "ID inválido." });
        }

        const user = await authService.getPublicProfile(id);

        if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        res.json(user);
    } catch (error) {
        next(error);
    }
}

// Responde com o resultado de fn(req), ou passa o erro adiante
function handle(fn, status = 200) {
    return async (req, res, next) => {
        try {
            const result = await fn(req);

            if (result === undefined) {
                return res.status(204).send();
            }

            res.status(status).json(result);
        } catch (error) {
            next(error);
        }
    };
}

// Endereço público do site, usado no link do e-mail de recuperação
function appUrl(req) {
    return (process.env.APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
}

const updateMe = handle(req => authService.updateMe(req.user.id, req.body || {}));

const changePassword = handle(async req => {
    await authService.changePassword(req.user.id, req.body || {});
});

const becomeOwner = handle(req => authService.becomeOwner(req.user.id));

const getAddresses = handle(req => authService.getAddresses(req.user.id));

const addAddress = handle(req => authService.addAddress(req.user.id, req.body || {}), 201);

const removeAddress = handle(async req => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        const error = new Error("ID inválido.");
        error.status = 400;
        throw error;
    }

    await authService.removeAddress(req.user.id, id);
});

const forgotPassword = handle(async req => {
    await authService.forgotPassword(req.body?.email, appUrl(req));

    return { message: "Se este e-mail estiver cadastrado, você vai receber um link para criar uma nova senha." };
});

const resetPassword = handle(async req => {
    await authService.resetPassword(req.body || {});

    return { message: "Senha alterada! Agora é só entrar com a nova senha." };
});

module.exports = {
    updateMe,
    changePassword,
    becomeOwner,
    getAddresses,
    addAddress,
    removeAddress,
    forgotPassword,
    resetPassword,
    register,
    login,
    me,
    uploadMyImage,
    removeMyImage,
    getUserById
};
