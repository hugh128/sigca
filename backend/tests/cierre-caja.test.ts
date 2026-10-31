import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { after, before, beforeEach, test, mock } from "node:test";
import mongoose from "mongoose";
import { createApp } from "../src/app";
import { Usuario, type Rol } from "../src/models/Usuario";
import { Caja } from "../src/models/Caja";
import { Pago } from "../src/models/Pago";
import { Cita } from "../src/models/Cita";
import { Paciente } from "../src/models/Paciente";
import { Servicio } from "../src/models/Servicio";
import { firmarToken } from "../src/utils/jwt";
const dbName = `sigca_test_${randomUUID().replaceAll("-", "")}`;
const ids: Record<string, string> = {}, tokens: Record<string, string> = {};
let server: Server, base: string, cajaId: string, citaId: string, pacienteId: string, servicioId: string;
async function pedir(method: string, path: string, body?: unknown, usuario = "recep") {
  const r = await fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(usuario ? { Authorization: `Bearer ${tokens[usuario]}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
}
const cerrar = (contado = 69000, usuario = "recep") => pedir("POST", `/cajas/${cajaId}/cerrar`, { efectivoContadoCentavos: contado }, usuario);
const pagar = (montoCentavos: number) => pedir("POST", "/pagos", { citaId, montoCentavos, metodo: "EFECTIVO" });
before(async () => {
  await mongoose.connect(process.env.MONGODB_URI!, { dbName }); await Promise.all([Caja.init(), Pago.init()]);
  for (const [clave, rol] of Object.entries({ admin: "ADMINISTRADOR", recep: "RECEPCIONISTA", otra: "RECEPCIONISTA", prof: "PROFESIONAL" })) {
    const u = await Usuario.create({ nombre: clave, email: `${clave}@example.test`, rol, passwordHash: "prueba" }); ids[clave] = u.id; tokens[clave] = firmarToken({ sub: u.id, rol: rol as Rol });
  }
  pacienteId = (await Paciente.create({ nombres: "Paciente", apellidos: "Prueba", fechaNacimiento: "1990-01-01", sexo: "OTRO", telefono: "12345678", direccion: "Prueba", fechaInicio: "2026-01-01" })).id;
  servicioId = (await Servicio.create({ nombre: "Prueba", descripcion: "Prueba", duracionMin: 50, precioCentavos: 200000 })).id;
  server = createApp().listen(0); await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string"); base = `http://localhost:${address.port}/api`;
});
beforeEach(async () => {
  await Promise.all([Caja.deleteMany({}), Pago.deleteMany({}), Cita.deleteMany({})]);
  cajaId = (await Caja.create({ usuario: ids.recep, montoInicialCentavos: 20000 })).id;
  citaId = (await Cita.create({ paciente: pacienteId, servicio: servicioId, profesional: ids.prof, creadoPor: ids.admin, inicio: new Date("2099-01-05T14:00:00Z"), fin: new Date("2099-01-05T14:50:00Z"), duracionMin: 50, precioCentavos: 200000 })).id;
});
after(async () => { if (server) await new Promise<void>(resolve => server.close(() => resolve())); if (mongoose.connection.name === dbName) await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
test("resumen excluye anulados, calcula efectivo y conserva movimientos y snapshot", async () => {
  for (const [metodo, monto] of [["EFECTIVO", 50000], ["TRANSFERENCIA", 35000], ["TARJETA", 15000]] as const) assert.equal((await pedir("POST", "/pagos", { citaId, montoCentavos: monto, metodo })).status, 201);
  const anulado = (await pagar(1000)).body;
  await pedir("PATCH", `/pagos/${anulado.id}/anular`, { motivo: "Registro duplicado" });
  const abierta = (await pedir("GET", `/cajas/${cajaId}`)).body;
  assert.deepEqual(abierta.resumen, { totalEfectivoCentavos: 50000, totalTransferenciaCentavos: 35000, totalTarjetaCentavos: 15000, totalIngresosCentavos: 100000, efectivoEsperadoCentavos: 70000 });
  const r = await cerrar(); assert.equal(r.status, 200); assert.equal(r.body.estado, "CERRADA");
  assert.equal(r.body.diferenciaCentavos, -1000); assert.equal(r.body.efectivoContadoCentavos, 69000);
  assert.equal(r.body.cerradoPor.id, ids.recep); assert.ok(r.body.cierre); assert.equal(r.body.puedeCerrar, false);
  assert.deepEqual(r.body.totalesCierre, abierta.resumen);
  const movimientos = await pedir("GET", `/cajas/${cajaId}/movimientos?limit=2`); assert.equal(movimientos.body.total, 4); assert.equal(movimientos.body.pages, 2);
  assert.equal((await cerrar()).status, 409);
  assert.equal((await pagar(1)).status, 422);
  assert.equal((await pedir("PATCH", `/pagos/${anulado.id}/anular`, { motivo: "Segundo intento" })).status, 409);
  assert.equal((await pedir("GET", "/cajas/actual")).body, null);
  assert.equal((await pedir("POST", "/cajas/abrir", { montoInicialCentavos: 0 })).status, 201);
  assert.equal((await pagar(1999)).status, 201);
  assert.deepEqual((await pedir("GET", `/cajas/${cajaId}`)).body.resumen, abierta.resumen);
  assert.equal((await pedir("GET", `/cajas/${cajaId}/movimientos`)).body.total, 4);
});
test("permisos y entradas protegidas, administrador cierra caja ajena abierta", async () => {
  assert.equal((await cerrar(0, "")).status, 401); assert.equal((await cerrar(0, "prof")).status, 403); assert.equal((await cerrar(0, "otra")).status, 404);
  assert.equal((await pedir("GET", `/cajas/${cajaId}/movimientos`, undefined, "otra")).status, 404);
  for (const monto of [-1, 1.5, "100", null, 1000000000]) assert.equal((await pedir("POST", `/cajas/${cajaId}/cerrar`, { efectivoContadoCentavos: monto })).status, 400);
  const r = await pedir("POST", `/cajas/${cajaId}/cerrar`, { efectivoContadoCentavos: 20001, diferenciaCentavos: 0, cerradoPor: ids.otra, cierre: "2000-01-01" }, "admin");
  assert.equal(r.status, 200); assert.equal(r.body.cerradoPor.id, ids.admin); assert.equal(r.body.diferenciaCentavos, 1);
});
test("dos cierres concurrentes preservan una sola auditoria", async () => {
  const r = await Promise.all([cerrar(20000), cerrar(20000, "admin")]); assert.deepEqual(r.map(x => x.status).sort(), [200, 409]);
});
test("cobro contra cierre se incluye completo o se rechaza en caja cerrada", async () => {
  const r = await Promise.all([pagar(1999), cerrar(20000)]);
  assert.equal(r[1]!.status, 200); assert.ok([201, 422].includes(r[0]!.status));
  const caja = (await pedir("GET", `/cajas/${cajaId}`)).body;
  assert.equal(caja.resumen.totalEfectivoCentavos, r[0]!.status === 201 ? 1999 : 0);
  assert.equal(caja.diferenciaCentavos, r[0]!.status === 201 ? -1999 : 0);
});
test("anulacion contra cierre deja totales consistentes y pago inmutable despues", async () => {
  const p = (await pagar(1000)).body;
  const r = await Promise.all([pedir("PATCH", `/pagos/${p.id}/anular`, { motivo: "Registro duplicado" }), cerrar(20000)]);
  assert.equal(r[1]!.status, 200); assert.ok([200, 422].includes(r[0]!.status));
  const caja = (await pedir("GET", `/cajas/${cajaId}`)).body;
  assert.equal(caja.resumen.totalEfectivoCentavos, r[0]!.status === 200 ? 0 : 1000);
  const despues = await pedir("PATCH", `/pagos/${p.id}/anular`, { motivo: "Otro intento" }); assert.ok([409, 422].includes(despues.status));
});
test("fallo al guardar el cierre revierte estado y snapshot", async () => {
  await pagar(1);
  const fallo = mock.method(Caja.prototype, "save", async () => { throw new Error("Fallo simulado al cerrar caja"); });
  try { assert.equal((await cerrar()).status, 500); } finally { fallo.mock.restore(); }
  const caja = (await pedir("GET", `/cajas/${cajaId}`)).body; assert.equal(caja.estado, "ABIERTA"); assert.ok(!caja.cierre && !caja.totalesCierre);
  assert.equal(caja.resumen.totalEfectivoCentavos, 1);
});
