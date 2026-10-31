import { z } from "zod";
import { quetzalesACentavos } from "@/lib/dinero";

/**
 * El formulario trabaja con texto (lo que se escribe). `servicioFormSchema.parse(valores)`
 * entrega los tipos que espera la API: minutos como numero y precio en centavos.
 */
export const servicioFormSchema = z.object({
  nombre: z.string().trim().min(2, "Escribe el nombre del servicio (mínimo 2 caracteres)").max(120, "Máximo 120 caracteres"),
  descripcion: z.string().trim().min(1, "Escribe una descripción").max(1000, "Máximo 1000 caracteres"),
  duracionMin: z
    .string()
    .trim()
    .regex(/^\d+$/, "Escribe la duración en minutos, solo números")
    .transform(Number)
    .pipe(z.number().min(5, "La duración mínima es de 5 minutos").max(480, "La duración máxima es de 480 minutos (8 horas)")),
  precio: z
    .string()
    .trim()
    .min(1, "Escribe el precio")
    .transform((v, ctx) => {
      const centavos = quetzalesACentavos(v);
      if (centavos === null) {
        ctx.issues.push({ code: "custom", input: v, message: "Escribe un monto válido, por ejemplo 250 o 250.50" });
        return z.NEVER;
      }
      if (centavos <= 0) {
        ctx.issues.push({ code: "custom", input: v, message: "El precio debe ser mayor a cero" });
        return z.NEVER;
      }
      return centavos;
    }),
  imagenUrl: z.union([z.literal(""), z.url("Escribe una dirección web válida, por ejemplo https://…")]),
  imagenKey: z.string(),
});

export type ServicioFormValores = z.input<typeof servicioFormSchema>;
