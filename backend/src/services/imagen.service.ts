import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { obtenerAlmacenamiento } from "../storage";
import { AppError } from "../utils/AppError";

/** Carpetas permitidas: ordenan el almacenamiento y evitan que el cliente invente rutas. */
export const CARPETAS_IMAGEN = [
  "general", // logo
  "carrusel",
  "servicios",
  "corporativo",
  "publicaciones",
  "pacientes",
  "responsables",
  "materiales",
] as const;
export type CarpetaImagen = (typeof CARPETAS_IMAGEN)[number];

export const MAX_BYTES_IMAGEN = 5 * 1024 * 1024; // 5 MB
const FORMATOS_ACEPTADOS = new Set(["jpeg", "png", "webp", "gif"]);
const LADO_MAXIMO = 1600;
/** Rechaza imagenes "bomba" (poco peso pero millones de pixeles al descomprimirse). */
const MAX_PIXELES = 40_000_000;

export interface ImagenSubida {
  url: string;
  key: string;
  ancho: number;
  alto: number;
  bytes: number;
}

/**
 * Valida que el archivo sea realmente una imagen (se decodifica, no se confia en el nombre ni en el
 * tipo que declara el navegador), la orienta, la reduce a 1600 px como maximo, elimina sus metadatos
 * (EXIF: ubicacion GPS, modelo de camara...) y la guarda como WebP. SVG no se acepta (puede llevar scripts).
 */
export async function subirImagen(contenido: Buffer, carpeta: CarpetaImagen): Promise<ImagenSubida> {
  let formato: string | undefined;
  try {
    formato = (await sharp(contenido, { limitInputPixels: MAX_PIXELES }).metadata()).format;
  } catch {
    throw AppError.unprocessable("El archivo no es una imagen válida o es demasiado grande en píxeles");
  }
  if (!formato || !FORMATOS_ACEPTADOS.has(formato)) {
    throw AppError.unprocessable("Formato no admitido. Usa una imagen JPG, PNG, WebP o GIF");
  }

  const { data, info } = await sharp(contenido, { limitInputPixels: MAX_PIXELES })
    .rotate() // aplica la orientacion EXIF antes de quitar los metadatos
    .resize({ width: LADO_MAXIMO, height: LADO_MAXIMO, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  const key = `${carpeta}/${new Date().getFullYear()}/${randomUUID()}.webp`;
  const guardado = await obtenerAlmacenamiento().guardar(key, data, "image/webp");
  return { url: guardado.url, key: guardado.key, ancho: info.width, alto: info.height, bytes: data.length };
}
