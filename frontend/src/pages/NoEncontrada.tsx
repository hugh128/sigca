import { LinkBoton } from "@/components/ui/Button";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export default function NoEncontrada() {
  useDocumentTitle("Página no encontrada");
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold text-marea-900">No encontramos esta página</h1>
      <p className="mt-3 font-serif text-lg text-ink-soft">Puede que la dirección esté mal escrita o que la página ya no exista.</p>
      <LinkBoton to="/" className="mt-8">Volver al inicio</LinkBoton>
    </div>
  );
}
