import { Router } from "express";
import * as ctrl from "../controllers/usuario.controller";
import { authenticate, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { idParams } from "../schemas/common.schema";
import {
  actualizarUsuarioBody,
  crearUsuarioBody,
  estadoUsuarioBody,
  listarUsuariosQuery,
  resetPasswordBody,
} from "../schemas/usuario.schema";

const router = Router();

router.use(authenticate);

// Lectura basica de profesionales: recepcion la necesita para programar citas.
// Va ANTES de "/:id" para que "profesionales" no se interprete como un id.
router.get("/profesionales", authorize("ADMINISTRADOR", "RECEPCIONISTA"), ctrl.listarProfesionales);

// El resto de la gestion de usuarios es exclusiva del administrador.
router.use(authorize("ADMINISTRADOR"));

router.get("/", validate({ query: listarUsuariosQuery }), ctrl.listar);
router.get("/:id", validate({ params: idParams }), ctrl.obtener);
router.post("/", validate({ body: crearUsuarioBody }), ctrl.crear);
router.put("/:id", validate({ params: idParams, body: actualizarUsuarioBody }), ctrl.actualizar);
router.patch("/:id/estado", validate({ params: idParams, body: estadoUsuarioBody }), ctrl.cambiarEstado);
router.patch("/:id/password", validate({ params: idParams, body: resetPasswordBody }), ctrl.restablecerPassword);

export default router;
