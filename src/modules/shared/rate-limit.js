const HttpError = require("./http-error");

/**
 * Limitador simples em memória: conta FALHAS por chave (ex.: IP + e-mail)
 * dentro de uma janela de tempo. Usado no login para dificultar quem tenta
 * adivinhar senhas. Como fica em memória, zera quando o servidor reinicia.
 */
function createFailureLimiter({ maxFailures, windowMs, message }) {
    const attempts = new Map(); // chave -> { count, resetAt }

    function current(key) {
        const entry = attempts.get(key);

        if (!entry || entry.resetAt <= Date.now()) {
            attempts.delete(key);
            return null;
        }

        return entry;
    }

    return {
        /** Lança 429 se a chave já passou do limite. */
        check(key) {
            const entry = current(key);

            if (entry && entry.count >= maxFailures) {
                const minutes = Math.ceil((entry.resetAt - Date.now()) / 60000);
                const error = new HttpError(429, `${message} Tente novamente em ${minutes} min.`);
                error.retryAfter = Math.ceil((entry.resetAt - Date.now()) / 1000);
                throw error;
            }
        },

        fail(key) {
            const entry = current(key) || { count: 0, resetAt: Date.now() + windowMs };
            entry.count++;
            attempts.set(key, entry);
        },

        reset(key) {
            attempts.delete(key);
        }
    };
}

module.exports = { createFailureLimiter };
