# ADR 002 — Segurança e funcionalidades do site

**Status:** aceito
**Data:** 10/11/2026

## Contexto

Revisando o EasyFood depois da Atividade 8, apareceram falhas de segurança e coisas que faltavam para o site ser usável de ponta a ponta.

## Problemas corrigidos

| Problema | Correção |
| --- | --- |
| Qualquer pessoa (até sem login) podia editar ou excluir qualquer restaurante | `PUT`/`DELETE /restaurants/:id` exigem JWT e o service confere se o usuário é o dono (`403`) |
| `GET /users` listava o e-mail de todos os usuários | Rota removida. `GET /users/:id` devolve só nome e foto |
| `GET /orders/:id` mostrava qualquer pedido a qualquer usuário logado | Só o cliente do pedido ou o dono do restaurante |
| Cadastro aceitava qualquer e-mail e senha | E-mail válido, senha com 6+ caracteres, nome com 2+ letras; e-mail salvo em minúsculas |
| Login permitia tentar senhas sem limite | 5 senhas erradas para o mesmo e-mail/IP bloqueiam por 15 min (`429` + `Retry-After`) |
| Pedido podia misturar restaurantes | Recusado (`400`) |
| Pedido finalizado podia mudar de status | Entregue/cancelado não muda mais (`409`) |
| Painel apagava o status escolhido a cada 5 s | A lista só é redesenhada quando algo muda |
| Nomes com aspas quebravam o botão "Adicionar" | O botão usa só o id; textos passam por `escapar()` |

## Funcionalidades novas

- **Sessão no front** (`public/js/app.js`): o menu mostra "Entrar/Criar conta" ou as opções de quem está logado. Token expirado leva ao login com aviso e volta para a página onde a pessoa estava. Depois do cadastro, a pessoa já entra direto.
- **Busca e filtro** de restaurantes (`?search=` e `?category=`).
- **Carrinho** salvo no navegador por restaurante. Ao voltar, remove pratos excluídos ou esgotados e atualiza preços.
- **Endereço e observação** no pedido (migration `pedidos_e_disponibilidade`).
- **Meus pedidos:** atualiza sozinho, mostra restaurante, endereço e data, e permite **cancelar** enquanto estiver pendente.
- **Prato esgotado** (`available`): continua no cardápio, mas não pode ser pedido.
- **Painel:**
  - escolha entre os restaurantes do dono;
  - formulário para editar e excluir o restaurante (no lugar dos `prompt()`);
  - editar prato;
  - marcar como esgotado;
  - filtro de pedidos por status, com contagem;
  - destaque e aviso no título da aba quando chega pedido novo.
- **Preços no formato brasileiro** (`Intl.NumberFormat`): R$ 49,90.

## Decisões

- A conferência de dono fica no **service** (`findOwnedRestaurant`), não na rota: a regra de negócio vale para qualquer rota que a use.
- O limitador de login é em memória (`shared/rate-limit.js`), sem dependência nova. Ele zera quando o servidor reinicia; num sistema com vários servidores, o lugar dele seria um Redis.
- O front ganhou o `js/app.js` com sessão, chamadas à API e formatação, do mesmo jeito que o back tem `shared/`. As telas ficam só com o que é delas.
