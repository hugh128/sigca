/**
 * PRUEBA DE CONTRATO (opcional): necesita el backend corriendo y con datos (`npm run seed` en backend/).
 *
 *   npm run test:contrato
 *
 * Comprueba contra el servidor REAL que:
 *   1. lo que la interfaz permite hacer con una cita (segun rol y estado) es exactamente lo que el servidor acepta, y
 *   2. la disponibilidad, la programacion, el conflicto de horario y los datos del calendario coinciden.
 * Crea citas de prueba en fechas lejanas y aleatorias: se puede ejecutar varias veces.
 */
import { describe, expect, it } from "vitest";
import { login } from "@/api/auth";
import { api, ApiError } from "@/lib/api";
import { accionesDisponibles, citaAEvento } from "@/lib/citas";
import { erroresDeServidor } from "@/lib/erroresServidor";
import { hoyGuatemala } from "@/lib/fechas";
import { useAuthStore } from "@/store/auth";
import type { Cita, Disponibilidad, EstadoCita, Pagina, Paciente, Profesional, Rol, Servicio } from "@/types/api";

const sumarDias = (f: string, n: number) => { const d = new Date(`${f}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dow = (f: string) => new Date(`${f}T00:00:00Z`).getUTCDay();

describe("citas: interfaz <-> backend real", () => {
  it("lo que la interfaz permite por rol y estado es exactamente lo que el servidor acepta", async () => {
    const tokens: Record<string, string> = {};
    for (const [clave, email] of [["recep", "recepcion1@sigca.test"], ["admin", "admin@sigca.test"], ["prof", "profesional1@sigca.test"]] as const) {
      await login(email, "Sigca2026!");
      tokens[clave] = useAuthStore.getState().token!;
    }
    const como = (c: string) => useAuthStore.setState({ token: tokens[c]! });
    const ROL: Record<string, Rol> = { recep: "RECEPCIONISTA", admin: "ADMINISTRADOR", prof: "PROFESIONAL" };

    como("recep");
    const profs = await api<Profesional[]>("/usuarios/profesionales");
    const ana = profs.find((p) => p.email === "profesional1@sigca.test")!;
    const servicio = (await api<Servicio[]>("/servicios")).find((s) => s.nombre === "Atención psicológica")!;
    const paciente = (await api<Pagina<Paciente>>("/pacientes?q=valeria")).items[0]!;

    // un día laboral distinto para cada cita (así nunca chocan entre sí); el punto de partida es aleatorio
    let cursor = sumarDias(hoyGuatemala(), 40 + Math.floor(Math.random() * 250));
    const fechaLibre = () => { while (dow(cursor) === 0 || dow(cursor) === 6) cursor = sumarDias(cursor, 1); const f = cursor; cursor = sumarDias(cursor, 1); return f; };

    async function citaEn(estado: EstadoCita): Promise<Cita> {
      como("recep");
      const c = await api<Cita>("/citas", { method: "POST", body: { pacienteId: paciente.id, servicioId: servicio.id, profesionalId: ana.id, fecha: fechaLibre(), horaInicio: "14:00" } });
      if (estado === "CONFIRMADA" || estado === "COMPLETADA") await api(`/citas/${c.id}/estado`, { method: "PATCH", body: { estado: "CONFIRMADA" } });
      if (estado === "COMPLETADA") { como("prof"); await api(`/citas/${c.id}/estado`, { method: "PATCH", body: { estado: "COMPLETADA" } }); }
      if (estado === "CANCELADA") await api(`/citas/${c.id}/estado`, { method: "PATCH", body: { estado: "CANCELADA" } });
      return c;
    }
    const acepta = async (rol: string, fn: () => Promise<unknown>) => { como(rol); try { await fn(); return true; } catch (e) { if (e instanceof ApiError) return false; throw e; } };

    const discrepancias: string[] = [];
    let comparaciones = 0;
    for (const estado of ["PENDIENTE", "CONFIRMADA", "COMPLETADA", "CANCELADA"] as EstadoCita[]) {
      for (const rol of ["recep", "admin", "prof"]) {
        const ui = accionesDisponibles(estado, ROL[rol]!);
        for (const [accion, destino] of [["confirmar", "CONFIRMADA"], ["completar", "COMPLETADA"], ["cancelar", "CANCELADA"]] as const) {
          const c = await citaEn(estado);
          const servidor = await acepta(rol, () => api(`/citas/${c.id}/estado`, { method: "PATCH", body: { estado: destino } }));
          comparaciones++;
          if (servidor !== ui[accion]) discrepancias.push(`${rol} / ${estado} / ${accion}: interfaz=${ui[accion]} servidor=${servidor}`);
        }
        const c = await citaEn(estado);
        const servidor = await acepta(rol, () => api(`/citas/${c.id}`, { method: "PUT", body: { observaciones: "nota" } }));
        comparaciones++;
        if (servidor !== ui.reprogramar) discrepancias.push(`${rol} / ${estado} / reprogramar: interfaz=${ui.reprogramar} servidor=${servidor}`);
      }
    }
    expect(comparaciones).toBe(48);
    expect(discrepancias, discrepancias.join("\n")).toEqual([]);
  }, 120_000);

  it("disponibilidad, programación, conflicto y datos del calendario", async () => {
    await login("recepcion1@sigca.test", "Sigca2026!");
    const profs = await api<Profesional[]>("/usuarios/profesionales");
    const mario = profs.find((p) => p.email === "profesional2@sigca.test")!;
    const servicio = (await api<Servicio[]>("/servicios")).find((s) => s.nombre === "Terapia de lenguaje")!;
    const paciente = (await api<Pagina<Paciente>>("/pacientes?q=camila")).items[0]!;
    let fecha = sumarDias(hoyGuatemala(), 400 + Math.floor(Math.random() * 250));
    while (dow(fecha) === 0 || dow(fecha) === 6) fecha = sumarDias(fecha, 1);

    const consulta = () => api<Disponibilidad>(`/citas/disponibilidad?${new URLSearchParams({ profesionalId: mario.id, servicioId: servicio.id, fecha })}`);
    const antes = await consulta();
    expect(antes.duracionMin).toBe(45);
    expect(antes.horarios.length).toBeGreaterThan(10);
    expect(antes.horarios[0]).toEqual({ horaInicio: "08:00", horaFin: "08:45" });

    const elegido = antes.horarios[4]!;
    const c = await api<Cita>("/citas", { method: "POST", body: { pacienteId: paciente.id, servicioId: servicio.id, profesionalId: mario.id, fecha, horaInicio: elegido.horaInicio } });
    expect(c.horaFin).toBe(elegido.horaFin);
    const evento = citaAEvento(c);
    expect(evento.start).toBe(`${fecha}T${elegido.horaInicio}:00`);
    expect(evento.end).toBe(`${fecha}T${elegido.horaFin}:00`);

    const despues = await consulta();
    expect(despues.horarios.some((h) => h.horaInicio === elegido.horaInicio)).toBe(false);
    expect(despues.horarios.every((h) => h.horaFin <= elegido.horaInicio || h.horaInicio >= elegido.horaFin)).toBe(true);
    expect(despues.horarios.some((h) => h.horaInicio === elegido.horaFin)).toBe(true);

    const choque = await api("/citas", { method: "POST", body: { pacienteId: paciente.id, servicioId: servicio.id, profesionalId: mario.id, fecha, horaInicio: elegido.horaInicio } }).catch((e: unknown) => e);
    expect((choque as ApiError).status).toBe(409);
    expect(erroresDeServidor(choque).form).toMatch(/ya tiene una cita/);

    const lista = await api<Pagina<Cita>>(`/citas?desde=${fecha}&hasta=${fecha}&profesionalId=${mario.id}`);
    const enLista = lista.items.find((x) => x.id === c.id)!;
    expect(enLista.paciente.nombres).toBe("Camila");
    expect(typeof enLista.paciente.edad).toBe("number");
    expect(enLista.servicio.nombre).toBe("Terapia de lenguaje");
    expect(enLista.profesional.nombre).toBe(mario.nombre);
  }, 60_000);
});
