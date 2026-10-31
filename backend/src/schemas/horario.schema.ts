import { z } from "zod";
import { DIAS_SEMANA } from "../models/Horario";

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato de hora inválido, usa HH:mm (24 horas)");

const franja = z
  .object({ inicio: hora, fin: hora })
  // "HH:mm" se puede comparar como texto
  .refine((f) => f.inicio < f.fin, { message: "La hora de inicio debe ser menor a la de finalización", path: ["fin"] });

const diaSchema = z
  .object({
    dia: z.enum(DIAS_SEMANA, "Día inválido"),
    atiende: z.boolean("Debe ser verdadero o falso"),
    franjas: z.array(franja).max(4, "Máximo 4 franjas por día").default([]),
  })
  .superRefine((d, ctx) => {
    if (d.atiende && d.franjas.length === 0) {
      ctx.addIssue({ code: "custom", path: ["franjas"], message: "Un día con atención necesita al menos una franja" });
    }
    const ordenadas = [...d.franjas].sort((a, b) => a.inicio.localeCompare(b.inicio));
    for (let i = 1; i < ordenadas.length; i++) {
      if (ordenadas[i]!.inicio < ordenadas[i - 1]!.fin) {
        ctx.addIssue({ code: "custom", path: ["franjas"], message: "Las franjas de un mismo día no pueden traslaparse" });
        break;
      }
    }
  })
  // Normaliza: dias sin atencion no guardan franjas y las franjas quedan ordenadas.
  .transform((d) => ({
    dia: d.dia,
    atiende: d.atiende,
    franjas: d.atiende ? [...d.franjas].sort((a, b) => a.inicio.localeCompare(b.inicio)) : [],
  }));

export const guardarSemanaBody = z.object({
  dias: z
    .array(diaSchema)
    .length(7, "Debes enviar los 7 días de la semana")
    .refine((dias) => new Set(dias.map((d) => d.dia)).size === 7, "No puede repetirse ningún día"),
});
