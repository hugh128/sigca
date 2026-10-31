/**
 * Convencion del proyecto (RN-28): todo monto se maneja en CENTAVOS enteros.
 * Q250.00 => 25000. Solo se convierte a quetzales para mostrar.
 */
export function formatearQuetzales(centavos: number): string {
  return new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" }).format(centavos / 100);
}
