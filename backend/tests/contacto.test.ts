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
const datos = { nombre: "María López", correo: "maria@example.test", telefono: "5555-1234", asunto: "Información de atención", mensaje: "Quisiera información sobre los servicios del centro." };
const tokens: Partial<Record<Rol, string>> = {};
let server: Server;
let base: string;
const mensajes = () => mongoose.connection.db!.collection("mensajesContacto");
async function pedir(method = "GET", ruta = "", body?: unknown, token?: string) {
  return fetch(base + ruta, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
}
before(async () => {
  assert.ok(process.env.MONGODB_URI);
  await mongoose.connect(process.env.MONGODB_URI, { dbName });
  for (const rol of ["ADMINISTRADOR", "RECEPCIONISTA", "PROFESIONAL"] as const) {
    const u = await Usuario.create({ nombre: "Usuario de prueba", email: `${rol}@example.test`, rol, passwordHash: "solo-pruebas" });
    tokens[rol] = firmarToken({ sub: u.id, rol });
  }
  server = createApp().listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  base = `http://localhost:${address.port}/api/contacto`;
});
beforeEach(async () => { await mensajes().deleteMany({}); });
after(async () => {
  if (server) await new Promise<void>(resolve => server.close(() => resolve()));
  if (mongoose.connection.name === dbName) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test("el visitante guarda un mensaje sin exponer datos privados ni permitir fecha arbitraria", async () => {
  const response = await pedir("POST", "", { ...datos, nombre: "  María López  ", correo: " MARIA@example.test ", fecha: "2000-01-01" }, "token-expirado");
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { message: "Recibimos tu mensaje. El equipo se pondrá en contacto contigo." });
  const guardado = await mensajes().findOne();
  assert.equal(guardado!.nombre, datos.nombre);
  assert.equal(guardado!.correo, "maria@example.test");
  assert.ok(guardado!.fecha instanceof Date);
  assert.ok(guardado!.fecha.getTime() > Date.now() - 60_000);
});

test("rechaza datos invalidos sin guardar mensajes", async () => {
  for (const cambio of [{ nombre: "" }, { correo: "invalido" }, { telefono: "abc" }, { asunto: "" }, { mensaje: "" }, { mensaje: "x".repeat(3001) }, { correo: { $gt: "" } }]) {
    const response = await pedir("POST", "", { ...datos, ...cambio });
    assert.equal(response.status, 400);
    assert.ok(Array.isArray((await response.json()).errors));
  }
  assert.equal(await mensajes().countDocuments(), 0);
});

test("solo administrador consulta mensajes, con paginacion y orden reciente", async () => {
  await mensajes().insertMany(Array.from({ length: 3 }, (_, i) => ({ ...datos, asunto: `Mensaje ${i}`, fecha: new Date(2026, 0, i + 1) })));
  assert.equal((await pedir()).status, 401);
  for (const rol of ["RECEPCIONISTA", "PROFESIONAL"] as const) assert.equal((await pedir("GET", "", undefined, tokens[rol])).status, 403);
  const response = await pedir("GET", "?limit=2&page=1", undefined, tokens.ADMINISTRADOR);
  assert.equal(response.status, 200);
  const page = await response.json();
  assert.equal(page.total, 3);
  assert.equal(page.pages, 2);
  assert.deepEqual(page.items.map((m: { asunto: string }) => m.asunto), ["Mensaje 2", "Mensaje 1"]);
  assert.ok(page.items[0].id && !page.items[0]._id && !page.items[0].__v);
  const segunda = await (await pedir("GET", "?limit=2&page=2", undefined, tokens.ADMINISTRADOR)).json();
  assert.equal(segunda.items[0].asunto, "Mensaje 0");
  assert.equal((await pedir("GET", "?limit=101", undefined, tokens.ADMINISTRADOR)).status, 400);
});

test("el limite de envios devuelve 429 y no persiste el intento bloqueado", async () => {
  let bloqueada = false;
  for (let intento = 0; intento < 21; intento++) {
    const response = await pedir("POST", "", datos);
    if (response.status === 429) { bloqueada = true; break; }
    assert.equal(response.status, 201);
  }
  assert.ok(bloqueada);
  const antes = await mensajes().countDocuments();
  assert.equal((await pedir("POST", "", datos)).status, 429);
  assert.equal(await mensajes().countDocuments(), antes);
});
