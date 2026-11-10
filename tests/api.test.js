// Testes automáticos da API do EasyFood.
//
// Como rodar:  npm test
// Precisa do banco configurado no .env e do seed aplicado (npm run seed),
// porque usa o dono de exemplo pizza@easyfood.com (senha 123456).
//
// O teste sobe o servidor na porta 3099, cria um restaurante e pratos
// temporários, testa e apaga tudo no final. Ele não cria pedidos no banco
// (os pedidos testados são recusados de propósito pelas regras de negócio).

const { spawn } = require("child_process");
const path = require("path");
const sharp = require("sharp");

const PORT = 3099;
const B = `http://localhost:${PORT}`;
const root = path.join(__dirname, "..");
const DONO = { email: "pizza@easyfood.com", password: "123456" };

let ok = 0;
let falhas = 0;

function check(nome, cond, extra = "") {
    if (cond) {
        ok++;
        console.log("  OK   ", nome, extra);
    } else {
        falhas++;
        console.log("  FALHA", nome, extra);
    }
}

function secao(titulo) {
    console.log(`\n${titulo}`);
}

async function req(method, url, { token, json, form } = {}) {
    const headers = {};
    let body;

    if (token) headers.Authorization = `Bearer ${token}`;
    if (json) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(json);
    }
    if (form) body = form;

    const r = await fetch(B + url, { method, headers, body });
    const text = await r.text();
    let data;

    try {
        data = JSON.parse(text);
    } catch {
        data = text;
    }

    return { status: r.status, data, headers: r.headers };
}

function arquivo(buf, nome, tipo) {
    const f = new FormData();
    f.append("image", new Blob([buf], { type: tipo }), nome);
    return f;
}

async function esperarServidor() {
    for (let i = 0; i < 40; i++) {
        try {
            await fetch(B + "/restaurants/categories");
            return;
        } catch {
            await new Promise(r => setTimeout(r, 250));
        }
    }
    throw new Error("O servidor não subiu na porta " + PORT);
}

async function main() {
    const server = spawn(process.execPath, ["server.js"], {
        cwd: root,
        env: { ...process.env, PORT: String(PORT) },
        stdio: ["ignore", "pipe", "pipe"]
    });

    let logServidor = "";
    server.stdout.on("data", d => { logServidor += d; });
    server.stderr.on("data", d => { logServidor += d; });

    let token;
    let rid;
    const pratos = [];
    let perfilTinhaFoto = true;

    try {
        await esperarServidor();

        const jpg = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: "#d33" } }).jpeg().toBuffer();
        const png = await sharp({ create: { width: 900, height: 900, channels: 4, background: "#3d3" } }).png().toBuffer();
        const gif = await sharp({ create: { width: 200, height: 200, channels: 3, background: "#33c" } }).gif().toBuffer();

        // ------------------------------------------------------------
        secao("Preparação");

        const login = await req("POST", "/auth/login", { json: DONO });
        check("login do dono de exemplo", login.status === 200, login.status === 200 ? "" : "(rode npm run seed)");
        token = login.data.token;

        if (!token) {
            throw new Error("Sem login não dá para continuar.");
        }

        perfilTinhaFoto = Boolean(login.data.user.imageUrl);

        const rest = await req("POST", "/restaurants", { token, json: { name: `Teste Automático ${Date.now()}`, category: "Teste" } });
        check("cria restaurante temporário", rest.status === 201, rest.status);
        rid = rest.data.id;

        // ------------------------------------------------------------
        secao("Atividade 8 (Parte 5)");

        const prato = await req("POST", `/restaurants/${rid}/dishes`, { token, json: { name: "Prato Teste", description: "teste", price: 10.5, category: "Teste" } });
        check("1. cadastrar prato -> 201", prato.status === 201, prato.status);
        pratos.push(prato.data.id);
        const pratoId = prato.data.id;

        const perfil = await req("POST", "/auth/me/image", { token, form: arquivo(jpg, "perfil.jpg", "image/jpeg") });
        check("2. foto do perfil vinculada", perfil.status === 200 && /^\/uploads\/users\//.test(perfil.data.imageUrl));

        const fotoPrato = await req("POST", `/dishes/${pratoId}/image`, { token, form: arquivo(png, "prato.png", "image/png") });
        check("3. foto do prato vinculada", fotoPrato.status === 200 && /^\/uploads\/dishes\//.test(fotoPrato.data.imageUrl));

        const me = await req("GET", "/auth/me", { token });
        const menu = await req("GET", `/restaurants/${rid}/dishes`);
        const noMenu = menu.data.find(d => d.id === pratoId);
        check("4. consulta retorna o caminho (perfil e cardápio)", me.data.imageUrl === perfil.data.imageUrl && noMenu?.imageUrl === fotoPrato.data.imageUrl);

        const img = await fetch(B + fotoPrato.data.imageUrl);
        const meta = await sharp(Buffer.from(await img.arrayBuffer())).metadata();
        check("5. URL da imagem abre (WebP 800x600)", img.status === 200 && meta.format === "webp" && meta.width === 800);

        const semJwt = await req("POST", "/auth/me/image", { form: arquivo(jpg, "a.jpg", "image/jpeg") });
        const semJwt2 = await req("POST", `/dishes/${pratoId}/image`, { form: arquivo(jpg, "a.jpg", "image/jpeg") });
        check("6. sem JWT -> 401", semJwt.status === 401 && semJwt2.status === 401);

        const pdf = await req("POST", "/auth/me/image", { token, form: arquivo(Buffer.from("%PDF-1.4"), "a.pdf", "application/pdf") });
        const falso = await req("POST", "/auth/me/image", { token, form: arquivo(Buffer.from("nao sou imagem"), "a.jpg", "image/jpeg") });
        const grande = await req("POST", "/auth/me/image", { token, form: arquivo(Buffer.alloc(6 * 1024 * 1024, 1), "g.jpg", "image/jpeg") });
        check("7. arquivo inválido -> 415 / 422 / 413", pdf.status === 415 && falso.status === 422 && grande.status === 413, `${pdf.status} ${falso.status} ${grande.status}`);

        const inexistente = await req("POST", "/dishes/999999/image", { token, form: arquivo(jpg, "a.jpg", "image/jpeg") });
        check("8. prato inexistente -> 404", inexistente.status === 404);

        // ------------------------------------------------------------
        secao("Imagens");

        const gifFalso = await req("POST", `/dishes/${pratoId}/image`, { token, form: arquivo(gif, "falso.jpg", "image/jpeg") });
        check("GIF disfarçado de JPEG -> 415", gifFalso.status === 415);

        const removerPrato = await req("DELETE", `/dishes/${pratoId}/image`, { token });
        const antiga = await fetch(B + fotoPrato.data.imageUrl);
        check("remover foto do prato apaga o arquivo", removerPrato.data.imageUrl === null && antiga.status === 404);

        const fotoRest = await req("POST", `/restaurants/${rid}/image`, { token, form: arquivo(jpg, "r.jpg", "image/jpeg") });
        check("foto do restaurante", fotoRest.status === 200 && /^\/uploads\/restaurants\//.test(fotoRest.data.imageUrl));

        const cache = await fetch(B + fotoRest.data.imageUrl, { method: "HEAD" });
        check("imagens com cache", /max-age/.test(cache.headers.get("cache-control") || ""));

        // ------------------------------------------------------------
        secao("Segurança");

        const cliente = await req("POST", "/auth/register", { json: { name: "Cliente Teste", email: `teste${Date.now()}@teste.com`, password: "segredo1" } });
        check("cadastro de cliente", cliente.status === 201 && cliente.data.role === "CLIENTE");

        const loginCli = await req("POST", "/auth/login", { json: { email: cliente.data.email, password: "segredo1" } });
        const tokenCli = loginCli.data.token;

        const semLogin = await req("PUT", `/restaurants/${rid}`, { json: { name: "Hack" } });
        const outro = await req("PUT", `/restaurants/${rid}`, { token: tokenCli, json: { name: "Hack" } });
        const outroDel = await req("DELETE", `/restaurants/${rid}`, { token: tokenCli });
        check("editar/excluir restaurante só o dono", semLogin.status === 401 && outro.status === 403 && outroDel.status === 403);

        const clienteCriaRest = await req("POST", "/restaurants", { token: tokenCli, json: { name: "Loja", category: "Teste" } });
        check("cliente não cadastra restaurante (403)", clienteCriaRest.status === 403);

        const lista = await req("GET", "/users", { token });
        const publico = await req("GET", `/users/${login.data.user.id}`);
        check("e-mails não ficam expostos", lista.status === 404 && publico.data.email === undefined);

        const cadRuim = await req("POST", "/auth/register", { json: { name: "X", email: "invalido", password: "123" } });
        check("cadastro valida nome, e-mail e senha", cadRuim.status === 400);

        const fake = `naoexiste${Date.now()}@teste.com`;
        let ultimo;
        for (let i = 0; i < 6; i++) {
            ultimo = await req("POST", "/auth/login", { json: { email: fake, password: "errada" } });
        }
        check("login bloqueia após 5 senhas erradas (429)", ultimo.status === 429);

        // ------------------------------------------------------------
        secao("Restaurante e cardápio");

        const config = await req("PUT", `/restaurants/${rid}`, { token, json: { deliveryFee: 5, minOrder: 30, opensAt: "", closesAt: "" } });
        check("configura taxa e pedido mínimo", config.status === 200 && config.data.deliveryFee === 5 && config.data.minOrder === 30);

        const horaRuim = await req("PUT", `/restaurants/${rid}`, { token, json: { opensAt: "25:00", closesAt: "10:00" } });
        check("valida horário de funcionamento", horaRuim.status === 400);

        const busca = await req("GET", `/restaurants?search=${encodeURIComponent("Teste Automático")}`);
        check("busca de restaurantes", busca.data.some(r => r.id === rid));

        const categorias = await req("GET", "/restaurants/categories");
        check("lista de categorias", Array.isArray(categorias.data) && categorias.data.includes("Teste"));

        const meus = await req("GET", "/my-restaurants", { token });
        check("/my-restaurants", meus.data.some(r => r.id === rid));

        const editar = await req("PUT", `/dishes/${pratoId}`, { token, json: { price: 12.34 } });
        check("editar prato", editar.status === 200 && editar.data.price === 12.34);

        // ------------------------------------------------------------
        secao("Regras do pedido (nenhum pedido é criado)");

        const itens = [{ dishId: pratoId, quantity: 1 }];

        const semEndereco = await req("POST", "/orders", { token: tokenCli, json: { items: itens } });
        check("exige endereço", semEndereco.status === 400);

        const pagamentoRuim = await req("POST", "/orders", { token: tokenCli, json: { address: "Rua Teste, 1", paymentMethod: "BOLETO", items: itens } });
        check("valida forma de pagamento", pagamentoRuim.status === 400);

        const abaixoMinimo = await req("POST", "/orders", { token: tokenCli, json: { address: "Rua Teste, 1", items: itens } });
        check("respeita o pedido mínimo", abaixoMinimo.status === 400 && /mínimo/.test(abaixoMinimo.data.error));

        const trocoRuim = await req("POST", "/orders", { token: tokenCli, json: { address: "Rua Teste, 1", paymentMethod: "DINHEIRO", changeFor: 1, items: [{ dishId: pratoId, quantity: 3 }] } });
        check("troco menor que o total é recusado", trocoRuim.status === 400);

        await req("PUT", `/restaurants/${rid}`, { token, json: { minOrder: 0, opensAt: "03:00", closesAt: "03:01" } });
        const fechado = await req("POST", "/orders", { token: tokenCli, json: { address: "Rua Teste, 1", items: itens } });
        const agora = new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
        check("restaurante fechado não recebe pedido", fechado.status === 409 || agora === "03:00");

        await req("PUT", `/restaurants/${rid}`, { token, json: { opensAt: "", closesAt: "" } });
        await req("PUT", `/dishes/${pratoId}`, { token, json: { available: false } });
        const esgotado = await req("POST", "/orders", { token: tokenCli, json: { address: "Rua Teste, 1", items: itens } });
        check("prato esgotado não pode ser pedido", esgotado.status === 409);

        // ------------------------------------------------------------
        secao("Minha conta");

        const nome = await req("PATCH", "/auth/me", { token: tokenCli, json: { name: "Cliente Renomeado" } });
        check("alterar nome", nome.data.name === "Cliente Renomeado");

        const senhaErrada = await req("PUT", "/auth/me/password", { token: tokenCli, json: { currentPassword: "x", newPassword: "outra123" } });
        const senhaOk = await req("PUT", "/auth/me/password", { token: tokenCli, json: { currentPassword: "segredo1", newPassword: "outra123" } });
        check("trocar senha confere a senha atual", senhaErrada.status === 400 && senhaOk.status === 204);

        const endereco = await req("POST", "/auth/me/addresses", { token: tokenCli, json: { label: "Casa", street: "Rua das Flores, 100" } });
        const enderecos = await req("GET", "/auth/me/addresses", { token: tokenCli });
        const remover = await req("DELETE", `/auth/me/addresses/${endereco.data.id}`, { token: tokenCli });
        check("endereços salvos (criar, listar, remover)", endereco.status === 201 && enderecos.data.length === 1 && remover.status === 204);

        const virarDono = await req("POST", "/auth/me/become-owner", { token: tokenCli });
        check("cliente ativa o modo restaurante", virarDono.data.role === "DONO");

        // ------------------------------------------------------------
        secao("Recuperar senha");

        const esqueci = await req("POST", "/auth/forgot-password", { json: { email: cliente.data.email } });
        const esqueciInexistente = await req("POST", "/auth/forgot-password", { json: { email: "ninguem@teste.com" } });
        check("resposta igual exista ou não a conta", esqueci.status === 200 && esqueciInexistente.data.message === esqueci.data.message);

        await new Promise(r => setTimeout(r, 300));
        const link = (logServidor.match(/redefinir-senha\.html\?token=(\w+)/g) || []).pop();

        if (link && !process.env.SMTP_HOST) {
            const resetToken = link.split("token=")[1];
            const reset = await req("POST", "/auth/reset-password", { json: { token: resetToken, password: "novaSenha1" } });
            const reuso = await req("POST", "/auth/reset-password", { json: { token: resetToken, password: "novaSenha2" } });
            const loginNova = await req("POST", "/auth/login", { json: { email: cliente.data.email, password: "novaSenha1" } });
            check("redefinir senha pelo link (uso único)", reset.status === 200 && reuso.status === 400 && loginNova.status === 200);
        } else {
            console.log("  (SMTP configurado: o link foi por e-mail, teste de redefinição pulado)");
        }

        // ------------------------------------------------------------
        secao("Tempo real e páginas");

        const sse = await fetch(`${B}/events?token=${token}`);
        const leitor = sse.body.getReader();
        const { value } = await leitor.read();
        await leitor.cancel();
        check("conexão de tempo real (/events)", sse.status === 200 && new TextDecoder().decode(value).includes("conectado"));

        const sseSemToken = await fetch(`${B}/events`);
        check("tempo real exige token", sseSemToken.status === 401);

        for (const pagina of ["/", "/painel.html", "/pedidos.html", "/conta.html", "/esqueci-senha.html", "/redefinir-senha.html", "/js/app.js", "/js/ui.js"]) {
            const r = await fetch(B + pagina);
            check(`página ${pagina}`, r.status === 200);
        }

    } catch (e) {
        falhas++;
        console.log("ERRO", e);
    } finally {
        // ------------------------------------------------------------
        secao("Limpeza");

        if (token) {
            for (const id of pratos) {
                await req("DELETE", `/dishes/${id}`, { token });
            }

            if (rid) {
                const del = await req("DELETE", `/restaurants/${rid}`, { token });
                console.log("  restaurante temporário removido ->", del.status);
            }

            if (!perfilTinhaFoto) {
                await req("DELETE", "/auth/me/image", { token });
            }
        }

        server.kill();

        console.log(`\nRESULTADO: ${ok} ok, ${falhas} falhas`);
        process.exitCode = falhas ? 1 : 0;
    }
}

main();
