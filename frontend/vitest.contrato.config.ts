import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Configuracion de las pruebas de contrato: Node puro (sin DOM) y contra el backend real. */
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["src/contrato/**/*.test.ts"], testTimeout: 120_000 },
});
