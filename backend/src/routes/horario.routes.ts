import { Router } from "express";
import * as ctrl from "../controllers/horario.controller";
import { authenticate, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { guardarSemanaBody } from "../schemas/horario.schema";

const router = Router();

router.get("/", ctrl.obtener); // publico
router.put("/", authenticate, authorize("ADMINISTRADOR"), validate({ body: guardarSemanaBody }), ctrl.guardar);

export default router;
