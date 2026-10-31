import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { ClaveContenido } from "../models/ContenidoInstitucional";

const texto = (max: number) => z.string().trim().min(1, "Campo obligatorio").max(max, `Máximo ${max} caracteres`);
const textoOpcional = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`).default("");

const urlOpcional = z
  .union([z.url("URL inválida"), z.literal("")])
  .transform((v) => (v === "" ? undefined : v))
  .optional();

/** Los elementos de las listas reciben un id automatico si no lo traen. */
const id = z.string().trim().min(1).max(60).default(() => randomUUID());

const imagen = z.object({
  id,
  url: z.url("URL de imagen inválida"),
  /** Llave del objeto en el almacenamiento (R2), si la imagen fue subida desde el sistema. */
  key: z.string().trim().max(300).optional(),
  alt: textoOpcional(200),
});

const general = z.object({
  nombreCentro: texto(120),
  eslogan: textoOpcional(200),
  logoUrl: urlOpcional,
  logoKey: z.string().trim().max(300).optional(),
  textoPiePagina: textoOpcional(300),
  notaHorarios: textoOpcional(300),
});

const inicio = z.object({
  titulo: texto(150),
  subtitulo: textoOpcional(250),
  descripcion: textoOpcional(1500),
  carrusel: z.array(imagen).min(5, "El carrusel debe tener al menos 5 imágenes").max(12, "Máximo 12 imágenes"),
});

const misionVision = z.object({ mision: texto(2000), vision: texto(2000) });

const contacto = z.object({
  direccion: texto(250),
  telefono: texto(30),
  correo: z.email("Correo electrónico inválido"),
  whatsapp: textoOpcional(30),
  facebook: urlOpcional,
  instagram: urlOpcional,
  mapaUrl: urlOpcional,
});

const bloqueCorporativo = z.object({
  descripcion: textoOpcional(2000),
  actividades: z.array(z.object({ id, titulo: texto(150), descripcion: texto(1000) })).max(30).default([]),
  imagenes: z.array(imagen).max(12).default([]),
});

const corporativo = z.object({ capacitaciones: bloqueCorporativo, escuelaPadres: bloqueCorporativo });

const educativo = z.object({
  publicaciones: z
    .array(
      z.object({
        id,
        titulo: texto(150),
        descripcion: texto(3000),
        /** AAAA-MM-DD */
        fechaPublicacion: z.iso.date("Fecha inválida, usa el formato AAAA-MM-DD"),
        imagenUrl: urlOpcional,
        imagenKey: z.string().trim().max(300).optional(),
        enlaceUrl: urlOpcional,
      }),
    )
    .max(100),
});

export const esquemasContenido = { general, inicio, misionVision, contacto, corporativo, educativo } satisfies Record<
  ClaveContenido,
  z.ZodType
>;

export const contenidoParams = z.object({
  clave: z.enum(Object.keys(esquemasContenido) as [ClaveContenido, ...ClaveContenido[]], "Sección de contenido inválida"),
});
