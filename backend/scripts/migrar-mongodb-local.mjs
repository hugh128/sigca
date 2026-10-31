import "dotenv/config";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import mongoose from "mongoose";
import { iniciar, localDir, localUri } from "./mongodb-local.mjs";

const { MongoClient, BSON } = mongoose.mongo;
const ejson = value => BSON.EJSON.stringify(value, { relaxed: false });
const huella = value => createHash("sha256").update(ejson(value)).digest("hex");

// Solo copia SIGCA local al destino vacio del proyecto. Nunca borra ni sobreescribe bases.
const origen = new URL(process.env.MONGODB_URI);
assert.ok(["localhost", "127.0.0.1"].includes(origen.hostname) && origen.port === "27017" && origen.pathname === "/sigca", "La migracion requiere que MONGODB_URI apunte a SIGCA local en 27017");
await iniciar();
const source = new MongoClient(origen.toString());
const target = new MongoClient(localUri);
try {
  await source.connect();
  await target.connect();
  const db = source.db("sigca");
  const destino = target.db("sigca");
  assert.equal((await destino.listCollections().toArray()).length, 0, "El destino ya contiene colecciones; no se sobreescribira");
  const colecciones = [];
  for (const c of await db.listCollections().toArray()) {
    assert.equal(c.type, "collection", "La copia no admite vistas");
    colecciones.push({ nombre: c.name, opciones: c.options, indices: await db.collection(c.name).listIndexes().toArray(), documentos: await db.collection(c.name).find().sort({ _id: 1 }).toArray() });
  }
  const backupDir = resolve(localDir, "backups");
  await mkdir(backupDir, { recursive: true });
  const backup = resolve(backupDir, `sigca-${Date.now()}.ejson`);
  await writeFile(backup, ejson({ fecha: new Date(), colecciones }), { flag: "wx", mode: 0o600 });
  const guardado = BSON.EJSON.parse(await readFile(backup, "utf8"), { relaxed: false });
  assert.equal(huella(guardado.colecciones), huella(colecciones), "El respaldo no coincide con el origen");
  // Se restaura desde el respaldo verificado para comprobar tambien su lectura.
  for (const c of guardado.colecciones) {
    const collection = await destino.createCollection(c.nombre, c.opciones);
    if (c.documentos.length) await collection.insertMany(c.documentos);
    for (const { key, v, ns, ...opciones } of c.indices) {
      if (opciones.name !== "_id_") await collection.createIndex(key, opciones);
    }
    assert.equal(huella(await collection.find().sort({ _id: 1 }).toArray()), huella(c.documentos), `Datos distintos en ${c.nombre}`);
    assert.equal(huella(await collection.listIndexes().toArray()), huella(c.indices), `Indices distintos en ${c.nombre}`);
    console.log(`${c.nombre}: ${c.documentos.length} documentos e indices verificados`);
  }
  console.log(`Respaldo verificado: ${backup}`);
  console.log(`Copia terminada; la base original permanece en 27017. Nueva conexion: ${localUri}`);
} finally { await Promise.all([source.close(), target.close()]); }
