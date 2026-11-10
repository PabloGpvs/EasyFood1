# ADR 003 — Conta, pagamento, avaliações e tempo real

**Status:** aceito
**Data:** 10/11/2026

## Contexto

Com a Atividade 8 entregue, o EasyFood ainda não tinha o mínimo de um app de delivery: forma de pagamento, taxa de entrega, horário de funcionamento, avaliações, recuperação de senha e separação entre cliente e dono de restaurante.

## Decisões

### Tipo de conta (`User.role`)
`CLIENTE` ou `DONO`. Só `DONO` cadastra restaurante. A conferência fica no `restaurant.service`, e não na rota, porque é uma regra de negócio. Quem já tinha restaurante virou `DONO` na migration. Um cliente pode ativar o modo restaurante em "Minha conta".

### Pagamento na entrega
`Order.paymentMethod` (`PIX`, `CARTAO` ou `DINHEIRO`) e `Order.changeFor` (troco). Não há integração com gateway de pagamento: isso exigiria contrato com um provedor e está fora do escopo da disciplina. O modelo já guarda o necessário para isso no futuro.

### Taxa, pedido mínimo e horário
Ficam no restaurante. Quem calcula o total do pedido é o servidor (`subtotal + deliveryFee`). Ele também confere se o restaurante está aberto e se o subtotal passa do mínimo. O cálculo de "aberto agora" fica em `shared/business-hours.js`, considera o fuso horário e aceita horário que vira a noite. O pedido guarda subtotal e taxa do momento da compra, para o histórico não mudar quando o restaurante alterar os valores.

### Avaliações (`Review`)
Uma avaliação por pedido (`orderId` único), só depois de `ENTREGUE` e só pelo cliente do pedido. A nota média é calculada com `groupBy` na hora de listar os restaurantes.

### Recuperar senha
O token aleatório vai por e-mail, e no banco fica só o **hash** dele (`resetTokenHash`), que vale 30 minutos e uma única vez. A resposta é a mesma exista ou não a conta, para não revelar quem é cadastrado. O `shared/email.service.js` usa Nodemailer com SMTP. Sem SMTP configurado (desenvolvimento), mostra o e-mail no terminal.

### Tempo real com Server-Sent Events
Os services avisam um barramento interno (`shared/events.js`) quando um pedido é criado ou muda de status. A rota `/events` repassa o aviso para quem tem a ver: o cliente do pedido e o dono do restaurante. Escolhemos SSE em vez de WebSocket porque a comunicação é só do servidor para o navegador, e o SSE funciona sobre HTTP comum, sem biblioteca. O `EventSource` não envia cabeçalhos, por isso o token vai na URL. As telas continuam consultando o servidor a cada 30 s, como garantia caso a conexão caia.

Limitação: o barramento fica na memória. Com mais de um servidor, seria preciso um Redis Pub/Sub ou algo parecido, e o mesmo vale para o limitador de login.

### Avisos e confirmações (`public/js/ui.js`)
Os `alert()` e `confirm()` do navegador foram trocados por avisos e janelas no visual do site. Avisos que precisam aparecer depois de mudar de página são guardados no `sessionStorage`.

### Testes (`npm test`)
`tests/api.test.js` sobe o servidor numa porta separada e testa a API de ponta a ponta. Ele cria e apaga um restaurante temporário. Os testes de regras de pedido usam pedidos que são recusados de propósito, então nenhum pedido fica no banco. A cada execução fica um usuário de teste novo, porque a API não tem exclusão de contas.

## O que ficou de fora (e por quê)

- **Pagamento online:** precisa de contrato com um gateway.
- **Imagens num serviço de arquivos (S3 etc.):** precisa de conta na nuvem. O `image.service` concentra o salvamento, então trocar disco por S3 mexe em um arquivo só.
- **Publicar o site (deploy):** depende de conta num serviço de hospedagem.
