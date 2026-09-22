import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Cliente do Supabase com a sessão do usuário (cookies). Respeita as regras de segurança do banco. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!.trim(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Em Server Components não dá para gravar cookies; o proxy renova a sessão.
          }
        },
      },
    },
  );
}
