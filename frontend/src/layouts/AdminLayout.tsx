import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router";
import { useContenido } from "@/api/contenido";
import { Logo } from "@/components/public/Marca";
import { NAV_ADMIN } from "@/config/adminNav";
import { cn } from "@/lib/cn";
import { ROL_ETIQUETA } from "@/lib/roles";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";

function MenuAdmin({ alNavegar }: { alNavegar?: () => void }) {
  const rol = useAuthStore((s) => s.usuario?.rol);
  const items = NAV_ADMIN.filter((i) => rol && i.roles.includes(rol));
  return (
    <nav aria-label="Módulos">
      <ul className="space-y-1">
        {items.map(({ to, etiqueta, icono: Icono, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              onClick={alNavegar}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isActive ? "bg-white/15 font-medium text-white" : "text-white/75 hover:bg-white/10 hover:text-white",
                )
              }
            >
              <Icono className="size-5" aria-hidden="true" />
              {etiqueta}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function BloqueUsuario() {
  const usuario = useAuthStore((s) => s.usuario);
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion);
  if (!usuario) return null;
  return (
    <div className="border-t border-white/15 pt-4">
      <p className="truncate text-sm font-medium text-white">{usuario.nombre}</p>
      <p className="text-sm text-white/70">{ROL_ETIQUETA[usuario.rol]}</p>
      <button
        type="button"
        onClick={() => {
          cerrarSesion();
          toast.info("Cerraste sesión");
        }}
        className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white -ml-3"
      >
        <LogOut className="size-4" aria-hidden="true" />
        Cerrar sesión
      </button>
    </div>
  );
}

export function AdminLayout() {
  const { data } = useContenido();
  const nombre = data?.general.nombreCentro ?? "SIGCA";
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <a href="#contenido-admin" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow">
        Saltar al contenido
      </a>

      {/* Barra lateral (escritorio) */}
      <aside className="hidden flex-col gap-8 bg-marea-900 p-5 lg:flex lg:sticky lg:top-0 lg:h-screen">
        <Logo nombre={nombre} logoUrl={data?.general.logoUrl} claro />
        <div className="flex-1"><MenuAdmin /></div>
        <BloqueUsuario />
      </aside>

      {/* Barra superior (movil) */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between bg-marea-900 px-4 py-3">
          <Logo nombre={nombre} logoUrl={data?.general.logoUrl} claro />
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            aria-controls="menu-admin-movil"
            aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
            className="grid size-10 place-items-center rounded-lg text-white hover:bg-white/10"
          >
            {abierto ? <X className="size-6" aria-hidden="true" /> : <Menu className="size-6" aria-hidden="true" />}
          </button>
        </div>
        {abierto && (
          <div id="menu-admin-movil" className="space-y-6 bg-marea-900 px-4 pb-5">
            <MenuAdmin alNavegar={() => setAbierto(false)} />
            <BloqueUsuario />
          </div>
        )}
      </div>

      <main id="contenido-admin" className="min-w-0 px-4 py-8 sm:px-8 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
}
