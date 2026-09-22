import type { NextRequest } from "next/server";
import type Stripe from "stripe";

import { stripeClient } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Único lugar que confirma pagamento. A volta do navegador não serve: qualquer
 * pessoa pode abrir a URL de sucesso. Aqui a mensagem chega assinada pela
 * Stripe e a assinatura é conferida com o segredo do webhook.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) {
    console.error("[stripe] aviso recebido sem assinatura ou sem STRIPE_WEBHOOK_SECRET");
    return new Response("configuração ausente", { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripeClient().webhooks.constructEventAsync(payload, signature, secret);
  } catch {
    // Assinatura inválida: pode ser tentativa de forjar uma confirmação.
    return new Response("assinatura inválida", { status: 400 });
  }

  const admin = createAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.payment_status !== "paid") return Response.json({ ignorado: session.payment_status });

    const { data, error } = await admin.rpc("confirm_paid_order", {
      p_session: session.id,
      p_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : null,
    });
    if (error) {
      // 500 faz a Stripe tentar de novo; confirmar duas vezes não duplica nada.
      console.error(`[stripe] não confirmei o pedido: ${error.code ?? error.message}`);
      return new Response("falha ao confirmar", { status: 500 });
    }
    console.info(`[stripe] pedido confirmado: ${data ?? "nenhum pedido para essa sessão"}`);
    return Response.json({ pedido: data });
  }

  if (event.type === "checkout.session.expired") {
    const orderId = event.data.object.metadata?.order_id;
    if (orderId) await admin.rpc("release_unpaid_order", { p_order: orderId });
    return Response.json({ liberado: orderId ?? null });
  }

  return Response.json({ recebido: event.type });
}
