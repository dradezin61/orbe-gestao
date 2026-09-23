import type { Metadata } from "next";
import Link from "next/link";

import { checkout, updateCartLine } from "@/app/cart-actions";
import { Flash } from "@/components/flash";
import { ProductImage } from "@/components/product-image";
import { SubmitButton } from "@/components/submit-button";
import { btnPrimary, btnSecondary, card } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { cartItems } from "@/lib/cart";
import { formatMoney } from "@/lib/money";
import { store } from "@/lib/store";

export const metadata: Metadata = { title: "Carrinho" };

export default async function CartPage({ searchParams }: PageProps<"/carrinho">) {
  const query = await searchParams;
  const [{ items, totalCents }, viewer] = await Promise.all([cartItems(), getViewer()]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Carrinho</h1>

      <div className="mt-4">
        <Flash
          ok={typeof query.ok === "string" ? query.ok : undefined}
          erro={typeof query.erro === "string" ? query.erro : undefined}
        />
      </div>

      {items.length === 0 ? (
        <div className={`${card} mt-4 p-6`}>
          <p className="text-muted">Seu carrinho está vazio.</p>
          <Link href="/" className={`${btnPrimary} mt-4`}>
            Ver o catálogo
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-4 grid gap-3">
            {items.map((item) => (
              <li key={item.id} className={`${card} flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5`}>
                <Link
                  href={`/produto/${item.slug}`}
                  className="w-20 shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <ProductImage
                    path={item.imagePath}
                    alt={item.imageAlt}
                    name={item.name}
                    sizes="80px"
                    className="rounded-lg"
                  />
                </Link>

                <div className="min-w-40 flex-1">
                  <h2 className="font-semibold">
                    <Link href={`/produto/${item.slug}`} className="hover:text-brand">
                      {item.name}
                    </Link>
                  </h2>
                  <p className="mt-1 text-sm text-muted tabular-nums">
                    {formatMoney(item.priceCents)} por unidade
                    {item.quantity > item.stock ? (
                      <span className="ml-2 font-semibold text-danger">só {item.stock} em estoque</span>
                    ) : null}
                  </p>
                </div>

                <form action={updateCartLine} className="flex items-center gap-2">
                  <input type="hidden" name="productId" value={item.id} />
                  <label htmlFor={`q-${item.id}`} className="text-sm text-muted">
                    Qtd.
                  </label>
                  <input
                    id={`q-${item.id}`}
                    name="quantity"
                    type="number"
                    min={0}
                    max={Math.max(item.stock, 1)}
                    defaultValue={item.quantity}
                    className="w-20 rounded-lg border border-border bg-surface px-2.5 py-2 text-base tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
                  />
                  <SubmitButton className={btnSecondary} pendingLabel="Salvando…">
                    Atualizar
                  </SubmitButton>
                </form>

                <p className="w-28 text-right text-lg font-bold tabular-nums">{formatMoney(item.subtotalCents)}</p>
              </li>
            ))}
          </ul>

          <div className={`${card} mt-4 p-5 sm:p-6`}>
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold">Total</p>
              <p className="text-2xl font-bold tabular-nums">{formatMoney(totalCents)}</p>
            </div>

            <form action={checkout} className="mt-5">
              <SubmitButton className={`${btnPrimary} w-full`} pendingLabel="Abrindo o pagamento…">
                {viewer ? "Ir para o pagamento" : "Entrar e pagar"}
              </SubmitButton>
            </form>

            <p className="mt-3 text-sm leading-relaxed text-muted">
              O pagamento acontece na página da Stripe. Ao criar o pedido, os itens ficam reservados por{" "}
              {store.reservationMinutes} minutos; se o pagamento não for concluído, eles voltam ao estoque.
            </p>
          </div>
        </>
      )}
    </main>
  );
}
