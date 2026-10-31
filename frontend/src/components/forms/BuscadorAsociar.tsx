import { Loader2, Search } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { useDebounce } from "@/lib/useDebounce";
import { claseControl } from "./TextField";

export interface OpcionAsociar {
  id: string;
  titulo: string;
  detalle?: string;
  /** Si la opcion ya esta asociada, no se ofrece. */
  deshabilitada?: boolean;
  motivo?: string;
}

interface Props {
  etiqueta: string;
  placeholder?: string;
  /** Resultados para el texto buscado (el padre hace la consulta con `useXxx(q)`). */
  resultados: { cargando: boolean; error?: boolean; opciones: OpcionAsociar[] };
  onBuscar: (q: string) => void;
  onElegir: (opcion: OpcionAsociar) => void;
  elegir?: string;
  asociando?: boolean;
  vacio?: ReactNode;
}

/**
 * Busca registros existentes y permite elegir uno para asociarlo (p. ej. un responsable a un paciente).
 * El texto se envia al padre con retraso para no consultar en cada tecla.
 */
export function BuscadorAsociar({ etiqueta, placeholder, resultados, onBuscar, onElegir, elegir = "Asociar", asociando, vacio }: Props) {
  const id = useId();
  const [texto, setTexto] = useState("");
  const retrasado = useDebounce(texto, 300);
  useEffect(() => {
    onBuscar(retrasado);
  }, [retrasado, onBuscar]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <label htmlFor={id} className="sr-only">{etiqueta}</label>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
        <input id={id} type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={placeholder ?? etiqueta}
          className={claseControl(false, "pl-10")} autoComplete="off" />
      </div>
      <div aria-live="polite">
        {resultados.cargando && (
          <p className="flex items-center gap-2 text-sm text-ink-soft"><Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Buscando…</p>
        )}
        {resultados.error && <p role="alert" className="text-sm text-danger">No pudimos buscar. Inténtalo de nuevo.</p>}
        {!resultados.cargando && !resultados.error && resultados.opciones.length === 0 && (
          <div className="text-sm text-ink-soft">{vacio ?? "No encontramos coincidencias."}</div>
        )}
      </div>
      {resultados.opciones.length > 0 && (
        <ul className="divide-y divide-marea-100 rounded-lg border border-marea-100 bg-white">
          {resultados.opciones.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{o.titulo}</p>
                {o.detalle && <p className="truncate text-sm text-ink-soft">{o.detalle}</p>}
              </div>
              {o.deshabilitada ? (
                <span className="shrink-0 text-sm text-ink-soft">{o.motivo ?? "Ya asociado"}</span>
              ) : (
                <Button variante="contorno" disabled={asociando} onClick={() => onElegir(o)} aria-label={`${elegir}: ${o.titulo}`}>
                  {elegir}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
