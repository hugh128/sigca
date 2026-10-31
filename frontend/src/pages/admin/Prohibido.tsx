import { ShieldAlert } from "lucide-react";
import { LinkBoton } from "@/components/ui/Button";

export default function Prohibido() {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <ShieldAlert className="mx-auto size-10 text-danger" aria-hidden="true" />
      <h1 className="mt-4 text-2xl font-semibold text-marea-900">No tienes acceso a esta sección</h1>
      <p className="mt-2 text-ink-soft">Tu rol no incluye este módulo. Si crees que es un error, pide ayuda al administrador.</p>
      <LinkBoton to="/admin" className="mt-6">Volver al panel</LinkBoton>
    </div>
  );
}
