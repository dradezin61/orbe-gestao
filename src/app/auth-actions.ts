"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { demoAccounts } from "@/lib/store";

const credentials = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8).max(72),
});

const signUpSchema = credentials.extend({
  fullName: z.string().trim().min(2).max(80),
});

/** Depois de entrar, volta para onde a pessoa estava (só caminhos internos). */
function destino(returnTo: FormDataEntryValue | null) {
  return typeof returnTo === "string" && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
}

async function signInAndGo(email: string, password: string, errorTarget: string, target: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`${errorTarget}?erro=credenciais`);
  redirect(target);
}

export async function signIn(formData: FormData) {
  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) redirect("/entrar?erro=credenciais");
  await signInAndGo(parsed.data.email, parsed.data.password, "/entrar", destino(formData.get("returnTo")));
}

/** Conta de teste pública: cliente comum. O painel não é oferecido publicamente. */
export async function signInDemo(formData: FormData) {
  const password = process.env.DEMO_PASSWORD;
  if (!password) redirect("/entrar?erro=demo_indisponivel");
  await signInAndGo(demoAccounts.customer, password, "/entrar", destino(formData.get("returnTo")));
}

export async function signUp(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/cadastro?erro=dados_invalidos");
  const { fullName, email, password } = parsed.data;

  // Conta já confirmada: a loja é uma demonstração e não há domínio próprio
  // para o e-mail de ativação do Supabase.
  const { error } = await createAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  const alreadyExists = error?.code === "email_exists" || error?.code === "user_already_exists";
  if (error && !alreadyExists) {
    redirect(`/cadastro?erro=${error.code === "weak_password" ? "senha_fraca" : "erro_inesperado"}`);
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) redirect(`/cadastro?erro=${alreadyExists ? "email_em_uso" : "erro_inesperado"}`);
  redirect(`${destino(formData.get("returnTo"))}?ok=bem_vindo`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
