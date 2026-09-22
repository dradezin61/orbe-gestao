import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";

/**
 * O carrinho vive num cookie do servidor, guardando só identificador e
 * quantidade. Nome, preço e estoque vêm sempre do banco na hora de mostrar e de
 * cobrar — o navegador nunca decide quanto custa.
 */
const COOKIE = "orbe_carrinho";
const MAX_LINHAS = 20;
const MAX_QUANTIDADE = 20;

export type CartLine = { id: string; q: number };

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  stock: number;
  active: boolean;
  quantity: number;
  subtotalCents: number;
};

export async function readCart(): Promise<CartLine[]> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((line): line is CartLine => typeof line?.id === "string" && Number.isInteger(line?.q))
      .map((line) => ({ id: line.id, q: Math.min(Math.max(line.q, 1), MAX_QUANTIDADE) }))
      .slice(0, MAX_LINHAS);
  } catch {
    return [];
  }
}

export async function writeCart(lines: CartLine[]) {
  const store = await cookies();
  if (!lines.length) {
    store.delete(COOKIE);
    return;
  }
  store.set(COOKIE, JSON.stringify(lines.slice(0, MAX_LINHAS)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearCart() {
  (await cookies()).delete(COOKIE);
}

/** Junta o carrinho com os dados atuais do catálogo, na ordem em que foi montado. */
export async function cartItems(): Promise<{ items: CartItem[]; totalCents: number }> {
  const lines = await readCart();
  if (!lines.length) return { items: [], totalCents: 0 };

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, slug, name, price_cents, stock, active")
    .in("id", lines.map((line) => line.id))
    .returns<{ id: string; slug: string; name: string; price_cents: number; stock: number; active: boolean }[]>();

  const items = lines.flatMap((line) => {
    const product = data?.find((p) => p.id === line.id);
    if (!product) return [];
    return [
      {
        id: product.id,
        slug: product.slug,
        name: product.name,
        priceCents: product.price_cents,
        stock: product.stock,
        active: product.active,
        quantity: line.q,
        subtotalCents: product.price_cents * line.q,
      },
    ];
  });

  return { items, totalCents: items.reduce((sum, item) => sum + item.subtotalCents, 0) };
}

export const cartCount = async () => (await readCart()).reduce((sum, line) => sum + line.q, 0);
