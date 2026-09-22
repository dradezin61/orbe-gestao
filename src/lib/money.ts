const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Centavos para "R$ 289,00". Preço é inteiro em centavos do banco ao Stripe. */
export const formatMoney = (cents: number) => brl.format(cents / 100);

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" }).format(
    new Date(value),
  );
