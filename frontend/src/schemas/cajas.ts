import { z } from "zod";
import { quetzalesACentavos } from "@/lib/dinero";
export const aperturaCajaSchema = z.object({
  monto: z.string().trim().transform((v, ctx) => {
    const centavos = quetzalesACentavos(v);
    if (centavos === null || !Number.isSafeInteger(centavos) || centavos < 0 || centavos > 999999999) {
      ctx.issues.push({ code: "custom", input: v, message: "Escribe un monto válido entre Q0.00 y Q9,999,999.99, con hasta dos decimales" });
      return z.NEVER;
    }
    return centavos;
  }),
});
