import type { DiaHorario, DiaSemana, Franja } from "@/types/api";

const NOMBRE_DIA: Record<DiaSemana, string> = {
  LUNES: "lunes",
  MARTES: "martes",
  MIERCOLES: "miércoles",
  JUEVES: "jueves",
  VIERNES: "viernes",
  SABADO: "sábado",
  DOMINGO: "domingo",
};

export function nombreDia(dia: DiaSemana): string {
  return NOMBRE_DIA[dia];
}

export interface GrupoHorario {
  dias: DiaSemana[];
  atiende: boolean;
  franjas: Franja[];
  /** "Lunes a viernes", "Sábado", "Lunes y martes" */
  etiqueta: string;
}

const mismasFranjas = (a: Franja[], b: Franja[]) =>
  a.length === b.length && a.every((f, i) => f.inicio === b[i]!.inicio && f.fin === b[i]!.fin);

function etiquetaDias(dias: DiaSemana[]): string {
  const nombres = dias.map(nombreDia);
  const texto =
    nombres.length === 1 ? nombres[0]!
    : nombres.length === 2 ? `${nombres[0]} y ${nombres[1]}`
    : `${nombres[0]} a ${nombres[nombres.length - 1]}`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Agrupa dias consecutivos con el mismo horario para mostrar "Lunes a viernes 8:00 a 12:00 y 14:00 a 18:00". */
export function resumirHorarios(dias: DiaHorario[]): GrupoHorario[] {
  const grupos: GrupoHorario[] = [];
  for (const d of dias) {
    const anterior = grupos[grupos.length - 1];
    if (anterior && anterior.atiende === d.atiende && mismasFranjas(anterior.franjas, d.franjas)) {
      anterior.dias.push(d.dia);
    } else {
      grupos.push({ dias: [d.dia], atiende: d.atiende, franjas: d.franjas, etiqueta: "" });
    }
  }
  for (const g of grupos) g.etiqueta = etiquetaDias(g.dias);
  return grupos;
}
