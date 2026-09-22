import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { cancelOrder } from "@/app/cart-actions";
import { Flash } from "@/components/flash";
import { OrderStatusBadge, type OrderStatus } from "@/components/order-status";
import { SubmitButton } from "@/components/submit-button";
import { btnDanger, card } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/money";
import { store } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pedido" };

type Order = {
  id: string;
  status: OrderStatus;
  total_cents: number;
  created_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  order_items: { id: string; product_name: string; unit_price_cents: number; quantity: number }[];
};

const explicacao: Record<OrderStatus, string> = {
  aguardando: `O pagamento ainda não foi confirmado pela Stripe. Os itens ficam reservados por ${store.reservationMinutes} minutos a partir da criação do pedido; depois disso voltam ao estoque.`,
  pago: "A Stripe confirmou o pagamento no nosso servidor. A loja já pode separar os itens.",
  enviado: "O pedido saiu para entrega.",
  cancelado: "Este pedido foi cancelado e os itens voltaram ao estoque.",
};

export default async function OrderPage({ params, searchParams }: PageProps<"/pedido/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  await requireViewer();

  const supabase = await createClient();
  const { data: pedido } = await supabase
    .from("orders")
    .select("id, status, total_cents, created_at, paid_at, shipped_at, order_items(id, product_name, unit_price_cents, quantity)")
    .eq("id", id)
    .maybeSingle<Order>();
  if (!pedido) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-8">
      <Link href="/minha-conta" className="text-sm font-semibold text-brand underline underline-offset-2">
        Voltar para meus pedidos
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pedido {pedido.id.slice(0, 8)}</h1>
        <OrderStatusBadge status={pedido.status} />
      </div>

      <div className="mt-4">
        <Flash
          ok={typeof query.ok === "string" ? query.ok : undefined}
          erro={typeof query.erro === "string" ? query.erro : undefined}
        />
      </div>

      <p className="mt-4 leading-relaxed text-muted">{explicacao[pedido.status]}</p>

      <div className={`${card} mt-4 p-5 sm:p-6`}>
        <h2 className="font-semibold">Itens</h2>
        <ul className="mt-3 grid gap-2">
          {pedido.order_items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0">
              <span>
                {item.product_name}
                <span className="text-muted"> × {item.quantity}</span>
              </span>
              <span className="tabular-nums">{formatMoney(item.unit_price_cents * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <p className="font-semibold">Total</p>
          <p className="text-xl font-bold tabular-nums">{formatMoney(pedido.total_cents)}</p>
        </div>
      </div>

      <dl className={`${card} mt-4 grid gap-2 p-5 text-sm sm:p-6`}>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Pedido criado</dt>
          <dd>{formatDate(pedido.created_at)}</dd>
        </div>
        {pedido.paid_at ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Pagamento confirmado</dt>
            <dd>{formatDate(pedido.paid_at)}</dd>
          </div>
        ) : null}
        {pedido.shipped_at ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Enviado</dt>
            <dd>{formatDate(pedido.shipped_at)}</dd>
          </div>
        ) : null}
      </dl>

      {pedido.status === "aguardando" ? (
        <form action={cancelOrder} className="mt-4">
          <input type="hidden" name="orderId" value={pedido.id} />
          <SubmitButton className={btnDanger} pendingLabel="Cancelando…">
            Cancelar pedido e liberar os itens
          </SubmitButton>
        </form>
      ) : null}
    </main>
  );
}
