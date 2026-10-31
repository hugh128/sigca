import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";
import { Cita } from "../src/models/Cita";
import { Horario } from "../src/models/Horario";
import { Paciente } from "../src/models/Paciente";
import { Servicio } from "../src/models/Servicio";
import { Usuario } from "../src/models/Usuario";
import * as citas from "../src/services/cita.service";
import { aInstante } from "../src/utils/fechas";

// Cada ejecucion usa su propia base: nunca borra ni modifica la base de desarrollo.
const dbName = `sigca_test_${randomUUID().replaceAll("-", "")}`;
const ids = Array.from({ length: 4 }, () => new mongoose.Types.ObjectId());
const [pacienteId, servicioId, profesionalId, citaId] = ids as [mongoose.Types.ObjectId, mongoose.Types.ObjectId, mongoose.Types.ObjectId, mongoose.Types.ObjectId];
const actor: citas.Actor = { id: String(profesionalId), rol: "ADMINISTRADOR" };
const fecha = "2099-01-05";
const params = () => ({ profesionalId: String(profesionalId), servicioId: String(servicioId), fecha, excluirCitaId: String(citaId) });

before(async () => {
  assert.ok(process.env.MONGODB_URI, "Configura MONGODB_URI para las pruebas de integracion");
  await mongoose.connect(process.env.MONGODB_URI, { dbName, serverSelectionTimeoutMS:5000 });
});
after(async () => {
  if (mongoose.connection.name === dbName) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
beforeEach(async () => {
  await Promise.all([Cita.deleteMany({}), Horario.deleteMany({}), Paciente.deleteMany({}), Servicio.deleteMany({}), Usuario.deleteMany({})]);
  await Usuario.create({ _id: profesionalId, nombre: "Profesional prueba", email: "prueba@sigca.test", passwordHash: "solo-pruebas", rol: "PROFESIONAL" });
  await Paciente.create({ _id: pacienteId, nombres: "Paciente", apellidos: "Prueba", fechaNacimiento: "1990-01-01", sexo: "OTRO", telefono: "12345678", direccion: "Direccion de prueba", fechaInicio: "2026-01-01" });
  await Servicio.create({ _id: servicioId, nombre: "Servicio prueba", descripcion: "Prueba", duracionMin: 50, precioCentavos: 25000 });
  await Horario.create({ dia: "LUNES", atiende: true, franjas: [{ inicio: "08:00", fin: "12:00" }] });
  await Cita.create({ _id: citaId, paciente: pacienteId, servicio: servicioId, profesional: profesionalId, inicio: aInstante("2020-01-06", "08:00"), fin: aInstante("2020-01-06", "08:50"), duracionMin: 50, precioCentavos: 25000, creadoPor: profesionalId });
});

test("reprogramar ofrece la duracion original aunque cambie el servicio", async () => {
  await Servicio.updateOne({ _id: servicioId }, { duracionMin: 30, precioCentavos: 30000 });
  const libres = await citas.disponibilidad(params());
  assert.equal(libres.duracionMin, 50);
  assert.deepEqual(libres.horarios[0], { horaInicio: "08:00", horaFin: "08:50" });
  assert.ok(!libres.horarios.some(h => h.horaInicio === "11:30"));
  const movida = await citas.actualizar(String(citaId), { fecha, horaInicio: "08:00" }, actor);
  assert.equal(movida.horaFin, "08:50");
  assert.equal(movida.precioCentavos, 25000);
});

test("un servicio desactivado permite reprogramar la cita existente, pero no crear otra", async () => {
  await Servicio.updateOne({ _id: servicioId }, { estado: "INACTIVO" });
  assert.ok((await citas.disponibilidad(params())).horarios.length > 0);
  await assert.rejects(citas.crear({ ...params(), pacienteId: String(pacienteId), horaInicio: "08:00" }, actor), /inactivo/);
});

test("no permite excluir otra cita mientras se consulta otro servicio", async () => {
  const otro = await Servicio.create({ nombre: "Otro servicio", descripcion: "Prueba", duracionMin: 30, precioCentavos: 1000 });
  await assert.rejects(citas.disponibilidad({ ...params(), servicioId: otro.id }), /servicio/i);
});

for (const objetivo of ["paciente", "profesional"] as const) {
  test(`no reprograma una cita pasada con ${objetivo} inactivo`, async () => {
    if (objetivo === "paciente") await Paciente.updateOne({ _id: pacienteId }, { estado: "INACTIVO" });
    else await Usuario.updateOne({ _id: profesionalId }, { activo: false });
    await assert.rejects(citas.actualizar(String(citaId), { fecha, horaInicio: "08:00" }, actor), /inactivo/);
    assert.equal((await Cita.findById(citaId))!.inicio.toISOString(), aInstante("2020-01-06", "08:00").toISOString());
  });
}

test("no reprograma un menor que quedo sin responsable", async () => {
  const nacimiento = `${new Date().getUTCFullYear() - 8}-01-01`;
  await Paciente.updateOne({ _id: pacienteId }, { fechaNacimiento: nacimiento });
  await assert.rejects(citas.actualizar(String(citaId), { fecha, horaInicio: "08:00" }, actor), /responsable/);
});
