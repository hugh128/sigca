import { Router } from "express";
import * as ctrl from "../controllers/upload.controller";
import { authenticate, authorize } from "../middlewares/auth";
import { limiteSubidas } from "../middlewares/rateLimit";
import { recibirImagen } from "../middlewares/subida";
import { validate } from "../middlewares/validate";
import { subirImagenBody } from "../schemas/upload.schema";

const router = Router();

// El personal que registra imagenes: contenido/servicios (admin) y fotos de pacientes (recepcion).
// Orden: sesion -> permiso -> limite -> recibir archivo -> validar campos de texto.
router.post(
  "/",
  authenticate,
  authorize("ADMINISTRADOR", "RECEPCIONISTA"),
  limiteSubidas,
  recibirImagen,
  validate({ body: subirImagenBody }),
  ctrl.subir,
);

export default router;
