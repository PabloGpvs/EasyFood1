// Avisos (toasts) e janela de confirmação do EasyFood, no lugar de
// alert() e confirm() do navegador.

const UI = (() => {
    const CHAVE_FLASH = "easyfood:aviso";
    let pilha;

    function container() {
        if (!pilha) {
            pilha = document.createElement("div");
            pilha.className = "toast-stack";
            pilha.setAttribute("aria-live", "polite");
            document.body.appendChild(pilha);
        }

        return pilha;
    }

    /**
     * Mostra um aviso no canto da tela.
     * @param {string} mensagem
     * @param {"sucesso"|"erro"|"info"} tipo
     */
    function aviso(mensagem, tipo = "info") {
        const toast = document.createElement("div");
        toast.className = `toast toast-${tipo}`;
        toast.setAttribute("role", tipo === "erro" ? "alert" : "status");

        const icone = { sucesso: "✓", erro: "!", info: "i" }[tipo] || "i";

        toast.innerHTML = `<span class="toast-icon">${icone}</span><span class="toast-text"></span><button class="toast-close" aria-label="Fechar">×</button>`;
        toast.querySelector(".toast-text").textContent = mensagem;

        const fechar = () => {
            toast.classList.add("saindo");
            setTimeout(() => toast.remove(), 250);
        };

        toast.querySelector(".toast-close").addEventListener("click", fechar);
        container().appendChild(toast);

        setTimeout(fechar, tipo === "erro" ? 6000 : 4000);
    }

    const sucesso = mensagem => aviso(mensagem, "sucesso");
    const erro = mensagem => aviso(mensagem instanceof Error ? mensagem.message : mensagem, "erro");
    const info = mensagem => aviso(mensagem, "info");

    /** Guarda um aviso para mostrar depois de mudar de página. */
    function avisoNaProximaPagina(mensagem, tipo = "sucesso") {
        sessionStorage.setItem(CHAVE_FLASH, JSON.stringify({ mensagem, tipo }));
    }

    function mostrarAvisoPendente() {
        const salvo = sessionStorage.getItem(CHAVE_FLASH);

        if (!salvo) return;

        sessionStorage.removeItem(CHAVE_FLASH);

        try {
            const { mensagem, tipo } = JSON.parse(salvo);
            aviso(mensagem, tipo);
        } catch {
            // ignora aviso corrompido
        }
    }

    /**
     * Pergunta antes de uma ação. Retorna uma Promise<boolean>.
     * @param {string} mensagem
     * @param {{ confirmar?: string, perigo?: boolean }} opcoes
     */
    function confirmar(mensagem, { confirmar: textoConfirmar = "Confirmar", perigo = false } = {}) {
        return new Promise(resolve => {
            const fundo = document.createElement("div");
            fundo.className = "modal-backdrop";

            fundo.innerHTML = `
<div class="modal" role="dialog" aria-modal="true">
    <p class="modal-text"></p>
    <div class="modal-actions">
        <button class="modal-cancel">Cancelar</button>
        <button class="modal-ok ${perigo ? "perigo" : ""}"></button>
    </div>
</div>`;

            fundo.querySelector(".modal-text").textContent = mensagem;
            fundo.querySelector(".modal-ok").textContent = textoConfirmar;

            const responder = valor => {
                document.removeEventListener("keydown", teclado);
                fundo.remove();
                resolve(valor);
            };

            const teclado = evento => {
                if (evento.key === "Escape") responder(false);
            };

            fundo.querySelector(".modal-cancel").addEventListener("click", () => responder(false));
            fundo.querySelector(".modal-ok").addEventListener("click", () => responder(true));
            fundo.addEventListener("click", evento => {
                if (evento.target === fundo) responder(false);
            });
            document.addEventListener("keydown", teclado);

            document.body.appendChild(fundo);
            fundo.querySelector(".modal-ok").focus();
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mostrarAvisoPendente);
    } else {
        mostrarAvisoPendente();
    }

    return {
        aviso,
        sucesso,
        erro,
        info,
        avisoNaProximaPagina,
        confirmar
    };
})();
