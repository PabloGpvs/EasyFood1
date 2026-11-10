// Estrutura comum das telas internas: barra lateral (no celular, barra
// inferior) com os atalhos certos para quem está logado, é dono ou visitante.
// Depende de js/app.js. Use: <body data-pagina="inicio"> e carregue este arquivo.

const Shell = (() => {
    const ICONES = {
        inicio: '<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
        pedidos: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3"/>',
        conta: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
        painel: '<path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z"/>',
        entrar: '<path d="M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5M10 8l4 4-4 4M14 12H3"/>',
        criar: '<circle cx="10" cy="8" r="4"/><path d="M3 21c1.3-3.6 4-5.5 7-5.5M18 14v7M14.5 17.5h7"/>',
        sair: '<path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5M14 8l4 4-4 4M18 12H8"/>'
    };

    function icone(nome) {
        return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome]}</svg>`;
    }

    function itens() {
        const usuario = App.usuario();

        if (!App.logado()) {
            return [
                { id: "inicio", rotulo: "Início", href: "/" },
                { id: "entrar", rotulo: "Entrar", acao: () => App.irParaLogin() },
                { id: "criar", rotulo: "Criar conta", href: "/cadastro.html" }
            ];
        }

        const lista = [
            { id: "inicio", rotulo: "Início", href: "/" },
            { id: "pedidos", rotulo: "Pedidos", href: "/pedidos.html" },
            { id: "conta", rotulo: "Conta", href: "/conta.html" }
        ];

        if (["DONO", "ADMIN"].includes(usuario?.role)) {
            lista.push({ id: "painel", rotulo: "Painel", href: "/painel.html" });
        }

        return lista;
    }

    function avatar() {
        const usuario = App.usuario();

        if (!usuario) return "";

        const conteudo = usuario.imageUrl
            ? `<img src="${App.escapar(usuario.imageUrl)}" alt="">`
            : `<span>${App.escapar((usuario.name || "?").charAt(0).toUpperCase())}</span>`;

        return `<a class="nav-avatar" href="/conta.html" title="${App.escapar(usuario.name)}">${conteudo}</a>`;
    }

    function montar() {
        const pagina = document.body.dataset.pagina || "";

        const nav = document.createElement("nav");
        nav.className = "shell-nav";
        nav.setAttribute("aria-label", "Navegação principal");

        nav.innerHTML = `
<a class="nav-logo" href="/" aria-label="EasyFood, início">
    <span class="nav-logo-mark">EF</span>
</a>
<ul class="nav-list">
    ${itens().map(item => `
    <li>
        ${item.href
            ? `<a class="nav-item ${item.id === pagina ? "ativo" : ""}" href="${item.href}" ${item.id === pagina ? 'aria-current="page"' : ""}>`
            : `<button class="nav-item" data-acao="${item.id}">`}
            ${icone(item.id)}
            <span>${item.rotulo}</span>
        ${item.href ? "</a>" : "</button>"}
    </li>`).join("")}
</ul>
<div class="nav-bottom">
    ${avatar()}
    ${App.logado() ? `<button class="nav-item nav-sair" data-acao="sair">${icone("sair")}<span>Sair</span></button>` : ""}
</div>`;

        nav.addEventListener("click", evento => {
            const botao = evento.target.closest("[data-acao]");

            if (!botao) return;

            if (botao.dataset.acao === "sair") App.sair();
            if (botao.dataset.acao === "entrar") App.irParaLogin();
        });

        document.body.classList.add("com-shell");
        document.body.prepend(nav);
    }

    // Atualiza nome/foto/tipo da conta guardados e redesenha a barra
    async function atualizarUsuario() {
        if (!App.logado()) return;

        try {
            const usuario = await App.api("/auth/me", { autenticado: true, seExpirar: "limpar" });
            App.salvarSessao(App.token(), usuario);
        } catch {
            // token expirado: a sessão foi limpa
        }

        redesenhar();
    }

    function redesenhar() {
        document.querySelector(".shell-nav")?.remove();
        montar();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", montar);
    } else {
        montar();
    }

    return { atualizarUsuario, redesenhar };
})();
