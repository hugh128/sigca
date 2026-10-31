import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { after, before, beforeEach, test, mock } from "node:test";
import mongoose from "mongoose";
import { createApp } from "../src/app";
import { Usuario, type Rol } from "../src/models/Usuario";
import { Caja } from "../src/models/Caja";
import { Cita } from "../src/models/Cita";
import { Paciente } from "../src/models/Paciente";
import { Servicio } from "../src/models/Servicio";
import { firmarToken } from "../src/utils/jwt";
const dbName = `sigca_test_${randomUUID().replaceAll("-", "")}`;
let server: Server, base: string, citaId: string, pacienteId: string, servicioId: string;
const tokens: Record<string, string> = {}, ids: Record<string, string> = {};
async function pedir(method: string, path: string, body?: unknown, usuario = "recep") {
  const r = await fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(usuario ? { Authorization: `Bearer ${tokens[usuario]}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
}
const pagar = (montoCentavos: number, usuario = "recep") => pedir("POST", "/pagos", { citaId, montoCentavos, metodo: "EFECTIVO" }, usuario);
const resumen = () => pedir("GET", `/pagos/citas/${citaId}/resumen`);
before(async () => {
  await mongoose.connect(process.env.MONGODB_URI!, { dbName }); await Caja.init();
  for (const [clave, rol] of Object.entries({ admin: "ADMINISTRADOR", recep: "RECEPCIONISTA", otra: "RECEPCIONISTA", prof: "PROFESIONAL" })) {
    const u = await Usuario.create({ nombre: clave, email: `${clave}@example.test`, rol, passwordHash: "prueba" }); ids[clave] = u.id; tokens[clave] = firmarToken({ sub: u.id, rol: rol as Rol });
  }
  pacienteId = (await Paciente.create({ nombres: "Paciente", apellidos: "Prueba", fechaNacimiento: "1990-01-01", sexo: "OTRO", telefono: "12345678", direccion: "Prueba", fechaInicio: "2026-01-01" })).id;
  servicioId = (await Servicio.create({ nombre: "Prueba", descripcion: "Prueba", duracionMin: 50, precioCentavos: 25000 })).id;
  server = createApp().listen(0); await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string"); base = `http://localhost:${address.port}/api`;
});
beforeEach(async () => {
  await Promise.all([Cita.deleteMany({}), Caja.deleteMany({}), mongoose.connection.db!.collection("pagos").deleteMany({}), mongoose.connection.db!.collection("contadores").deleteMany({})]);
  citaId = (await Cita.create({ paciente: pacienteId, servicio: servicioId, profesional: ids.prof, inicio: new Date("2099-01-05T14:00:00Z"), fin: new Date("2099-01-05T14:50:00Z"), duracionMin: 50, precioCentavos: 25000, creadoPor: ids.admin })).id;
  await Caja.create({ usuario: ids.recep, montoInicialCentavos: 0 }); await Caja.create({ usuario: ids.otra, montoInicialCentavos: 0 });
});
after(async () => { if (server) await new Promise<void>(resolve => server.close(() => resolve())); if (mongoose.connection.name === dbName) await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
test("pago parcial/completo, auditoria protegida y saldo derivado", async () => {
  assert.equal((await resumen()).body.estadoFinanciero, "PENDIENTE");
  const r = await pedir("POST", "/pagos", { citaId, montoCentavos: 10000, metodo: "EFECTIVO", paciente: "falso", caja: "ajena", estado: "ANULADO", comprobante: "falso", fecha: "2000-01-01" });
  assert.equal(r.status, 201); assert.equal(r.body.estado, "REGISTRADO"); assert.equal(r.body.registradoPor.id, ids.recep);
  assert.equal(r.body.paciente.id, pacienteId); assert.match(r.body.comprobante, /^COMP-\d{4}-\d{6,}$/);
  assert.deepEqual([(await resumen()).body.totalPagadoCentavos, (await resumen()).body.saldoCentavos], [10000, 15000]);
  assert.equal((await resumen()).body.estadoFinanciero, "PARCIAL");
  await pagar(15000); assert.equal((await resumen()).body.estadoFinanciero, "PAGADO");
  assert.equal((await pagar(1)).status, 422);
  assert.equal((await pedir("PATCH", `/citas/${citaId}/estado`, { estado: "CANCELADA" })).status, 422);
});
test("valida permisos, monto, cita y caja propia abierta", async () => {
  assert.equal((await pagar(100, "")).status, 401); assert.equal((await pagar(100, "prof")).status, 403);
  assert.equal((await pedir("GET", "/pagos", undefined, "prof")).status, 403);
  for (const monto of [0, -1, 1.5, "100", null]) assert.equal((await pedir("POST", "/pagos", { citaId, montoCentavos: monto, metodo: "EFECTIVO" })).status, 400);
  assert.equal((await pagar(25001)).status, 422);
  assert.equal((await pagar(10, "admin")).status, 422);
  await Caja.updateOne({ usuario: ids.recep }, { estado: "CERRADA" }); assert.equal((await pagar(10)).status, 422);
  await Cita.updateOne({ _id: citaId }, { estado: "CANCELADA" }); assert.equal((await pagar(10, "otra")).status, 422);
});
test("abonos concurrentes de cajas distintas no exceden el costo", async () => {
  const r = await Promise.all([pagar(20000), pagar(20000, "otra")]);
  assert.deepEqual(r.map(x => x.status).sort(), [201, 422]); assert.equal((await resumen()).body.totalPagadoCentavos, 20000);
});
test("pago y cancelacion concurrentes no dejan cita cancelada con pagos validos", async () => {
  const r = await Promise.all([pagar(100), pedir("PATCH", `/citas/${citaId}/estado`, { estado: "CANCELADA" })]);
  assert.equal(r.filter(x => x.status < 300).length, 1);
  assert.equal(r.filter(x => x.status === 422).length, 1);
  const cita = await Cita.findById(citaId); const cantidad = await mongoose.connection.db!.collection("pagos").countDocuments({ estado: "REGISTRADO" });
  assert.equal(cantidad, cita!.estado === "CANCELADA" ? 0 : 1);
});
test("comprobantes unicos, filtros y exclusion de anulados del saldo", async () => {
  const r = await Promise.all([pagar(100), pagar(100, "otra")]); assert.equal(new Set(r.map(x => x.body.comprobante)).size, 2);
  assert.ok(r.every(x => x.status === 201));
  let lista = await pedir("GET", `/pagos?pacienteId=${pacienteId}&metodo=EFECTIVO&limit=1`); assert.equal(lista.body.total, 2); assert.equal(lista.body.pages, 2);
  assert.equal((await pedir("GET", "/pagos?desde=2000-01-01&hasta=2000-01-02")).body.total, 0);
  assert.equal((await pedir("GET", "/pagos?desde=2026-02-30")).status, 400);
  await mongoose.connection.db!.collection("pagos").updateOne({ comprobante: r[0]!.body.comprobante }, { $set: { estado: "ANULADO" } });
  assert.equal((await resumen()).body.totalPagadoCentavos, 100);
});
test("un pago valido restante sigue bloqueando la cancelacion tras anular otro", async () => {
  const primero = (await pagar(100)).body; const segundo = (await pagar(100)).body;
  await pedir("PATCH", `/pagos/${primero.id}/anular`, { motivo: "Registro duplicado" });
  assert.equal((await pedir("PATCH", `/citas/${citaId}/estado`, { estado: "CANCELADA" })).status, 422);
  await pedir("PATCH", `/pagos/${segundo.id}/anular`, { motivo: "Registro duplicado" });
  assert.equal((await pedir("PATCH", `/citas/${citaId}/estado`, { estado: "CANCELADA" })).status, 200);
});
test("fallo al crear pago revierte contador y no deja cobros parciales", async () => {
  const { Pago } = await import("../src/models/Pago");
  const fallo = mock.method(Pago, "create", async () => { throw new Error("Fallo simulado al guardar pago"); });
  try { assert.equal((await pagar(100)).status, 500); } finally { fallo.mock.restore(); }
  assert.equal(await mongoose.connection.db!.collection("pagos").countDocuments(), 0);
  assert.equal((await resumen()).body.totalPagadoCentavos, 0);
  const r = await pagar(100); assert.equal(r.status, 201); assert.match(r.body.comprobante, /-000001$/);
});
test("primeros pagos en citas distintas comparten contador sin duplicar comprobantes", async () => {
  const original = await Cita.findById(citaId);
  const { _id, ...campos } = original!.toObject();
  const segunda = await Cita.create(campos);
  const r = await Promise.all([
    pagar(100), pedir("POST", "/pagos", { citaId: segunda.id, montoCentavos: 200, metodo: "TARJETA" }, "otra"),
  ]);
  assert.deepEqual(r.map(p => p.status), [201, 201]); assert.equal(new Set(r.map(p => p.body.comprobante)).size, 2);
});
test("anula con auditoria y permite cancelar solo tras anular todos los pagos validos", async () => {
  const pago = (await pagar(10000)).body;
  assert.equal((await pedir("GET", `/pagos/${pago.id}`)).body.puedeAnular, true);
  for (const motivo of ["", "  ", "x".repeat(301)]) assert.equal((await pedir("PATCH", `/pagos/${pago.id}/anular`, { motivo })).status, 400);
  const r = await pedir("PATCH", `/pagos/${pago.id}/anular`, { motivo: "Error de registro", anuladoPor: ids.otra, fechaAnulacion: "2000-01-01" });
  assert.equal(r.status, 200); assert.equal(r.body.estado, "ANULADO"); assert.equal(r.body.anuladoPor.id, ids.recep);
  assert.equal(r.body.motivoAnulacion, "Error de registro"); assert.ok(new Date(r.body.fechaAnulacion).getFullYear() >= 2026);
  assert.equal(r.body.comprobante, pago.comprobante); assert.equal(r.body.montoCentavos, 10000);
  assert.equal(r.body.puedeAnular, false); assert.equal((await resumen()).body.estadoFinanciero, "PENDIENTE");
  assert.equal((await pedir("PATCH", `/pagos/${pago.id}/anular`, { motivo: "Segundo intento" })).status, 409);
  assert.equal((await pedir("PATCH", `/citas/${citaId}/estado`, { estado: "CANCELADA" })).status, 200);
  assert.equal(await mongoose.connection.db!.collection("pagos").countDocuments(), 1);
});
test("propiedad de caja, administrador autorizado y caja cerrada inmutable", async () => {
  const pago = (await pagar(100)).body;
  assert.equal((await pedir("GET", `/pagos/${pago.id}`, undefined, "prof")).status, 403);
  assert.equal((await pedir("PATCH", `/pagos/${pago.id}/anular`, { motivo: "Error de registro" }, "prof")).status, 403);
  assert.equal((await pedir("GET", `/pagos/${pago.id}`, undefined, "otra")).body.puedeAnular, false);
  assert.equal((await pedir("PATCH", `/pagos/${pago.id}/anular`, { motivo: "Error de registro" }, "otra")).status, 403);
  await Caja.updateOne({ usuario: ids.recep }, { estado: "CERRADA" });
  assert.equal((await pedir("PATCH", `/pagos/${pago.id}/anular`, { motivo: "Error de registro" }, "admin")).status, 422);
  assert.equal((await pedir("GET", `/pagos/${pago.id}`, undefined, "admin")).body.puedeAnular, false);
  await Caja.updateOne({ usuario: ids.recep }, { estado: "ABIERTA" });
  assert.equal((await pedir("PATCH", `/pagos/${pago.id}/anular`, { motivo: "Corrección autorizada" }, "admin")).body.anuladoPor.id, ids.admin);
});
test("dos anulaciones concurrentes preservan un solo registro de auditoria", async () => {
  const pago = (await pagar(100)).body;
  const r = await Promise.all(["recep", "admin"].map(u => pedir("PATCH", `/pagos/${pago.id}/anular`, { motivo: `Error indicado por ${u}` }, u)));
  assert.deepEqual(r.map(x => x.status).sort(), [200, 409]);
  assert.equal((await resumen()).body.totalPagadoCentavos, 0);
});
test("anulacion y nuevo abono compiten sin sobrepago ni perdida de registros", async () => {
  const pago = (await pagar(15000)).body;
  const r = await Promise.all([pedir("PATCH", `/pagos/${pago.id}/anular`, { motivo: "Registro incorrecto" }), pagar(15000, "otra")]);
  assert.equal(r[0]!.status, 200); assert.ok([201, 422].includes(r[1]!.status));
  assert.equal((await resumen()).body.totalPagadoCentavos, r[1]!.status === 201 ? 15000 : 0);
});
test("fallo de guardado al anular revierte estado, auditoria y revisiones", async () => {
  const pago = (await pagar(100)).body;
  const { Pago } = await import("../src/models/Pago");
  const fallo = mock.method(Pago.prototype, "save", async () => { throw new Error("Fallo simulado al anular"); });
  try { assert.equal((await pedir("PATCH", `/pagos/${pago.id}/anular`, { motivo: "Error de registro" })).status, 500); } finally { fallo.mock.restore(); }
  const r = await pedir("GET", `/pagos/${pago.id}`);
  assert.equal(r.body.estado, "REGISTRADO"); assert.ok(!r.body.anuladoPor && !r.body.fechaAnulacion);
  assert.equal((await resumen()).body.totalPagadoCentavos, 100);
});
