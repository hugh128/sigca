import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";

const dbName = `sigca_test_${randomUUID().replaceAll("-", "")}`;
before(async () => {
  assert.ok(process.env.MONGODB_URI, "Configura MONGODB_URI");
  await mongoose.connect(process.env.MONGODB_URI, { dbName, serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.db!.createCollection("operaciones");
  await mongoose.connection.db!.createCollection("movimientos");
});
after(async () => {
  if (mongoose.connection.name === dbName) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
beforeEach(async () => {
  await Promise.all(["operaciones", "movimientos"].map(c => mongoose.connection.db!.collection(c).deleteMany({})));
});

test("confirma cambios en dos colecciones dentro de una transaccion", async () => {
  const db = mongoose.connection.db!;
  await mongoose.connection.transaction(async session => {
    await db.collection("operaciones").insertOne({ importe: 25000 }, { session });
    await db.collection("movimientos").insertOne({ importe: 25000 }, { session });
  });
  assert.equal(await db.collection("operaciones").countDocuments(), 1);
  assert.equal(await db.collection("movimientos").countDocuments(), 1);
});

test("revierte ambas colecciones cuando falla una parte de la operacion", async () => {
  const db = mongoose.connection.db!;
  await assert.rejects(mongoose.connection.transaction(async session => {
    await db.collection("operaciones").insertOne({ importe: 25000 }, { session });
    await db.collection("movimientos").insertOne({ importe: 25000 }, { session });
    throw new Error("fallo de prueba");
  }), /fallo de prueba/);
  assert.equal(await db.collection("operaciones").countDocuments(), 0);
  assert.equal(await db.collection("movimientos").countDocuments(), 0);
});

test("reintenta conflictos concurrentes sin perder actualizaciones", async () => {
  const operaciones = mongoose.connection.db!.collection("operaciones");
  const { insertedId } = await operaciones.insertOne({ total: 0 });
  await Promise.all(Array.from({ length: 4 }, () => mongoose.connection.transaction(async session => {
    const actual = await operaciones.findOne({ _id: insertedId }, { session });
    await operaciones.updateOne({ _id: insertedId }, { $set: { total: actual!.total + 1 } }, { session });
  })));
  assert.equal((await operaciones.findOne({ _id: insertedId }))!.total, 4);
});
