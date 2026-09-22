import Stripe from "stripe";

import { store } from "@/lib/store";

/**
 * Cliente da Stripe. Só no servidor: a chave secreta nunca chega ao navegador.
 * O `trim` não é decoração: um espaço ou uma quebra de linha colada junto com a
 * chave torna o cabeçalho HTTP inválido, e o erro que aparece é de conexão, como
 * se a Stripe estivesse fora do ar.
 */
export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY ausente");
  return new Stripe(key, { appInfo: { name: `${store.name} Gestao` } });
}

/** Endereço público do app, usado nos retornos do pagamento. */
export function siteOrigin(hostHeader: string | null) {
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production) return `https://${production}`;
  return `http://${hostHeader ?? "localhost:3000"}`;
}
