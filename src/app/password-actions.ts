"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { getViewer } from "@/lib/auth";
import { sendPasswordReset } from "@/lib/email";
import { RESET_COOKIE } from "@/lib/password-reset";
import { isTestAccount } from "@/lib/store";
import { siteOrigin } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(formData: FormData) {
  const parsed = z.string().trim().toLowerCase().pipe(z.email()).safeParse(formData.get("email"));
  if (!parsed.success) redirect("/esqueci-senha?erro=dados_invalidos");
  const email = parsed.data;

  // A resposta é sempre a mesma, exista a conta ou não, para a tela não revelar
  // quais e-mails estão cadastrados. A conta de teste não troca de senha.
  if (!isTestAccount(email)) {
    const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "recovery", email });
    if (!error && data.properties?.hashed_token) {
      const origin = siteOrigin((await headers()).get("host"));
      const link = `${origin}/auth/confirmar?token_hash=${data.properties.hashed_token}&type=recovery`;
      const fullName = data.user.user_metadata?.full_name;
      const name = typeof fullName === "string" && fullName ? fullName : "tudo bem";
      after(() => sendPasswordReset(email, name, link));
    }
  }

  redirect("/esqueci-senha?ok=link_enviado");
}

const newPasswordSchema = z.object({
  password: z.string().min(8).max(72),
  confirm: z.string(),
});

export async function updatePassword(formData: FormData) {
  const viewer = await getViewer();
  const cookieStore = await cookies();
  if (!viewer || cookieStore.get(RESET_COOKIE)?.value !== viewer.id || isTestAccount(viewer.email)) {
    redirect("/esqueci-senha?erro=link_invalido");
  }

  const parsed = newPasswordSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) redirect("/redefinir-senha?erro=senha_fraca");
  if (parsed.data.password !== parsed.data.confirm) redirect("/redefinir-senha?erro=senhas_diferentes");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const code =
      error.code === "same_password" ? "mesma_senha" : error.code === "weak_password" ? "senha_fraca" : "erro_inesperado";
    redirect(`/redefinir-senha?erro=${code}`);
  }

  cookieStore.delete(RESET_COOKIE);
  redirect("/minha-conta?ok=senha_alterada");
}
