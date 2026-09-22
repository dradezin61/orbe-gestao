import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type Viewer = {
  id: string;
  email: string;
  fullName: string;
  role: "customer" | "admin";
};

/** Usuário logado (ou null). `getClaims` valida o token antes de confiar nele. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", claims.sub)
    .single<{ full_name: string; role: Viewer["role"] }>();
  if (!profile) return null;

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    fullName: profile.full_name,
    role: profile.role,
  };
});

export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar");
  return viewer;
}

export async function requireAdmin() {
  const viewer = await requireViewer();
  if (viewer.role !== "admin") redirect("/minha-conta?erro=forbidden");
  return viewer;
}
