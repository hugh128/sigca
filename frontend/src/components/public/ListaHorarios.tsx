import { formatearHora } from "@/lib/format";
import { resumirHorarios } from "@/lib/horarios";
import type { DiaHorario, Franja } from "@/types/api";

export function textoFranjas(franjas: Franja[]): string {
  return franjas.map((f) => `${formatearHora(f.inicio)} a ${formatearHora(f.fin)}`).join(" y ");
}

/** Horarios agrupados por dias consecutivos iguales: "Lunes a viernes — 8:00 a. m. a 12:00 p. m. y ...". */
export function ListaHorarios({ dias }: { dias: DiaHorario[] }) {
  const grupos = resumirHorarios(dias);
  return (
    <dl className="divide-y divide-marea-100">
      {grupos.map((g) => (
        <div key={g.dias.join("-")} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-6">
          <dt className="font-medium text-marea-900 sm:w-44 sm:shrink-0">{g.etiqueta}</dt>
          <dd className="text-ink-soft">{g.atiende ? textoFranjas(g.franjas) : "Sin atención"}</dd>
        </div>
      ))}
    </dl>
  );
}
