import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

/** «Página 2 de 5 · 93 resultados» con botones anterior/siguiente. */
export function Paginacion({ page, pages, total, onCambiar, etiqueta = "resultados" }: {
  page: number; pages: number; total: number; onCambiar: (pagina: number) => void; etiqueta?: string;
}) {
  return (
    <nav aria-label="Paginación" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-soft">
      <p aria-live="polite">
        {total === 0 ? "Sin resultados" : `Página ${page} de ${pages} · ${total} ${total === 1 ? etiqueta.replace(/s$/, "") : etiqueta}`}
      </p>
      <div className="flex gap-2">
        <Button variante="contorno" disabled={page <= 1} onClick={() => onCambiar(page - 1)}>
          <ChevronLeft className="size-4" aria-hidden="true" />
          Anterior
        </Button>
        <Button variante="contorno" disabled={page >= pages} onClick={() => onCambiar(page + 1)}>
          Siguiente
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
