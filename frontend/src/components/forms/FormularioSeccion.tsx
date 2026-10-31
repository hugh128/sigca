import { useStore, type AnyFormApi } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorFormulario } from "./ErrorFormulario";

/**
 * Envoltorio de un formulario largo: barra de acciones fija abajo con "Descartar" y "Guardar",
 * error general del servidor, y aviso al pagina (`alCambiarSucio`) de si hay cambios sin guardar.
 */
export function FormularioSeccion({
  form, children, alCambiarSucio, textoGuardar = "Guardar cambios",
}: { form: AnyFormApi; children: ReactNode; alCambiarSucio?: (sucio: boolean) => void; textoGuardar?: string }) {
  const sinCambios = useStore(form.store, (s) => s.isDefaultValue);
  const enviando = useStore(form.store, (s) => s.isSubmitting);
  const errores = useStore(form.store, (s) => s.errors);
  const sucio = !sinCambios;

  useEffect(() => {
    alCambiarSucio?.(sucio);
    return () => alCambiarSucio?.(false);
  }, [sucio, alCambiarSucio]);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div className="space-y-6">
        <ErrorFormulario errores={errores} />
        {children}
      </div>
      <div className="sticky bottom-0 -mx-4 mt-8 flex items-center justify-end gap-3 border-t border-marea-100 bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        {sucio && <p className="mr-auto text-sm text-ink-soft">Hay cambios sin guardar</p>}
        <Button variante="texto" disabled={!sucio || enviando} onClick={() => form.reset()}>Descartar cambios</Button>
        <Button type="submit" disabled={!sucio || enviando}>
          {enviando && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
          {enviando ? "Guardando…" : textoGuardar}
        </Button>
      </div>
    </form>
  );
}
