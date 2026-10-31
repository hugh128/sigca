import "dotenv/config";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { createServer } from "node:http";
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
  // Comprobar el seed antes de que las pruebas HTTP modifiquen sus datos.
  const db = mongoose.connection.db;
  for (const [coleccion, minimo] of Object.entries({ pacientes: 10, responsables: 5, servicios: 5, citas: 15, materiales: 5, solicitudesCita: 5, pagos: 10, cajas: 3 })) {
    assert.ok(await db.collection(coleccion).countDocuments() >= minimo, `Seed incompleto: ${coleccion} requiere ${minimo}`);
  }
  for (const [rol, minimo] of Object.entries({ ADMINISTRADOR: 1, RECEPCIONISTA: 2, PROFESIONAL: 3 })) {
    assert.ok(await db.collection("usuarios").countDocuments({ rol, activo: true }) >= minimo, `Seed incompleto: ${rol}`);
  }
  const citasSeed = await db.collection("citas").find().toArray();
  for (const cita of citasSeed) {
    assert.ok(await db.collection("pacientes").findOne({ _id: cita.paciente }), "Cita del seed sin paciente");
    assert.ok(await db.collection("usuarios").findOne({ _id: cita.profesional, rol: "PROFESIONAL" }), "Cita del seed sin profesional");
    assert.ok(await db.collection("servicios").findOne({ _id: cita.servicio }), "Cita del seed sin servicio");
    assert.equal((cita.fin - cita.inicio) / 60000, cita.duracionMin, "Duracion inconsistente en el seed");
    assert.ok(Number.isInteger(cita.precioCentavos) && cita.precioCentavos > 0, "Precio invalido en el seed");
  }
  const atendidas = await db.collection("solicitudesCita").find({ estado: "ATENDIDA" }).toArray();
  assert.ok(atendidas.length > 0, "Falta una solicitud atendida de demostracion");
  for (const s of atendidas) assert.ok(citasSeed.some(c => c._id.equals(s.cita)), "Solicitud del seed sin cita vinculada");
  assert.ok(await db.collection("asignacionesMateriales").countDocuments() > 0, "Faltan asignaciones de demostracion");
  assert.ok(await db.collection("cajas").countDocuments({ estado: "ABIERTA" }) > 0, "Falta una caja abierta de demostracion");
  const cierresSeed = await db.collection("cajas").find({ estado: "CERRADA" }).toArray();
  assert.ok(cierresSeed.length > 0, "Faltan cierres de demostracion");
  for (const c of cierresSeed) {
    assert.ok(c.cierre && c.cerradoPor && c.totalesCierre, "Cierre del seed sin auditoria o totales");
    assert.equal(c.diferenciaCentavos, c.efectivoContadoCentavos - c.totalesCierre.efectivoEsperadoCentavos);
    assert.ok(c.cierre >= c.apertura, "Cierre anterior a su apertura");
  }
  const anuladosSeed = await db.collection("pagos").find({ estado: "ANULADO" }).toArray();
  assert.ok(anuladosSeed.length > 0, "Falta una anulacion de demostracion");
  for (const p of anuladosSeed) assert.ok(p.motivoAnulacion && p.anuladoPor && p.fechaAnulacion >= p.fecha, "Anulacion del seed sin auditoria coherente");
  console.log("Seed operativo verificado: minimos, roles, referencias, duraciones y precios.");
  const require = createRequire(import.meta.url);
  const servir = process.argv.includes("--servir");
  // Reservar el puerto antes de cargar env/storage: las URLs de imagen deben
  // apuntar a esta API, aunque .env no declare API_PUBLIC_URL o use otra URL.
  server = createServer();
  server.listen(0);
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  process.env.API_PUBLIC_URL = `http://localhost:${server.address().port}`;
  const { createApp } = require("../dist/app.js");
  server.on("request", createApp());
  const api = `${process.env.API_PUBLIC_URL}/api`;
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
