import { z } from "zod";
import { CARPETAS_IMAGEN } from "../services/imagen.service";

export const subirImagenBody = z.object({
  carpeta: z.enum(CARPETAS_IMAGEN, "Carpeta de destino inválida").default("general"),
});
