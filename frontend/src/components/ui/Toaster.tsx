import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useToastStore, type TipoToast } from "@/store/toast";

const ESTILOS: Record<TipoToast, string> = {
  exito: "border-ok bg-ok-soft text-ink",
  error: "border-danger bg-danger-soft text-ink",
  info: "border-marea-500 bg-marea-50 text-ink",
};
const ICONOS = { exito: CircleCheck, error: CircleAlert, info: Info } as const;
const COLOR_ICONO: Record<TipoToast, string> = { exito: "text-ok", error: "text-danger", info: "text-marea-700" };

/** Avisos de confirmacion y error. `role=status` hace que los lectores de pantalla los anuncien. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const quitar = useToastStore((s) => s.quitar);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
      {toasts.map((t) => {
        const Icono = ICONOS[t.tipo];
        return (
          <div key={t.id} className={cn("pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border-l-4 px-4 py-3 text-sm shadow-lg", ESTILOS[t.tipo])}>
            <Icono className={cn("mt-0.5 size-5 shrink-0", COLOR_ICONO[t.tipo])} aria-hidden="true" />
            <p className="flex-1">{t.mensaje}</p>
            <button type="button" onClick={() => quitar(t.id)} className="rounded p-0.5 text-ink-soft hover:text-ink" aria-label="Cerrar aviso">
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
