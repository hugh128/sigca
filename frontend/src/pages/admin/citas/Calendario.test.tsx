import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/store/auth";
import { citasFixture, consultasA, detalleDeCita, filtrarCitas, profesionalesFixture, usuarioPorRol } from "@/test/datos";
import horarios from "@/test/fixtures/horarios.json";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import type { Cita, Rol } from "@/types/api";
import Calendario from "./Calendario";

/** El calendario muestra la semana de «hoy» según el navegador: las citas de prueba se ubican en ese día. */
const HOY = new Date().toLocaleDateString("sv-SE");

const confirmada = citasFixture.find((c) => c.estado === "CONFIRMADA" && c.paciente.nombres === "Valeria")!;
const pendiente = citasFixture.find((c) => c.estado === "PENDIENTE" && c.paciente.nombres === "Camila")!;
const completada = citasFixture.find((c) => c.estado === "COMPLETADA" && c.paciente.nombres === "Jorge")!;
const cancelada = citasFixture.find((c) => c.estado === "CANCELADA")!;

const citasDeHoy: Cita[] = [
  { ...confirmada, fecha: HOY, horaInicio: "09:00", horaFin: "09:50" },
  { ...pendiente, fecha: HOY, horaInicio: "10:00", horaFin: "10:50" },
  { ...completada, fecha: HOY, horaInicio: "11:00", horaFin: "11:50" },
  { ...cancelada, fecha: HOY, horaInicio: "15:00", horaFin: "15:50" },
];

function iniciar(rol: Rol = "RECEPCIONISTA", extra: Parameters<typeof simularApi>[0] = {}) {
  useAuthStore.setState({ estado: "autenticado", usuario: usuarioPorRol(rol), token: "t" });
  return simularApi({
    "GET /citas": (_i, url) => ({ body: filtrarCitas(citasDeHoy, url) }),
    "GET /usuarios/profesionales": { body: profesionalesFixture },
    "GET /horarios": { body: horarios },
    ...extra,
  });
}
const peticiones = (api: ReturnType<typeof simularApi>) => consultasA(api, "GET", "/citas").map((c) => c.url.searchParams);
const nombre = (c: Cita) => `${c.paciente.nombres} ${c.paciente.apellidos}`;

beforeEach(reiniciarEstado);

describe("Calendario", () => {
  it("muestra la barra de navegación en español y las tres vistas", async () => {
    iniciar();
    renderConRutas([{ path: "/", element: <Calendario /> }], "/");
    expect(await screen.findByRole("button", { name: "Hoy" })).toBeInTheDocument();
    for (const v of ["Mes", "Semana", "Día"]) expect(screen.getByRole("button", { name: v })).toBeInTheDocument();
  });

  it("pide las citas del rango visible (una semana), sin las canceladas, hasta 500", async () => {
    const api = iniciar();
    renderConRutas([{ path: "/", element: <Calendario /> }], "/");
    await waitFor(() => expect(peticiones(api).length).toBeGreaterThan(0));
    const p = peticiones(api)[0]!;
    expect(p.get("estado")).toBe("PENDIENTE,CONFIRMADA,COMPLETADA");
    expect(p.get("limit")).toBe("500");
    const dias = (new Date(`${p.get("hasta")}T00:00:00Z`).getTime() - new Date(`${p.get("desde")}T00:00:00Z`).getTime()) / 86_400_000;
    expect(dias).toBe(6); // lunes a domingo, ambos incluidos
    expect(p.get("desde")! <= HOY && HOY <= p.get("hasta")!).toBe(true);
  });

  it("dibuja cada cita con el nombre del paciente", async () => {
    iniciar();
    renderConRutas([{ path: "/", element: <Calendario /> }], "/");
    expect(await screen.findByText(nombre(confirmada))).toBeInTheDocument();
    expect(screen.getByText(nombre(pendiente))).toBeInTheDocument();
    expect(screen.getByText(nombre(completada))).toBeInTheDocument();
    expect(screen.queryByText(nombre(cancelada))).not.toBeInTheDocument(); // canceladas ocultas por defecto
  });

  it("«Mostrar canceladas» las incluye (tachadas) y las pide al servidor", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    renderConRutas([{ path: "/", element: <Calendario /> }], "/");
    await screen.findByText(nombre(confirmada));
    await user.click(screen.getByLabelText("Mostrar canceladas"));
    expect(await screen.findByText(nombre(cancelada))).toBeInTheDocument();
    expect(peticiones(api).at(-1)!.get("estado")).toBe("PENDIENTE,CONFIRMADA,COMPLETADA,CANCELADA");
    expect(screen.getByText(nombre(cancelada)).closest(".fc-event")).toHaveClass("cita-cancelada");
  });

  it("la leyenda de estados incluye «Cancelada» solo cuando se muestran canceladas", async () => {
    iniciar();
    const user = userEvent.setup();
    renderConRutas([{ path: "/", element: <Calendario /> }], "/");
    const leyenda = await screen.findByRole("list", { name: "Estados de las citas" });
    expect(within(leyenda).queryByText("Cancelada")).not.toBeInTheDocument();
    expect(within(leyenda).getByText("Confirmada")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Mostrar canceladas"));
    expect(await within(screen.getByRole("list", { name: "Estados de las citas" })).findByText("Cancelada")).toBeInTheDocument();
  });

  it("filtra por profesional", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    renderConRutas([{ path: "/", element: <Calendario /> }], "/");
    const select = await screen.findByLabelText("Filtrar por profesional");
    await within(select).findByRole("option", { name: profesionalesFixture[0]!.nombre });
    await user.selectOptions(select, profesionalesFixture[0]!.id);
    await waitFor(() => expect(peticiones(api).at(-1)!.get("profesionalId")).toBe(profesionalesFixture[0]!.id));
    // solo quedan las citas de ese profesional
    await waitFor(() => expect(screen.queryByText(nombre(completada))).not.toBeInTheDocument());
    expect(screen.getByText(nombre(confirmada))).toBeInTheDocument();
  });

  it("al hacer clic en una cita se abre su detalle con las acciones", async () => {
    iniciar("RECEPCIONISTA", { [`GET /citas/${confirmada.id}`]: { body: detalleDeCita(citasDeHoy[0]!) } });
    const user = userEvent.setup();
    renderConRutas([{ path: "/", element: <Calendario /> }], "/");
    await user.click(await screen.findByText(nombre(confirmada)));
    const modal = await screen.findByRole("dialog", { name: `${nombre(confirmada)} · ${confirmada.servicio.nombre}` });
    expect(await within(modal).findByRole("button", { name: "Reprogramar" })).toBeInTheDocument();
  });

  it("cambiar a la vista «Mes» pide un rango más amplio", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    renderConRutas([{ path: "/", element: <Calendario /> }], "/");
    await screen.findByText(nombre(confirmada));
    await user.click(screen.getByRole("button", { name: "Mes" }));
    await waitFor(() => {
      const p = peticiones(api).at(-1)!;
      const dias = (new Date(`${p.get("hasta")}T00:00:00Z`).getTime() - new Date(`${p.get("desde")}T00:00:00Z`).getTime()) / 86_400_000;
      expect(dias).toBeGreaterThanOrEqual(27);
    });
  });

  it("el profesional ve su agenda sin filtro de profesional y sin poder programar", async () => {
    const api = iniciar("PROFESIONAL");
    renderConRutas([{ path: "/", element: <Calendario /> }], "/");
    await screen.findByText(nombre(confirmada));
    expect(screen.queryByLabelText("Filtrar por profesional")).not.toBeInTheDocument();
    expect(screen.getByText("Tu agenda.")).toBeInTheDocument();
    expect(peticiones(api).every((p) => p.get("profesionalId") === null)).toBe(true);
    expect(consultasA(api, "GET", "/usuarios/profesionales")).toHaveLength(0);
  });

  it("muestra horas de atencion fuera de 07:00 a 19:00", async () => {
    iniciar("RECEPCIONISTA", {
      "GET /horarios": { body: { dias: horarios.dias.map(d => ({ ...d, atiende: true, franjas: [{ inicio: "05:00", fin: "22:00" }] })) } },
    });
    const { container } = renderConRutas([{ path: "/", element: <Calendario /> }], "/");
    await screen.findByText(nombre(confirmada));
    await waitFor(() => {
      expect(container.querySelector('[data-time="05:00:00"]')).toBeInTheDocument();
      expect(container.querySelector('[data-time="21:30:00"]')).toBeInTheDocument();
    });
  });

  it("si falla la carga de citas lo avisa", async () => {
    iniciar("RECEPCIONISTA", { "GET /citas": { status: 500, body: { message: "Error interno del servidor" } } });
    renderConRutas([{ path: "/", element: <Calendario /> }], "/");
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar las citas de este período");
  });
});
