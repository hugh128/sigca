import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());

// Lo siguiente solo aplica en pruebas con DOM (jsdom). Hay pruebas que corren en Node puro.
if (typeof window !== "undefined") {
  // jsdom no implementa scrollTo (lo usa ScrollRestoration de React Router)
  window.scrollTo = () => {};

  // jsdom no implementa <dialog>.showModal(): version minima para poder probar los modales
  const dialogo = document.createElement("dialog");
  if (typeof (dialogo as HTMLDialogElement).showModal !== "function") {
    const proto = Object.getPrototypeOf(dialogo) as HTMLDialogElement;
    Object.defineProperty(proto, "open", { configurable: true, get() { return this.hasAttribute("open"); } });
    proto.showModal = function () { this.setAttribute("open", ""); };
    proto.close = function () {
      if (!this.hasAttribute("open")) return;
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  }
}
