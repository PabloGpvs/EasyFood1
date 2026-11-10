// Funções de upload de imagem usadas pelas telas do EasyFood.
// Depende de js/app.js (carregue app.js antes).
// As regras abaixo espelham as do servidor (upload.middleware.js), para avisar
// o usuário antes de enviar. Quem decide de verdade é sempre o servidor.

// Se uma imagem de /uploads não existir mais (arquivo apagado, banco restaurado...),
// troca o ícone de "imagem quebrada" por um espaço reservado.
document.addEventListener("error", evento => {
    const img = evento.target;

    if (img.tagName !== "IMG" || !img.src.includes("/uploads/")) {
        return;
    }

    // Mantém as classes da imagem, para o espaço reservado ocupar o mesmo lugar
    const reserva = document.createElement("span");
    reserva.className = `${img.className} photo-empty`.trim();
    reserva.textContent = img.dataset.emoji || "🍽️";
    img.replaceWith(reserva);
}, true);

const Imagens = (() => {
    const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
    const LIMITE_MB = 5;

    function token() {
        return localStorage.getItem("token");
    }

    /** Retorna uma mensagem de erro, ou null se o arquivo pode ser enviado. */
    function validar(arquivo) {
        if (!arquivo) {
            return "Escolha uma imagem.";
        }

        if (!TIPOS_ACEITOS.includes(arquivo.type)) {
            return "Formato inválido. Use JPEG, PNG ou WebP.";
        }

        if (arquivo.size > LIMITE_MB * 1024 * 1024) {
            return `A imagem deve ter no máximo ${LIMITE_MB} MB.`;
        }

        return null;
    }

    /** Mostra a imagem escolhida num <img> antes de enviar. */
    function mostrarPrevia(arquivo, img) {
        if (img.dataset.previa) {
            URL.revokeObjectURL(img.dataset.previa);
        }

        const url = URL.createObjectURL(arquivo);
        img.dataset.previa = url;
        img.src = url;
        img.hidden = false;
    }

    async function lerResposta(resposta) {
        const texto = await resposta.text();

        try {
            return texto ? JSON.parse(texto) : {};
        } catch {
            return {};
        }
    }

    /**
     * Envia uma imagem (multipart/form-data, campo "image").
     * Retorna o objeto atualizado (usuário, prato ou restaurante).
     */
    async function enviar(url, arquivo) {
        const erro = validar(arquivo);

        if (erro) {
            throw new Error(erro);
        }

        const form = new FormData();
        form.append("image", arquivo);

        const resposta = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${token()}` },
            body: form
        });

        const dados = await lerResposta(resposta);

        if (resposta.status === 401) {
            App.sessaoExpirada();
            throw new Error("Sua sessão expirou. Faça login novamente.");
        }

        if (!resposta.ok) {
            throw new Error(dados.error || "Não foi possível enviar a imagem.");
        }

        return dados;
    }

    async function remover(url) {
        const resposta = await fetch(url, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token()}` }
        });

        const dados = await lerResposta(resposta);

        if (!resposta.ok) {
            throw new Error(dados.error || "Não foi possível remover a imagem.");
        }

        return dados;
    }

    /**
     * Abre o seletor de arquivos e devolve o arquivo escolhido (ou null).
     */
    function escolherArquivo() {
        return new Promise(resolve => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = TIPOS_ACEITOS.join(",");
            input.addEventListener("change", () => resolve(input.files[0] || null));
            input.addEventListener("cancel", () => resolve(null));
            input.click();
        });
    }

    return {
        TIPOS_ACEITOS,
        LIMITE_MB,
        validar,
        mostrarPrevia,
        enviar,
        remover,
        escolherArquivo,
        escapar: App.escapar
    };
})();
