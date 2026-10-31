import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/store/auth";
import horariosFixture from "@/test/fixtures/horarios.json";
import usuarios from "@/test/fixtures/usuarios.json";
import { reiniciarEstado, renderConRutas, simularApi } from "@/test/utils";
import type { DiaHorario, Usuario } from "@/types/api";
import HorariosAdmin from "./HorariosAdmin";

const rutas = [{ path: "/admin/horarios", element: <HorariosAdmin /> }];
const admin = usuarios.find((u) => u.rol === "ADMINISTRADOR") as Usuario;

function iniciar(extra: Parameters<typeof simularApi>[0] = {}) {
  useAuthStore.setState({ estado: "autenticado", usuario: admin, token: "t" });
  return simularApi({
    "GET /horarios": { body: structuredClone(horariosFixture) },
    "PUT /horarios": (init) => ({ body: JSON.parse(String(init?.body)) }),
    ...extra,
  });
}
const enviado = (api: ReturnType<typeof simularApi>) => {
  const l = api.mock.calls.find(([, i]) => i?.method === "PUT");
  return l ? (JSON.parse(String(l[1]!.body)).dias as DiaHorario[]) : undefined;
};
const guardar = () => screen.getByRole("button", { name: "Guardar horarios" });
const hora = (el: HTMLElement, valor: string) => fireEvent.change(el, { target: { value: valor } });

beforeEach(reiniciarEstado);

describe("Horarios (panel)", () => {
  it("recepción consulta los horarios sin controles de edición", async () => {
    iniciar();
    useAuthStore.setState({ usuario: usuarios.find(u => u.rol === "RECEPCIONISTA") as Usuario });
    renderConRutas(rutas, "/admin/horarios");
    expect(await screen.findByText("Lunes a viernes")).toBeInTheDocument();
    expect(screen.getByText("Domingo")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar horarios" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Contenido/ })).not.toBeInTheDocument();
  });
  it("muestra los 7 días con sus franjas y una vista previa agrupada", async () => {
    iniciar();
    renderConRutas(rutas, "/admin/horarios");
    expect(await screen.findByRole("group", { name: "Lunes" })).toBeInTheDocument();
    expect(screen.getAllByRole("group").map((g) => g.querySelector("legend")?.textContent)).toEqual([
      "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo",
    ]);
    expect(screen.getByLabelText("Lunes, franja 1: desde")).toHaveValue("08:00");
    expect(screen.getByLabelText("Lunes, franja 2: hasta")).toHaveValue("18:00");
    const previa = screen.getByRole("complementary");
    expect(within(previa).getByText("Lunes a viernes")).toBeInTheDocument();
    expect(within(previa).getByText("Domingo")).toBeInTheDocument();
  });

  it("cambia una hora, la vista previa se actualiza al instante y se guarda", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/horarios");
    await screen.findByRole("group", { name: "Lunes" });
    expect(guardar()).toBeDisabled();

    hora(screen.getByLabelText("Lunes, franja 1: desde"), "09:00");
    // el lunes ya no es igual a martes-viernes: la vista previa los separa
    expect(within(screen.getByRole("complementary")).getByText("Lunes")).toBeInTheDocument();
    expect(within(screen.getByRole("complementary")).getByText("Martes a viernes")).toBeInTheDocument();

    await user.click(guardar());
    expect(await screen.findByText(/Horarios guardados/)).toBeInTheDocument();
    const dias = enviado(api)!;
    expect(dias).toHaveLength(7);
    expect(dias[0]!.franjas[0]).toEqual({ inicio: "09:00", fin: "12:00" });
    await waitFor(() => expect(guardar()).toBeDisabled());
  });

  it("rechaza franjas traslapadas", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/horarios");
    await screen.findByRole("group", { name: "Lunes" });
    hora(screen.getByLabelText("Lunes, franja 2: desde"), "11:00");
    await user.click(guardar());
    expect(await screen.findByText("Las franjas de un mismo día no pueden traslaparse")).toBeInTheDocument();
    expect(enviado(api)).toBeUndefined();
  });

  it("rechaza una hora de fin anterior a la de inicio, bajo el campo correcto", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/horarios");
    await screen.findByRole("group", { name: "Sábado" });
    hora(screen.getByLabelText("Sábado, franja 1: hasta"), "07:00");
    await user.click(guardar());
    const sabado = screen.getByRole("group", { name: "Sábado" });
    expect(await within(sabado).findByText("La hora de fin debe ser posterior a la de inicio")).toBeInTheDocument();
    expect(enviado(api)).toBeUndefined();
  });

  it("activar un día sin atención y agregar franjas; quitar una franja", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/horarios");
    const domingo = await screen.findByRole("group", { name: "Domingo" });
    expect(within(domingo).queryByLabelText(/franja 1/)).not.toBeInTheDocument();

    await user.click(within(domingo).getByLabelText("Se atiende el domingo"));
    expect(within(domingo).getByLabelText("Domingo, franja 1: desde")).toHaveValue("08:00");
    expect(within(domingo).getByLabelText("Domingo, franja 1: hasta")).toHaveValue("12:00");

    await user.click(within(domingo).getByRole("button", { name: "Agregar franja" }));
    expect(within(domingo).getByLabelText("Domingo, franja 2: desde")).toHaveValue("14:00");
    await user.click(within(domingo).getByRole("button", { name: "Quitar la franja 2 del domingo" }));
    expect(within(domingo).queryByLabelText("Domingo, franja 2: desde")).not.toBeInTheDocument();

    await user.click(guardar());
    await screen.findByText(/Horarios guardados/);
    expect(enviado(api)![6]).toEqual({ dia: "DOMINGO", atiende: true, franjas: [{ inicio: "08:00", fin: "12:00" }] });
  });

  it("un día con atención y sin franjas no se puede guardar", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/horarios");
    const sabado = await screen.findByRole("group", { name: "Sábado" });
    await user.click(within(sabado).getByRole("button", { name: "Quitar la franja 1 del sábado" }));
    await user.click(guardar());
    expect(await within(sabado).findByText("Agrega al menos una franja de atención")).toBeInTheDocument();
    expect(enviado(api)).toBeUndefined();
  });

  it("desmarcar un día lo deja sin atención", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/horarios");
    const sabado = await screen.findByRole("group", { name: "Sábado" });
    await user.click(within(sabado).getByLabelText("Se atiende el sábado"));
    expect(within(sabado).queryByLabelText(/franja 1/)).not.toBeInTheDocument();
    await user.click(guardar());
    await screen.findByText(/Horarios guardados/);
    expect(enviado(api)![5]!.atiende).toBe(false);
  });

  it("copiar el lunes a martes–viernes", async () => {
    const api = iniciar();
    const user = userEvent.setup();
    renderConRutas(rutas, "/admin/horarios");
    await screen.findByRole("group", { name: "Lunes" });
    hora(screen.getByLabelText("Lunes, franja 1: desde"), "07:30");
    hora(screen.getByLabelText("Lunes, franja 2: hasta"), "17:00");
    await user.click(screen.getByRole("button", { name: /Copiar el lunes/ }));

    expect(screen.getByLabelText("Viernes, franja 1: desde")).toHaveValue("07:30");
    expect(screen.getByLabelText("Miércoles, franja 2: hasta")).toHaveValue("17:00");
    expect(within(screen.getByRole("complementary")).getByText("Lunes a viernes")).toBeInTheDocument();

    await user.click(guardar());
    await screen.findByText(/Horarios guardados/);
    const dias = enviado(api)!;
    for (const i of [0, 1, 2, 3, 4]) expect(dias[i]!.franjas).toEqual([{ inicio: "07:30", fin: "12:00" }, { inicio: "14:00", fin: "17:00" }]);
    expect(dias[5]!.franjas).toEqual([{ inicio: "08:00", fin: "12:00" }]); // el sábado no se toca
  });

  it("avisa si se intenta salir con cambios sin guardar", async () => {
    iniciar();
    renderConRutas([...rutas, { path: "/admin", element: <p>Panel</p> }], "/admin/horarios");
    await screen.findByRole("group", { name: "Lunes" });
    hora(screen.getByLabelText("Lunes, franja 1: desde"), "09:00");
    const enlace = screen.getByRole("link", { name: /Contenido › General/ });
    expect(enlace).toHaveAttribute("href", "/admin/contenido?seccion=general");
  });
});
