import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI es obligatorio"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET debe tener al menos 32 caracteres"),
  JWT_EXPIRES_IN: z.string().default("8h"),

  // --- Almacenamiento de imagenes ---
  /** "local" guarda en la carpeta /uploads (no requiere cuentas externas). "r2" usa Cloudflare R2. */
  STORAGE_DRIVER: z.enum(["local", "r2"]).default("local"),
  /** URL publica de esta API (para armar las URL de las imagenes en modo local). */
  API_PUBLIC_URL: z.url().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  /** URL publica del bucket (https://pub-xxxx.r2.dev o tu dominio propio), sin "/" final. */
  R2_PUBLIC_URL: z.url().optional(),
  /** Solo para pruebas: reemplaza https://<cuenta>.r2.cloudflarestorage.com */
  R2_ENDPOINT: z.url().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.STORAGE_DRIVER !== "r2") return;
    for (const campo of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_URL"] as const) {
      if (!v[campo]) ctx.addIssue({ code: "custom", path: [campo], message: `Es obligatorio cuando STORAGE_DRIVER=r2 (o usa STORAGE_DRIVER=local)` });
    }
  });

// Una variable declarada pero vacia (R2_BUCKET=) se trata como si no existiera.
const entorno = Object.fromEntries(Object.entries(process.env).filter(([, valor]) => valor !== ""));
const parsed = envSchema.safeParse(entorno);

if (!parsed.success) {
  console.error("Variables de entorno inválidas:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export const apiPublicUrl = (env.API_PUBLIC_URL ?? `http://localhost:${env.PORT}`).replace(/\/$/, "");
export const isProd = env.NODE_ENV === "production";
