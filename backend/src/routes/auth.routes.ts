import { Router } from "express";
import * as ctrl from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth";
import { limiteLogin } from "../middlewares/rateLimit";
import { validate } from "../middlewares/validate";
import { loginBody } from "../schemas/auth.schema";

const router = Router();

router.post("/login", limiteLogin, validate({ body: loginBody }), ctrl.login);
router.get("/me", authenticate, ctrl.me);

export default router;
