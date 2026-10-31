import type { ButtonHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router";
import { cn } from "@/lib/cn";

type Variante = "primario" | "acento" | "contorno" | "texto" | "peligro";
type Tamano = "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60";
const VARIANTES: Record<Variante, string> = {
  primario: "bg-marea-700 text-white hover:bg-marea-800",
  acento: "bg-sol-400 text-ink hover:bg-sol-500",
  contorno: "border border-marea-700 text-marea-700 hover:bg-marea-50",
  texto: "text-marea-700 hover:bg-marea-50",
  peligro: "bg-danger text-white hover:opacity-90",
};
const TAMANOS: Record<Tamano, string> = { md: "px-4 py-2.5 text-sm", lg: "px-6 py-3.5 text-base" };

export function clasesBoton(variante: Variante = "primario", tamano: Tamano = "md", extra?: string) {
  return cn(BASE, VARIANTES[variante], TAMANOS[tamano], extra);
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamano?: Tamano;
}

export function Button({ variante, tamano, className, type = "button", ...props }: Props) {
  return <button type={type} className={clasesBoton(variante, tamano, className)} {...props} />;
}

interface LinkBotonProps extends LinkProps {
  variante?: Variante;
  tamano?: Tamano;
}

export function LinkBoton({ variante, tamano, className, ...props }: LinkBotonProps) {
  return <Link className={clasesBoton(variante, tamano, className)} {...props} />;
}
