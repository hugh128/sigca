import multer from "multer";
import { MAX_BYTES_IMAGEN } from "../services/imagen.service";

/** Recibe UN archivo en el campo "archivo". Queda en memoria: se procesa y se sube sin tocar el disco. */
export const recibirImagen = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES_IMAGEN, files: 1, fields: 5, parts: 8 },
}).single("archivo");
