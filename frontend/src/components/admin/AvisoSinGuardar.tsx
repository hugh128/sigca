import { useEffect } from "react";
import { useBlocker } from "react-router";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/**
 * Evita perder ediciones por accidente: si `sucio` es true, avisa antes de salir de la pagina
 * (enlaces del menu, cambio de seccion, atras del navegador) y al cerrar o recargar la pestana.
 */
export function AvisoSinGuardar({ sucio }: { sucio: boolean }) {
  const bloqueo = useBlocker(sucio);

  useEffect(() => {
    if (!sucio) return;
    const alSalir = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", alSalir);
    return () => window.removeEventListener("beforeunload", alSalir);
  }, [sucio]);

  return (
    <ConfirmDialog
      abierto={bloqueo.state === "blocked"}
      titulo="Tienes cambios sin guardar"
      textoConfirmar="Salir sin guardar"
      textoCancelar="Seguir editando"
      peligro
      onCancelar={() => bloqueo.state === "blocked" && bloqueo.reset()}
      onConfirmar={() => bloqueo.state === "blocked" && bloqueo.proceed()}
    >
      Si sales ahora, se perderán los cambios que no hayas guardado.
    </ConfirmDialog>
  );
}
