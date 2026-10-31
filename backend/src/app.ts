import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { errorHandler, notFound } from "./middlewares/errorHandler";
import { limiteGeneral } from "./middlewares/rateLimit";
import routes from "./routes";
import { DIRECTORIO_UPLOADS } from "./storage/local";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL }));
  app.use(express.json({ limit: "1mb" }));
  if (env.NODE_ENV !== "test") app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

  // Modo local: las imagenes subidas se sirven desde /uploads. Helmet pone "same-origin" por defecto,
  // lo que impediria que el frontend (otro origen) las muestre, por eso se relaja solo para esta ruta.
  if (env.STORAGE_DRIVER === "local") {
    app.use(
      "/uploads",
      (_req, res, next) => {
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        next();
      },
      express.static(DIRECTORIO_UPLOADS, { maxAge: "7d", immutable: true, index: false, dotfiles: "deny" }),
    );
  }

  app.use("/api", limiteGeneral, routes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
