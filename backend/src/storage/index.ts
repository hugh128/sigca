import { apiPublicUrl, env } from "../config/env";
import { AlmacenamientoLocal, DIRECTORIO_UPLOADS } from "./local";
import { AlmacenamientoR2 } from "./r2";
import type { Almacenamiento } from "./tipos";

let instancia: Almacenamiento | null = null;

function crear(): Almacenamiento {
  if (env.STORAGE_DRIVER === "r2") {
    // env.ts ya garantiza que estas variables existen cuando el driver es r2
    return new AlmacenamientoR2({
      accountId: env.R2_ACCOUNT_ID!,
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      bucket: env.R2_BUCKET!,
      urlPublica: env.R2_PUBLIC_URL!,
      endpoint: env.R2_ENDPOINT,
    });
  }
  return new AlmacenamientoLocal(DIRECTORIO_UPLOADS, apiPublicUrl);
}

export function obtenerAlmacenamiento(): Almacenamiento {
  return (instancia ??= crear());
}

/** Para pruebas: reemplaza el almacenamiento. */
export function usarAlmacenamiento(a: Almacenamiento | null) {
  instancia = a;
}

export type { Almacenamiento, ArchivoGuardado } from "./tipos";
