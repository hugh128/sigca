import type { Contenido } from "@/types/api";

/**
 * Convierte lo que devuelve la API en los valores iniciales de cada formulario:
 * los textos opcionales ausentes pasan a "" (un input siempre tiene texto) y se conservan
 * los `id` y las `key` (llaves de almacenamiento) para no perderlos al guardar.
 */
const imagen = (i: Contenido["inicio"]["carrusel"][number]) => ({ id: i.id, url: i.url, key: i.key ?? "", alt: i.alt ?? "" });

export const valoresGeneral = (d: Contenido["general"]) => ({
  nombreCentro: d.nombreCentro,
  eslogan: d.eslogan ?? "",
  logoUrl: d.logoUrl ?? "",
  logoKey: d.logoKey ?? "",
  textoPiePagina: d.textoPiePagina ?? "",
  notaHorarios: d.notaHorarios ?? "",
});

export const valoresInicio = (d: Contenido["inicio"]) => ({
  titulo: d.titulo,
  subtitulo: d.subtitulo ?? "",
  descripcion: d.descripcion ?? "",
  carrusel: d.carrusel.map(imagen),
});

export const valoresMisionVision = (d: Contenido["misionVision"]) => ({ mision: d.mision, vision: d.vision });

export const valoresContacto = (d: Contenido["contacto"]) => ({
  direccion: d.direccion,
  telefono: d.telefono,
  correo: d.correo,
  whatsapp: d.whatsapp ?? "",
  facebook: d.facebook ?? "",
  instagram: d.instagram ?? "",
  mapaUrl: d.mapaUrl ?? "",
});

const bloque = (b: Contenido["corporativo"]["capacitaciones"]) => ({
  descripcion: b.descripcion ?? "",
  actividades: b.actividades.map((a) => ({ id: a.id, titulo: a.titulo, descripcion: a.descripcion })),
  imagenes: b.imagenes.map(imagen),
});

export const valoresCorporativo = (d: Contenido["corporativo"]) => ({
  capacitaciones: bloque(d.capacitaciones),
  escuelaPadres: bloque(d.escuelaPadres),
});

export const valoresEducativo = (d: Contenido["educativo"]) => ({
  publicaciones: d.publicaciones.map((p) => ({
    id: p.id,
    titulo: p.titulo,
    descripcion: p.descripcion,
    fechaPublicacion: p.fechaPublicacion,
    imagenUrl: p.imagenUrl ?? "",
    imagenKey: p.imagenKey ?? "",
    enlaceUrl: p.enlaceUrl ?? "",
  })),
});
