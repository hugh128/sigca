import { connectDB, disconnectDB } from "../config/db";
import { isProd } from "../config/env";
import { CLAVES_CONTENIDO, ContenidoInstitucional } from "../models/ContenidoInstitucional";
import { Horario, type DiaSemana } from "../models/Horario";
import { Paciente, type Sexo } from "../models/Paciente";
import { Responsable } from "../models/Responsable";
import { Servicio } from "../models/Servicio";
import { Usuario, type Rol } from "../models/Usuario";
import { esquemasContenido } from "../schemas/contenido.schema";
import { CONTENIDO_POR_DEFECTO } from "../services/contenido.defaults";
import { hoyGuatemala } from "../utils/fechas";
import { hashPassword } from "../utils/password";
import { sinUndefined } from "../utils/sinUndefined";

/**
 * Datos de prueba FICTICIOS. Borra y recrea las colecciones que maneja.
 * A medida que se agreguen modulos, se agregan aqui sus datos de prueba.
 *
 *   npm run seed
 */
const PASSWORD_DEMO = "Sigca2026!";

const usuarios: { nombre: string; email: string; rol: Rol }[] = [
  { nombre: "Administrador SIGCA", email: "admin@sigca.test", rol: "ADMINISTRADOR" },
  { nombre: "Laura Méndez", email: "recepcion1@sigca.test", rol: "RECEPCIONISTA" },
  { nombre: "Carlos Ruiz", email: "recepcion2@sigca.test", rol: "RECEPCIONISTA" },
  { nombre: "Dra. Ana López", email: "profesional1@sigca.test", rol: "PROFESIONAL" },
  { nombre: "Lic. Mario Pérez", email: "profesional2@sigca.test", rol: "PROFESIONAL" },
  { nombre: "Licda. Sofía Castillo", email: "profesional3@sigca.test", rol: "PROFESIONAL" },
];

// Precios en CENTAVOS: Q250.00 => 25000
const servicios = [
  { nombre: "Atención psicológica", descripcion: "Sesión individual de atención psicológica para niños, adolescentes y adultos.", duracionMin: 50, precioCentavos: 25000 },
  { nombre: "Evaluación psicológica", descripcion: "Evaluación inicial para identificar necesidades y definir el plan de atención.", duracionMin: 60, precioCentavos: 35000 },
  { nombre: "Estimulación auditiva verbal", descripcion: "Sesión de estimulación auditiva verbal orientada a mejorar la comunicación y el lenguaje.", duracionMin: 45, precioCentavos: 20000 },
  { nombre: "Terapia de lenguaje", descripcion: "Sesión de terapia para el desarrollo y la corrección del lenguaje.", duracionMin: 45, precioCentavos: 22000 },
  { nombre: "Orientación para padres", descripcion: "Sesión de acompañamiento y orientación para padres y responsables.", duracionMin: 60, precioCentavos: 18000 },
];

// Contenido de demostracion que se suma/reemplaza al contenido por defecto.
const contenidoDemo: Record<string, Record<string, unknown>> = {
  corporativo: {
    capacitaciones: {
      descripcion: "Capacitaciones para instituciones educativas y empresas sobre salud emocional, comunicación y desarrollo infantil.",
      actividades: [
        { titulo: "Taller de comunicación efectiva", descripcion: "Herramientas prácticas para mejorar la comunicación en equipos de trabajo." },
        { titulo: "Detección temprana en el aula", descripcion: "Orientación a docentes para identificar señales de alerta en el desarrollo del lenguaje." },
      ],
      imagenes: [{ url: "https://picsum.photos/seed/capacitacion/800/500", alt: "Capacitacion" }],
    },
    escuelaPadres: {
      descripcion: "Espacio mensual de formación y acompañamiento para padres, madres y responsables.",
      actividades: [
        { titulo: "Límites y disciplina positiva", descripcion: "Estrategias de crianza respetuosa para cada etapa del desarrollo." },
        { titulo: "Estimulación del lenguaje en casa", descripcion: "Actividades sencillas para reforzar en familia lo trabajado en terapia." },
      ],
      imagenes: [{ url: "https://picsum.photos/seed/padres/800/500", alt: "Escuela para padres" }],
    },
  },
  educativo: {
    publicaciones: [
      { titulo: "Cuándo consultar por el desarrollo del lenguaje", descripcion: "Señales que pueden indicar que un nino necesita una evaluación: poca intención comunicativa, vocabulario limitado para su edad o dificultad para seguir instrucciones sencillas.", fechaPublicacion: "2026-09-15", imagenUrl: "https://picsum.photos/seed/lenguaje/800/500" },
      { titulo: "La importancia de la escucha en el desarrollo", descripcion: "La audición es la base del aprendizaje del lenguaje. Conoce cómo se relacionan la escucha, la atención y la comunicación.", fechaPublicacion: "2026-08-20" },
      { titulo: "Cómo acompañar emocionalmente a tu hijo", descripcion: "Validar las emociones, poner límites con calma y ofrecer rutinas predecibles ayuda a que los niños se sientan seguros.", fechaPublicacion: "2026-07-05", enlaceUrl: "https://example.com/guia-emociones" },
    ],
  },
};

const horarioSemana: { dia: DiaSemana; atiende: boolean; franjas: { inicio: string; fin: string }[] }[] = [
  ...(["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"] as const).map((dia) => ({
    dia,
    atiende: true,
    franjas: [{ inicio: "08:00", fin: "12:00" }, { inicio: "14:00", fin: "18:00" }],
  })),
  { dia: "SABADO", atiende: true, franjas: [{ inicio: "08:00", fin: "12:00" }] },
  { dia: "DOMINGO", atiende: false, franjas: [] },
];


/** Fecha de nacimiento para tener hoy exactamente `anios` anios y `meses` meses (asi las edades de la demo no caducan). */
function nacimientoHace(anios: number, meses = 0): string {
  const hoy = hoyGuatemala();
  let y = Number(hoy.slice(0, 4)) - anios;
  let m = Number(hoy.slice(5, 7)) - meses;
  while (m < 1) { m += 12; y -= 1; }
  const d = Math.min(Number(hoy.slice(8, 10)), 28);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
const haceMeses = (n: number) => nacimientoHace(0, n);

const responsablesDemo = [
  { clave: "ana", nombres: "Ana María", apellidos: "Morales Cruz", parentesco: "Madre", telefono: "5555-0101", email: "ana.morales@sigca.test", direccion: "6a avenida 12-30, zona 1, Ciudad de Guatemala" },
  { clave: "carlos", nombres: "Carlos", apellidos: "Castillo Juárez", parentesco: "Padre", telefono: "5555-0102", email: "carlos.castillo@sigca.test", direccion: "Calzada Roosevelt 24-15, zona 7, Ciudad de Guatemala" },
  { clave: "luis", nombres: "Luis", apellidos: "Ortiz Barrios", parentesco: "Padre", telefono: "5555-0103", email: "luis.ortiz@sigca.test", direccion: "3a calle 8-45, zona 10, Ciudad de Guatemala" },
  { clave: "marta", nombres: "Marta", apellidos: "Pérez López", parentesco: "Madre", telefono: "5555-0104", email: "marta.perez@sigca.test", direccion: "Boulevard Los Próceres 18-20, zona 10, Ciudad de Guatemala" },
  { clave: "rosa", nombres: "Rosa", apellidos: "Gómez Alvarado", parentesco: "Abuela", telefono: "5555-0105", email: "rosa.gomez@sigca.test", direccion: "12 calle 5-60, zona 3, Ciudad de Guatemala" },
];

// `resp` son claves de responsablesDemo. Lucia (menor) NO tiene responsable: permite demostrar la RN-04.
const pacientesDemo: { nombres: string; apellidos: string; nac: string; sexo: Sexo; telefono: string; direccion: string; resp: string[]; inactivo?: boolean; observaciones?: string }[] = [
  { nombres: "Mateo", apellidos: "Hernández Morales", nac: nacimientoHace(6, 2), sexo: "MASCULINO", telefono: "5555-0201", direccion: "6a avenida 12-30, zona 1", resp: ["ana"], observaciones: "Derivado por la escuela. Requiere estimulación auditiva." },
  { nombres: "Diego", apellidos: "Hernández Morales", nac: nacimientoHace(12, 5), sexo: "MASCULINO", telefono: "5555-0201", direccion: "6a avenida 12-30, zona 1", resp: ["ana"] },
  { nombres: "Valeria", apellidos: "Castillo Juárez", nac: nacimientoHace(9, 1), sexo: "FEMENINO", telefono: "5555-0202", direccion: "Calzada Roosevelt 24-15, zona 7", resp: ["carlos"] },
  { nombres: "Camila", apellidos: "Ortiz Barrios", nac: nacimientoHace(15, 7), sexo: "FEMENINO", telefono: "5555-0203", direccion: "3a calle 8-45, zona 10", resp: ["luis"] },
  { nombres: "Sebastián", apellidos: "Pérez Gómez", nac: nacimientoHace(17, 10), sexo: "MASCULINO", telefono: "5555-0204", direccion: "Boulevard Los Próceres 18-20, zona 10", resp: ["marta", "rosa"] },
  { nombres: "Lucía", apellidos: "Gómez Alvarado", nac: nacimientoHace(8, 3), sexo: "FEMENINO", telefono: "5555-0205", direccion: "12 calle 5-60, zona 3", resp: [], observaciones: "Pendiente registrar a su responsable." },
  { nombres: "Jorge", apellidos: "Alvarado Méndez", nac: nacimientoHace(34, 4), sexo: "MASCULINO", telefono: "5555-0206", direccion: "Avenida Reforma 9-55, zona 9", resp: [] },
  { nombres: "Sofía", apellidos: "Marroquín Díaz", nac: nacimientoHace(28, 9), sexo: "FEMENINO", telefono: "5555-0207", direccion: "15 avenida 14-20, zona 13", resp: [] },
  { nombres: "Pedro", apellidos: "Cifuentes Soto", nac: nacimientoHace(45, 2), sexo: "MASCULINO", telefono: "5555-0208", direccion: "Calle Real 3-10, Mixco", resp: [] },
  { nombres: "Elena", apellidos: "Barrios Quiñónez", nac: nacimientoHace(52, 6), sexo: "FEMENINO", telefono: "5555-0209", direccion: "7a avenida 20-12, zona 11", resp: [], inactivo: true, observaciones: "Concluyó su proceso." },
];

async function main() {
  if (isProd && !process.argv.includes("--force")) {
    console.error("Estas en produccion: el seed borra datos. Usa --force si realmente quieres ejecutarlo.");
    process.exit(1);
  }

  await connectDB();

  await Promise.all([
    Usuario.deleteMany({}),
    Servicio.deleteMany({}),
    ContenidoInstitucional.deleteMany({}),
    Horario.deleteMany({}),
    Paciente.deleteMany({}),
    Responsable.deleteMany({}),
  ]);

  const passwordHash = await hashPassword(PASSWORD_DEMO);
  await Usuario.insertMany(usuarios.map((u) => ({ ...u, passwordHash })));
  await Servicio.insertMany(servicios);

  // El contenido pasa por los mismos esquemas Zod que usa la API (asigna ids, valida, normaliza).
  for (const clave of CLAVES_CONTENIDO) {
    const datos = esquemasContenido[clave].parse({ ...CONTENIDO_POR_DEFECTO[clave], ...contenidoDemo[clave] });
    await ContenidoInstitucional.create({ clave, datos: sinUndefined(datos) });
  }
  await Horario.insertMany(horarioSemana);

  // Responsables y pacientes (se usa .create/.save para que se calculen los campos de busqueda)
  const responsables: Record<string, string> = {};
  for (const { clave, ...r } of responsablesDemo) responsables[clave] = (await Responsable.create(r)).id;
  for (const { nac, resp, inactivo, ...p } of pacientesDemo) {
    await Paciente.create({
      ...p,
      fechaNacimiento: nac,
      fechaInicio: haceMeses(3),
      estado: inactivo ? "INACTIVO" : "ACTIVO",
      responsables: resp.map((c) => responsables[c]),
    });
  }

  console.log(
    `Usuarios: ${usuarios.length} | Servicios: ${servicios.length} | Secciones de contenido: ${CLAVES_CONTENIDO.length} | Días de horario: ${horarioSemana.length} | Pacientes: ${pacientesDemo.length} | Responsables: ${responsablesDemo.length}`,
  );
  console.log("\nCredenciales de demostración (contraseña para todos: " + PASSWORD_DEMO + ")");
  for (const u of usuarios) console.log(`  ${u.rol.padEnd(14)} ${u.email}`);

  await disconnectDB();
}

main().catch(async (err) => {
  console.error("Error en el seed:", err);
  await disconnectDB();
  process.exit(1);
});
