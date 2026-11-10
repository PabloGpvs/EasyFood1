const multer = require("multer");

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = Number(process.env.UPLOAD_MAX_SIZE_MB) || 5;

// memoryStorage: o arquivo fica em req.file.buffer e só é gravado em disco
// depois de otimizado pelo image.service.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_SIZE_MB * 1024 * 1024,
        files: 1
    },
    fileFilter(req, file, cb) {
        if (!ALLOWED_TYPES.includes(file.mimetype)) {
            const error = new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname);
            error.message = "Formato inválido. Envie uma imagem JPEG, PNG ou WebP.";
            error.invalidType = true;
            return cb(error);
        }

        cb(null, true);
    }
});

/**
 * Middleware que recebe UMA imagem no campo informado (padrão: "image")
 * e transforma os erros do Multer em respostas HTTP claras.
 */
function uploadImage(fieldName = "image") {
    const handler = upload.single(fieldName);

    return (req, res, next) => {
        handler(req, res, error => {
            if (error) {
                if (error.code === "LIMIT_FILE_SIZE") {
                    return res.status(413).json({
                        error: `A imagem deve ter no máximo ${MAX_SIZE_MB} MB.`
                    });
                }

                if (error.invalidType) {
                    return res.status(415).json({ error: error.message });
                }

                if (error instanceof multer.MulterError) {
                    return res.status(400).json({
                        error: `Envie uma única imagem no campo "${fieldName}".`
                    });
                }

                return next(error);
            }

            if (!req.file) {
                return res.status(400).json({
                    error: `Nenhuma imagem enviada. Use o campo "${fieldName}" (multipart/form-data).`
                });
            }

            next();
        });
    };
}

module.exports = {
    uploadImage,
    ALLOWED_TYPES,
    MAX_SIZE_MB
};
