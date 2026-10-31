import { Router } from "express";
import * as ctrl from "../controllers/contenido.controller";
import { authenticate, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { contenidoParams } from "../schemas/contenido.schema";

const router = Router();

// Lectura publica: la consume el portal.
router.get("/", ctrl.obtenerTodo);
router.get("/:clave", validate({ params: contenidoParams }), ctrl.obtener);

// Edicion: solo administrador. El cuerpo se valida dentro del servicio segun la clave.
router.put("/:clave", authenticate, authorize("ADMINISTRADOR"), validate({ params: contenidoParams }), ctrl.guardar);

export default router;
