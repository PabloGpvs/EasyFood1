const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");
const HttpError = require("./http-error");

// Pasta onde as imagens otimizadas ficam salvas (servida em /uploads pelo app.js)
const UPLOADS_DIR = path.join(__dirname, "../../../uploads");

// Formatos aceitos, conferidos pelo CONTEÚDO do arquivo (não pelo nome nem
// pelo Content-Type, que o cliente pode inventar)
const ALLOWED_FORMATS = ["jpeg", "png", "webp"];

// Proteção contra "bomba de descompressão": um arquivo pequeno que, aberto,
// vira uma imagem gigantesca e derruba o servidor.
const MAX_INPUT_PIXELS = 40_000_000; // ~40 megapixels (ex.: 8000 x 5000)

// Tamanho e formato final por tipo de imagem. Para um novo tipo, basta adicionar aqui.
const PRESETS = {
    users: { width: 400, height: 400 },        // foto de perfil (quadrada)
    dishes: { width: 800, height: 600 },       // foto do prato (4:3)
    restaurants: { width: 600, height: 600 }   // logo/foto do restaurante (quadrada)
};

async function readMetadata(buffer) {
    try {
        return await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    } catch (error) {
        if (/pixel limit/i.test(error.message)) {
            throw new HttpError(413, "A imagem tem resolução grande demais (máximo de 40 megapixels).");
        }

        throw new HttpError(422, "Não foi possível ler a imagem. Envie um arquivo JPEG, PNG ou WebP válido.");
    }
}

/**
 * Valida, otimiza com Sharp e salva uma imagem em disco.
 * Não sabe nada de usuários, pratos ou restaurantes: qualquer módulo pode usar.
 *
 * - confere o formato real do arquivo (JPEG, PNG ou WebP)
 * - corrige a rotação de fotos de celular
 * - recorta/redimensiona para o tamanho do preset (sem ampliar fotos pequenas)
 * - remove metadados (EXIF, GPS...) e converte para WebP
 *
 * @param {Buffer} buffer  conteúdo do arquivo recebido pelo Multer
 * @param {string} folder  "users", "dishes" ou "restaurants"
 * @returns {Promise<string>} caminho público, ex.: /uploads/dishes/abc.webp
 */
async function processAndSave(buffer, folder) {
    const preset = PRESETS[folder];

    if (!preset) {
        throw new Error(`Tipo de imagem desconhecido: ${folder}`);
    }

    const metadata = await readMetadata(buffer);

    if (!ALLOWED_FORMATS.includes(metadata.format)) {
        throw new HttpError(415, "Formato inválido. Envie uma imagem JPEG, PNG ou WebP.");
    }

    let optimized;

    try {
        optimized = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
            .rotate()
            .resize(preset.width, preset.height, {
                fit: "cover",
                position: "attention", // centraliza na parte mais "interessante" da foto
                withoutEnlargement: true
            })
            .webp({ quality: 80, effort: 4 })
            .toBuffer();
    } catch (error) {
        throw new HttpError(422, "Não foi possível processar a imagem. Envie um arquivo JPEG, PNG ou WebP válido.");
    }

    const fileName = `${crypto.randomUUID()}.webp`;
    const dir = path.join(UPLOADS_DIR, folder);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, fileName), optimized);

    return `/uploads/${folder}/${fileName}`;
}

/**
 * Apaga uma imagem salva antes (ao trocar ou remover a foto).
 * Ignora caminhos externos (http://...) e arquivos que já não existem.
 */
async function remove(publicPath) {
    if (!publicPath || !publicPath.startsWith("/uploads/")) {
        return;
    }

    const filePath = path.resolve(UPLOADS_DIR, publicPath.replace("/uploads/", ""));

    if (!filePath.startsWith(UPLOADS_DIR + path.sep)) {
        return; // nunca apaga nada fora da pasta uploads
    }

    await fs.unlink(filePath).catch(() => {});
}

/**
 * Fluxo completo de troca de imagem, igual para qualquer entidade:
 * processa a nova, salva no banco com `saveToDatabase` e só então apaga a antiga.
 * Se o banco falhar, apaga a nova para não deixar arquivo órfão.
 */
async function replace({ buffer, folder, oldPath, saveToDatabase }) {
    const newPath = await processAndSave(buffer, folder);

    try {
        const result = await saveToDatabase(newPath);
        await remove(oldPath);
        return result;
    } catch (error) {
        await remove(newPath);
        throw error;
    }
}

module.exports = {
    UPLOADS_DIR,
    ALLOWED_FORMATS,
    processAndSave,
    replace,
    remove
};
