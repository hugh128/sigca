import { Router } from "express";
import * as ctrl from "../controllers/contacto.controller";
import { authenticate, authorize } from "../middlewares/auth";
import { limiteFormularioPublico } from "../middlewares/rateLimit";
import { validate } from "../middlewares/validate";
import { contactoBody, contactoQuery } from "../schemas/contacto.schema";

const router = Router();
router.post("/", limiteFormularioPublico, validate({ body: contactoBody }), ctrl.crear);
router.get("/", authenticate, authorize("ADMINISTRADOR"), validate({ query: contactoQuery }), ctrl.listar);
export default router;
