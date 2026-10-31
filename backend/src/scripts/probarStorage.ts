/**
 * Verifica TU configuracion de almacenamiento (la de .env): sube una imagen de prueba, la descarga por su
 * URL publica y la elimina. Con STORAGE_DRIVER=r2 sirve para confirmar que las credenciales y la URL publica
 * del bucket estan bien antes de usar el sistema.
 *
 *   npm run storage:probar
 */
import sharp from "sharp";
import { env } from "../config/env";
import { subirImagen } from "../services/imagen.service";
import { obtenerAlmacenamiento } from "../storage";

async function main() {
  const almacenamiento = obtenerAlmacenamiento();
  console.log(`Almacenamiento configurado: ${almacenamiento.nombre}\n`);

  const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 23, g: 82, b: 91 } } }).png().toBuffer();

  let key: string | undefined;
  try {
    const r = await subirImagen(png, "general");
    key = r.key;
    console.log(`OK  subida:      ${r.url}  (${r.ancho}x${r.alto}, ${r.bytes} bytes)`);

    if (env.STORAGE_DRIVER === "local") {
      console.log("--  descarga:    en modo local la imagen se sirve desde la API; inicia el servidor (npm run dev) y abre la URL de arriba.");
    } else {
      const respuesta = await fetch(r.url);
      if (!respuesta.ok) {
        throw new Error(
          `la imagen se subió, pero su URL pública responde ${respuesta.status}. Revisa R2_PUBLIC_URL y que el bucket tenga acceso público (r2.dev o dominio propio).`,
        );
      }
      console.log(`OK  descarga:    ${respuesta.status} ${respuesta.headers.get("content-type")}`);
    }
  } catch (e) {
    console.error(`\nFALLO: ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  } finally {
    if (key) {
      await almacenamiento.eliminar(key).then(
        () => console.log("OK  eliminada:   archivo de prueba borrado"),
        (e: unknown) => console.error(`No se pudo borrar el archivo de prueba (${key}):`, e instanceof Error ? e.message : e),
      );
    }
  }
}

main().catch((e) => {
  console.error("FALLO:", e instanceof Error ? e.message : e);
  process.exit(1);
});
