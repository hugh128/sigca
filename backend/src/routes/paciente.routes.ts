import { Router } from "express";
import * as ctrl from "../controllers/paciente.controller";
import { authenticate, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { idParams, objectId } from "../schemas/common.schema";
import {
  actualizarPacienteBody, asociarResponsableBody, crearPacienteBody, estadoPacienteBody, listarPacientesQuery,
} from "../schemas/paciente.schema";
import { z } from "zod";

const router = Router();

router.use(authenticate);

// Consulta: el profesional ve solo informacion basica de los pacientes que atiende (lo aplica el servicio).
const lectura = authorize("ADMINISTRADOR", "RECEPCIONISTA", "PROFESIONAL");
router.get("/", lectura, validate({ query: listarPacientesQuery }), ctrl.listar);
router.get("/:id", lectura, validate({ params: idParams }), ctrl.obtener);

// Gestion de pacientes: administrador y recepcion.
router.use(authorize("ADMINISTRADOR", "RECEPCIONISTA"));
router.post("/", validate({ body: crearPacienteBody }), ctrl.crear);
router.put("/:id", validate({ params: idParams, body: actualizarPacienteBody }), ctrl.actualizar);
router.patch("/:id/estado", validate({ params: idParams, body: estadoPacienteBody }), ctrl.cambiarEstado);
router.post("/:id/responsables", validate({ params: idParams, body: asociarResponsableBody }), ctrl.asociarResponsable);
router.delete(
  "/:id/responsables/:responsableId",
  validate({ params: z.object({ id: objectId, responsableId: objectId }) }),
  ctrl.desasociarResponsable,
);

export default router;
