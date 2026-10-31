import type { ClaveContenido } from "../models/ContenidoInstitucional";

/**
 * Contenido inicial. Se usa cuando una seccion todavia no ha sido guardada por el
 * administrador, de modo que el portal publico siempre tiene algo que mostrar.
 * (Las imagenes son marcadores de posicion; el administrador las reemplaza.)
 */
const foto = (n: number) => ({
  id: `carrusel-${n}`,
  url: `https://picsum.photos/seed/sigca${n}/1600/700`,
  alt: `Imagen ${n} del carrusel`,
});

export const CONTENIDO_POR_DEFECTO: Record<ClaveContenido, Record<string, unknown>> = {
  general: {
    nombreCentro: "Centro Armonía",
    eslogan: "Psicología y estimulación auditiva verbal",
    textoPiePagina: "© Centro Armonía. Todos los derechos reservados.",
    notaHorarios: "Atendemos con cita previa.",
  },
  inicio: {
    titulo: "Bienvenidos a Centro Armonía",
    subtitulo: "Acompañamos el desarrollo emocional y la comunicación de cada persona",
    descripcion:
      "Somos un centro de atención psicológica y estimulación auditiva verbal. Brindamos un espacio profesional, cálido y cercano para niños, adolescentes, adultos y sus familias.",
    carrusel: [1, 2, 3, 4, 5].map(foto),
  },
  misionVision: {
    mision:
      "Brindar atención psicológica y de estimulación auditiva verbal de calidad, con calidez humana y enfoque profesional, contribuyendo al bienestar de nuestros pacientes y sus familias.",
    vision:
      "Ser un centro de referencia por la excelencia de nuestros servicios, la innovación en la atención y el acompañamiento integral a las familias.",
  },
  contacto: {
    direccion: "Ciudad de Guatemala, Guatemala",
    telefono: "+502 0000-0000",
    correo: "contacto@centroarmonia.test",
  },
  corporativo: {
    capacitaciones: { descripcion: "", actividades: [], imagenes: [] },
    escuelaPadres: { descripcion: "", actividades: [], imagenes: [] },
  },
  educativo: { publicaciones: [] },
};
