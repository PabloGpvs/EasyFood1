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


    // ---------- Select com o visual do site ----------
    // A lista de opções do <select> nativo é desenhada pelo sistema (fundo branco).
    // Aqui o <select> continua existindo (valor, eventos "change", formulários),
    // mas fica escondido atrás de um botão + lista no estilo neon.

    const nativo = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
    const nativoIndice = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "selectedIndex");
    let selectId = 0;

    function selectNeon(select) {

        if (select.dataset.neon || select.multiple) return;
        select.dataset.neon = "1";

        const id = `sel-${++selectId}`;
        const caixa = document.createElement("div");
        const botao = document.createElement("button");
        const lista = document.createElement("ul");
        let destaque = -1;

        caixa.className = "sel";
        botao.type = "button";
        botao.className = "sel-botao";
        botao.setAttribute("aria-haspopup", "listbox");
        botao.setAttribute("aria-expanded", "false");
        botao.setAttribute("aria-controls", `${id}-lista`);
        lista.className = "sel-lista";
        lista.id = `${id}-lista`;
        lista.setAttribute("role", "listbox");
        lista.hidden = true;

        // Nome acessível: aria-label do select ou o texto do <label> em volta
        const rotulo = select.getAttribute("aria-label")
            || select.closest("label")?.querySelector("span")?.textContent?.trim();
        if (rotulo) {
            botao.setAttribute("aria-label", rotulo);
            lista.setAttribute("aria-label", rotulo);
        }

        select.parentNode.insertBefore(caixa, select);
        caixa.append(botao, select);
        document.body.appendChild(lista);

        select.classList.add("sel-nativo");
        select.tabIndex = -1;
        select.setAttribute("aria-hidden", "true");

        const opcoes = () => [...select.options];

        function atualizarBotao() {
            const atual = select.options[select.selectedIndex];
            botao.innerHTML = `<span class="sel-texto">${atual ? escaparHtml(atual.textContent) : ""}</span><span class="sel-seta" aria-hidden="true"></span>`;
            caixa.hidden = select.hidden;
            botao.disabled = select.disabled;
        }

        function desenharLista() {
            lista.innerHTML = opcoes().map((opcao, i) => `
<li role="option" id="${id}-op${i}" data-indice="${i}"
    class="${i === select.selectedIndex ? "selecionada" : ""} ${i === destaque ? "ativa" : ""}"
    aria-selected="${i === select.selectedIndex}" ${opcao.disabled ? `aria-disabled="true"` : ""}>${escaparHtml(opcao.textContent)}</li>`).join("");
            if (destaque >= 0) botao.setAttribute("aria-activedescendant", `${id}-op${destaque}`);
        }

        function posicionar() {
            const r = botao.getBoundingClientRect();
            const espacoAbaixo = window.innerHeight - r.bottom;
            const altura = Math.min(lista.scrollHeight, 300);

            lista.style.minWidth = `${r.width}px`;
            lista.style.left = `${Math.min(r.left, window.innerWidth - lista.offsetWidth - 8)}px`;

            if (espacoAbaixo < altura + 12 && r.top > espacoAbaixo) {
                lista.style.top = `${r.top - altura - 6}px`;
                lista.classList.add("acima");
            } else {
                lista.style.top = `${r.bottom + 6}px`;
                lista.classList.remove("acima");
            }
        }

        function abrir() {
            if (botao.disabled || !select.options.length) return;
            destaque = select.selectedIndex;
            desenharLista();
            lista.hidden = false;
            caixa.classList.add("aberto");
            botao.setAttribute("aria-expanded", "true");
            posicionar();
            lista.querySelector(".ativa")?.scrollIntoView({ block: "nearest" });
        }

        function fechar() {
            if (lista.hidden) return;
            lista.hidden = true;
            caixa.classList.remove("aberto");
            botao.setAttribute("aria-expanded", "false");
            botao.removeAttribute("aria-activedescendant");
        }

        function escolher(indice) {
            const opcao = select.options[indice];
            if (!opcao || opcao.disabled) return;

            const mudou = indice !== select.selectedIndex;
            nativoIndice.set.call(select, indice);
            atualizarBotao();
            fechar();
            botao.focus();

            if (mudou) {
                select.dispatchEvent(new Event("input", { bubbles: true }));
                select.dispatchEvent(new Event("change", { bubbles: true }));
            }
        }

        function mover(passo) {
            const todas = opcoes();
            let i = destaque;
            do {
                i = Math.max(0, Math.min(todas.length - 1, i + passo));
            } while (todas[i]?.disabled && i > 0 && i < todas.length - 1);
            destaque = i;
            desenharLista();
            lista.querySelector(".ativa")?.scrollIntoView({ block: "nearest" });
        }

        botao.addEventListener("click", evento => {
            evento.preventDefault();
            lista.hidden ? abrir() : fechar();
        });

        botao.addEventListener("keydown", evento => {
            const aberta = !lista.hidden;

            if (["ArrowDown", "ArrowUp"].includes(evento.key)) {
                evento.preventDefault();
                aberta ? mover(evento.key === "ArrowDown" ? 1 : -1) : abrir();
            } else if (evento.key === "Home" || evento.key === "End") {
                if (!aberta) return;
                evento.preventDefault();
                destaque = evento.key === "Home" ? 0 : select.options.length - 1;
                desenharLista();
            } else if ((evento.key === "Enter" || evento.key === " ") && aberta) {
                evento.preventDefault();
                escolher(destaque);
            } else if (evento.key === "Escape" && aberta) {
                evento.preventDefault();
                evento.stopPropagation();
                fechar();
            } else if (evento.key === "Tab") {
                fechar();
            }
        });

        lista.addEventListener("mousedown", evento => evento.preventDefault());
        lista.addEventListener("click", evento => {
            const item = evento.target.closest("li[data-indice]");
            if (item) escolher(Number(item.dataset.indice));
        });
        lista.addEventListener("mousemove", evento => {
            const item = evento.target.closest("li[data-indice]");
            if (item && Number(item.dataset.indice) !== destaque) {
                destaque = Number(item.dataset.indice);
                lista.querySelectorAll("li").forEach(li => li.classList.toggle("ativa", li === item));
            }
        });

        document.addEventListener("click", evento => {
            if (!caixa.contains(evento.target) && !lista.contains(evento.target)) fechar();
        });
        window.addEventListener("resize", fechar);
        window.addEventListener("scroll", evento => {
            if (!lista.contains(evento.target)) fechar();
        }, true);

        // Quem muda o select por código (select.value = ...) também atualiza o botão
        Object.defineProperty(select, "value", {
            get() { return nativo.get.call(this); },
            set(valor) { nativo.set.call(this, valor); atualizarBotao(); },
            configurable: true
        });
        Object.defineProperty(select, "selectedIndex", {
            get() { return nativoIndice.get.call(this); },
            set(indice) { nativoIndice.set.call(this, indice); atualizarBotao(); },
            configurable: true
        });

        // Opções preenchidas depois (fetch) ou select escondido/mostrado
        new MutationObserver(() => {
            atualizarBotao();
            if (!lista.hidden) desenharLista();
        }).observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "disabled"] });

        select.addEventListener("change", atualizarBotao);
        select.form?.addEventListener("reset", () => setTimeout(atualizarBotao));

        atualizarBotao();
    }

    function escaparHtml(texto) {
        return String(texto).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    function prepararSelects() {
        document.querySelectorAll("select").forEach(selectNeon);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", prepararSelects);
    } else {
        prepararSelects();
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
        confirmar,
        selectNeon
    };
})();
