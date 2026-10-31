import { Clock } from "lucide-react";
import { Link } from "react-router";
import { formatearDuracion } from "@/lib/format";
import type { Servicio } from "@/types/api";
import { MarcaOndas } from "./Marca";

/** Servicio en formato de fila: imagen, nombre, descripcion y duracion. */
export function FilaServicio({ servicio, grande = false }: { servicio: Servicio; grande?: boolean }) {
  const tam = grande ? "size-28 sm:size-36" : "size-20";
  return (
    <li className="flex gap-4 py-5 sm:gap-6">
      {servicio.imagenUrl ? (
        <img src={servicio.imagenUrl} alt="" loading="lazy" className={`${tam} shrink-0 rounded-xl object-cover`} />
      ) : (
        <div className={`${tam} grid shrink-0 place-items-center rounded-xl bg-marea-100 text-marea-500`}>
          <MarcaOndas className="size-1/2" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <h3 className="text-lg font-medium text-marea-900">{servicio.nombre}</h3>
          <p className="flex items-center gap-1.5 text-sm text-ink-soft">
            <Clock className="size-4" aria-hidden="true" />
            <span>{formatearDuracion(servicio.duracionMin)}</span>
          </p>
        </div>
        <p className={`mt-1.5 max-w-2xl font-serif leading-relaxed text-ink-soft ${grande ? "" : "line-clamp-2"}`}>
          {servicio.descripcion}
        </p>
        <Link to={`/solicitar-cita?servicio=${servicio.id}`} className="mt-3 inline-block rounded text-sm font-medium text-marea-700 underline underline-offset-4" aria-label={`Solicitar cita de ${servicio.nombre}`}>Solicitar cita</Link>
      </div>
    </li>
  );
}
