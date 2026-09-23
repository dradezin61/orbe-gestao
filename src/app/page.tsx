import Link from "next/link";

import { addToCart } from "@/app/cart-actions";
import { Flash } from "@/components/flash";
import { ProductImage } from "@/components/product-image";
import { SubmitButton } from "@/components/submit-button";
import { btnPrimary, btnSecondary } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { categories } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";

type Product = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  category: string;
  price_cents: number;
  stock: number;
  image_path: string | null;
  image_alt: string | null;
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
    .select("id, slug, name, summary, category, price_cents, stock, image_path, image_alt")
    .eq("active", true)
    .order("name");
  if (categoria) consulta = consulta.eq("category", categoria);
  if (busca) consulta = consulta.or(`name.ilike.%${busca}%,summary.ilike.%${busca}%`);

  const { data } = await consulta.returns<Product[]>();
  const produtos = data ?? [];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8">
      <section className="max-w-2xl pb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Objetos para casa e escritório.</h1>
        <p className="mt-3 text-lg leading-relaxed text-muted">
          Organização, iluminação e detalhes para os espaços do dia a dia.
        </p>
      </section>

      <div className="mb-8 grid gap-4">
        <Flash ok={param(query.ok)} erro={param(query.erro)} />

        <div className="flex flex-wrap items-center gap-3">
          <form className="flex min-w-64 flex-1 gap-2" role="search">
            <input
              type="search"
              name="busca"
              defaultValue={busca}
              placeholder="Buscar no catálogo"
              aria-label="Buscar no catálogo"
              className="min-w-40 flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-base focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
            />
            {categoria ? <input type="hidden" name="categoria" value={categoria} /> : null}
            <SubmitButton className={`${btnSecondary} rounded-full`} pendingLabel="Buscando…">
              Buscar
            </SubmitButton>
          </form>
        </div>

        <nav aria-label="Categorias" className="flex flex-wrap gap-2">
          {[{ label: "Tudo", value: undefined as string | undefined }, ...categories.map((c) => ({ label: c, value: c as string | undefined }))].map(
            (item) => {
              const ativo = categoria === item.value;
              const params = new URLSearchParams();
              if (item.value) params.set("categoria", item.value);
              if (busca) params.set("busca", busca);
              return (
                <Link
                  key={item.label}
                  href={`/?${params.toString()}`}
                  aria-current={ativo ? "page" : undefined}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                    ativo
                      ? "border-brand bg-brand text-white"
                      : "border-border bg-surface text-muted hover:border-foreground/20 hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            },
          )}
        </nav>
      </div>

      {produtos.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-6 text-muted">
          Nenhum produto encontrado com esse filtro.
        </p>
      ) : (
        <ul className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {produtos.map((produto, indice) => {
            const esgotado = produto.stock === 0;
            return (
              <li key={produto.id} className="group flex flex-col">
                <Link
                  href={`/produto/${produto.slug}`}
                  className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                >
                  <ProductImage
                    path={produto.image_path}
                    alt={produto.image_alt}
                    name={produto.name}
                    sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 92vw"
                    priority={indice < 3}
                    className="rounded-xl transition-opacity group-hover:opacity-95"
                  />
                </Link>

                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{produto.category}</p>
                <h2 className="mt-1.5 text-lg font-semibold leading-snug">
                  <Link
                    href={`/produto/${produto.slug}`}
                    className="hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    {produto.name}
                  </Link>
                </h2>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">{produto.summary}</p>

                <div className="mt-3 flex items-baseline justify-between gap-3">
                  <p className="text-xl font-bold tabular-nums">{formatMoney(produto.price_cents)}</p>
                  <p className={`text-sm ${esgotado ? "font-medium text-danger" : "text-muted"}`}>
                    {esgotado ? "Sem estoque" : produto.stock <= 5 ? `Últimas ${produto.stock} unidades` : "Em estoque"}
                  </p>
                </div>

                <form action={addToCart} className="mt-3">
                  <input type="hidden" name="productId" value={produto.id} />
                  <input type="hidden" name="returnTo" value="/" />
                  <SubmitButton className={`${btnPrimary} w-full`} pendingLabel="Adicionando…" disabled={esgotado}>
                    {esgotado ? "Indisponível" : "Adicionar ao carrinho"}
                  </SubmitButton>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
