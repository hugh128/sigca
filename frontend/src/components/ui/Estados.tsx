import { CircleAlert, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api";
import { Button } from "./Button";

export function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-ink-soft">
      <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}

export function ErrorCarga({ error, onReintentar }: { error: unknown; onReintentar?: () => void }) {
  const mensaje = error instanceof ApiError ? error.message : "No pudimos cargar la información.";
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <CircleAlert className="size-8 text-danger" aria-hidden="true" />
      <p className="text-ink">{mensaje}</p>
      {onReintentar && (
        <Button variante="contorno" onClick={onReintentar}>
          Intentar de nuevo
        </Button>
      )}
    </div>
  );
}

export function Vacio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="font-medium text-ink">{titulo}</p>
      {children && <div className="mt-2 text-sm text-ink-soft">{children}</div>}
    </div>
  );
}
