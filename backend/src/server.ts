import { createApp } from "./app";
import { connectDB, disconnectDB } from "./config/db";
import { env } from "./config/env";
import { obtenerAlmacenamiento } from "./storage";

async function main() {
  await connectDB();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`API SIGCA escuchando en http://localhost:${env.PORT}/api`);
    console.log(`Almacenamiento de imágenes: ${obtenerAlmacenamiento().nombre}`);
  });

  const apagar = () => {
    console.log("Cerrando servidor...");
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };
  process.on("SIGINT", apagar);
  process.on("SIGTERM", apagar);
}

main().catch((err) => {
  console.error("No se pudo iniciar el servidor:", err);
  process.exit(1);
});
