import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/store/auth";
import { admin, citasFixture, detalleDeCita, filtrarCitas, filtrarPacientes, pacientePorNombre, pacientesFixture, profesionalesFixture } from "@/test/datos";
import serviciosAdmin from "@/test/fixtures/servicios-admin.json";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import type { Paciente } from "@/types/api";
import PacienteDetalle from "./PacienteDetalle";

function abrir(nombre: string) {
  const p: Paciente = structuredClone(pacientePorNombre(nombre));
  useAuthStore.setState({ estado: "autenticado", usuario: admin, token: "t" });
  simularApi({
    [`GET /pacientes/${p.id}`]: { body: p },
    "GET /citas": (_i, url) => ({ body: filtrarCitas(citasFixture, url) }),
    ...Object.fromEntries(citasFixture.map((c) => [`GET /citas/${c.id}`, { body: detalleDeCita(c) }])),
    "GET /pacientes": (_i, url) => ({ body: filtrarPacientes(pacientesFixture, url) }),
    "GET /servicios": { body: serviciosAdmin },
    "GET /usuarios/profesionales": { body: profesionalesFixture },
  });
  renderConRutas([{ path: "/admin/pacientes/:id", element: <PacienteDetalle /> }, { path: "/admin/pacientes", element: <p>Lista</p> }, { path: "/admin/citas", element: <p>Citas</p> }], `/admin/pacientes/${p.id}`);
  return p;
}

beforeEach(reiniciarEstado);

describe("Ficha del paciente: citas", () => {
  it("muestra sus últimas citas con estado y profesional, y enlaza al historial completo", async () => {
    const p = abrir("Mateo");
    const seccion = await screen.findByRole("region", { name: "Citas" });
    const filas = await within(seccion).findAllByRole("listitem");
    expect(filas.length).toBe(Math.min(5, citasFixture.filter((c) => c.paciente.id === p.id).length));
    expect(within(filas[0]!).getByText(/Estimulación auditiva verbal/)).toBeInTheDocument();
    expect(within(seccion).getByRole("link", { name: "Ver historial completo" })).toHaveAttribute("href", `/admin/citas?paciente=${p.id}`);
  });

  it("«Ver» abre el detalle de la cita", async () => {
    abrir("Mateo");
    const user = userEvent.setup();
    const seccion = await screen.findByRole("region", { name: "Citas" });
    await user.click((await within(seccion).findAllByRole("button", { name: /Ver la cita del/ }))[0]!);
    expect(await screen.findByRole("dialog", { name: /Mateo Hernández Morales · Estimulación auditiva verbal/ })).toBeInTheDocument();
  });

  it("un paciente activo con responsable puede recibir una cita: el formulario ya trae al paciente", async () => {
    abrir("Valeria");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Programar cita" }));
    const modal = await screen.findByRole("dialog", { name: "Programar cita" });
    expect(within(modal).getByText("Valeria Castillo Juárez")).toBeInTheDocument();
    expect(within(modal).queryByRole("button", { name: /Cambiar/ })).not.toBeInTheDocument();
  });

  it("RN-04: un menor sin responsable no puede programar, y se explica por qué", async () => {
    abrir("Lucía");
    const boton = await screen.findByRole("button", { name: "Programar cita" });
    expect(boton).toBeDisabled();
    expect(screen.getByText("Registra un responsable para poder programarle citas.")).toBeInTheDocument();
  });

  it("RN-14: un paciente inactivo no puede programar, y se explica por qué", async () => {
    abrir("Elena");
    expect(await screen.findByRole("button", { name: "Programar cita" })).toBeDisabled();
    expect(screen.getByText("Reactiva al paciente para programarle citas.")).toBeInTheDocument();
  });

  it("sin citas lo dice", async () => {
    abrir("Elena"); // la paciente inactiva del seed nunca tuvo citas
    const seccion = await screen.findByRole("region", { name: "Citas" });
    expect(await within(seccion).findByText("Todavía no tiene citas.")).toBeInTheDocument();
  });
});
