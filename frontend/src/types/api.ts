/** Tipos de las respuestas de la API (ver README del backend). */

export type Rol = "ADMINISTRADOR" | "RECEPCIONISTA" | "PROFESIONAL";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Servicio {
  id: string;
  nombre: string;
  descripcion: string;
  duracionMin: number;
  /** En centavos. Solo viene si hay sesion de personal. */
  precioCentavos?: number;
  imagenUrl?: string;
  imagenKey?: string;
  estado: "ACTIVO" | "INACTIVO";
}

export interface Imagen {
  id: string;
  url: string;
  key?: string;
  alt: string;
}

export interface ContenidoGeneral {
  nombreCentro: string;
  eslogan: string;
  logoUrl?: string;
  logoKey?: string;
  textoPiePagina: string;
  notaHorarios: string;
}

export interface ContenidoInicio {
  titulo: string;
  subtitulo: string;
  descripcion: string;
  carrusel: Imagen[];
}

export interface ContenidoMisionVision {
  mision: string;
  vision: string;
}

export interface ContenidoContacto {
  direccion: string;
  telefono: string;
  correo: string;
  whatsapp: string;
  facebook?: string;
  instagram?: string;
  mapaUrl?: string;
}

export interface BloqueCorporativo {
  descripcion: string;
  actividades: { id: string; titulo: string; descripcion: string }[];
  imagenes: Imagen[];
}

export interface Publicacion {
  id: string;
  titulo: string;
  descripcion: string;
  /** AAAA-MM-DD */
  fechaPublicacion: string;
  imagenUrl?: string;
  imagenKey?: string;
  enlaceUrl?: string;
}

export interface Contenido {
  general: ContenidoGeneral;
  inicio: ContenidoInicio;
  misionVision: ContenidoMisionVision;
  contacto: ContenidoContacto;
  corporativo: { capacitaciones: BloqueCorporativo; escuelaPadres: BloqueCorporativo };
  educativo: { publicaciones: Publicacion[] };
}

export type DiaSemana = "LUNES" | "MARTES" | "MIERCOLES" | "JUEVES" | "VIERNES" | "SABADO" | "DOMINGO";

export interface Franja {
  /** HH:mm */
  inicio: string;
  fin: string;
}

export interface DiaHorario {
  dia: DiaSemana;
  atiende: boolean;
  franjas: Franja[];
}

export interface Horarios {
  dias: DiaHorario[];
}

export interface RespuestaLogin {
  token: string;
  usuario: Usuario;
}

export type Sexo = "MASCULINO" | "FEMENINO" | "OTRO";

/** Respuesta paginada de los listados. */
export interface Pagina<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Responsable {
  id: string;
  nombres: string;
  apellidos: string;
  parentesco: string;
  telefono: string;
  email: string;
  direccion: string;
  fotoUrl?: string;
  fotoKey?: string;
  /** Pacientes asociados (resumen). */
  pacientes: { id: string; nombres: string; apellidos: string; estado: "ACTIVO" | "INACTIVO" }[];
}

/** Responsable tal como viene dentro de un paciente (sin la lista de pacientes). */
export type ResponsableDePaciente = Omit<Responsable, "pacientes">;

export interface Paciente {
  id: string;
  nombres: string;
  apellidos: string;
  /** AAAA-MM-DD */
  fechaNacimiento: string;
  sexo: Sexo;
  telefono: string;
  direccion: string;
  /** Inicio del proceso, AAAA-MM-DD */
  fechaInicio: string;
  observaciones?: string;
  fotoUrl?: string;
  fotoKey?: string;
  estado: "ACTIVO" | "INACTIVO";
  /** Calculadas por el servidor. */
  edad: number;
  esMenor: boolean;
  responsables: ResponsableDePaciente[];
}

export type EstadoCita = "PENDIENTE" | "CONFIRMADA" | "COMPLETADA" | "CANCELADA";

export interface Cita {
  id: string;
  paciente: { id: string; nombres: string; apellidos: string; fotoUrl?: string; fechaNacimiento: string; edad: number; esMenor: boolean };
  servicio: { id: string; nombre: string };
  profesional: { id: string; nombre: string };
  /** Fecha y horas de pared en Guatemala (el servidor ya las convierte). */
  fecha: string;
  horaInicio: string;
  horaFin: string;
  /** Instantes exactos (UTC). */
  inicio: string;
  fin: string;
  duracionMin: number;
  /** En centavos. No viene para el rol profesional. */
  precioCentavos?: number;
  estado: EstadoCita;
  observaciones?: string;
  motivoCancelacion?: string;
  historial: { estado: EstadoCita; fecha: string; usuario?: { id: string; nombre: string } | string; nota?: string }[];
  createdAt: string;
}

export interface Disponibilidad {
  fecha: string;
  duracionMin: number;
  horarios: { horaInicio: string; horaFin: string }[];
}

export interface Profesional {
  id: string;
  nombre: string;
  email: string;
}

/** Paciente tal como lo ve un profesional: solo informacion basica. */
export interface PacienteBasico {
  id: string;
  nombres: string;
  apellidos: string;
  sexo: Sexo;
  fotoUrl?: string;
  estado: "ACTIVO" | "INACTIVO";
  edad: number;
  esMenor: boolean;
}
