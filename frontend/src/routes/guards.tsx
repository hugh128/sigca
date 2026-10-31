import { Navigate, Outlet, useLocation } from "react-router";
import { Cargando } from "@/components/ui/Estados";
import { useAuthStore } from "@/store/auth";
import type { Rol } from "@/types/api";
import Prohibido from "@/pages/admin/Prohibido";

/** Exige sesion iniciada. Mientras se verifica el token guardado muestra una pantalla de carga. */
export function RequireAuth() {
  const estado = useAuthStore((s) => s.estado);
  const location = useLocation();

  if (estado === "inicial" || estado === "cargando") {
    return (
      <div className="grid min-h-screen place-items-center">
        <Cargando texto="Verificando tu sesión…" />
      </div>
    );
  }
  if (estado === "anonimo") return <Navigate to="/admin/login" replace state={{ desde: location.pathname + location.search }} />;
  return <Outlet />;
}

/** Exige uno de los roles indicados. Debe ir dentro de RequireAuth. */
export function RequireRole({ roles }: { roles: Rol[] }) {
  const usuario = useAuthStore((s) => s.usuario);
  if (!usuario || !roles.includes(usuario.rol)) return <Prohibido />;
  return <Outlet />;
}

/** Para el login: si ya hay sesion, lleva directo al panel. */
export function GuestOnly() {
  const estado = useAuthStore((s) => s.estado);
  if (estado === "inicial" || estado === "cargando") {
    return (
      <div className="grid min-h-screen place-items-center">
        <Cargando />
      </div>
    );
  }
  if (estado === "autenticado") return <Navigate to="/admin" replace />;
  return <Outlet />;
}
