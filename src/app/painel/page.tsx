import type { Metadata } from "next";
import Link from "next/link";

import { markShipped, saveProduct } from "@/app/admin-actions";
import { Flash } from "@/components/flash";
import { OrderStatusBadge, type OrderStatus } from "@/components/order-status";
import { SubmitButton } from "@/components/submit-button";
import { btnPrimary, btnSecondary, card, input, label } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/money";
import { categories } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Painel" };

type Order = {
  id: string;
  status: OrderStatus;
  total_cents: number;
  created_at: string;
  profiles: { full_name: string } | null;
  order_items: { quantity: number }[];
};

type Product = {
  id: string;
  name: string;
  summary: string;
  description: string;
  category: string;
  price_cents: number;
  stock: number;
  active: boolean;
};

const param = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

export default async function AdminPage({ searchParams }: PageProps<"/painel">) {
  await requireAdmin();
  const query = await searchParams;
  const aba = param(query.aba) === "produtos" ? "produtos" : "pedidos";
  const editando = param(query.editar);

  const supabase = await createClient();
  const [{ data: pedidos }, { data: produtos }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, status, total_cents, created_at, profiles(full_name), order_items(quantity)")
      .order("created_at", { ascending: false })
      .limit(40)
      .returns<Order[]>(),
    supabase
      .from("products")
      .select("id, name, summary, description, category, price_cents, stock, active")
      .order("name")
      .returns<Product[]>(),
  ]);

  const lista = pedidos ?? [];
  const catalogo = produtos ?? [];
  const pagos = lista.filter((p) => p.status === "pago" || p.status === "enviado");
  const receita = pagos.reduce((soma, p) => soma + p.total_cents, 0);
  const aguardando = lista.filter((p) => p.status === "aguardando").length;
  const semEstoque = catalogo.filter((p) => p.active && p.stock === 0).length;
  const produtoEmEdicao = editando ? catalogo.find((p) => p.id === editando) : undefined;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Painel da loja</h1>
      <p className="mt-1 text-muted">Pedidos, receita confirmada e catálogo.</p>

      <div className="mt-4">
        <Flash ok={param(query.ok)} erro={param(query.erro)} />
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-4">
        {[
          { termo: "Receita confirmada", valor: formatMoney(receita) },
          { termo: "Pedidos pagos", valor: String(pagos.length) },
          { termo: "Aguardando pagamento", valor: String(aguardando) },
          { termo: "Produtos sem estoque", valor: String(semEstoque) },
        ].map((item) => (
          <div key={item.termo} className={`${card} p-5`}>
            <dt className="text-sm text-muted">{item.termo}</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{item.valor}</dd>
          </div>
        ))}
      </dl>

      <nav aria-label="Seções do painel" className="mt-8 flex gap-2">
        {[
          { href: "/painel?aba=pedidos", rotulo: "Pedidos", ativo: aba === "pedidos" },
          { href: "/painel?aba=produtos", rotulo: "Produtos", ativo: aba === "produtos" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.ativo ? "page" : undefined}
            className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
              item.ativo ? "bg-brand text-white" : "border border-border bg-surface text-muted hover:text-foreground"
            }`}
          >
            {item.rotulo}
          </Link>
        ))}
      </nav>

      {aba === "pedidos" ? (
        <section aria-label="Pedidos" className="mt-4 grid gap-3">
          {lista.length === 0 ? (
            <p className={`${card} p-6 text-muted`}>Nenhum pedido ainda.</p>
          ) : (
            lista.map((pedido) => {
              const itens = pedido.order_items.reduce((soma, item) => soma + item.quantity, 0);
              return (
                <article key={pedido.id} className={`${card} flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5`}>
                  <div className="min-w-48">
                    <p className="font-semibold">{pedido.profiles?.full_name ?? "Cliente"}</p>
                    <p className="mt-1 text-sm text-muted">
                      {formatDate(pedido.created_at)} · {itens} {itens === 1 ? "item" : "itens"} · código {pedido.id.slice(0, 8)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <OrderStatusBadge status={pedido.status} />
                    <p className="text-lg font-bold tabular-nums">{formatMoney(pedido.total_cents)}</p>
                    {pedido.status === "pago" ? (
                      <form action={markShipped}>
                        <input type="hidden" name="orderId" value={pedido.id} />
                        <SubmitButton className={btnSecondary} pendingLabel="Marcando…">
                          Marcar como enviado
                        </SubmitButton>
                      </form>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </section>
      ) : (
        <section aria-label="Produtos" className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="grid gap-3">
            {catalogo.map((produto) => (
              <article key={produto.id} className={`${card} flex flex-wrap items-center justify-between gap-4 p-4`}>
                <div className="min-w-48">
                  <p className="font-semibold">
                    {produto.name}
                    {!produto.active ? <span className="ml-2 text-sm font-medium text-muted">fora do catálogo</span> : null}
                  </p>
                  <p className="mt-1 text-sm text-muted">{produto.category}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="tabular-nums">{formatMoney(produto.price_cents)}</p>
                  <p className={`text-sm tabular-nums ${produto.stock === 0 ? "text-danger" : "text-muted"}`}>
                    {produto.stock} em estoque
                  </p>
                  <Link href={`/painel?aba=produtos&editar=${produto.id}`} className={btnSecondary}>
                    Editar
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <form action={saveProduct} className={`${card} grid h-fit gap-4 p-5`}>
            <h2 className="text-lg font-semibold">{produtoEmEdicao ? "Editar produto" : "Novo produto"}</h2>
            {produtoEmEdicao ? <input type="hidden" name="id" value={produtoEmEdicao.id} /> : null}

            <div className="grid gap-1.5">
              <label htmlFor="name" className={label}>Nome</label>
              <input id="name" name="name" required maxLength={120} defaultValue={produtoEmEdicao?.name} className={input} />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="summary" className={label}>Resumo</label>
              <input id="summary" name="summary" required maxLength={200} defaultValue={produtoEmEdicao?.summary} className={input} />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="description" className={label}>Descrição</label>
              <textarea id="description" name="description" required rows={4} maxLength={2000} defaultValue={produtoEmEdicao?.description} className={input} />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="category" className={label}>Categoria</label>
              <select id="category" name="category" defaultValue={produtoEmEdicao?.category ?? categories[0]} className={input}>
                {categories.map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label htmlFor="price" className={label}>Preço (R$)</label>
                <input
                  id="price"
                  name="price"
                  required
                  inputMode="decimal"
                  defaultValue={produtoEmEdicao ? (produtoEmEdicao.price_cents / 100).toFixed(2) : ""}
                  className={input}
                />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="stock" className={label}>Estoque</label>
                <input id="stock" name="stock" type="number" min={0} required defaultValue={produtoEmEdicao?.stock ?? 0} className={input} />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="active" defaultChecked={produtoEmEdicao?.active ?? true} className="size-4" />
              Mostrar no catálogo
            </label>

            <div className="flex flex-wrap gap-2">
              <SubmitButton className={btnPrimary} pendingLabel="Salvando…">
                {produtoEmEdicao ? "Salvar alterações" : "Criar produto"}
              </SubmitButton>
              {produtoEmEdicao ? (
                <Link href="/painel?aba=produtos" className={btnSecondary}>
                  Cancelar edição
                </Link>
              ) : null}
            </div>
          </form>
        </section>
      )}
    </main>
  );
}
