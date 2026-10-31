import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface Props {
  abierto: boolean;
  titulo: string;
  children: ReactNode;
  textoConfirmar: string;
  textoCancelar?: string;
  cargando?: boolean;
  peligro?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/** Confirmacion de acciones delicadas. El boton de confirmar dice exactamente lo que va a pasar. */
export function ConfirmDialog({ abierto, titulo, children, textoConfirmar, textoCancelar = "Cancelar", cargando, peligro, onConfirmar, onCancelar }: Props) {
  return (
    <Modal abierto={abierto} onCerrar={onCancelar} titulo={titulo} ancho="sm">
      <div className="text-ink-soft">{children}</div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variante="texto" onClick={onCancelar} disabled={cargando}>{textoCancelar}</Button>
        <Button variante={peligro ? "peligro" : "primario"} onClick={onConfirmar} disabled={cargando}>
          {cargando && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
          {textoConfirmar}
        </Button>
      </div>
    </Modal>
  );
}
