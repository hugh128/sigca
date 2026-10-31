import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { after, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";
import { createApp } from "../src/app";
import { Usuario, type Rol } from "../src/models/Usuario";
import { firmarToken } from "../src/utils/jwt";
const dbName = `sigca_test_${randomUUID().replaceAll("-", "")}`;
const tokens: Record<string, string> = {}, ids: Record<string, string> = {};
let server: Server, base: string;
async function pedir(method: string, path: string, body?: unknown, usuario?: string) {
  const r = await fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(usuario ? { Authorization: `Bearer ${tokens[usuario]}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
}
before(async () => {
  await mongoose.connect(process.env.MONGODB_URI!, { dbName });
  for (const [clave, rol] of Object.entries({ admin: "ADMINISTRADOR", recep: "RECEPCIONISTA", otra: "RECEPCIONISTA", prof: "PROFESIONAL" })) {
    const u = await Usuario.create({ nombre: clave, email: `${clave}@example.test`, rol, passwordHash: "prueba" });
    ids[clave] = u.id; tokens[clave] = firmarToken({ sub: u.id, rol: rol as Rol });
  }
  server = createApp().listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string"); base = `http://localhost:${address.port}/api`;
});
beforeEach(async () => { await mongoose.connection.db!.collection("cajas").deleteMany({}); });
after(async () => {
  if (server) await new Promise<void>(resolve => server.close(() => resolve()));
  if (mongoose.connection.name === dbName) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
test("apertura privada y profesional excluido de todas las consultas", async () => {
  for (const ruta of ["/cajas", "/cajas/actual", `/cajas/${new mongoose.Types.ObjectId()}`]) {
    assert.equal((await pedir("GET", ruta)).status, 401);
    assert.equal((await pedir("GET", ruta, undefined, "prof")).status, 403);
  }
  assert.equal((await pedir("POST", "/cajas/abrir", { montoInicialCentavos: 0 }, "prof")).status, 403);
});
test("valida dinero y no permite inyectar propietario, fecha ni estado", async () => {
  for (const montoInicialCentavos of [-1, 1.5, "100", null, 1000000000, Number.MAX_SAFE_INTEGER]) {
    assert.equal((await pedir("POST", "/cajas/abrir", { montoInicialCentavos }, "recep")).status, 400);
  }
  assert.equal((await pedir("GET", "/cajas/actual", undefined, "recep")).body, null);
  const antes = Date.now();
  const r = await pedir("POST", "/cajas/abrir", { montoInicialCentavos: 1999, usuario: ids.otra, apertura: "2000-01-01", estado: "CERRADA" }, "recep");
  assert.equal(r.status, 201); assert.equal(r.body.usuario.id, ids.recep); assert.equal(r.body.estado, "ABIERTA");
  assert.equal(r.body.montoInicialCentavos, 1999); assert.ok(new Date(r.body.apertura).getTime() >= antes);
  assert.ok(!r.body.usuario.email && !r.body.usuario.passwordHash);
});
test("dos aperturas concurrentes del mismo usuario solo crean una caja", async () => {
  const r = await Promise.all([1, 2].map(() => pedir("POST", "/cajas/abrir", { montoInicialCentavos: 0 }, "recep")));
  assert.deepEqual(r.map(x => x.status).sort(), [201, 409]);
  assert.equal(await mongoose.connection.db!.collection("cajas").countDocuments(), 1);
  assert.equal((await pedir("GET", "/cajas/actual", undefined, "recep")).body.montoInicialCentavos, 0);
});
test("propiedad, listado paginado y caja actual del administrador", async () => {
  const propia = await pedir("POST", "/cajas/abrir", { montoInicialCentavos: 20000 }, "recep");
  await pedir("POST", "/cajas/abrir", { montoInicialCentavos: 30000 }, "otra");
  assert.equal((await pedir("GET", `/cajas/${propia.body.id}`, undefined, "otra")).status, 404);
  assert.equal((await pedir("GET", `/cajas/${propia.body.id}`, undefined, "admin")).status, 200);
  assert.equal((await pedir("GET", "/cajas", undefined, "recep")).body.total, 1);
  assert.equal((await pedir("GET", `/cajas?usuarioId=${ids.otra}`, undefined, "recep")).status, 403);
  assert.equal((await pedir("GET", "/cajas?limit=1", undefined, "admin")).body.pages, 2);
  assert.equal((await pedir("GET", `/cajas?usuarioId=${ids.otra}`, undefined, "admin")).body.total, 1);
  assert.equal((await pedir("GET", "/cajas/actual", undefined, "admin")).body, null);
  assert.equal((await pedir("POST", "/cajas/abrir", { montoInicialCentavos: 0 }, "admin")).status, 201);
  assert.equal((await pedir("GET", "/cajas/actual", undefined, "admin")).body.usuario.id, ids.admin);
  assert.equal((await pedir("GET", "/cajas?estado=OTRA", undefined, "admin")).status, 400);
});
test("el indice parcial permite una apertura tras una caja historica cerrada", async () => {
  await mongoose.connection.db!.collection("cajas").insertOne({ usuario: new mongoose.Types.ObjectId(ids.recep), apertura: new Date("2026-01-01"), montoInicialCentavos: 0, estado: "CERRADA" });
  assert.equal((await pedir("POST", "/cajas/abrir", { montoInicialCentavos: 50 }, "recep")).status, 201);
  const historial = await pedir("GET", "/cajas?estado=CERRADA", undefined, "recep");
  assert.equal(historial.body.total, 1);
});
