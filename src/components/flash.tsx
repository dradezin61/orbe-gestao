import { errorMessage, successMessage } from "@/lib/messages";

/** Mensagem de retorno das ações, lida dos parâmetros ?ok= e ?erro= da URL. */
export function Flash({ ok, erro }: { ok?: string; erro?: string }) {
  const error = errorMessage(erro);
  const success = error ? null : successMessage(ok);
  if (!error && !success) return null;

  return (
    <div
      role={error ? "alert" : "status"}
      className={`rounded-lg border px-4 py-3 text-sm font-medium ${
        error ? "border-danger/30 bg-danger-soft text-danger" : "border-success/30 bg-success-soft text-success"
      }`}
    >
      {error ?? success}
    </div>
  );
}
