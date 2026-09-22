import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { addToCart } from "@/app/cart-actions";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";
import { btnPrimary, card } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

type Product = {
  id: string;
  name: string;
  summary: string;
  description: string;
  category: string;
  price_cents: number;
  stock: number;
};

async function buscar(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, summary, description, category, price_cents, stock")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle<Product>();
  return data;
}

export async function generateMetadata({ params }: PageProps<"/produto/[slug]">): Promise<Metadata> {
  const produto = await buscar((await params).slug);
  return { title: produto?.name ?? "Produto" };
}

export default async function ProductPage({ params, searchParams }: PageProps<"/produto/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  const produto = await buscar(slug);
  if (!produto) notFound();

  const esgotado = produto.stock === 0;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-8">
      <Link href="/" className="text-sm font-semibold text-brand underline underline-offset-2">
        Voltar ao catálogo
      </Link>

      <div className={`${card} mt-4 p-6 sm:p-8`}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{produto.category}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{produto.name}</h1>
        <p className="mt-2 text-lg text-muted">{produto.summary}</p>

        <p className="mt-6 text-3xl font-bold tabular-nums">{formatMoney(produto.price_cents)}</p>
        <p className={`mt-1 text-sm ${esgotado ? "text-danger" : "text-muted"}`}>
          {esgotado ? "Sem estoque no momento" : `${produto.stock} em estoque`}
        </p>

        <div className="mt-6">
          <Flash
            ok={typeof query.ok === "string" ? query.ok : undefined}
            erro={typeof query.erro === "string" ? query.erro : undefined}
          />
        </div>

        <form action={addToCart} className="mt-6">
          <input type="hidden" name="productId" value={produto.id} />
          <input type="hidden" name="returnTo" value={`/produto/${slug}`} />
          <SubmitButton className={btnPrimary} pendingLabel="Adicionando…" disabled={esgotado}>
            {esgotado ? "Indisponível" : "Adicionar ao carrinho"}
          </SubmitButton>
        </form>

        <h2 className="mt-8 text-sm font-semibold text-muted">Descrição</h2>
        <p className="mt-2 leading-relaxed">{produto.description}</p>
      </div>
    </main>
  );
}
