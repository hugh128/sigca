import { describe, expect, it } from "vitest";
import { citaPor } from "@/test/datos";
import { accionesDisponibles, citaAEvento, COLOR_ESTADO, tituloCita } from "./citas";

describe("accionesDisponibles (qué botones ve cada rol)", () => {
  const sin = { confirmar: false, completar: false, cancelar: false, reprogramar: false };

  it("recepción: confirma, cancela y reprograma las activas; nunca completa", () => {
    expect(accionesDisponibles("PENDIENTE", "RECEPCIONISTA")).toEqual({ confirmar: true, completar: false, cancelar: true, reprogramar: true });
    expect(accionesDisponibles("CONFIRMADA", "RECEPCIONISTA")).toEqual({ confirmar: false, completar: false, cancelar: true, reprogramar: true });
  });

  it("profesional: solo completa citas confirmadas", () => {
    expect(accionesDisponibles("CONFIRMADA", "PROFESIONAL")).toEqual({ ...sin, completar: true });
    expect(accionesDisponibles("PENDIENTE", "PROFESIONAL")).toEqual(sin); // primero debe confirmarse
  });

  it("administrador: puede todo lo que el estado permite", () => {
    expect(accionesDisponibles("PENDIENTE", "ADMINISTRADOR")).toEqual({ confirmar: true, completar: false, cancelar: true, reprogramar: true });
    expect(accionesDisponibles("CONFIRMADA", "ADMINISTRADOR")).toEqual({ confirmar: false, completar: true, cancelar: true, reprogramar: true });
  });

  it("las citas completadas y canceladas son finales: nadie puede hacer nada", () => {
    for (const rol of ["ADMINISTRADOR", "RECEPCIONISTA", "PROFESIONAL"] as const) {
      expect(accionesDisponibles("COMPLETADA", rol)).toEqual(sin);
      expect(accionesDisponibles("CANCELADA", rol)).toEqual(sin);
    }
  });
});

describe("citaAEvento (calendario)", () => {
  it("usa la hora de pared tal cual, sin zona horaria, para verse igual en cualquier equipo", () => {
    const c = citaPor("CONFIRMADA");
    const e = citaAEvento(c);
    expect(e.start).toBe(`${c.fecha}T${c.horaInicio}:00`);
    expect(e.end).toBe(`${c.fecha}T${c.horaFin}:00`);
    expect(e.start).not.toMatch(/Z|[+-]\d\d:\d\d$/);
    expect(e.id).toBe(c.id);
    expect(e.title).toBe(`${c.paciente.nombres} ${c.paciente.apellidos}`);
    expect(e.backgroundColor).toBe(COLOR_ESTADO.CONFIRMADA.fondo);
  });

  it("cada estado tiene su propio color y las canceladas se tachan", () => {
    const colores = new Set((["PENDIENTE", "CONFIRMADA", "COMPLETADA", "CANCELADA"] as const).map((e) => COLOR_ESTADO[e].fondo));
    expect(colores.size).toBe(4);
    expect(citaAEvento(citaPor("CANCELADA")).classNames).toContain("cita-cancelada");
    expect(citaAEvento(citaPor("PENDIENTE")).classNames).toEqual([]);
  });

  it("el título de una cita incluye paciente y servicio", () => {
    const c = citaPor("COMPLETADA");
    expect(tituloCita(c)).toBe(`${c.paciente.nombres} ${c.paciente.apellidos} · ${c.servicio.nombre}`);
  });
});
