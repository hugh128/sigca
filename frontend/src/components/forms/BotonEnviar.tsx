import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function BotonEnviar({ enviando, texto, textoEnviando = "Guardando…" }: { enviando: boolean; texto: string; textoEnviando?: string }) {
  return (
    <Button type="submit" disabled={enviando}>
      {enviando && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
      {enviando ? textoEnviando : texto}
    </Button>
  );
}
