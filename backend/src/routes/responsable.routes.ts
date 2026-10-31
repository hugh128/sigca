import { Router } from "express";
import { z } from "zod";
import * as ctrl from "../controllers/responsable.controller";
import { authenticate, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { idParams, objectId } from "../schemas/common.schema";
import {
  actualizarResponsableBody, asociarPacienteBody, crearResponsableBody, listarResponsablesQuery,
} from "../schemas/responsable.schema";

const router = Router();

router.use(authenticate, authorize("ADMINISTRADOR", "RECEPCIONISTA"));

router.get("/", validate({ query: listarResponsablesQuery }), ctrl.listar);
router.get("/:id", validate({ params: idParams }), ctrl.obtener);
router.post("/", validate({ body: crearResponsableBody }), ctrl.crear);
router.put("/:id", validate({ params: idParams, body: actualizarResponsableBody }), ctrl.actualizar);
router.post("/:id/pacientes", validate({ params: idParams, body: asociarPacienteBody }), ctrl.asociarPaciente);
router.delete(
  "/:id/pacientes/:pacienteId",
  validate({ params: z.object({ id: objectId, pacienteId: objectId }) }),
  ctrl.desasociarPaciente,
);

export default router;
