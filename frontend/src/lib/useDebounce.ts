import { useEffect, useState } from "react";

/** Devuelve `valor` tras `ms` sin cambios: evita pedir datos al servidor en cada tecla. */
export function useDebounce<T>(valor: T, ms = 300): T {
  const [retrasado, setRetrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setRetrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return retrasado;
}
