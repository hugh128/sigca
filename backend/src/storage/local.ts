import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import type { Almacenamiento, ArchivoGuardado } from "./tipos";

export const DIRECTORIO_UPLOADS = resolve(process.cwd(), "uploads");

/** Guarda en disco (carpeta /uploads) y se sirve con express.static. Util para desarrollo y para correr sin credenciales. */
export class AlmacenamientoLocal implements Almacenamiento {
  readonly nombre = "local (carpeta uploads/)";

  constructor(
    private readonly directorio: string,
    private readonly urlPublicaApi: string,
  ) {}

  /** Evita que una llave como "../../x" escriba fuera de la carpeta de subidas. */
  private rutaSegura(key: string): string {
    const base = resolve(this.directorio);
    const ruta = resolve(base, key);
    if (!ruta.startsWith(base + sep)) throw new Error(`Llave de archivo no permitida: ${key}`);
    return ruta;
  }

  async guardar(key: string, contenido: Buffer): Promise<ArchivoGuardado> {
    const ruta = this.rutaSegura(key);
    await mkdir(dirname(ruta), { recursive: true });
    await writeFile(ruta, contenido);
    return { key, url: `${this.urlPublicaApi}/uploads/${key}` };
  }

  async eliminar(key: string): Promise<void> {
    await rm(this.rutaSegura(key), { force: true });
  }
}
