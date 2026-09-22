// Dados fixos da loja usados nas telas.

export const store = {
  name: "Orbe",
  tagline: "Objetos para casa e escritório",
  timeZone: "America/Sao_Paulo",
  /** Minutos que o estoque fica reservado esperando o pagamento (espelha reservation_minutes()). */
  reservationMinutes: 30,
} as const;

export const categories = ["Escritório", "Casa", "Iluminação", "Acessórios"] as const;

/** Conta de teste pública: cliente comum. O painel não tem acesso público. */
export const demoAccounts = { customer: "cliente.teste@example.com" } as const;

export const isTestAccount = (email: string) =>
  (Object.values(demoAccounts) as string[]).includes(email.trim().toLowerCase());

export const author = {
  name: "Gabriel Andrade",
  portfolio: "https://gabriel-andrade-omega.vercel.app/",
  repository: "https://github.com/dradezin61/orbe-gestao",
} as const;
