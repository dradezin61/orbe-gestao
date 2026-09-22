import Link from "next/link";

import { addToCart } from "@/app/cart-actions";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";
import { btnPrimary, btnSecondary, card } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { categories, store } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";

type Product = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  category: string;
  price_cents: number;
  stock: number;
};

const param = (value: string | string[] | undefined) => (typeof value === "string" ? value.trim() : undefined);

export default async function CatalogPage({ searchParams }: PageProps<"/">) {
  const query = await searchParams;
  const busca = param(query.busca) ?? "";
  const categoria = categories.find((c) => c === param(query.categoria));

  const supabase = await createClient();
  // Devolve ao estoque o que ficou preso em pedidos que ninguém pagou.
  await supabase.rpc("release_expired_orders");

  let consulta = supabase
    .from("products")
    .select("id, slug, name, summary, category, price_cents, stock")
    .eq("active", true)
    .order("name");
  if (categoria) consulta = consulta.eq("category", categoria);
  if (busca) consulta = consulta.or(`name.ilike.%${busca}%,summary.ilike.%${busca}%`);

  const { data } = await consulta.returns<Product[]>();
  const produtos = data ?? [];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8">
      <section className="grid gap-4 pb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{store.tagline}</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted">
          Peças escolhidas para durar. Escolha, pague com cartão e acompanhe o pedido até a saída para entrega.
        </p>
      </section>

      <div className="mb-6 grid gap-4">
        <Flash ok={param(query.ok)} erro={param(query.erro)} />

        <form className="flex flex-wrap gap-2" role="search">
          <input
            type="search"
            name="busca"
            defaultValue={busca}
            placeholder="Buscar no catálogo"
            aria-label="Buscar no catálogo"
            className="min-w-48 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-base focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
          />
          {categoria ? <input type="hidden" name="categoria" value={categoria} /> : null}
          <SubmitButton className={btnSecondary} pendingLabel="Buscando…">
            Buscar
          </SubmitButton>
        </form>

        <nav aria-label="Categorias" className="flex flex-wrap gap-2">
          {[{ label: "Tudo", value: undefined as string | undefined }, ...categories.map((c) => ({ label: c, value: c as string | undefined }))].map((item) => {
            const ativo = categoria === item.value;
            const params = new URLSearchParams();
            if (item.value) params.set("categoria", item.value);
            if (busca) params.set("busca", busca);
            return (
              <Link
                key={item.label}
                href={`/?${params.toString()}`}
                aria-current={ativo ? "page" : undefined}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  ativo ? "border-brand bg-brand-soft text-brand" : "border-border bg-surface text-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {produtos.length === 0 ? (
        <p className={`${card} p-6 text-muted`}>Nenhum produto encontrado com esse filtro.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {produtos.map((produto) => (
            <li key={produto.id} className={`${card} flex flex-col p-5`}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{produto.category}</p>
              <h2 className="mt-2 text-lg font-semibold">
                <Link
                  href={`/produto/${produto.slug}`}
                  className="hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  {produto.name}
                </Link>
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{produto.summary}</p>

              <p className="mt-4 text-2xl font-bold tabular-nums">{formatMoney(produto.price_cents)}</p>
              <p className={`mt-1 text-sm ${produto.stock === 0 ? "text-danger" : "text-muted"}`}>
                {produto.stock === 0
                  ? "Sem estoque"
                  : produto.stock <= 5
                    ? `Últimas ${produto.stock} unidades`
                    : `${produto.stock} em estoque`}
              </p>

              <form action={addToCart} className="mt-4">
                <input type="hidden" name="productId" value={produto.id} />
                <input type="hidden" name="returnTo" value="/" />
                <SubmitButton className={`${btnPrimary} w-full`} pendingLabel="Adicionando…" disabled={produto.stock === 0}>
                  {produto.stock === 0 ? "Indisponível" : "Adicionar ao carrinho"}
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
