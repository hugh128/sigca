import { describe, expect, it } from "vitest";
import { formatearDuracion, formatearFecha, formatearHora, formatearQuetzales } from "./format";

describe("formato", () => {
  it("convierte centavos a quetzales", () => {
    expect(formatearQuetzales(25000)).toMatch(/250[.,]00/);
    expect(formatearQuetzales(25050)).toMatch(/250[.,]50/);
  });

  it("formatea la duracion", () => {
    expect(formatearDuracion(45)).toBe("45 min");
    expect(formatearDuracion(60)).toBe("1 h");
    expect(formatearDuracion(90)).toBe("1 h 30 min");
  });

  it("formatea fechas sin desfase de zona horaria", () => {
    expect(formatearFecha("2026-09-15")).toMatch(/15 de septiembre de 2026/);
    expect(formatearFecha("2026-01-01")).toMatch(/1 de enero de 2026/);
  });

  it("formatea horas en formato de 12 horas", () => {
    expect(formatearHora("14:00")).toMatch(/2:00.*p\.\s?m\./i);
    expect(formatearHora("08:30")).toMatch(/8:30.*a\.\s?m\./i);
  });
});
