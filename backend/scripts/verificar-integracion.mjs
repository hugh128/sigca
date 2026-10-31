import "dotenv/config";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

// Ejecutar despues de npm run build. Seed y pruebas solo pueden tocar esta base temporal.
const backend = fileURLToPath(new URL("../", import.meta.url));
const frontend = fileURLToPath(new URL("../../frontend/", import.meta.url));
const dbName = `sigca_test_${randomUUID().replaceAll("-", "")}`;
const mongo = new URL(process.env.MONGODB_URI);
assert.ok(["localhost", "127.0.0.1"].includes(mongo.hostname), "Esta verificacion requiere MongoDB local");
mongo.pathname = `/${dbName}`;
Object.assign(process.env, { MONGODB_URI: mongo.toString(), NODE_ENV: "test", STORAGE_DRIVER: "local", CLIENT_URL: "http://localhost:5174" });

function ejecutar(args, cwd = backend, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const hijo = spawn(process.execPath, args, { cwd, env: { ...process.env, ...extraEnv }, stdio: "inherit", windowsHide: true });
    hijo.once("error", reject);
    hijo.once("exit", code => code === 0 ? resolve() : reject(new Error(`La verificacion termino con codigo ${code}`)));
  });
}

let server;
try {
  await ejecutar(["dist/seed/seed.js"]);
  await mongoose.connect(process.env.MONGODB_URI);
  const require = createRequire(import.meta.url);
  const { createApp } = require("../dist/app.js");
  const servir = process.argv.includes("--servir");
  server = createApp().listen(servir ? 4100 : 0);
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  const api = `http://localhost:${server.address().port}/api`;
  console.log(`API temporal de verificacion: ${api}`);
  if (servir) {
    await new Promise(resolve => {
      process.once("SIGINT", resolve);
      process.once("SIGTERM", resolve);
      process.stdin.once("data", resolve);
      process.stdin.resume();
    });
    process.stdin.pause();
  } else {
    await ejecutar(["node_modules/vitest/vitest.mjs", "run", "--config", "vitest.contrato.config.ts"], frontend, { VITE_API_URL: api });
    await ejecutar(["dist/seed/seed.js"]);
    // El smoke prueba el bloqueo por intentos fallidos al final: se ejecuta ultimo.
    await ejecutar(["scripts/smoke-test.mjs"], backend, { TEST_API_URL: api });
  }
} finally {
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  if (mongoose.connection.name === dbName) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
