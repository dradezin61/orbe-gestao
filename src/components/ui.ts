// Classes compartilhadas de botões e superfícies.
const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50";

export const btnPrimary = `${base} bg-brand text-white hover:bg-brand-strong`;
export const btnSecondary = `${base} border border-border bg-surface text-foreground hover:bg-surface-muted`;
export const btnDanger = `${base} border border-danger/30 bg-surface text-danger hover:bg-danger-soft`;
export const btnGhost = `${base} text-brand hover:bg-brand-soft`;
export const card = "rounded-xl border border-border bg-surface";
export const input =
  "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-foreground placeholder:text-muted/70 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand";
export const label = "text-sm font-medium text-foreground";
