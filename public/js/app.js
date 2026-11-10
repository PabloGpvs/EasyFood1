// Funções comuns a todas as telas do EasyFood: sessão, chamadas à API,
// formatação de preço e status. Carregue antes dos outros scripts da página.

const App = (() => {
    const CHAVE_TOKEN = "token";
    const CHAVE_USUARIO = "usuario";

    const STATUS_TEXTO = {
        PENDENTE: "Pendente",
        PREPARANDO: "Preparando",
        SAIU_PARA_ENTREGA: "Saiu para entrega",
        ENTREGUE: "Entregue",
        CANCELADO: "Cancelado"
    };

    const PAGAMENTO_TEXTO = {
        PIX: "Pix",
        CARTAO: "Cartão na entrega",
        DINHEIRO: "Dinheiro"
    };

    const formatoPreco = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

    const formatoData = new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
    });

    // ---------- Sessão ----------

    function token() {
        return localStorage.getItem(CHAVE_TOKEN);
    }

    function usuario() {
        try {
            return JSON.parse(localStorage.getItem(CHAVE_USUARIO)) || null;
        } catch {
            return null;
        }
    }

    function logado() {
        return Boolean(token());
    }

    function salvarSessao(novoToken, novoUsuario) {
        localStorage.setItem(CHAVE_TOKEN, novoToken);
        localStorage.setItem(CHAVE_USUARIO, JSON.stringify(novoUsuario));
    }

    function limparSessao() {
        localStorage.removeItem(CHAVE_TOKEN);
        localStorage.removeItem(CHAVE_USUARIO);
    }

    // Página atual, para voltar a ela depois do login
    function paginaAtual() {
        return window.location.pathname + window.location.search;
    }

    function irParaLogin(motivo) {
        const params = new URLSearchParams({ voltar: paginaAtual() });

        if (motivo) {
            params.set("motivo", motivo);
        }

        window.location.href = `/login.html?${params}`;
    }

    /** Se não estiver logado, manda para o login e retorna false. */
    function exigirLogin() {
        if (logado()) {
            return true;
        }

        irParaLogin("entrar");
        return false;
    }

    function sessaoExpirada() {
        limparSessao();
        irParaLogin("expirou");
    }

    function sair() {
        limparSessao();
        window.location.href = "/";
    }

    // Só aceita caminhos do próprio site (evita redirecionar para outro domínio)
    function destinoSeguro(caminho) {
        return typeof caminho === "string" && caminho.startsWith("/") && !caminho.startsWith("//")
            ? caminho
            : "/";
    }

    // ---------- API ----------

    /**
     * Chama a API e devolve o JSON. Em erro, lança Error com a mensagem do servidor.
     * Se o token expirou (401 numa chamada autenticada), volta para o login
     * (ou só limpa a sessão, com seExpirar: "limpar").
     */
    async function api(url, { method = "GET", body, autenticado = false, seExpirar = "login" } = {}) {
        const headers = {};

        if (body !== undefined) {
            headers["Content-Type"] = "application/json";
        }

        if (autenticado && !token()) {
            irParaLogin("entrar");
            throw new Error("Você precisa estar logado.");
        }

        if (token()) {
            headers.Authorization = `Bearer ${token()}`;
        }

        const resposta = await fetch(url, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined
        });

        const texto = await resposta.text();
        let dados = {};

        try {
            dados = texto ? JSON.parse(texto) : {};
        } catch {
            dados = {};
        }

        if (resposta.status === 401 && headers.Authorization) {
            // "limpar": só desloga (ex.: página inicial); "login": leva para o login
            if (seExpirar === "limpar") {
                limparSessao();
            } else {
                sessaoExpirada();
            }
            throw new Error("Sua sessão expirou. Faça login novamente.");
        }

        if (!resposta.ok) {
            const erro = new Error(dados.error || "Algo deu errado. Tente novamente.");
            erro.status = resposta.status;
            throw erro;
        }

        return dados;
    }

    // ---------- Formatação ----------

    function preco(valor) {
        return formatoPreco.format(Number(valor) || 0);
    }

    function data(valor) {
        return formatoData.format(new Date(valor));
    }

    function statusTexto(status) {
        return STATUS_TEXTO[status] || status;
    }

    function pagamentoTexto(metodo) {
        return PAGAMENTO_TEXTO[metodo] || metodo;
    }

    /** "★★★★☆" para uma nota de 1 a 5 */
    function estrelas(nota) {
        const cheias = Math.round(Number(nota) || 0);
        return "★".repeat(cheias) + "☆".repeat(5 - cheias);
    }

    /** Texto curto da nota: "★ 4,8 (12)" ou "Novo" */
    function notaResumo(restaurante) {
        if (!restaurante.ratingCount) {
            return "Novo";
        }

        return `★ ${restaurante.ratingAvg.toLocaleString("pt-BR")} (${restaurante.ratingCount})`;
    }

    // ---------- Tempo real ----------

    /**
     * Fica ouvindo o servidor (Server-Sent Events) e chama aoReceber a cada
     * pedido criado ou atualizado. Retorna a conexão (ou null sem login).
     */
    function ouvirPedidos(aoReceber) {
        if (!token() || !window.EventSource) {
            return null;
        }

        const fonte = new EventSource(`/events?token=${encodeURIComponent(token())}`);

        fonte.addEventListener("pedido", evento => {
            try {
                aoReceber(JSON.parse(evento.data));
            } catch {
                // evento inválido: ignora
            }
        });

        return fonte;
    }

    /** Evita que textos com < > " quebrem o HTML montado com template strings. */
    function escapar(texto) {
        return String(texto ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    return {
        STATUS_TEXTO,
        PAGAMENTO_TEXTO,
        token,
        usuario,
        logado,
        salvarSessao,
        limparSessao,
        exigirLogin,
        irParaLogin,
        sessaoExpirada,
        sair,
        destinoSeguro,
        api,
        preco,
        data,
        statusTexto,
        pagamentoTexto,
        estrelas,
        notaResumo,
        ouvirPedidos,
        escapar
    };
})();
