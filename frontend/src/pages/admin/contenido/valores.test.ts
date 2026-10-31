import { describe, expect, it } from "vitest";
import { contactoSchema, corporativoSchema, educativoSchema, generalSchema, inicioSchema, misionVisionSchema } from "@/schemas/contenido";
import contenido from "@/test/fixtures/contenido.json";
import type { Contenido } from "@/types/api";
import { valoresContacto, valoresCorporativo, valoresEducativo, valoresGeneral, valoresInicio, valoresMisionVision } from "./valores";

const c = contenido as unknown as Contenido;

describe("valores iniciales de los formularios (respuestas reales de la API)", () => {
  it.each([
    ["general", generalSchema, valoresGeneral(c.general)],
    ["inicio", inicioSchema, valoresInicio(c.inicio)],
    ["misionVision", misionVisionSchema, valoresMisionVision(c.misionVision)],
    ["contacto", contactoSchema, valoresContacto(c.contacto)],
    ["corporativo", corporativoSchema, valoresCorporativo(c.corporativo)],
    ["educativo", educativoSchema, valoresEducativo(c.educativo)],
  ])("%s: el contenido actual del portal pasa su propia validación", (_clave, schema, valores) => {
    const r = schema.safeParse(valores);
    expect(r.success, r.success ? "" : JSON.stringify(r.error.issues)).toBe(true);
  });

  it("los opcionales ausentes pasan a texto vacío y se conservan los id", () => {
    const v = valoresGeneral({ nombreCentro: "X", eslogan: "", textoPiePagina: "", notaHorarios: "" });
    expect(v.logoUrl).toBe("");
    expect(valoresInicio(c.inicio).carrusel.map((i) => i.id)).toEqual(c.inicio.carrusel.map((i) => i.id));
    expect(valoresEducativo(c.educativo).publicaciones[0]!.imagenUrl).toBe(c.educativo.publicaciones[0]!.imagenUrl ?? "");
  });
});
