import { Plus } from "lucide-react";
import type { CarpetaImagen } from "@/api/uploads";
import { ControlImagen } from "@/components/forms/ControlImagen";
import { FilaLista } from "@/components/forms/FilaLista";
import { mensajesDeError, TextField } from "@/components/forms/TextField";
import { comoFormConCampos } from "@/components/forms/tipos";
import { Button } from "@/components/ui/Button";
import { nuevoId } from "@/lib/id";
import type { Imagen } from "@/types/api";

interface Props {
  /** El `form` de TanStack Form del formulario padre. */
  form: unknown;
  /** Ruta de la lista dentro del formulario, p. ej. "carrusel" o "capacitaciones.imagenes". */
  nombre: string;
  titulo: string;
  /** Carpeta de almacenamiento de las imagenes subidas. */
  carpeta: CarpetaImagen;
  /** Como se llama cada elemento: "Imagen" -> "Imagen 1", "Imagen 2"... */
  etiquetaItem?: string;
  maximo: number;
  ayuda?: string;
}

/** Lista editable de imagenes (direccion web + descripcion), con reordenar, agregar y quitar. */
export function ListaImagenes({ form, nombre, titulo, carpeta, etiquetaItem = "Imagen", maximo, ayuda }: Props) {
  const f = comoFormConCampos(form);
  return (
    <f.Field name={nombre} mode="array">
      {(lista) => {
        const items = (lista.state.value ?? []) as Imagen[];
        const errores = mensajesDeError(lista);
        return (
          <fieldset className="space-y-3">
            <legend className="text-base font-semibold text-marea-900">{titulo}</legend>
            {ayuda && <p className="text-sm text-ink-soft">{ayuda}</p>}
            {items.map((img, i) => (
              <FilaLista
                key={img.id}
                titulo={`${etiquetaItem} ${i + 1}`}
                onSubir={i > 0 ? () => lista.moveValue(i, i - 1) : undefined}
                onBajar={i < items.length - 1 ? () => lista.moveValue(i, i + 1) : undefined}
                onQuitar={() => lista.removeValue(i)}
              >
                <ControlImagen form={form} nombreUrl={`${nombre}[${i}].url`} nombreKey={`${nombre}[${i}].key`} carpeta={carpeta} etiqueta={`${etiquetaItem} ${i + 1}`} />
                <f.Field name={`${nombre}[${i}].alt`}>
                  {(c) => <TextField field={c} label="Descripción de la imagen" ayuda="Opcional. La leen los lectores de pantalla." />}
                </f.Field>
              </FilaLista>
            ))}
            {errores.length > 0 && <p role="alert" className="text-sm font-medium text-danger">{errores[0]}</p>}
            <Button
              variante="contorno"
              disabled={items.length >= maximo}
              onClick={() => lista.pushValue({ id: nuevoId(), url: "", key: "", alt: "" })}
            >
              <Plus className="size-4" aria-hidden="true" />
              Agregar imagen
            </Button>
            {items.length >= maximo && <p className="text-sm text-ink-soft">Llegaste al máximo de {maximo} imágenes.</p>}
          </fieldset>
        );
      }}
    </f.Field>
  );
}
