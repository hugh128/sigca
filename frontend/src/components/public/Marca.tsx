import { cn } from "@/lib/cn";

/** Marca por defecto: tres arcos que se abren desde un punto, como el sonido al propagarse. */
export function MarcaOndas({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <g stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <path d="M12 21a8 8 0 0 1 8 8" />
        <path d="M12 13a16 16 0 0 1 16 16" />
        <path d="M12 5a24 24 0 0 1 24 24" opacity="0.55" />
      </g>
      <circle cx="12" cy="29" r="3.2" fill="currentColor" />
    </svg>
  );
}

/** Arcos concentricos grandes para fondos (decorativos). */
export function ArcosDecorativos({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" fill="none" className={className} aria-hidden="true">
      {[60, 110, 160, 210, 260, 310].map((r, i) => (
        <circle
          key={r}
          cx="400"
          cy="400"
          r={r}
          stroke={i === 2 ? "var(--color-sol-400)" : "var(--color-marea-200)"}
          strokeWidth={i === 2 ? 3 : 2}
        />
      ))}
    </svg>
  );
}

interface LogoProps {
  nombre: string;
  logoUrl?: string;
  /** Version para fondos oscuros. */
  claro?: boolean;
  className?: string;
}

export function Logo({ nombre, logoUrl, claro = false, className }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      {logoUrl ? (
        <img src={logoUrl} alt="" className="size-10 rounded-lg object-contain" />
      ) : (
        <MarcaOndas className={cn("size-10", claro ? "text-sol-400" : "text-marea-700")} />
      )}
      <span className={cn("text-lg font-semibold leading-tight tracking-tight", claro ? "text-white" : "text-marea-900")}>
        {nombre}
      </span>
    </span>
  );
}
