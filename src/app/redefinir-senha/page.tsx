import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { updatePassword } from "@/app/password-actions";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";
import { card, input, label } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { RESET_COOKIE } from "@/lib/password-reset";

export const metadata: Metadata = { title: "Nova senha" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/redefinir-senha">) {
  const viewer = await getViewer();
  const allowed = (await cookies()).get(RESET_COOKIE)?.value;
  if (!viewer || allowed !== viewer.id) redirect("/esqueci-senha?erro=link_invalido");
  const { erro } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-10">
      <div className={`${card} p-6 sm:p-8`}>
        <h1 className="text-2xl font-bold tracking-tight">Crie uma nova senha</h1>
        <p className="mt-2 text-sm text-muted">
          Conta: <span className="font-semibold text-foreground">{viewer.email}</span>
        </p>
        <div className="mt-4">
          <Flash erro={typeof erro === "string" ? erro : undefined} />
        </div>

        <form action={updatePassword} className="mt-4 grid gap-4">
          <div className="grid gap-1.5">
            <label htmlFor="password" className={label}>Nova senha</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} className={input} />
            <p className="text-xs text-muted">Pelo menos 8 caracteres.</p>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="confirm" className={label}>Repita a nova senha</label>
            <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} maxLength={72} className={input} />
          </div>
          <SubmitButton pendingLabel="Salvando…">Salvar nova senha</SubmitButton>
        </form>
      </div>
    </main>
  );
}
