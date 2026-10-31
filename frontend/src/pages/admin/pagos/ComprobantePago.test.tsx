import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { useState } from "react";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import { ComprobantePago } from "./ComprobantePago";
beforeEach(reiniciarEstado);
const pago = { id: "p1", comprobante: "COMP-2026-000001", paciente: { nombres: "Paciente", apellidos: "Prueba" }, montoCentavos: 10000, metodo: "EFECTIVO", fecha: "2026-10-31T12:00:00Z", registradoPor: { nombre: "Laura" }, estado: "REGISTRADO", cajaEstado: "ABIERTA", puedeAnular: true };
function iniciar(cambios = {}, fallo = false) {
  let actual: typeof pago & { motivoAnulacion?: string; anuladoPor?: { nombre: string }; fechaAnulacion?: string } = { ...pago, ...cambios };
  const api = simularApi({
    "GET /pagos/p1": () => ({ body: actual }),
    "PATCH /pagos/p1/anular": init => {
      if (fallo) return { status: 422, body: { message: "No se pueden anular pagos de una caja cerrada" } };
      actual = { ...actual, estado: "ANULADO", puedeAnular: false, motivoAnulacion: JSON.parse(init!.body as string).motivo, anuladoPor: { nombre: "Laura" }, fechaAnulacion: "2026-10-31T13:00:00Z" };
      return { body: actual };
    },
  });
  renderConRutas([{ path: "/", element: <ComprobantePago id="p1" onCerrar={vi.fn()} /> }]); return api;
}
it("consulta detalle fresco, exige motivo y muestra auditoria tras anular", async () => {
  const api = iniciar(); const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Anular pago" }));
  await user.click(screen.getByRole("button", { name: "Confirmar anulación" }));
  expect(api.mock.calls.some(([, o]) => o?.method === "PATCH")).toBe(false);
  await user.type(screen.getByLabelText("Motivo de anulación"), "Pago registrado por error");
  await user.click(screen.getByRole("button", { name: "Confirmar anulación" }));
  expect(await screen.findByText("Pago anulado correctamente")).toBeInTheDocument();
  expect(await screen.findByText("Pago registrado por error")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Anular pago" })).not.toBeInTheDocument();
});
it.each([{ cajaEstado: "CERRADA", puedeAnular: false }, { estado: "ANULADO", puedeAnular: false }, { puedeAnular: false }])("no ofrece anulacion cuando el servidor la deniega: %j", async cambios => {
  iniciar(cambios);
  await screen.findByText(pago.comprobante);
  expect(screen.queryByRole("button", { name: "Anular pago" })).not.toBeInTheDocument();
});
it("conserva el motivo ante rechazo del servidor sin confirmar exito", async () => {
  iniciar({}, true); const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Anular pago" }));
  await user.type(screen.getByLabelText("Motivo de anulación"), "Error de registro");
  await user.click(screen.getByRole("button", { name: "Confirmar anulación" }));
  expect(await screen.findByText("No se pueden anular pagos de una caja cerrada")).toBeInTheDocument();
  expect(screen.getByLabelText("Motivo de anulación")).toHaveValue("Error de registro");
  expect(screen.queryByText("Pago anulado correctamente")).not.toBeInTheDocument();
});
it("al reabrir espera el detalle actualizado antes de ofrecer anulación", async () => {
  let consultas = 0;
  simularApi({ "GET /pagos/p1": async () => {
    consultas++;
    if (consultas > 1) await new Promise(resolve => setTimeout(resolve, 100));
    return { body: { ...pago, cajaEstado: consultas > 1 ? "CERRADA" : "ABIERTA", puedeAnular: consultas === 1 } };
  } });
  function Ejemplo() {
    const [abierto, setAbierto] = useState(true);
    return abierto ? <ComprobantePago id="p1" onCerrar={() => setAbierto(false)} /> : <button onClick={() => setAbierto(true)}>Abrir comprobante</button>;
  }
  renderConRutas([{ path: "/", element: <Ejemplo /> }]); const user = userEvent.setup();
  await screen.findByRole("button", { name: "Anular pago" });
  await user.click(screen.getByRole("button", { name: "Cerrar" }));
  await user.click(screen.getByRole("button", { name: "Abrir comprobante" }));
  expect(screen.queryByRole("button", { name: "Anular pago" })).not.toBeInTheDocument();
  expect(await screen.findByText("La caja está cerrada; este pago no puede anularse.")).toBeInTheDocument();
});
