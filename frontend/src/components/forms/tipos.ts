import type { AnyFieldApi } from "@tanstack/react-form";
import type { ComponentType, ReactNode } from "react";

/**
 * Forma minima de `form` que necesitan los componentes reutilizables de listas: solo `Field`,
 * con el nombre como texto (rutas como "carrusel[0].url"). Los formularios concretos siguen
 * tipados de punta a punta; este tipo suelto vive solo en los componentes genericos.
 */
export interface FormConCampos {
  Field: ComponentType<{ name: string; mode?: "array"; children: (campo: AnyFieldApi) => ReactNode }>;
}

export const comoFormConCampos = (form: unknown) => form as FormConCampos;
