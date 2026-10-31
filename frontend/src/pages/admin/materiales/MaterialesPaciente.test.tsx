import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it } from "vitest";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import MaterialesPaciente from "./MaterialesPaciente";
beforeEach(reiniciarEstado);
const material = { id: "m1", titulo: "Guía", descripcion: "Apoyo", tipo: "Documento", enlace: "https://example.test/guia", estado: "ACTIVO" };
function iniciar(estado = "ACTIVO", falla = false) {
  let asignado = false;
  const api = simularApi({
    "GET /pacientes/p1": { body: { id: "p1", nombres: "Paciente", apellidos: "Prueba", estado } },
    "GET /materiales": { body: { items: [material], total: 1, page: 1, pages: 1 } },
    "GET /materiales/pacientes/p1": () => ({ body: { items: asignado ? [{ id: "a1", material, asignadoPor: { nombre: "Ana" }, createdAt: "2026-10-31T12:00:00Z" }] : [], total: asignado ? 1 : 0, page: 1, pages: 1 } }),
    "POST /materiales/pacientes/p1": () => { if (falla) return { status: 409, body: { message: "El material ya está asignado" } }; asignado = true; return { status: 201, body: {} }; },
  });
  renderConRutas([{ path: "/:id", element: <MaterialesPaciente /> }], "/p1");
  return api;
}
it("asigna un recurso y muestra fecha y profesional", async () => {
  const api = iniciar(); const user = userEvent.setup();
  await screen.findByRole("heading", { name: "Materiales de Paciente Prueba" });
  await user.click(screen.getByRole("button", { name: "Asignar material" }));
  await user.click(await screen.findByRole("button", { name: "Asignar Guía" }));
  expect(await screen.findByText(/Asignado por Ana/)).toBeInTheDocument();
  expect(screen.getByText(/1 asignación$/)).toBeInTheDocument();
  const post = api.mock.calls.find(([, o]) => o?.method === "POST")!;
  expect(JSON.parse(post[1]!.body as string)).toEqual({ materialId: "m1" });
});
it("conserva historial pero bloquea nuevas asignaciones a pacientes inactivos", async () => {
  iniciar("INACTIVO");
  expect(await screen.findByRole("button", { name: "Asignar material" })).toBeDisabled();
  expect(screen.getByText(/paciente está inactivo/)).toBeInTheDocument();
});
it("muestra conflictos del servidor sin confirmar una asignación", async () => {
  iniciar("ACTIVO", true); const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Asignar material" }));
  await user.click(await screen.findByRole("button", { name: "Asignar Guía" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("El material ya está asignado");
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});
