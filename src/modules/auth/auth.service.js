const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../../database/prisma");
const imageService = require("../shared/image.service");
const HttpError = require("../shared/http-error");
const emailService = require("../shared/email.service");
const { ADMIN, canManageRestaurants } = require("../shared/permissions");

const JWT_SECRET = process.env.JWT_SECRET || "easyfood_segredo";

if (!process.env.JWT_SECRET) {
    console.warn("[aviso] JWT_SECRET não definido no .env: usando um segredo padrão (inseguro fora do computador de desenvolvimento).");
}

const ROLES = ["CLIENTE", "DONO"];
const RESET_EXPIRES_MIN = 30;
const JWT_EXPIRES_IN = "2h";

// Campos do usuário que podem sair na resposta (nunca a senha)
const publicFields = {
    id: true,
    name: true,
    email: true,
    imageUrl: true,
    role: true,
    createdAt: true,
    updatedAt: true
};

const { createFailureLimiter } = require("../shared/rate-limit");

// Depois de 5 senhas erradas para o mesmo e-mail no mesmo IP, bloqueia por 15 min
const loginLimiter = createFailureLimiter({
    maxFailures: 5,
    windowMs: 15 * 60 * 1000,
    message: "Muitas tentativas de login com senha errada."
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

function normalizeEmail(email) {
    return typeof email === "string" ? email.trim().toLowerCase() : "";
}

// Busca ignorando maiúsculas/minúsculas (contas antigas podem ter sido
// criadas com letras maiúsculas no e-mail)
function findByEmail(email) {
    return prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } }
    });
}

function validatePassword(password) {
    if (typeof password !== "string" || password.length < MIN_PASSWORD) {
        throw new HttpError(400, `A senha deve ter pelo menos ${MIN_PASSWORD} caracteres.`);
    }
}

async function register({ name, email, password, role }) {
    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanEmail = normalizeEmail(email);

    if (cleanName.length < 2) {
        throw new HttpError(400, "Informe seu nome (pelo menos 2 letras).");
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
        throw new HttpError(400, "Informe um e-mail válido.");
    }

    validatePassword(password);

    const cleanRole = role === undefined ? "CLIENTE" : role;

    if (!ROLES.includes(cleanRole)) {
        throw new HttpError(400, "Tipo de conta inválido (CLIENTE ou DONO).");
    }

    if (await findByEmail(cleanEmail)) {
        throw new HttpError(409, "Este e-mail já está cadastrado.");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    return prisma.user.create({
        data: { name: cleanName, email: cleanEmail, password: passwordHash, role: cleanRole },
        select: publicFields
    });
}

/**
 * @param {string} clientKey  identifica quem tenta (IP), para o limite de tentativas
 */
async function login(email, password, clientKey = "") {
    const cleanEmail = normalizeEmail(email);

    if (!cleanEmail || !password) {
        throw new HttpError(400, "E-mail e senha são obrigatórios.");
    }

    const limitKey = `${clientKey}|${cleanEmail}`;
    loginLimiter.check(limitKey);

    const user = await findByEmail(cleanEmail);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        loginLimiter.fail(limitKey);
        throw new HttpError(401, "E-mail ou senha inválidos.");
    }

    loginLimiter.reset(limitKey);

    const token = jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    const { password: _, resetTokenHash, resetTokenExpires, ...userWithoutPassword } = user;

    return { token, user: userWithoutPassword };
}

// Dados completos: só para o próprio usuário (/auth/me)
async function getUserById(id) {
    return prisma.user.findUnique({
        where: { id },
        select: publicFields
    });
}

// Perfil público: sem e-mail nem datas
async function getPublicProfile(id) {
    return prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, imageUrl: true }
    });
}

async function findUserOrFail(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
        throw new HttpError(404, "Usuário não encontrado.");
    }

    return user;
}

/**
 * Troca a foto de perfil do usuário autenticado.
 * O processamento fica no image.service (compartilhado com pratos e restaurantes).
 */
async function updateProfileImage(userId, file) {
    const user = await findUserOrFail(userId);

    return imageService.replace({
        buffer: file.buffer,
        folder: "users",
        oldPath: user.imageUrl,
        saveToDatabase: imageUrl => prisma.user.update({
            where: { id: userId },
            data: { imageUrl },
            select: publicFields
        })
    });
}

async function removeProfileImage(userId) {
    const user = await findUserOrFail(userId);

    const updated = await prisma.user.update({
        where: { id: userId },
        data: { imageUrl: null },
        select: publicFields
    });

    await imageService.remove(user.imageUrl);

    return updated;
}

// ---------- Minha conta ----------

async function updateMe(userId, { name }) {
    const cleanName = typeof name === "string" ? name.trim() : "";

    if (cleanName.length < 2 || cleanName.length > 80) {
        throw new HttpError(400, "Informe seu nome (entre 2 e 80 letras).");
    }

    return prisma.user.update({
        where: { id: userId },
        data: { name: cleanName },
        select: publicFields
    });
}

async function changePassword(userId, { currentPassword, newPassword }) {
    const user = await findUserOrFail(userId);

    if (typeof currentPassword !== "string" || !(await bcrypt.compare(currentPassword, user.password))) {
        throw new HttpError(400, "A senha atual está incorreta.");
    }

    validatePassword(newPassword);

    await prisma.user.update({
        where: { id: userId },
        data: { password: await bcrypt.hash(newPassword, 10) }
    });
}

// Cliente passa a poder cadastrar restaurantes
async function becomeOwner(userId) {
    const user = await findUserOrFail(userId);

    // O administrador já pode tudo; não rebaixa o papel dele
    if (user.role === ADMIN) {
        return getUserById(userId);
    }

    return prisma.user.update({
        where: { id: userId },
        data: { role: "DONO" },
        select: publicFields
    });
}

async function ensureOwnerRole(userId) {
    const user = await findUserOrFail(userId);

    if (!canManageRestaurants(user.role)) {
        throw new HttpError(403, "Ative o modo restaurante em \"Minha conta\" para cadastrar restaurantes.");
    }
}


// ---------- Endereços salvos ----------

const MAX_ADDRESSES = 10;

async function getAddresses(userId) {
    return prisma.address.findMany({
        where: { userId },
        orderBy: { id: "asc" }
    });
}

async function addAddress(userId, { label, street }) {
    const cleanLabel = typeof label === "string" ? label.trim() : "";
    const cleanStreet = typeof street === "string" ? street.trim() : "";

    if (cleanLabel.length < 1 || cleanLabel.length > 30) {
        throw new HttpError(400, "Dê um nome ao endereço (ex.: Casa, Trabalho), até 30 letras.");
    }

    if (cleanStreet.length < 5 || cleanStreet.length > 200) {
        throw new HttpError(400, "Informe o endereço completo (entre 5 e 200 caracteres).");
    }

    if ((await prisma.address.count({ where: { userId } })) >= MAX_ADDRESSES) {
        throw new HttpError(400, `Você pode salvar até ${MAX_ADDRESSES} endereços.`);
    }

    return prisma.address.create({
        data: { label: cleanLabel, street: cleanStreet, userId }
    });
}

async function removeAddress(userId, addressId) {
    const address = await prisma.address.findUnique({ where: { id: addressId } });

    if (!address || address.userId !== userId) {
        throw new HttpError(404, "Endereço não encontrado.");
    }

    await prisma.address.delete({ where: { id: addressId } });
}


// ---------- Recuperar senha ----------

function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Gera um link de redefinição e manda por e-mail.
 * Responde igual exista ou não a conta, para não revelar quem é cadastrado.
 */
async function forgotPassword(email, appUrl) {
    const cleanEmail = normalizeEmail(email);

    if (!EMAIL_REGEX.test(cleanEmail)) {
        throw new HttpError(400, "Informe um e-mail válido.");
    }

    const user = await findByEmail(cleanEmail);

    if (!user) {
        return;
    }

    const token = crypto.randomBytes(32).toString("hex");

    await prisma.user.update({
        where: { id: user.id },
        data: {
            resetTokenHash: hashToken(token),
            resetTokenExpires: new Date(Date.now() + RESET_EXPIRES_MIN * 60 * 1000)
        }
    });

    const link = `${appUrl}/redefinir-senha.html?token=${token}`;

    await emailService.send({
        to: user.email,
        subject: "EasyFood - Redefinir senha",
        text: `Olá, ${user.name}!\n\nPara criar uma nova senha, acesse:\n${link}\n\nO link vale por ${RESET_EXPIRES_MIN} minutos. Se não foi você, ignore este e-mail.`,
        html: `<p>Olá, ${user.name}!</p><p>Para criar uma nova senha, <a href="${link}">clique aqui</a>.</p><p>O link vale por ${RESET_EXPIRES_MIN} minutos. Se não foi você, ignore este e-mail.</p>`
    });
}

async function resetPassword({ token, password }) {
    if (typeof token !== "string" || token.length < 20) {
        throw new HttpError(400, "Link inválido.");
    }

    validatePassword(password);

    const user = await prisma.user.findFirst({
        where: {
            resetTokenHash: hashToken(token),
            resetTokenExpires: { gt: new Date() }
        }
    });

    if (!user) {
        throw new HttpError(400, "Este link é inválido ou expirou. Peça um novo.");
    }

    // O token só vale uma vez
    await prisma.user.update({
        where: { id: user.id },
        data: {
            password: await bcrypt.hash(password, 10),
            resetTokenHash: null,
            resetTokenExpires: null
        }
    });
}

module.exports = {
    JWT_SECRET,
    updateMe,
    changePassword,
    becomeOwner,
    ensureOwnerRole,
    getAddresses,
    addAddress,
    removeAddress,
    forgotPassword,
    resetPassword,
    register,
    login,
    getUserById,
    getPublicProfile,
    updateProfileImage,
    removeProfileImage
};
