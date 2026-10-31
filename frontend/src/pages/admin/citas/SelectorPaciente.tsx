import { Search, TriangleAlert } from "lucide-react";
import { useId, useState } from "react";
import { Link } from "react-router";
import { usePacientes } from "@/api/pacientes";
import { claseControl } from "@/components/forms/TextField";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { textoEdad } from "@/lib/fechas";
import { useDebounce } from "@/lib/useDebounce";
import type { Paciente } from "@/types/api";

interface Props {
  elegido: Paciente | null;
  onElegir: (p: Paciente | null) => void;
  /** Si el paciente viene dado (p. ej. desde su ficha), no se puede cambiar. */
  bloqueado?: boolean;
  error?: string;
}

/** Busca entre los pacientes ACTIVOS. Un menor sin responsable no se puede elegir (RN-04) y se explica por que. */
export function SelectorPaciente({ elegido, onElegir, bloqueado, error }: Props) {
  const id = useId();
  const [texto, setTexto] = useState("");
  const q = useDebounce(texto.trim(), 300);
  const { data, isFetching, isError } = usePacientes({ q: q || undefined, estado: "ACTIVO", limit: 6 }, );

  if (elegido) {
    return (
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-ink">Paciente</p>
        <div className="flex items-center gap-3 rounded-lg border border-marea-200 bg-white p-3">
          <Avatar nombres={elegido.nombres} apellidos={elegido.apellidos} url={elegido.fotoUrl} />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink">{elegido.nombres} {elegido.apellidos}</p>
            <p className="text-sm text-ink-soft">{textoEdad(elegido.edad)}{elegido.esMenor && " · menor de edad"}</p>
          </div>
          {!bloqueado && <Button variante="texto" onClick={() => onElegir(null)}>Cambiar<span className="sr-only"> paciente</span></Button>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-ink">Paciente</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
        <input id={id} type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por nombre, apellido o teléfono"
          autoComplete="off" aria-invalid={Boolean(error) || undefined} className={claseControl(Boolean(error), "pl-10")} />
      </div>
      <div aria-live="polite" className="text-sm text-ink-soft">
        {isFetching && "Buscando…"}
        {isError && <span className="text-danger">No pudimos buscar pacientes.</span>}
        {data && !isFetching && data.items.length === 0 && "No hay pacientes activos que coincidan."}
      </div>
      {data && data.items.length > 0 && (
        <ul className="divide-y divide-marea-100 rounded-lg border border-marea-100 bg-white">
          {data.items.map((p) => {
            const sinResponsable = p.esMenor && p.responsables.length === 0;
            return (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                <Avatar nombres={p.nombres} apellidos={p.apellidos} url={p.fotoUrl} tamano="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{p.nombres} {p.apellidos}</p>
                  {sinResponsable ? (
                    <p className="flex items-start gap-1.5 text-sm text-ink">
                      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      <span>Menor sin responsable. <Link to={`/admin/pacientes/${p.id}`} className="text-marea-700 underline underline-offset-2">Registra uno</Link> antes de programar.</span>
                    </p>
                  ) : (
                    <p className="text-sm text-ink-soft">{textoEdad(p.edad)}{p.esMenor && " · menor de edad"}</p>
                  )}
                </div>
                {!sinResponsable && (
                  <Button variante="contorno" onClick={() => onElegir(p)} aria-label={`Elegir a ${p.nombres} ${p.apellidos}`}>Elegir</Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
