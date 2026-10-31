import { Loader2 } from "lucide-react";
import { useEffect, useId } from "react";
import { useDisponibilidad, type ParamsDisponibilidad } from "@/api/citas";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api";
import { formatearHora } from "@/lib/format";

interface Props {
  params: Partial<ParamsDisponibilidad>;
  valor: string;
  onElegir: (horaInicio: string) => void;
  error?: string;
  enviando?: boolean;
}

/**
 * Horarios libres del profesional para ese servicio y fecha, ya filtrados por el servidor
 * (horario de atencion, citas existentes y hora actual). Elegir uno garantiza una cita valida.
 */
export function HorariosDisponibles({ params, valor, onElegir, error, enviando = false }: Props) {
  const nombre = useId();
  const q = useDisponibilidad(params);
  const horarios = q.data?.horarios ?? [];

  // Si el horario elegido deja de estar libre (alguien mas lo tomo), se deselecciona
  useEffect(() => {
    // Al guardar, el propio horario reservado desaparece del listado. No invalidar
    // el formulario mientras espera que terminen las consultas posteriores al guardado.
    if (!enviando && q.data && valor && !q.data.horarios.some((h) => h.horaInicio === valor)) onElegir("");
  }, [q.data, valor, onElegir, enviando]);

  const grupos = [
    { titulo: "Mañana", items: horarios.filter((h) => h.horaInicio < "12:00") },
    { titulo: "Tarde", items: horarios.filter((h) => h.horaInicio >= "12:00") },
  ].filter((g) => g.items.length > 0);

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-ink">Horario disponible</legend>

      {!params.profesionalId || !params.servicioId || !params.fecha ? (
        <p className="rounded-lg bg-marea-50 px-3 py-2.5 text-sm text-ink-soft">Elige el servicio, el profesional y la fecha para ver los horarios libres.</p>
      ) : q.isError ? (
        <div role="alert" className="space-y-2 text-sm text-danger">
          <p>{q.error instanceof ApiError ? q.error.message : "No pudimos consultar los horarios."}</p>
          <Button variante="contorno" onClick={() => q.refetch()}>Intentar de nuevo</Button>
        </div>
      ) : q.isPending ? (
        <p role="status" className="flex items-center gap-2 text-sm text-ink-soft">
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Buscando horarios…
        </p>
      ) : horarios.length === 0 ? (
        <p role="status" className="rounded-lg bg-sol-100 px-3 py-2.5 text-sm">
          No hay horarios disponibles ese día. Prueba con otra fecha o con otro profesional.
        </p>
      ) : (
        <div className="space-y-3">
          <p role="status" className="sr-only">{horarios.length} horarios disponibles</p>
          {grupos.map((g) => (
            <div key={g.titulo}>
              <p className="mb-1.5 text-sm text-ink-soft">{g.titulo}</p>
              <div className="flex flex-wrap gap-2">
                {g.items.map((h) => (
                  <label key={h.horaInicio} className="cursor-pointer">
                    <input type="radio" name={nombre} value={h.horaInicio} checked={valor === h.horaInicio} onChange={() => onElegir(h.horaInicio)} className="peer sr-only" />
                    <span className="block rounded-lg border border-marea-200 bg-white px-3 py-2 text-sm transition-colors hover:border-marea-500 peer-checked:border-marea-700 peer-checked:bg-marea-700 peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-marea-500">
                      {formatearHora(h.horaInicio)} – {formatearHora(h.horaFin)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </fieldset>
  );
}
