import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it } from "vitest";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import { useAuthStore } from "@/store/auth";
import { usuarioPorRol } from "@/test/datos";
import Caja from "./Caja";
beforeEach(reiniciarEstado);
const caja = { id: "c1", usuario: { id: "u1", nombre: "Laura" }, apertura: "2026-10-31T18:00:00Z", montoInicialCentavos: 1999, estado: "ABIERTA", resumen: { totalEfectivoCentavos: 0, totalTransferenciaCentavos: 0, totalTarjetaCentavos: 0, totalIngresosCentavos: 0, efectivoEsperadoCentavos: 1999 }, puedeCerrar: true };
function iniciar(rol: "ADMINISTRADOR" | "RECEPCIONISTA" = "RECEPCIONISTA", abierta = false, conflicto = false) {
  let actual = abierta ? caja : null;
  useAuthStore.setState({ token: "t", estado: "autenticado", usuario: usuarioPorRol(rol) });
  const api = simularApi({
    "GET /cajas/actual": () => ({ body: actual }),
    "GET /cajas": () => ({ body: { items: actual ? [actual] : [], total: actual ? 1 : 0, page: 1, pages: 1 } }),
    "POST /cajas/abrir": init => { actual = { ...caja, montoInicialCentavos: JSON.parse(init!.body as string).montoInicialCentavos }; return conflicto ? { status: 409, body: { message: "Ya tienes una caja abierta" } } : { status: 201, body: actual }; },
    "GET /cajas/c1": { body: caja },
    "GET /cajas/c1/movimientos": { body: { items: [], total: 0, page: 1, pages: 1 } },
  });
  renderConRutas([{ path: "/", element: <Caja /> }]); return api;
}
it("abre con centavos exactos y oculta el formulario tras guardar", async () => {
  const api = iniciar(); const user = userEvent.setup();
  await user.type(await screen.findByLabelText("Monto inicial (Q)"), "19.99");
  await user.click(screen.getByRole("button", { name: "Abrir mi caja" }));
  expect(await screen.findByText("Caja abierta correctamente")).toBeInTheDocument();
  expect(screen.queryByLabelText("Monto inicial (Q)")).not.toBeInTheDocument();
  const post = api.mock.calls.find(([, o]) => o?.method === "POST")!;
  expect(JSON.parse(post[1]!.body as string)).toEqual({ montoInicialCentavos: 1999 });
  expect(screen.getByRole("heading", { name: "Mi caja abierta" })).toBeInTheDocument();
});
it("rechaza montos invalidos sin llamar a la API", async () => {
  const api = iniciar(); const user = userEvent.setup();
  await user.type(await screen.findByLabelText("Monto inicial (Q)"), "-1");
  await user.click(screen.getByRole("button", { name: "Abrir mi caja" }));
  expect(await screen.findByText(/Escribe un monto válido/)).toBeInTheDocument();
  expect(api.mock.calls.some(([, o]) => o?.method === "POST")).toBe(false);
});
it("al competir por una apertura muestra la caja ganadora", async () => {
  iniciar("RECEPCIONISTA", false, true); const user = userEvent.setup();
  await user.type(await screen.findByLabelText("Monto inicial (Q)"), "0");
  await user.click(screen.getByRole("button", { name: "Abrir mi caja" }));
  expect(await screen.findByRole("heading", { name: "Mi caja abierta" })).toBeInTheDocument();
  expect(screen.queryByText("Caja abierta correctamente")).not.toBeInTheDocument();
});
it("administrador consulta todas y recepción solo las suyas", async () => {
  iniciar("ADMINISTRADOR", true);
  expect(await screen.findByRole("heading", { name: "Todas las cajas" })).toBeInTheDocument();
  expect(screen.getByLabelText("Mostrar solo mis cajas")).toBeInTheDocument();
  await userEvent.setup().click(await screen.findByRole("button", { name: "Ver caja de Laura" }));
  expect(await screen.findByRole("dialog", { name: "Detalle de caja" })).toBeInTheDocument();
});
