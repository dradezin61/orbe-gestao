"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireViewer } from "@/lib/auth";
import { cartItems, clearCart, readCart, writeCart } from "@/lib/cart";
import { errorCodeFrom, type ErrorCode, type SuccessCode } from "@/lib/messages";
import { siteOrigin, stripeClient } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const uuid = z.uuid();
const quantidade = z.coerce.number().int().min(0).max(20);

/** Volta para a página de origem (só caminhos internos) com a mensagem da ação. */
function back(returnTo: FormDataEntryValue | null, fallback: string, param: "ok" | "erro", code: SuccessCode | ErrorCode): never {
  const path = typeof returnTo === "string" && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : fallback;
  const url = new URL(path, "http://interno");
  url.searchParams.delete("ok");
  url.searchParams.delete("erro");
  url.searchParams.set(param, code);
  redirect(`${url.pathname}${url.search}`);
}

export async function addToCart(formData: FormData) {
  const returnTo = formData.get("returnTo");
  const produto = uuid.safeParse(formData.get("productId"));
  if (!produto.success) back(returnTo, "/", "erro", "product_unavailable");

  // Estoque conferido no banco: o botão pode estar desatualizado na tela.
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("stock, active")
    .eq("id", produto.data)
    .single<{ stock: number; active: boolean }>();
  if (!data?.active) back(returnTo, "/", "erro", "product_unavailable");

  const linhas = await readCart();
  const atual = linhas.find((linha) => linha.id === produto.data);
  const nova = (atual?.q ?? 0) + 1;
  if (nova > data.stock) back(returnTo, "/", "erro", "out_of_stock");

  await writeCart(atual ? linhas.map((l) => (l.id === produto.data ? { ...l, q: nova } : l)) : [...linhas, { id: produto.data, q: 1 }]);
  revalidatePath("/", "layout");
  back(returnTo, "/", "ok", "adicionado");
}

/** Quantidade 0 remove a linha. */
export async function updateCartLine(formData: FormData) {
  const produto = uuid.safeParse(formData.get("productId"));
  const nova = quantidade.safeParse(formData.get("quantity"));
  if (!produto.success || !nova.success) back("/carrinho", "/carrinho", "erro", "invalid_quantity");

  const linhas = await readCart();
  if (nova.data === 0) {
    await writeCart(linhas.filter((linha) => linha.id !== produto.data));
    revalidatePath("/", "layout");
    back("/carrinho", "/carrinho", "ok", "removido");
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("stock")
    .eq("id", produto.data)
    .single<{ stock: number }>();
  if ((data?.stock ?? 0) < nova.data) back("/carrinho", "/carrinho", "erro", "out_of_stock");

  await writeCart(linhas.map((linha) => (linha.id === produto.data ? { ...linha, q: nova.data } : linha)));
  revalidatePath("/", "layout");
  back("/carrinho", "/carrinho", "ok", "carrinho_atualizado");
}

/**
 * Cria o pedido (que já reserva o estoque) e manda para a tela de pagamento da
 * Stripe. O pedido só vira "pago" quando a Stripe avisa o servidor.
 */
export async function checkout() {
  const viewer = await requireViewer();
  const { items } = await cartItems();
  if (!items.length) back("/carrinho", "/carrinho", "erro", "empty_cart");

  const supabase = await createClient();
  const { data: orderId, error } = await supabase.rpc("create_order", {
    p_items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
  });
  if (error || !orderId) back("/carrinho", "/carrinho", "erro", errorCodeFrom(error));

  // A cobrança usa o pedido já gravado, não a leitura do carrinho: se o preço
  // mudar entre uma coisa e outra, vale o que ficou registrado no pedido.
  const { data: snapshot } = await supabase
    .from("order_items")
    .select("product_name, unit_price_cents, quantity")
    .eq("order_id", orderId)
    .returns<{ product_name: string; unit_price_cents: number; quantity: number }[]>();
  if (!snapshot?.length) back("/carrinho", "/carrinho", "erro", "erro_inesperado");

  const origin = siteOrigin((await headers()).get("host"));
  let url: string | null = null;

  try {
    const session = await stripeClient().checkout.sessions.create({
      mode: "payment",
      customer_email: viewer.email,
      client_reference_id: orderId as string,
      metadata: { order_id: orderId as string },
      line_items: snapshot.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: "brl",
          unit_amount: item.unit_price_cents,
          product_data: { name: item.product_name },
        },
      })),
      success_url: `${origin}/pedido/${orderId}`,
      cancel_url: `${origin}/pedido/${orderId}?erro=pagamento_cancelado`,
    });
    url = session.url;
    await supabase.rpc("attach_checkout_session", { p_order: orderId, p_session: session.id });
  } catch (erro) {
    // Sem sessão de pagamento não há pedido: devolve o estoque reservado.
    // O tipo do erro fica no registro do servidor; a tela não expõe detalhes.
    const detalhe = erro as { type?: string; code?: string; name?: string };
    console.error(`[checkout] falhou: ${detalhe.type ?? detalhe.name ?? "desconhecido"}:${detalhe.code ?? "sem_codigo"}`);
    await createAdminClient().rpc("release_unpaid_order", { p_order: orderId });
    back("/carrinho", "/carrinho", "erro", "pagamento_indisponivel");
  }

  await clearCart();
  revalidatePath("/", "layout");
  redirect(url!);
}

export async function cancelOrder(formData: FormData) {
  const pedido = uuid.safeParse(formData.get("orderId"));
  if (!pedido.success) back("/minha-conta", "/minha-conta", "erro", "order_not_found");

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_order", { p_order: pedido.data });
  if (error) back(`/pedido/${pedido.data}`, "/minha-conta", "erro", errorCodeFrom(error));

  revalidatePath("/", "layout");
  back(`/pedido/${pedido.data}`, "/minha-conta", "ok", "pedido_cancelado");
}
