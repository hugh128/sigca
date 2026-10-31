import { api } from "@/lib/api";

export type CarpetaImagen = "general" | "carrusel" | "servicios" | "corporativo" | "publicaciones" | "pacientes" | "responsables" | "materiales";

export interface ImagenSubida {
  /** URL publica (R2 o API local). Es lo que se guarda y se muestra. */
  url: string;
  /** Llave del objeto en el almacenamiento. Se guarda junto a la URL. */
  key: string;
  ancho: number;
  alto: number;
  bytes: number;
}

export const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_MB_IMAGEN = 5;

/** Revisa el archivo antes de enviarlo (el servidor lo vuelve a validar). Devuelve el motivo del rechazo, o null. */
export function validarArchivoImagen(archivo: File): string | null {
  if (!TIPOS_IMAGEN.includes(archivo.type)) return "Elige una imagen JPG, PNG, WebP o GIF.";
  if (archivo.size > MAX_MB_IMAGEN * 1024 * 1024) return `La imagen pesa demasiado. El máximo es de ${MAX_MB_IMAGEN} MB.`;
  if (archivo.size === 0) return "El archivo está vacío.";
  return null;
}

export function subirImagen(archivo: File, carpeta: CarpetaImagen): Promise<ImagenSubida> {
  const datos = new FormData();
  datos.append("carpeta", carpeta); // los campos de texto van ANTES del archivo
  datos.append("archivo", archivo);
  return api<ImagenSubida>("/uploads", { method: "POST", body: datos });
}
