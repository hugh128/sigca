import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import mongoose from "mongoose";
import { createApp } from "../src/app";
import { Usuario, type Rol } from "../src/models/Usuario";
import { Paciente } from "../src/models/Paciente";
import { Cita } from "../src/models/Cita";
import { firmarToken } from "../src/utils/jwt";

const dbName = `sigca_test_${randomUUID().replaceAll("-", "")}`;
let server: Server, base: string, pacienteId: string, otroId: string, profesionalId: string;
const tokens: Partial<Record<Rol, string>> = {};
const recurso = { titulo: "Guía de apoyo", descripcion: "Ejercicios de demostración", tipo: "Documento", enlace: "https://example.test/guia.pdf" };
async function pedir(method: string, path: string, body?: unknown, rol?: Rol) {
  const r = await fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(rol ? { Authorization: `Bearer ${tokens[rol]}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
}
before(async () => {
  await mongoose.connect(process.env.MONGODB_URI!, { dbName });
  for (const rol of ["ADMINISTRADOR", "RECEPCIONISTA", "PROFESIONAL"] as const) {
    const u = await Usuario.create({ nombre: "Prueba", email: `${rol}@example.test`, rol, passwordHash: "prueba" });
    tokens[rol] = firmarToken({ sub: u.id, rol });
    if (rol === "PROFESIONAL") profesionalId = u.id;
  }
  const p = { nombres: "Paciente", apellidos: "Prueba", fechaNacimiento: "1990-01-01", sexo: "OTRO", telefono: "12345678", direccion: "Dirección prueba", fechaInicio: "2026-01-01" };
  pacienteId = (await Paciente.create(p)).id;
  otroId = (await Paciente.create({ ...p, nombres: "Otro" })).id;
  await Cita.collection.insertOne({ paciente: new mongoose.Types.ObjectId(pacienteId), profesional: new mongoose.Types.ObjectId(profesionalId) });
  server = createApp().listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  base = `http://localhost:${address.port}/api`;
});
after(async () => {
  if (server) await new Promise<void>(resolve => server.close(() => resolve()));
  if (mongoose.connection.name === dbName) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
test("catálogo privado, escritura solo admin y enlaces HTTP seguros", async () => {
  assert.equal((await pedir("GET", "/materiales")).status, 401);
  assert.equal((await pedir("GET", "/materiales", undefined, "RECEPCIONISTA")).status, 403);
  assert.equal((await pedir("POST", "/materiales", recurso, "PROFESIONAL")).status, 403);
  for (const enlace of ["", "no-es-url", "javascript:alert(1)", "data:text/html,test", "ftp://example.test/a", "https://usuario:clave@example.test/a"]) {
    assert.equal((await pedir("POST", "/materiales", { ...recurso, enlace }, "ADMINISTRADOR")).status, 400);
  }
  const r = await pedir("POST", "/materiales", recurso, "ADMINISTRADOR");
  assert.equal(r.status, 201); assert.equal(r.body.estado, "ACTIVO"); assert.ok(r.body.createdAt);
  const id = r.body.id;
  assert.equal((await pedir("PUT", `/materiales/${id}`, { titulo: "Guía actualizada" }, "ADMINISTRADOR")).body.titulo, "Guía actualizada");
  assert.equal((await pedir("PUT", `/materiales/${id}`, {}, "ADMINISTRADOR")).status, 400);
  assert.equal((await pedir("PATCH", `/materiales/${id}/estado`, { estado: "INACTIVO" }, "ADMINISTRADOR")).status, 200);
  assert.equal((await pedir("GET", "/materiales", undefined, "PROFESIONAL")).body.total, 0);
  assert.equal((await pedir("GET", `/materiales/${id}`, undefined, "PROFESIONAL")).status, 404);
});
test("asignación auditada, pacientes propios, duplicados concurrentes y RN-09", async () => {
  const material = (await pedir("POST", "/materiales", recurso, "ADMINISTRADOR")).body;
  const ruta = `/materiales/pacientes/${pacienteId}`;
  assert.equal((await pedir("GET", `/materiales/pacientes/${otroId}`, undefined, "PROFESIONAL")).status, 404);
  assert.equal((await pedir("POST", `/materiales/pacientes/${otroId}`, { materialId: material.id }, "PROFESIONAL")).status, 404);
  assert.equal((await pedir("POST", ruta, { materialId: material.id }, "RECEPCIONISTA")).status, 403);
  const carrera = await Promise.all([1, 2].map(() => pedir("POST", ruta, { materialId: material.id }, "PROFESIONAL")));
  assert.deepEqual(carrera.map(r => r.status).sort(), [201, 409]);
  let lista = (await pedir("GET", ruta, undefined, "PROFESIONAL")).body;
  assert.equal(lista.total, 1); assert.equal(lista.items[0].asignadoPor.id, profesionalId); assert.ok(lista.items[0].createdAt);
  assert.ok(!lista.items[0].paciente && !lista.items[0].asignadoPor.email);
  await pedir("PATCH", `/materiales/${material.id}/estado`, { estado: "INACTIVO" }, "ADMINISTRADOR");
  lista = (await pedir("GET", ruta, undefined, "PROFESIONAL")).body;
  assert.equal(lista.items[0].material.estado, "INACTIVO");
  assert.equal((await pedir("POST", `/materiales/pacientes/${otroId}`, { materialId: material.id }, "ADMINISTRADOR")).status, 422);
  const activo = (await pedir("POST", "/materiales", recurso, "ADMINISTRADOR")).body;
  await Paciente.updateOne({ _id: pacienteId }, { estado: "INACTIVO" });
  assert.equal((await pedir("POST", ruta, { materialId: activo.id }, "ADMINISTRADOR")).status, 422);
  assert.equal((await pedir("GET", ruta, undefined, "ADMINISTRADOR")).body.total, 1);
});
