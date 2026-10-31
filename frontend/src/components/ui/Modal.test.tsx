import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

function DosVentanas() {
  const [abierta, setAbierta] = useState<"a" | "b" | null>(null);
  return (
    <>
      <button onClick={() => setAbierta("a")}>Abrir A</button>
      <Modal abierto={abierta === "a"} onCerrar={() => setAbierta(null)} titulo="Ventana A">
        <button onClick={() => setAbierta("b")}>Pasar a B</button>
      </Modal>
      <Modal abierto={abierta === "b"} onCerrar={() => setAbierta(null)} titulo="Ventana B">
        <p>Contenido de B</p>
      </Modal>
    </>
  );
}

describe("Modal", () => {
  it("al reemplazar una ventana por otra, la segunda se queda abierta", async () => {
    const user = userEvent.setup();
    render(<DosVentanas />);
    await user.click(screen.getByRole("button", { name: "Abrir A" }));
    await user.click(await screen.findByRole("button", { name: "Pasar a B" }));
    expect(await screen.findByRole("dialog", { name: "Ventana B" })).toBeInTheDocument();
    // el cierre de A (que dispara su evento «close») no debe cerrar B
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByRole("dialog", { name: "Ventana B" })).toBeInTheDocument();
    expect(screen.getByText("Contenido de B")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Ventana A" })).not.toBeInTheDocument();
  });

  it("cuando la persona cierra con Escape (evento close del navegador) se avisa al padre", async () => {
    const onCerrar = vi.fn();
    render(<Modal abierto onCerrar={onCerrar} titulo="Ventana"><p>x</p></Modal>);
    const dialogo = await screen.findByRole("dialog", { name: "Ventana" });
    fireEvent(dialogo, new Event("close"));
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it("el botón Cerrar y el clic en el fondo avisan al padre", async () => {
    const onCerrar = vi.fn();
    const user = userEvent.setup();
    render(<Modal abierto onCerrar={onCerrar} titulo="Ventana"><p>x</p></Modal>);
    await user.click(await screen.findByRole("button", { name: "Cerrar" }));
    expect(onCerrar).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("dialog", { name: "Ventana" })); // el clic cae sobre el <dialog>, o sea, el fondo
    expect(onCerrar).toHaveBeenCalledTimes(2);
  });

  it("al cerrar por código no se llama a onCerrar de nuevo", async () => {
    const onCerrar = vi.fn();
    const { rerender } = render(<Modal abierto onCerrar={onCerrar} titulo="Ventana"><p>x</p></Modal>);
    await screen.findByRole("dialog");
    rerender(<Modal abierto={false} onCerrar={onCerrar} titulo="Ventana"><p>x</p></Modal>);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onCerrar).not.toHaveBeenCalled();
  });
});
