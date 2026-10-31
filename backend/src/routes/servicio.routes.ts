import { Router } from "express";
import * as ctrl from "../controllers/servicio.controller";
import { authenticate, authorize, optionalAuth } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { idParams } from "../schemas/common.schema";
import {
  actualizarServicioBody,
  crearServicioBody,
  estadoServicioBody,
  listarServiciosQuery,
} from "../schemas/servicio.schema";

const router = Router();

// Lectura: publica (solo activos) o con sesion (todos). Ver servicio.service.
router.get("/", optionalAuth, validate({ query: listarServiciosQuery }), ctrl.listar);
router.get("/:id", optionalAuth, validate({ params: idParams }), ctrl.obtener);

// Escritura: solo administrador.
router.post("/", authenticate, authorize("ADMINISTRADOR"), validate({ body: crearServicioBody }), ctrl.crear);
router.put(
  "/:id",
  authenticate,
  authorize("ADMINISTRADOR"),
  validate({ params: idParams, body: actualizarServicioBody }),
  ctrl.actualizar,
);
router.patch(
  "/:id/estado",
  authenticate,
  authorize("ADMINISTRADOR"),
  validate({ params: idParams, body: estadoServicioBody }),
  ctrl.cambiarEstado,
);

export default router;
