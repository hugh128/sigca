import { describe, expect, it } from "vitest";
import { centavosAQuetzales, quetzalesACentavos } from "./dinero";

describe("dinero (centavos enteros, RN-28)", () => {
  it("convierte lo que se escribe a centavos", () => {
    expect(quetzalesACentavos("250")).toBe(25000);
    expect(quetzalesACentavos("250.5")).toBe(25050);
    expect(quetzalesACentavos("250.50")).toBe(25050);
    expect(quetzalesACentavos("0.99")).toBe(99);
    expect(quetzalesACentavos(" Q 1,250.00 ")).toBe(125000);
  });

  it("no pierde centavos por punto flotante", () => {
    // 19.99 * 100 === 1998.9999999999998 en JavaScript
    expect(quetzalesACentavos("19.99")).toBe(1999);
    expect(quetzalesACentavos("1.15")).toBe(115);
    expect(quetzalesACentavos("0.29")).toBe(29);
  });

  it("rechaza lo que no es un monto valido", () => {
    for (const malo of ["", "abc", "12.345", "-5", "1e3", "12,5.5", "1,25", "1,2345", ",500", "Q", "1..2", "99999999"]) {
      expect(quetzalesACentavos(malo), malo).toBeNull();
    }
  });

  it("convierte centavos a texto para editar", () => {
    expect(centavosAQuetzales(25000)).toBe("250.00");
    expect(centavosAQuetzales(25050)).toBe("250.50");
    expect(centavosAQuetzales(5)).toBe("0.05");
  });

  it("ida y vuelta", () => {
    for (const c of [1, 99, 100, 1999, 25050, 9999999]) expect(quetzalesACentavos(centavosAQuetzales(c))).toBe(c);
  });
});
