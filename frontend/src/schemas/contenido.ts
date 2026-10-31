import { z } from "zod";

const urlOpcional = z.union([z.literal(""), z.url("Escribe una dirección web válida, por ejemplo https://…")]);
const obligatorio = (max: number, msg = "Este campo es obligatorio") => z.string().trim().min(1, msg).max(max, `Máximo ${max} caracteres`);
const opcional = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`);

export const imagenSchema = z.object({
  id: z.string(),
  url: z.url("Sube una imagen o escribe su dirección web"),
  key: z.string().optional(),
  alt: opcional(200),
});

export const generalSchema = z.object({
  nombreCentro: obligatorio(120, "Escribe el nombre del centro"),
  eslogan: opcional(200),
  logoUrl: urlOpcional,
  logoKey: z.string().optional(),
  textoPiePagina: opcional(300),
  notaHorarios: opcional(300),
});

export const inicioSchema = z.object({
  titulo: obligatorio(150, "Escribe el título de la portada"),
  subtitulo: opcional(250),
  descripcion: opcional(1500),
  carrusel: z.array(imagenSchema).min(5, "El carrusel necesita al menos 5 imágenes").max(12, "El carrusel admite como máximo 12 imágenes"),
});

export const misionVisionSchema = z.object({
  mision: obligatorio(2000, "Escribe la misión"),
  vision: obligatorio(2000, "Escribe la visión"),
});

export const contactoSchema = z.object({
  direccion: obligatorio(250, "Escribe la dirección"),
  telefono: obligatorio(30, "Escribe el teléfono"),
  correo: z.string().trim().min(1, "Escribe el correo electrónico").pipe(z.email("Escribe un correo válido, por ejemplo contacto@centro.com")),
  whatsapp: opcional(30),
  facebook: urlOpcional,
  instagram: urlOpcional,
  mapaUrl: urlOpcional,
});

const bloqueSchema = z.object({
  descripcion: opcional(2000),
  actividades: z
    .array(z.object({ id: z.string(), titulo: obligatorio(150, "Escribe el título de la actividad"), descripcion: obligatorio(1000, "Escribe la descripción de la actividad") }))
    .max(30, "Máximo 30 actividades"),
  imagenes: z.array(imagenSchema).max(12, "Máximo 12 imágenes"),
});

export const corporativoSchema = z.object({ capacitaciones: bloqueSchema, escuelaPadres: bloqueSchema });

export const educativoSchema = z.object({
  publicaciones: z
    .array(
      z.object({
        id: z.string(),
        titulo: obligatorio(150, "Escribe el título de la publicación"),
        descripcion: obligatorio(3000, "Escribe el contenido de la publicación"),
        fechaPublicacion: z.iso.date("Elige la fecha de publicación"),
        imagenUrl: urlOpcional,
        imagenKey: z.string().optional(),
        enlaceUrl: urlOpcional,
      }),
    )
    .max(100, "Máximo 100 publicaciones"),
});
