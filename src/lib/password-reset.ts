/**
 * Marca, por 15 minutos, que a sessão atual veio de um link de redefinição de
 * senha válido. Guarda o id do usuário para não valer para outra conta.
 */
export const RESET_COOKIE = "orbe_pw_reset";
export const RESET_WINDOW_SECONDS = 15 * 60;
