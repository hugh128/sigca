import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import { DetalleCaja } from "./DetalleCaja";
beforeEach(reiniciarEstado);
const resumen = { totalEfectivoCentavos: 50000, totalTransferenciaCentavos: 35000, totalTarjetaCentavos: 15000, totalIngresosCentavos: 100000, efectivoEsperadoCentavos: 70000 };
const caja = { id: "c1", usuario: { id: "u1", nombre: "Laura" }, apertura: "2026-10-31T12:00:00Z", montoInicialCentavos: 20000, estado: "ABIERTA", resumen, puedeCerrar: true };
function iniciar(cerrada = false, falla = false) {
  let actual = { ...caja, estado: cerrada ? "CERRADA" : "ABIERTA", puedeCerrar: !cerrada, cierre: cerrada ? "2026-10-31T16:00:00Z" : undefined, cerradoPor: cerrada ? { nombre: "Laura" } : undefined, efectivoContadoCentavos: cerrada ? 69000 : undefined, diferenciaCentavos: cerrada ? -1000 : undefined };
  const api = simularApi({
    "GET /cajas/c1": () => ({ body: actual }),
    "GET /cajas/c1/movimientos": { body: { items: [], page: 1, pages: 1, total: 0 } },
    "POST /cajas/c1/cerrar": init => {
      if (falla) return { status: 500, body: { message: "No se pudo guardar el cierre" } };
      actual = { ...actual, estado: "CERRADA", puedeCerrar: false, cierre: "2026-10-31T16:00:00Z", cerradoPor: { nombre: "Laura" }, efectivoContadoCentavos: JSON.parse(init!.body as string).efectivoContadoCentavos, diferenciaCentavos: -1000 };
      return { body: actual };
    },
  });
  renderConRutas([{ path: "/", element: <DetalleCaja id="c1" onCerrar={vi.fn()} /> }]); return api;
}
it("cierra con centavos exactos y muestra diferencia y auditoria", async () => {
  const api = iniciar(); const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Cerrar esta caja" }));
  await user.type(screen.getByLabelText("Efectivo contado (Q)"), "690.00");
  expect(screen.getByText(/Faltante de Q\s*10.00/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Confirmar cierre" }));
  expect(await screen.findByText("Caja cerrada correctamente")).toBeInTheDocument();
  expect(await screen.findByText(/Cerrada por Laura/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Cerrar esta caja" })).not.toBeInTheDocument();
  const post = api.mock.calls.find(([, o]) => o?.method === "POST")!;
  expect(JSON.parse(post[1]!.body as string)).toEqual({ efectivoContadoCentavos: 69000 });
});
it("un cierre anterior muestra totales e historial sin permitir editar", async () => {
  iniciar(true);
  expect(await screen.findByText(/Cerrada por Laura/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Cerrar esta caja" })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Movimientos" })).toBeInTheDocument();
});
it("valida contado y conserva el formulario ante fallo sin confirmar cierre", async () => {
  const api = iniciar(false, true); const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Cerrar esta caja" }));
  await user.type(screen.getByLabelText("Efectivo contado (Q)"), "-1");
  await user.click(screen.getByRole("button", { name: "Confirmar cierre" }));
  expect(api.mock.calls.some(([, o]) => o?.method === "POST")).toBe(false);
  await user.clear(screen.getByLabelText("Efectivo contado (Q)")); await user.type(screen.getByLabelText("Efectivo contado (Q)"), "690");
  await user.click(screen.getByRole("button", { name: "Confirmar cierre" }));
  expect(await screen.findByText("No se pudo guardar el cierre")).toBeInTheDocument();
  expect(screen.getByLabelText("Efectivo contado (Q)")).toHaveValue("690");
  expect(screen.queryByText("Caja cerrada correctamente")).not.toBeInTheDocument();
});
