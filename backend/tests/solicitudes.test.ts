import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { after, before, beforeEach, test, mock } from "node:test";
import mongoose from "mongoose";
import { createApp } from "../src/app";
import { Cita } from "../src/models/Cita";
import { Horario } from "../src/models/Horario";
import { Paciente } from "../src/models/Paciente";
import { Servicio } from "../src/models/Servicio";
import { Usuario, type Rol } from "../src/models/Usuario";
import { firmarToken } from "../src/utils/jwt";
import { crearEnTransaccion } from "../src/services/cita.service";

const dbName = `sigca_test_${randomUUID().replaceAll("-", "")}`;
const ids = Array.from({ length: 4 }, () => new mongoose.Types.ObjectId());
const pacienteId = String(ids[0]), servicioId = String(ids[1]), profesionalId = String(ids[2]);
const fecha = "2099-01-05";
const datos = () => ({ nombre: "María López", correo: "maria@example.test", telefono: "5555-1234", servicioId, fechaPreferida: fecha, mensaje: "Consulta de atención" });
const conversion = () => ({ pacienteId, profesionalId, fecha, horaInicio: "08:00" });
const tokens: Partial<Record<Rol, string>> = {};
let server: Server;
let base: string;
const solicitudes = () => mongoose.connection.db!.collection("solicitudesCita");
async function pedir(method: string, ruta: string, body?: unknown, rol?: Rol) {
  const response = await fetch(base + ruta, { method, headers: { "Content-Type": "application/json", ...(rol ? { Authorization: `Bearer ${tokens[rol]}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
async function pendiente() {
  const { servicioId: _servicio, ...d } = datos();
  const r = await solicitudes().insertOne({ ...d, servicio: ids[1], estado: "PENDIENTE", createdAt: new Date() });
  return String(r.insertedId);
}
before(async () => {
  assert.ok(process.env.MONGODB_URI);
  await mongoose.connect(process.env.MONGODB_URI, { dbName });
  await Cita.init();
  server = createApp().listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  base = `http://localhost:${address.port}/api`;
});
beforeEach(async () => {
  await Promise.all([solicitudes().deleteMany({}), Cita.deleteMany({}), Paciente.deleteMany({}), Servicio.deleteMany({}), Horario.deleteMany({}), Usuario.deleteMany({})]);
  for (const rol of ["ADMINISTRADOR", "RECEPCIONISTA", "PROFESIONAL"] as const) {
    const u = await Usuario.create({ ...(rol === "PROFESIONAL" ? { _id: ids[2] } : {}), nombre: "Usuario de prueba", email: `${rol}@example.test`, rol, passwordHash: "solo-pruebas" });
    tokens[rol] = firmarToken({ sub: u.id, rol });
  }
  await Usuario.create({ _id: ids[3], nombre: "Segundo profesional", email: "segundo@example.test", rol: "PROFESIONAL", passwordHash: "solo-pruebas" });
  await Paciente.create({ _id: ids[0], nombres: "Paciente", apellidos: "Prueba", fechaNacimiento: "1990-01-01", sexo: "OTRO", telefono: "12345678", direccion: "Direccion de prueba", fechaInicio: "2026-01-01" });
  await Servicio.create({ _id: ids[1], nombre: "Servicio prueba", descripcion: "Prueba", duracionMin: 50, precioCentavos: 25000 });
  await Horario.create({ dia: "LUNES", atiende: true, franjas: [{ inicio: "08:00", fin: "12:00" }] });
});
after(async () => {
  if (server) await new Promise<void>(resolve => server.close(() => resolve()));
  if (mongoose.connection.name === dbName) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test("recibe una solicitud publica sin reservar horario ni exponer datos", async () => {
  const r = await pedir("POST", "/solicitudes-cita", { ...datos(), estado: "ATENDIDA", cita: String(ids[0]) });
  assert.equal(r.status, 201);
  assert.deepEqual(Object.keys(r.body), ["message"]);
  const sol = await solicitudes().findOne();
  assert.equal(sol!.estado, "PENDIENTE"); assert.ok(!sol!.cita);
  assert.equal(await Cita.countDocuments(), 0);
});
test("valida datos y no acepta servicios inactivos ni fechas pasadas", async () => {
  for (const cambio of [{ correo: "invalido" }, { fechaPreferida: "2020-01-01" }, { fechaPreferida: "2099-02-30" }, { servicioId: "no-id" }]) assert.equal((await pedir("POST", "/solicitudes-cita", { ...datos(), ...cambio })).status, 400);
  await Servicio.updateOne({ _id: ids[1] }, { estado: "INACTIVO" });
  assert.equal((await pedir("POST", "/solicitudes-cita", datos())).status, 422);
  assert.equal(await solicitudes().countDocuments(), 0);
});
test("solo administracion y recepcion consultan y gestionan las solicitudes", async () => {
  const id = await pendiente();
  assert.equal((await pedir("GET", "/solicitudes-cita")).status, 401);
  assert.equal((await pedir("GET", "/solicitudes-cita", undefined, "PROFESIONAL")).status, 403);
  for (const rol of ["ADMINISTRADOR", "RECEPCIONISTA"] as const) {
    const r = await pedir("GET", "/solicitudes-cita?estado=PENDIENTE&limit=1", undefined, rol);
    assert.equal(r.status, 200); assert.equal(r.body.items[0].id, id); assert.equal(r.body.total, 1);
  }
  assert.equal((await pedir("POST", `/solicitudes-cita/${id}/convertir`, conversion(), "PROFESIONAL")).status, 403);
});
test("convierte a cita pendiente con precio, duracion y referencia conservados", async () => {
  const id = await pendiente();
  const r = await pedir("POST", `/solicitudes-cita/${id}/convertir`, conversion(), "RECEPCIONISTA");
  assert.equal(r.status, 201);
  assert.equal(r.body.estado, "ATENDIDA"); assert.ok(r.body.cita?.id);
  const cita = await Cita.findById(r.body.cita.id);
  assert.equal(cita!.precioCentavos, 25000); assert.equal(cita!.duracionMin, 50); assert.equal(cita!.estado, "PENDIENTE");
  assert.ok((await solicitudes().findOne())!.gestionadoPor);
  assert.equal((await pedir("POST", `/solicitudes-cita/${id}/convertir`, conversion(), "RECEPCIONISTA")).status, 409);
  assert.equal(await Cita.countDocuments(), 1);
});
test("al fallar reglas de citas conserva solicitud pendiente y no crea cita", async () => {
  const id = await pendiente();
  for (const cambio of [{ horaInicio: "07:00" }, { fecha: "2020-01-06" }]) assert.equal((await pedir("POST", `/solicitudes-cita/${id}/convertir`, { ...conversion(), ...cambio }, "ADMINISTRADOR")).status, 422);
  await Paciente.updateOne({ _id: ids[0] }, { estado: "INACTIVO" });
  assert.equal((await pedir("POST", `/solicitudes-cita/${id}/convertir`, conversion(), "ADMINISTRADOR")).status, 422);
  assert.equal((await solicitudes().findOne())!.estado, "PENDIENTE"); assert.equal(await Cita.countDocuments(), 0);
});
test("dos conversiones de una solicitud solo generan una cita", async () => {
  const id = await pendiente();
  const resultados = await Promise.all([conversion(), { ...conversion(), profesionalId: String(ids[3]) }].map(d => pedir("POST", `/solicitudes-cita/${id}/convertir`, d, "ADMINISTRADOR")));
  assert.deepEqual(resultados.map(r => r.status).sort(), [201, 409]);
  assert.equal(await Cita.countDocuments(), 1); assert.equal((await solicitudes().findOne())!.estado, "ATENDIDA");
});
test("conversion y programacion normal concurrentes no traslapan horarios", async () => {
  const id = await pendiente();
  const resultados = await Promise.all([
    pedir("POST", `/solicitudes-cita/${id}/convertir`, conversion(), "ADMINISTRADOR"),
    pedir("POST", "/citas", { ...conversion(), servicioId }, "RECEPCIONISTA"),
  ]);
  assert.deepEqual(resultados.map(r => r.status).sort(), [201, 409]); assert.equal(await Cita.countDocuments(), 1);
});
test("rechazo compite con conversion sin dejar cita huerfana", async () => {
  const id = await pendiente();
  const resultados = await Promise.all([
    pedir("POST", `/solicitudes-cita/${id}/convertir`, conversion(), "ADMINISTRADOR"),
    pedir("PATCH", `/solicitudes-cita/${id}/rechazar`, { motivo: "El solicitante desistió" }, "RECEPCIONISTA"),
  ]);
  assert.equal(resultados.filter(r => r.status < 300).length, 1);
  assert.equal(resultados.filter(r => r.status === 409).length, 1);
  const sol = await solicitudes().findOne();
  assert.equal(await Cita.countDocuments(), sol!.estado === "ATENDIDA" ? 1 : 0);
});

test("revierte la cita ya creada si falla el guardado de su referencia", async () => {
  const { SolicitudCita } = await import("../src/models/SolicitudCita");
  const id = await pendiente();
  const fallo = mock.method(SolicitudCita.prototype, "save", async () => { throw new Error("Fallo simulado tras crear la cita"); });
  try {
    assert.equal((await pedir("POST", `/solicitudes-cita/${id}/convertir`, conversion(), "ADMINISTRADOR")).status, 500);
    assert.equal(await Cita.countDocuments(), 0);
    const sol = await solicitudes().findOne();
    assert.equal(sol!.estado, "PENDIENTE"); assert.ok(!sol!.cita && !sol!.gestionadoPor);
  } finally { fallo.mock.restore(); }
});

test("sesiones independientes sin bloqueo en memoria no crean traslapes", async () => {
  const actor = { id: profesionalId, rol: "ADMINISTRADOR" as const };
  const resultados = await Promise.allSettled(Array.from({ length: 2 }, () =>
    mongoose.connection.transaction(session => crearEnTransaccion({ ...conversion(), servicioId }, actor, session)),
  ));
  assert.equal(resultados.filter(r => r.status === "fulfilled").length, 1);
  const fallo = resultados.find(r => r.status === "rejected") as PromiseRejectedResult;
  assert.equal(fallo.reason.status, 409); assert.equal(await Cita.countDocuments(), 1);
});
