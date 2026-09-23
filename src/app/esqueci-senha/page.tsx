import type { Metadata } from "next";
import Link from "next/link";

import { requestPasswordReset } from "@/app/password-actions";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";
import { card, input, label } from "@/components/ui";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/esqueci-senha">) {
  const { ok, erro } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-10">
      <div className={`${card} p-6 sm:p-8`}>
        <h1 className="text-2xl font-bold tracking-tight">Esqueci minha senha</h1>
        <p className="mt-2 text-sm text-muted">
          Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.
        </p>
        <div className="mt-4">
          <Flash ok={typeof ok === "string" ? ok : undefined} erro={typeof erro === "string" ? erro : undefined} />
        </div>

        <form action={requestPasswordReset} className="mt-4 grid gap-4">
          <div className="grid gap-1.5">
            <label htmlFor="email" className={label}>E-mail</label>
            <input id="email" name="email" type="email" autoComplete="email" required className={input} />
          </div>
          <SubmitButton pendingLabel="Enviando…">Enviar link</SubmitButton>
        </form>

        <p className="mt-5 text-sm text-muted">
          Lembrou a senha?{" "}
          <Link href="/entrar" className="font-semibold text-brand underline underline-offset-2">
            Voltar para entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
