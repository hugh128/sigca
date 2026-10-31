import { Router } from "express";
import authRoutes from "./auth.routes";
import citaRoutes from "./cita.routes";
import contactoRoutes from "./contacto.routes";
import solicitudRoutes from "./solicitud.routes";
import materialRoutes from "./material.routes";
import contenidoRoutes from "./contenido.routes";
import horarioRoutes from "./horario.routes";
import pacienteRoutes from "./paciente.routes";
import responsableRoutes from "./responsable.routes";
import servicioRoutes from "./servicio.routes";
import uploadRoutes from "./upload.routes";
import usuarioRoutes from "./usuario.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", servicio: "sigca-api", fecha: new Date().toISOString() });
});

router.use("/auth", authRoutes);
router.use("/contacto", contactoRoutes);
router.use("/solicitudes-cita", solicitudRoutes);
router.use("/materiales", materialRoutes);
router.use("/usuarios", usuarioRoutes);
router.use("/servicios", servicioRoutes);
router.use("/contenido", contenidoRoutes);
router.use("/horarios", horarioRoutes);
router.use("/uploads", uploadRoutes);
router.use("/pacientes", pacienteRoutes);
router.use("/citas", citaRoutes);
router.use("/responsables", responsableRoutes);

export default router;
