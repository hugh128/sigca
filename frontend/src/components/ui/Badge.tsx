import { cn } from "@/lib/cn";

type Tono = "ok" | "neutro" | "info";
const TONOS: Record<Tono, string> = {
  ok: "bg-ok-soft text-ok",
  neutro: "bg-bruma text-ink-soft",
  info: "bg-marea-100 text-marea-800",
};

/** Etiqueta de estado. Siempre lleva texto: el color no es la unica pista. */
export function Badge({ tono = "neutro", children }: { tono?: Tono; children: string }) {
  return <span className={cn("inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium", TONOS[tono])}>{children}</span>;
}
