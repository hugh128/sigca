import type { AnyFieldApi } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link2, Loader2, Trash2, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";
import { subirImagen, TIPOS_IMAGEN, validarArchivoImagen, type CarpetaImagen } from "@/api/uploads";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api";
import { CampoBase, claseControl, mensajesDeError } from "./TextField";
import { comoFormConCampos } from "./tipos";
import { VistaPrevia } from "./VistaPrevia";

interface Props {
  /** El `form` de TanStack Form del formulario padre. */
  form: unknown;
  /** Campos del formulario donde se guardan la URL y la llave del archivo. */
  nombreUrl: string;
  nombreKey: string;
  carpeta: CarpetaImagen;
  /** Nombre corto para lectores de pantalla y botones: "Logo", "Imagen 2"... */
  etiqueta: string;
}

function Interior({ url, clave, carpeta, etiqueta }: { url: AnyFieldApi; clave: AnyFieldApi; carpeta: CarpetaImagen; etiqueta: string }) {
  const idArchivo = useId();
  const entrada = useRef<HTMLInputElement>(null);
  const [aviso, setAviso] = useState<{ tipo: "error" | "ok"; texto: string } | null>(null);
  const [manual, setManual] = useState(false);
  const valor = (url.state.value as string | undefined) ?? "";
  const errorCampo = mensajesDeError(url)[0];

  const subida = useMutation({
    mutationFn: (archivo: File) => subirImagen(archivo, carpeta),
    onSuccess: (r) => {
      url.handleChange(r.url);
      clave.handleChange(r.key);
      setAviso({ tipo: "ok", texto: "Imagen subida. Guarda los cambios para publicarla." });
    },
    onError: (e) => setAviso({ tipo: "error", texto: e instanceof ApiError ? e.message : "No pudimos subir la imagen. Inténtalo de nuevo." }),
  });

  const elegir = (archivo: File | undefined) => {
    if (!archivo) return;
    const problema = validarArchivoImagen(archivo);
    if (problema) return setAviso({ tipo: "error", texto: problema });
    setAviso(null);
    subida.mutate(archivo);
  };

  const quitar = () => {
    url.handleChange("");
    clave.handleChange("");
    setAviso(null);
  };

  return (
    <div className="flex gap-4">
      <VistaPrevia key={valor} url={valor} />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={entrada}
            id={idArchivo}
            type="file"
            accept={TIPOS_IMAGEN.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-label={`Archivo de imagen: ${etiqueta}`}
            onChange={(e) => {
              elegir(e.target.files?.[0]);
              e.target.value = ""; // permite volver a elegir el mismo archivo
            }}
          />
          <Button variante="contorno" disabled={subida.isPending} onClick={() => entrada.current?.click()}>
            {subida.isPending ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
            {subida.isPending ? "Subiendo…" : valor ? "Cambiar imagen" : "Subir imagen"}
            <span className="sr-only"> ({etiqueta})</span>
          </Button>
          {valor && (
            <Button variante="texto" onClick={quitar} disabled={subida.isPending} className="text-danger hover:bg-danger-soft">
              <Trash2 className="size-4" aria-hidden="true" />
              Quitar<span className="sr-only"> imagen ({etiqueta})</span>
            </Button>
          )}
          <Button variante="texto" aria-expanded={manual} onClick={() => setManual((v) => !v)}>
            <Link2 className="size-4" aria-hidden="true" />
            {manual ? "Ocultar dirección web" : "Usar una dirección web"}
          </Button>
        </div>

        <p className="text-sm text-ink-soft">JPG, PNG, WebP o GIF, hasta 5 MB.</p>

        {manual && (
          <CampoBase field={url} label={`Dirección web de la imagen (${etiqueta})`} id={`${idArchivo}-url`}>
            {({ invalido, describedBy }) => (
              <input
                id={`${idArchivo}-url`}
                type="url"
                placeholder="https://…"
                value={valor}
                onChange={(e) => {
                  url.handleChange(e.target.value);
                  clave.handleChange(""); // ya no es un archivo guardado en nuestro almacenamiento
                }}
                onBlur={url.handleBlur}
                aria-invalid={invalido || undefined}
                aria-describedby={describedBy}
                className={claseControl(invalido)}
              />
            )}
          </CampoBase>
        )}

        {!manual && errorCampo && <p className="text-sm text-danger">{errorCampo}</p>}
        {aviso?.tipo === "error" && <p role="alert" className="text-sm font-medium text-danger">{aviso.texto}</p>}
        {aviso?.tipo === "ok" && <p role="status" className="text-sm text-ok">{aviso.texto}</p>}
      </div>
    </div>
  );
}

/** Subir una imagen (o pegar su direccion). Guarda la URL y la llave del archivo en el formulario. */
export function ControlImagen({ form, nombreUrl, nombreKey, carpeta, etiqueta }: Props) {
  const f = comoFormConCampos(form);
  return (
    <f.Field name={nombreUrl}>
      {(url) => (
        <f.Field name={nombreKey}>{(clave) => <Interior url={url} clave={clave} carpeta={carpeta} etiqueta={etiqueta} />}</f.Field>
      )}
    </f.Field>
  );
}
