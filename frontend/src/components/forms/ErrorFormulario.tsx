/** Error general de un formulario (p. ej. el que devuelve el servidor y no corresponde a un campo). */
export function ErrorFormulario({ errores }: { errores: unknown[] }) {
  const mensaje = errores.map((e) => (typeof e === "string" ? e : (e as { message?: string } | undefined)?.message)).find(Boolean);
  if (!mensaje) return null;
  return (
    <p role="alert" className="rounded-lg border-l-4 border-danger bg-danger-soft px-4 py-3 text-sm">
      {mensaje}
    </p>
  );
}
