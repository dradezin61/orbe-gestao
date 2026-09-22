import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a chave secreta: ignora as regras de segurança do banco.
 * Só pode ser usado no servidor (Server Actions), nunca em componentes de cliente.
 */
export function createAdminClient() {
  // `trim`: uma quebra de linha colada junto com a chave invalida o cabeçalho.
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), process.env.SUPABASE_SECRET_KEY!.trim(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
