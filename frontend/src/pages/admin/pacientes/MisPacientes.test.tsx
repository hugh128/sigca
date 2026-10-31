import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/store/auth";
import { consultasA, pacientesBasicosFixture, paginar, usuarioPorRol } from "@/test/datos";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import { normalizar } from "@/lib/texto";
import MisPacientes from "./MisPacientes";

const rutas = [{ path: "/admin/mis-pacientes", element: <MisPacientes /> }, { path: "/admin/citas", element: <p>Citas</p> }];

beforeEach(() => {
  reiniciarEstado();
  useAuthStore.setState({ estado: "autenticado", usuario: usuarioPorRol("PROFESIONAL"), token: "t" });
});

describe("Mis pacientes (profesional)", () => {
  it("lista a los pacientes que atiende, solo con información básica", async () => {
    simularApi({ "GET /pacientes": (_i, url) => ({ body: paginar(pacientesBasicosFixture, url) }) });
    renderConRutas(rutas, "/admin/mis-pacientes");
    expect(await screen.findByText(`${pacientesBasicosFixture[0]!.nombres} ${pacientesBasicosFixture[0]!.apellidos}`)).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(pacientesBasicosFixture.length + 1);
    expect(screen.queryByRole("columnheader", { name: /Teléfono|Dirección|Responsables/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Por privacidad solo ves su información básica/)).toBeInTheDocument();
  });

  it("busca sin tildes", async () => {
    const api = simularApi({
      "GET /pacientes": (_i, url) => {
        const q = normalizar(url.searchParams.get("q") ?? "");
        return { body: paginar(pacientesBasicosFixture.filter((p) => !q || normalizar(`${p.nombres} ${p.apellidos}`).includes(q)), url) };
      },
    });
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/mis-pacientes");
    await screen.findAllByRole("row");
    await user.type(screen.getByLabelText("Buscar paciente"), "sebastian");
    await waitFor(() => expect(consultasA(api, "GET", "/pacientes").some((c) => c.url.searchParams.get("q") === "sebastian")).toBe(true));
    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(2));
  });

  it("cada paciente enlaza a su historial de citas", async () => {
    simularApi({ "GET /pacientes": (_i, url) => ({ body: paginar(pacientesBasicosFixture, url) }) });
    renderConRutas(rutas, "/admin/mis-pacientes");
    const p = pacientesBasicosFixture[0]!;
    const enlace = await screen.findByRole("link", { name: `Historial de citas de ${p.nombres} ${p.apellidos}` });
    expect(enlace).toHaveAttribute("href", `/admin/citas?paciente=${p.id}`);
  });

  it("sin pacientes asignados lo explica", async () => {
    simularApi({ "GET /pacientes": { body: { items: [], total: 0, page: 1, limit: 15, pages: 1 } } });
    renderConRutas(rutas, "/admin/mis-pacientes");
    expect(await screen.findByText("Todavía no tienes pacientes asignados")).toBeInTheDocument();
    expect(within(document.body).getByText(/Aparecerán aquí cuando tengas citas/)).toBeInTheDocument();
  });
});
