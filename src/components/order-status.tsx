export type OrderStatus = "aguardando" | "pago" | "enviado" | "cancelado";

const estilos: Record<OrderStatus, { rotulo: string; classe: string }> = {
  aguardando: { rotulo: "Aguardando pagamento", classe: "border-accent/40 bg-accent/10 text-accent" },
  pago: { rotulo: "Pago", classe: "border-success/30 bg-success-soft text-success" },
  enviado: { rotulo: "Enviado", classe: "border-brand/30 bg-brand-soft text-brand" },
  cancelado: { rotulo: "Cancelado", classe: "border-border bg-surface-muted text-muted" },
};

/** O rótulo carrega o significado; a cor só reforça. */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { rotulo, classe } = estilos[status] ?? estilos.aguardando;
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${classe}`}>{rotulo}</span>;
}
