import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signUp } from "@/app/auth-actions";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";
import { card, input, label } from "@/components/ui";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignUpPage({ searchParams }: PageProps<"/cadastro">) {
  if (await getViewer()) redirect("/");
  const { erro, voltar } = await searchParams;
  const returnTo = typeof voltar === "string" && voltar.startsWith("/") ? voltar : "/carrinho";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-10">
      <div className={`${card} p-6 sm:p-8`}>
        <h1 className="text-2xl font-bold tracking-tight">Criar conta</h1>
        <p className="mt-2 text-sm text-muted">Precisamos do seu nome e e-mail para acompanhar os pedidos.</p>
        <div className="mt-4">
          <Flash erro={typeof erro === "string" ? erro : undefined} />
        </div>

        <form action={signUp} className="mt-4 grid gap-4">
          <input type="hidden" name="returnTo" value={returnTo} />
          <div className="grid gap-1.5">
            <label htmlFor="fullName" className={label}>Nome completo</label>
            <input id="fullName" name="fullName" autoComplete="name" required minLength={2} maxLength={80} className={input} />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="email" className={label}>E-mail</label>
            <input id="email" name="email" type="email" autoComplete="email" required className={input} />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="password" className={label}>Senha</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} className={input} />
            <p className="text-xs text-muted">Pelo menos 8 caracteres.</p>
          </div>
          <SubmitButton pendingLabel="Criando…">Criar conta</SubmitButton>
        </form>

        <p className="mt-5 text-sm text-muted">
          Já tem conta?{" "}
          <Link href="/entrar" className="font-semibold text-brand underline underline-offset-2">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
