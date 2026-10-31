import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it } from "vitest";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import Pagos from "./Pagos";
beforeEach(reiniciarEstado);
const cita = { id: "c1", paciente: { id: "p1", nombres: "Paciente", apellidos: "Prueba" }, servicio: { nombre: "Atención" }, fecha: "2026-11-16", estado: "CONFIRMADA" };
function iniciar(caja = true, error = false) {
  let pagado = 10000;
  const pago = { id: "pago1", comprobante: "COMP-2026-000001", paciente: cita.paciente, cita, caja: "caja1", montoCentavos: 15000, metodo: "EFECTIVO", fecha: "2026-10-31T16:00:00Z", registradoPor: { nombre: "Laura" }, estado: "REGISTRADO" };
  const api = simularApi({
    "GET /cajas/actual": { body: caja ? { id: "caja1", estado: "ABIERTA" } : null },
    "GET /pagos": { body: { items: [pago], total: 1, page: 1, pages: 1 } },
    "GET /pagos/citas/c1/resumen": () => ({ body: { cita, costoCentavos: 25000, totalPagadoCentavos: pagado, saldoCentavos: 25000 - pagado, estadoFinanciero: pagado === 25000 ? "PAGADO" : "PARCIAL" } }),
    "POST /pagos": init => { if (error) return { status: 422, body: { message: "El pago supera el saldo pendiente" } }; pagado += JSON.parse(init!.body as string).montoCentavos; return { status: 201, body: pago }; },
  });
  renderConRutas([{ path: "/", element: <Pagos /> }], "/?cita=c1"); return api;
}
it("registra el saldo pendiente y conserva centavos exactos", async () => {
  const api = iniciar(); const user = userEvent.setup();
  await user.type(await screen.findByLabelText("Monto a pagar (Q)"), "150.00");
  await user.selectOptions(screen.getByLabelText("Método de pago"), "EFECTIVO");
  await user.click(screen.getByRole("button", { name: "Registrar pago" }));
  expect(await screen.findByText(/Pago registrado: COMP-2026-000001/)).toBeInTheDocument();
  expect(await screen.findByText("Pagado")).toBeInTheDocument();
  const post = api.mock.calls.find(([, o]) => o?.method === "POST")!;
  expect(JSON.parse(post[1]!.body as string)).toEqual({ citaId: "c1", montoCentavos: 15000, metodo: "EFECTIVO" });
});
it("sin caja ofrece abrirla y no muestra formulario de cobro", async () => {
  iniciar(false);
  expect(await screen.findByRole("link", { name: "Abrir mi caja" })).toHaveAttribute("href", "/admin/caja");
  expect(screen.queryByRole("button", { name: "Registrar pago" })).not.toBeInTheDocument();
});
it("rechaza sobrepago local y conserva valores ante error del servidor", async () => {
  const api = iniciar(true, true); const user = userEvent.setup();
  const monto = await screen.findByLabelText("Monto a pagar (Q)");
  await user.type(monto, "151"); await user.selectOptions(screen.getByLabelText("Método de pago"), "TARJETA");
  await user.click(screen.getByRole("button", { name: "Registrar pago" }));
  expect(api.mock.calls.some(([, o]) => o?.method === "POST")).toBe(false);
  await user.clear(monto); await user.type(monto, "100"); await user.click(screen.getByRole("button", { name: "Registrar pago" }));
  expect(await screen.findByText("El pago supera el saldo pendiente")).toBeInTheDocument();
  expect(monto).toHaveValue("100"); expect(screen.queryByText(/Pago registrado:/)).not.toBeInTheDocument();
});
