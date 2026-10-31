import type { AnyFieldApi } from "@tanstack/react-form";
import type { TextareaHTMLAttributes } from "react";
import { CampoBase, claseControl } from "./TextField";

interface Props extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "name" | "value" | "onChange" | "onBlur"> {
  field: AnyFieldApi;
  label: string;
  ayuda?: string;
}

export function TextAreaField({ field, label, ayuda, id, rows = 4, ...props }: Props) {
  const idCampo = id ?? `campo-${field.name}`;
  return (
    <CampoBase field={field} label={label} ayuda={ayuda} id={idCampo}>
      {({ invalido, describedBy }) => (
        <textarea
          id={idCampo}
          name={field.name}
          rows={rows}
          value={field.state.value ?? ""}
          onChange={(e) => field.handleChange(e.target.value)}
          onBlur={field.handleBlur}
          aria-invalid={invalido || undefined}
          aria-describedby={describedBy}
          className={claseControl(invalido, "resize-y")}
          {...props}
        />
      )}
    </CampoBase>
  );
}
