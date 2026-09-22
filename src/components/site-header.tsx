import Link from "next/link";

import { signOut } from "@/app/auth-actions";
import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";
import { btnSecondary } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { cartCount } from "@/lib/cart";
import { isTestAccount } from "@/lib/store";

export async function SiteHeader() {
  const [viewer, itens] = await Promise.all([getViewer(), cartCount()]);

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <Logo />

        <nav aria-label="Principal" className="order-3 flex w-full items-center gap-1 overflow-x-auto sm:order-2 sm:w-auto sm:flex-1 sm:justify-center">
          {[
            { href: "/", label: "Catálogo" },
            ...(viewer ? [{ href: "/minha-conta", label: "Meus pedidos" }] : []),
            ...(viewer?.role === "admin" ? [{ href: "/painel", label: "Painel" }] : []),
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:order-3">
          {viewer && isTestAccount(viewer.email) ? (
            <p className="hidden text-xs font-medium text-muted lg:block">Conta de teste — pagamentos simulados.</p>
          ) : null}

          <Link href="/carrinho" className={btnSecondary}>
            Carrinho
            {itens > 0 ? (
              <span className="rounded-full bg-brand px-1.5 py-0.5 text-xs font-bold text-white tabular-nums">{itens}</span>
            ) : null}
          </Link>

          {viewer ? (
            <form action={signOut}>
              <SubmitButton className={btnSecondary} pendingLabel="Saindo…">
                Sair
              </SubmitButton>
            </form>
          ) : (
            <Link href="/entrar" className={btnSecondary}>
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
