import type { AnyFieldApi } from "@tanstack/react-form";
import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Extrae los mensajes de error de un campo (los validadores Zod devuelven objetos con `message`). */
export function mensajesDeError(field: AnyFieldApi): string[] {
  return field.state.meta.errors
    .map((e: unknown) => (typeof e === "string" ? e : (e as { message?: string } | undefined)?.message))
    .filter((m): m is string => Boolean(m));
}

interface BaseProps {
  field: AnyFieldApi;
  label: string;
  ayuda?: string;
}

/** Envoltura comun: etiqueta, ayuda y mensaje de error vinculados al control por aria. */
export function CampoBase({
  field, label, ayuda, id, children,
}: BaseProps & { id: string; children: (a: { invalido: boolean; describedBy?: string }) => React.ReactNode }) {
  const errores = mensajesDeError(field);
  const invalido = errores.length > 0;
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">{label}</label>
      {children({ invalido, describedBy: cn(invalido && idError, ayuda && idAyuda) || undefined })}
      {ayuda && !invalido && <p id={idAyuda} className="text-sm text-ink-soft">{ayuda}</p>}
      {invalido && <p id={idError} className="text-sm text-danger">{errores[0]}</p>}
    </div>
  );
}

export const claseControl = (invalido: boolean, extra?: string) =>
  cn(
    "block w-full rounded-lg border bg-white px-3.5 py-2.5 text-ink placeholder:text-ink-soft/60",
    invalido ? "border-danger" : "border-marea-200 hover:border-marea-500",
    extra,
  );

interface Props extends BaseProps, Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "value" | "onChange" | "onBlur"> {
  /** Texto fijo a la izquierda dentro del campo, p. ej. "Q". */
  prefijo?: string;
}

/**
 * Campo de texto conectado a TanStack Form. Uso:
 *   <form.Field name="email" children={(field) => <TextField field={field} label="Correo" />} />
 * Si es `type="password"` incluye el boton para mostrar u ocultar lo escrito.
 */
export function TextField({ field, label, ayuda, className, id, prefijo, type, ...props }: Props) {
  const idCampo = id ?? `campo-${field.name}`;
  const [visible, setVisible] = useState(false);
  const esPassword = type === "password";

  return (
    <CampoBase field={field} label={label} ayuda={ayuda} id={idCampo}>
      {({ invalido, describedBy }) => (
        <div className="relative">
          {prefijo && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-soft" aria-hidden="true">{prefijo}</span>
          )}
          <input
            id={idCampo}
            name={field.name}
            type={esPassword && visible ? "text" : type}
            value={field.state.value ?? ""}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            aria-invalid={invalido || undefined}
            aria-describedby={describedBy}
            className={claseControl(invalido, cn(prefijo && "pl-8", esPassword && "pr-12", className))}
            {...props}
          />
          {esPassword && (
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={visible}
              className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-ink-soft hover:text-ink"
            >
              {visible ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
            </button>
          )}
        </div>
      )}
    </CampoBase>
  );
}
