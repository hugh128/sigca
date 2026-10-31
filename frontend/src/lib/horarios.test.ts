import { describe, expect, it } from "vitest";
import type { DiaHorario } from "@/types/api";
import { resumirHorarios } from "./horarios";

const manana = [{ inicio: "08:00", fin: "12:00" }];
const dobleTurno = [{ inicio: "08:00", fin: "12:00" }, { inicio: "14:00", fin: "18:00" }];
const dia = (d: DiaHorario["dia"], atiende: boolean, franjas = atiende ? dobleTurno : []): DiaHorario => ({ dia: d, atiende, franjas });

describe("resumirHorarios", () => {
  it("agrupa dias consecutivos con el mismo horario", () => {
    const grupos = resumirHorarios([
      dia("LUNES", true), dia("MARTES", true), dia("MIERCOLES", true), dia("JUEVES", true), dia("VIERNES", true),
      dia("SABADO", true, manana), dia("DOMINGO", false),
    ]);
    expect(grupos.map((g) => g.etiqueta)).toEqual(["Lunes a viernes", "Sábado", "Domingo"]);
    expect(grupos[0]!.dias).toHaveLength(5);
    expect(grupos[2]!.atiende).toBe(false);
  });

  it("usa 'y' cuando son dos dias", () => {
    const grupos = resumirHorarios([dia("LUNES", true), dia("MARTES", true), dia("MIERCOLES", false)]);
    expect(grupos[0]!.etiqueta).toBe("Lunes y martes");
  });

  it("no une dias con distinto horario ni dias no consecutivos", () => {
    const grupos = resumirHorarios([dia("LUNES", true), dia("MARTES", true, manana), dia("MIERCOLES", true)]);
    expect(grupos.map((g) => g.etiqueta)).toEqual(["Lunes", "Martes", "Miércoles"]);
  });
});
