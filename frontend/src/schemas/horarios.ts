import { z } from "zod";

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Elige una hora");

const franja = z
  .object({ inicio: hora, fin: hora })
  .refine((f) => f.inicio < f.fin, { message: "La hora de fin debe ser posterior a la de inicio", path: ["fin"] });

const dia = z
  .object({
    dia: z.enum(["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"]),
    atiende: z.boolean(),
    franjas: z.array(franja).max(4, "Máximo 4 franjas por día"),
  })
  .superRefine((d, ctx) => {
    if (d.atiende && d.franjas.length === 0) {
      ctx.addIssue({ code: "custom", path: ["franjas"], message: "Agrega al menos una franja de atención" });
    }
    const ordenadas = [...d.franjas].sort((a, b) => a.inicio.localeCompare(b.inicio));
    for (let i = 1; i < ordenadas.length; i++) {
      if (ordenadas[i]!.inicio < ordenadas[i - 1]!.fin) {
        ctx.addIssue({ code: "custom", path: ["franjas"], message: "Las franjas de un mismo día no pueden traslaparse" });
        break;
      }
    }
  });

export const horariosSchema = z.object({ dias: z.array(dia).length(7) });
