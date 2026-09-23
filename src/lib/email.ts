import { isTestAccount, store } from "@/lib/store";

type Message = { to: string; subject: string; heading: string; lines: string[] };

/**
 * Resultado do envio. Aceito pelo provedor não é o mesmo que entregue na caixa
 * de entrada, por isso nenhuma tela afirma entrega a partir daqui.
 */
export type SendOutcome = "aceito_pelo_provedor" | "dispensado_conta_de_teste" | "sem_configuracao" | "falhou";

/** "Orbe <contato@exemplo.com>" separado em nome e endereço. */
function sender() {
  const raw = process.env.EMAIL_FROM?.trim() || `${store.name} <onboarding@resend.dev>`;
  const parts = raw.match(/^(.*?)\s*<([^>]+)>$/);
  return { name: parts?.[1]?.trim() || store.name, email: (parts?.[2] ?? raw).trim() };
}

/**
 * Envio pelo Brevo, que entrega no endereço de cada pessoa bastando um
 * remetente verificado. Contas de teste são descartadas antes de qualquer
 * chamada ao provedor. Falha aqui não derruba a ação que originou o e-mail.
 */
async function send({ to, subject, heading, lines }: Message): Promise<SendOutcome> {
  if (isTestAccount(to)) {
    console.info(`[email] dispensado: destinatário é conta de teste ("${subject}")`);
    return "dispensado_conta_de_teste";
  }

  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    console.warn(`[email] sem BREVO_API_KEY; nada foi enviado ("${subject}")`);
    return "sem_configuracao";
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: sender(),
        to: [{ email: to }],
        subject,
        htmlContent: render(heading, lines),
        textContent: [heading, "", ...lines, "", footerText].join("\n"),
      }),
    });

    if (!response.ok) {
      console.error(`[email] Brevo recusou "${subject}": HTTP ${response.status}`);
      return "falhou";
    }
    return "aceito_pelo_provedor";
  } catch (error) {
    // Só o tipo do erro: nada de corpo, destinatário ou credencial no registro.
    console.error(`[email] exceção ao enviar "${subject}": ${error instanceof Error ? error.name : "desconhecida"}`);
    return "falhou";
  }
}

const footerText = `${store.name} · ${store.tagline}`;

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function render(heading: string, lines: string[]) {
  const body = lines.map((line) => `<p style="margin:0 0 12px;line-height:1.55">${escape(line)}</p>`).join("");
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f7f5f1;font-family:Arial,sans-serif;color:#20242b">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
<p style="margin:0 0 24px;font-weight:700;color:#343c8f;font-size:18px">${escape(store.name)}</p>
<div style="background:#ffffff;border:1px solid #e4ded4;border-radius:12px;padding:24px">
<h1 style="margin:0 0 16px;font-size:20px">${escape(heading)}</h1>${body}</div>
<p style="margin:24px 0 0;font-size:12px;color:#5e626b;line-height:1.5">${escape(footerText)}</p>
</div></body></html>`;
}

export function sendPasswordReset(to: string, name: string, link: string) {
  return send({
    to,
    subject: `Crie uma nova senha na ${store.name}`,
    heading: "Redefinição de senha",
    lines: [
      `Olá, ${name}.`,
      "Recebemos um pedido para criar uma nova senha para a sua conta. Para continuar, abra o link abaixo:",
      link,
      "O link vale por 1 hora e só pode ser usado uma vez. Se não foi você quem pediu, é só ignorar este e-mail: sua senha atual continua valendo.",
    ],
  });
}
