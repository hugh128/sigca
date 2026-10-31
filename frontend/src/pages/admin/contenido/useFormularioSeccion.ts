import { useForm } from "@tanstack/react-form";
import type { z } from "zod";
import { useGuardarContenido, type ClaveContenido } from "@/api/contenido";
import { erroresDeServidor } from "@/lib/erroresServidor";
import { toast } from "@/store/toast";

/**
 * Formulario de una seccion del portal: valida con el esquema Zod, guarda con PUT /contenido/:clave
 * y muestra los errores del servidor bajo el campo que corresponda. Tras guardar, los valores
 * guardados pasan a ser los "originales" (asi desaparece el aviso de cambios sin guardar).
 *
 * `T` es el tipo de los valores del formulario (la *entrada* del esquema).
 */
export function useFormularioSeccion<T extends Record<string, unknown>>(
  clave: ClaveContenido,
  schema: z.ZodType<unknown, T>,
  valores: T,
) {
  const guardar = useGuardarContenido(clave);
  return useForm({
    defaultValues: valores,
    validators: {
      onBlur: schema,
      onSubmit: schema,
      onSubmitAsync: async ({ value }) => {
        try {
          await guardar.mutateAsync(schema.parse(value));
        } catch (e) {
          return erroresDeServidor(e);
        }
        return undefined;
      },
    },
    onSubmit: ({ value, formApi }) => {
      toast.exito("Cambios guardados. Ya se ven en el portal.");
      formApi.reset(schema.parse(value) as T);
    },
  });
}
