import { Router } from "express";
import * as ctrl from "../controllers/cita.controller";
import { authenticate, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { actualizarCitaBody, crearCitaBody, disponibilidadQuery, estadoCitaBody, listarCitasQuery } from "../schemas/cita.schema";
import { idParams } from "../schemas/common.schema";

const router = Router();
router.use(authenticate);

// El profesional solo ve y completa SUS citas (el servicio lo aplica); administracion y recepcion gestionan todas.
const personal = authorize("ADMINISTRADOR", "RECEPCIONISTA", "PROFESIONAL");
const gestion = authorize("ADMINISTRADOR", "RECEPCIONISTA");

router.get("/", personal, validate({ query: listarCitasQuery }), ctrl.listar);
// "disponibilidad" va antes de "/:id" para que no se tome como un identificador
router.get("/disponibilidad", gestion, validate({ query: disponibilidadQuery }), ctrl.disponibilidad);
router.get("/:id", personal, validate({ params: idParams }), ctrl.obtener);
router.post("/", gestion, validate({ body: crearCitaBody }), ctrl.crear);
router.put("/:id", gestion, validate({ params: idParams, body: actualizarCitaBody }), ctrl.actualizar);
// Que estado puede asignar cada rol lo decide el servicio (confirmar/cancelar: recepcion; completar: profesional)
router.patch("/:id/estado", personal, validate({ params: idParams, body: estadoCitaBody }), ctrl.cambiarEstado);

export default router;
