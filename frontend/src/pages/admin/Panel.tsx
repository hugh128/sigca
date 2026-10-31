import { useServiciosAdmin } from "@/api/servicios";
import { useUsuarios } from "@/api/usuarios";
import { Cargando } from "@/components/ui/Estados";
import { ROL_ETIQUETA } from "@/lib/roles";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { useAuthStore } from "@/store/auth";

function Dato({ etiqueta, valor, cargando }: { etiqueta: string; valor?: string; cargando: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-4">
      <dt className="text-ink-soft">{etiqueta}</dt>
      <dd className="text-lg font-medium text-marea-900">{cargando ? "…" : (valor ?? "—")}</dd>
    </div>
  );
}

export default function Panel() {
  const usuario = useAuthStore((s) => s.usuario);
  useDocumentTitle("Panel", "SIGCA");

  const esAdmin = usuario?.rol === "ADMINISTRADOR";
  const servicios = useServiciosAdmin();
  const usuarios = useUsuarios(esAdmin);

  if (!usuario) return <Cargando />;

  const activosServicios = servicios.data?.filter((s) => s.estado === "ACTIVO").length;
  const activosUsuarios = usuarios.data?.filter((u) => u.activo).length;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight text-marea-900">Hola, {usuario.nombre.split(" ")[0]}</h1>
      <p className="mt-2 text-ink-soft">Iniciaste sesión como {ROL_ETIQUETA[usuario.rol].toLowerCase()}.</p>

      <h2 className="mt-10 text-lg font-semibold text-marea-900">Resumen</h2>
      <dl className="mt-2 divide-y divide-marea-100 border-y border-marea-100">
        <Dato
          etiqueta="Servicios activos"
          cargando={servicios.isPending}
          valor={servicios.data ? `${activosServicios} de ${servicios.data.length}` : undefined}
        />
        {esAdmin && (
          <Dato
            etiqueta="Usuarios activos"
            cargando={usuarios.isPending}
            valor={usuarios.data ? `${activosUsuarios} de ${usuarios.data.length}` : undefined}
          />
        )}
      </dl>
    </div>
  );
}
