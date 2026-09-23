import { NextResponse, type NextRequest } from "next/server";

import { RESET_COOKIE, RESET_WINDOW_SECONDS } from "@/lib/password-reset";
import { createClient } from "@/lib/supabase/server";

/** Destino do link do e-mail: troca o token (uso único) por uma sessão e abre a tela de nova senha. */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const target = request.nextUrl.clone();
  target.search = "";

  const supabase = await createClient();
  const { data, error } =
    tokenHash && type === "recovery"
      ? await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash })
      : { data: null, error: true };

  if (error || !data?.user) {
    target.pathname = "/esqueci-senha";
    target.searchParams.set("erro", "link_invalido");
    return NextResponse.redirect(target);
  }

  target.pathname = "/redefinir-senha";
  const response = NextResponse.redirect(target);
  response.cookies.set(RESET_COOKIE, data.user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: RESET_WINDOW_SECONDS,
  });
  return response;
}
