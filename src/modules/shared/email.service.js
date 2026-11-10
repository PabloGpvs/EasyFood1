const nodemailer = require("nodemailer");

/**
 * Envio de e-mails, compartilhado por qualquer módulo.
 *
 * Com SMTP configurado no .env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
 * SMTP_FROM), envia de verdade. Sem configuração (desenvolvimento), só mostra
 * o e-mail no terminal do servidor, para dar para testar sem conta de e-mail.
 */
let transporter = null;

function getTransporter() {
    if (!process.env.SMTP_HOST) {
        return null;
    }

    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: Number(process.env.SMTP_PORT) === 465,
            auth: process.env.SMTP_USER
                ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
                : undefined
        });
    }

    return transporter;
}

async function send({ to, subject, text, html }) {
    const transport = getTransporter();

    if (!transport) {
        console.log("\n========== E-MAIL (modo desenvolvimento, não enviado) ==========");
        console.log(`Para: ${to}`);
        console.log(`Assunto: ${subject}`);
        console.log(text);
        console.log("================================================================\n");
        return { simulated: true };
    }

    await transport.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        text,
        html
    });

    return { simulated: false };
}

module.exports = { send };
