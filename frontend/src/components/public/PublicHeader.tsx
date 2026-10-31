import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router";
import { cn } from "@/lib/cn";
import { Logo } from "./Marca";

const ENLACES = [
  { to: "/", etiqueta: "Inicio", end: true },
  { to: "/mision-vision", etiqueta: "Misión y visión" },
  { to: "/servicios", etiqueta: "Servicios" },
  { to: "/contenido-educativo", etiqueta: "Contenido educativo" },
  { to: "/corporativo", etiqueta: "Corporativo" },
  { to: "/horarios", etiqueta: "Horarios" },
];

const claseEnlace = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-md px-3 py-2 text-sm transition-colors",
    isActive
      ? "font-semibold text-marea-900 underline decoration-sol-400 decoration-2 underline-offset-8"
      : "text-ink-soft hover:text-ink",
  );

export function PublicHeader({ nombre, logoUrl }: { nombre: string; logoUrl?: string }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <header className="border-b border-marea-100 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6">
        <Link to="/" aria-label={`${nombre}, ir al inicio`} className="rounded-md">
          <Logo nombre={nombre} logoUrl={logoUrl} />
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {ENLACES.map((e) => (
            <NavLink key={e.to} to={e.to} end={e.end} className={claseEnlace}>
              {e.etiqueta}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="grid size-10 place-items-center rounded-lg text-marea-900 hover:bg-marea-50 md:hidden"
          aria-expanded={abierto}
          aria-controls="menu-movil"
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setAbierto((v) => !v)}
        >
          {abierto ? <X className="size-6" aria-hidden="true" /> : <Menu className="size-6" aria-hidden="true" />}
        </button>
      </div>

      {abierto && (
        <nav id="menu-movil" aria-label="Principal" className="border-t border-marea-100 px-4 pb-4 pt-2 md:hidden">
          <ul className="flex flex-col">
            {ENLACES.map((e) => (
              <li key={e.to}>
                <NavLink to={e.to} end={e.end} onClick={() => setAbierto(false)} className={(s) => cn(claseEnlace(s), "block py-3 text-base")}>
                  {e.etiqueta}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
