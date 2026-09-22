import type { Metadata } from "next";
import Link from "next/link";

import { Flash } from "@/components/flash";
import { OrderStatusBadge, type OrderStatus } from "@/components/order-status";
import { btnPrimary, card } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Meus pedidos" };

type Order = {
  id: string;
  status: OrderStatus;
  total_cents: number;
  created_at: string;
  order_items: { quantity: number }[];
};

export default async function AccountPage({ searchParams }: PageProps<"/minha-conta">) {
  const viewer = await requireViewer();
  const query = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, status, total_cents, created_at, order_items(quantity)")
    .eq("user_id", viewer.id)
    .order("created_at", { ascending: false })
    .returns<Order[]>();
  const pedidos = data ?? [];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Meus pedidos</h1>
      <p className="mt-1 text-muted">Conta de {viewer.fullName}.</p>

      <div className="mt-4">
        <Flash
          ok={typeof query.ok === "string" ? query.ok : undefined}
          erro={typeof query.erro === "string" ? query.erro : undefined}
        />
      </div>

      {pedidos.length === 0 ? (
        <div className={`${card} mt-4 p-6`}>
          <p className="text-muted">Você ainda não fez pedidos.</p>
          <Link href="/" className={`${btnPrimary} mt-4`}>
            Ver o catálogo
          </Link>
        </div>
      ) : (
        <ul className="mt-4 grid gap-3">
          {pedidos.map((pedido) => {
            const itens = pedido.order_items.reduce((soma, item) => soma + item.quantity, 0);
            return (
              <li key={pedido.id} className={`${card} flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5`}>
                <div>
                  <p className="font-semibold">
                    <Link href={`/pedido/${pedido.id}`} className="hover:text-brand">
                      Pedido de {formatDate(pedido.created_at)}
                    </Link>
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {itens} {itens === 1 ? "item" : "itens"} · código {pedido.id.slice(0, 8)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <OrderStatusBadge status={pedido.status} />
                  <p className="text-lg font-bold tabular-nums">{formatMoney(pedido.total_cents)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
