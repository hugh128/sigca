import citasJson from "@/test/fixtures/citas.json";
import pacientesBasicosJson from "@/test/fixtures/pacientes-profesional.json";
import pacientesJson from "@/test/fixtures/pacientes.json";
import profesionalesJson from "@/test/fixtures/profesionales.json";
import responsablesJson from "@/test/fixtures/responsables.json";
import usuarios from "@/test/fixtures/usuarios.json";
import { normalizar } from "@/lib/texto";
import type { Cita, EstadoCita, Paciente, PacienteBasico, Pagina, Profesional, Responsable, Usuario } from "@/types/api";

export const pacientesFixture = pacientesJson.items as unknown as Paciente[];
export const responsablesFixture = responsablesJson.items as unknown as Responsable[];
export const admin = usuarios.find((u) => u.rol === "ADMINISTRADOR") as Usuario;

export const pacientePorNombre = (nombres: string) => pacientesFixture.find((p) => p.nombres === nombres)!;
export const responsablePorNombre = (nombres: string) => responsablesFixture.find((r) => r.nombres === nombres)!;

/** Responde como lo haria la API: busca sin tildes, filtra y pagina. */
export function paginar<T>(items: T[], url: URL): Pagina<T> {
  const limit = Number(url.searchParams.get("limit")) || 20;
  const page = Number(url.searchParams.get("page")) || 1;
  return { items: items.slice((page - 1) * limit, page * limit), total: items.length, page, limit, pages: Math.max(1, Math.ceil(items.length / limit)) };
}

export function filtrarPacientes(lista: Paciente[], url: URL): Pagina<Paciente> {
  const q = normalizar(url.searchParams.get("q") ?? "");
  const estado = url.searchParams.get("estado");
  const menores = url.searchParams.get("menores");
  const items = lista.filter(
    (p) =>
      (!q || q.split(" ").every((w) => normalizar(`${p.nombres} ${p.apellidos} ${p.telefono}`).includes(w))) &&
      (!estado || p.estado === estado) &&
      (menores === null || p.esMenor === (menores === "true")),
  );
  return paginar(items, url);
}

export function filtrarResponsables(lista: Responsable[], url: URL): Pagina<Responsable> {
  const q = normalizar(url.searchParams.get("q") ?? "");
  const items = lista.filter((r) => !q || q.split(" ").every((w) => normalizar(`${r.nombres} ${r.apellidos} ${r.email} ${r.telefono}`).includes(w)));
  return paginar(items, url);
}

export const consultasA = (mock: { mock: { calls: unknown[][] } }, metodo: string, ruta: string) =>
  mock.mock.calls
    .filter(([u, i]) => new URL(String(u)).pathname.endsWith(ruta) && ((i as RequestInit | undefined)?.method ?? "GET") === metodo)
    .map(([u, i]) => ({ url: new URL(String(u)), init: i as RequestInit | undefined }));

export const citasFixture = citasJson.items as unknown as Cita[];
export const profesionalesFixture = profesionalesJson as unknown as Profesional[];
export const pacientesBasicosFixture = pacientesBasicosJson.items as unknown as PacienteBasico[];
export const usuarioPorRol = (rol: Usuario["rol"]) => usuarios.find((u) => u.rol === rol) as Usuario;

/** Primera cita del fixture con ese estado (y, opcionalmente, de ese paciente). */
export const citaPor = (estado: EstadoCita, paciente?: string) =>
  citasFixture.find((c) => c.estado === estado && (!paciente || c.paciente.nombres === paciente))!;

/** Detalle de una cita, como lo devuelve GET /citas/:id (con el nombre de quien hizo cada cambio). */
export const detalleDeCita = (c: Cita): Cita => ({
  ...c,
  historial: c.historial.map((h) => ({ ...h, usuario: { id: "u-recepcion", nombre: "Laura Méndez" } })),
});

/**
 * Responde como lo haria la API para el filtrado por estado, profesional y paciente, el orden y la paginacion.
 * NO filtra por fecha a proposito: las fechas del fixture son fijas y las pruebas no deben depender del dia en que se corran
 * (los parametros `desde` y `hasta` se verifican mirando la peticion).
 */
export function filtrarCitas(lista: Cita[], url: URL): Pagina<Cita> {
  const estados = url.searchParams.get("estado")?.split(",");
  const prof = url.searchParams.get("profesionalId");
  const pac = url.searchParams.get("pacienteId");
  const items = lista
    .filter((c) => (!estados || estados.includes(c.estado)) && (!prof || c.profesional.id === prof) && (!pac || c.paciente.id === pac))
    .sort((a, b) => (url.searchParams.get("orden") === "desc" ? b.inicio.localeCompare(a.inicio) : a.inicio.localeCompare(b.inicio)));
  return paginar(items, url);
}
