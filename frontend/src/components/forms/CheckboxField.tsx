import type { AnyFieldApi } from "@tanstack/react-form";

export function CheckboxField({ field, label, id, onCambio }: { field: AnyFieldApi; label: string; id?: string; onCambio?: (marcado: boolean) => void }) {
  const idCampo = id ?? `campo-${field.name}`;
  return (
    <label htmlFor={idCampo} className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
      <input
        id={idCampo}
        type="checkbox"
        checked={Boolean(field.state.value)}
        onChange={(e) => {
          field.handleChange(e.target.checked);
          onCambio?.(e.target.checked);
        }}
        onBlur={field.handleBlur}
        className="size-5 rounded border-marea-200 accent-marea-700"
      />
      {label}
    </label>
  );
}
