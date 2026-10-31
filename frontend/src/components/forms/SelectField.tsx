import type { SelectHTMLAttributes } from "react";
import { CampoBase, claseControl } from "./TextField";
import type { AnyFieldApi } from "@tanstack/react-form";

interface Props extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "name" | "value" | "onChange" | "onBlur"> {
  field: AnyFieldApi;
  label: string;
  ayuda?: string;
  opciones: { valor: string; etiqueta: string }[];
}

export function SelectField({ field, label, ayuda, opciones, id, ...props }: Props) {
  const idCampo = id ?? `campo-${field.name}`;
  return (
    <CampoBase field={field} label={label} ayuda={ayuda} id={idCampo}>
      {({ invalido, describedBy }) => (
        <select
          id={idCampo}
          name={field.name}
          value={field.state.value ?? ""}
          onChange={(e) => field.handleChange(e.target.value)}
          onBlur={field.handleBlur}
          aria-invalid={invalido || undefined}
          aria-describedby={describedBy}
          className={claseControl(invalido)}
          {...props}
        >
          {opciones.map((o) => (
            <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
          ))}
        </select>
      )}
    </CampoBase>
  );
}
