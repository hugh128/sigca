import { z } from "zod";
export const materialSchema = z.object({
  titulo: z.string().trim().min(2, "Escribe un título").max(160),
  descripcion: z.string().trim().min(3, "Escribe una descripción").max(2000),
  tipo: z.string().trim().min(2, "Indica el tipo de recurso").max(60),
  enlace: z.string().trim().max(2000).pipe(z.httpUrl("Usa un enlace http o https válido")).refine(v => {
    try { const url = new URL(v); return !url.username && !url.password; } catch { return false; }
  }, "El enlace no debe incluir credenciales"),
});
export type DatosMaterial = z.infer<typeof materialSchema>;
