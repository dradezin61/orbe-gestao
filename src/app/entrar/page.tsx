import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signIn, signInDemo } from "@/app/auth-actions";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";
import { btnSecondary, card, input, label } from "@/components/ui";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Entrar" };

export default async function SignInPage({ searchParams }: PageProps<"/entrar">) {
  if (await getViewer()) redirect("/");
  const { erro, voltar } = await searchParams;
  const returnTo = typeof voltar === "string" && voltar.startsWith("/") ? voltar : "/carrinho";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-10">
      <div className={`${card} p-6 sm:p-8`}>
        <h1 className="text-2xl font-bold tracking-tight">Entrar</h1>
        <div className="mt-4">
          <Flash erro={typeof erro === "string" ? erro : undefined} />
        </div>

        <form action={signIn} className="mt-4 grid gap-4">
          <input type="hidden" name="returnTo" value={returnTo} />
          <div className="grid gap-1.5">
            <label htmlFor="email" className={label}>E-mail</label>
            <input id="email" name="email" type="email" autoComplete="email" required className={input} />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="password" className={label}>Senha</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} className={input} />
            <Link href="/esqueci-senha" className="justify-self-end text-sm font-semibold text-brand underline underline-offset-2">
              Esqueci minha senha
            </Link>
          </div>
          <SubmitButton pendingLabel="Entrando…">Entrar</SubmitButton>
        </form>

        <p className="mt-5 text-sm text-muted">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-semibold text-brand underline underline-offset-2">
            Criar conta
          </Link>
        </p>
      </div>

      <div className={`${card} mt-4 p-6`}>
        <h2 className="font-semibold">Só quer conhecer a loja?</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          A conta de teste compra com os cartões de teste da Stripe. Nenhuma cobrança real acontece.
        </p>
        <form action={signInDemo} className="mt-4">
          <input type="hidden" name="returnTo" value={returnTo} />
          <SubmitButton className={`${btnSecondary} w-full`} pendingLabel="Entrando…">
            Entrar com conta de teste
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
