import "dotenv/config";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

export const localDir = fileURLToPath(new URL("../../.local/mongodb/", import.meta.url));
export const localUri = "mongodb://localhost:27018/sigca?replicaSet=sigca-rs";
const dataDir = resolve(localDir, "data");
const logPath = resolve(localDir, "mongod.log");
const { MongoClient } = mongoose.mongo;

async function conectar() {
  const client = new MongoClient("mongodb://localhost:27018/?directConnection=true", { serverSelectionTimeoutMS: 800 });
  try { await client.connect(); return client; }
  catch (error) { await client.close(); throw error; }
}

async function comprobarInstancia(client) {
  const opciones = await client.db("admin").command({ getCmdLineOpts: 1 });
  assert.equal(resolve(opciones.parsed.storage.dbPath), dataDir, "El puerto 27018 pertenece a otra instancia; no se modificara");
  const replication = opciones.parsed.replication;
  // MongoDB devuelve replSet para argumentos CLI y replSetName para YAML.
  assert.equal(replication?.replSetName ?? replication?.replSet, "sigca-rs", "Nombre de replica set inesperado");
}

async function buscarMongod() {
  if (process.env.MONGOD_PATH) return process.env.MONGOD_PATH;
  if (process.platform !== "win32") return "mongod";
  const base = resolve(process.env.ProgramFiles ?? "C:/Program Files", "MongoDB/Server");
  const versiones = (await readdir(base)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  const binary = versiones.map(v => resolve(base, v, "bin/mongod.exe")).find(existsSync);
  assert.ok(binary, "No se encontro mongod. Instala MongoDB Server o define MONGOD_PATH");
  return binary;
}

export async function iniciar() {
  let client;
  try { client = await conectar(); }
  catch {
    await mkdir(dataDir, { recursive: true });
    const proceso = spawn(await buscarMongod(), ["--replSet", "sigca-rs", "--port", "27018", "--bind_ip", "127.0.0.1", "--dbpath", dataDir, "--logpath", logPath, "--logappend", "--oplogSize", "128"], {
      detached: true, stdio: "ignore", windowsHide: true,
    });
    await new Promise((ok, fail) => { proceso.once("spawn", ok); proceso.once("error", fail); });
    proceso.unref();
    const limite = Date.now() + 25_000;
    while (!client && Date.now() < limite) {
      try { client = await conectar(); }
      catch { await new Promise(ok => setTimeout(ok, 300)); }
    }
    assert.ok(client, `MongoDB no inicio; revisa ${logPath}`);
  }
  try {
    await comprobarInstancia(client);
    const hello = await client.db("admin").command({ hello: 1 });
    if (!hello.setName) {
      await client.db("admin").command({ replSetInitiate: { _id: "sigca-rs", members: [{ _id: 0, host: "localhost:27018" }] } });
    }
    const limite = Date.now() + 25_000;
    while (Date.now() < limite) {
      const estado = await client.db("admin").command({ hello: 1 });
      if (estado.isWritablePrimary) {
        console.log(`Replica set local listo: ${localUri}`);
        return;
      }
      await new Promise(ok => setTimeout(ok, 300));
    }
    throw new Error("El replica set todavia no tiene primario; revisa el log local");
  } finally { await client.close(); }
}

async function ejecutar(accion) {
  if (accion === "start") return iniciar();
  assert.ok(["status", "stop"].includes(accion), "Uso: mongodb-local.mjs start|status|stop");
  const client = await conectar();
  try {
    await comprobarInstancia(client);
    if (accion === "status") {
      const estado = await client.db("admin").command({ replSetGetStatus: 1 });
      console.log(JSON.stringify({ replicaSet: estado.set, miembros: estado.members.map(m => ({ host: m.name, estado: m.stateStr })) }));
    } else {
      try { await client.db("admin").command({ shutdown: 1 }); }
      catch (error) { if (!(error instanceof mongoose.mongo.MongoNetworkError)) throw error; }
      console.log("Instancia local de SIGCA detenida; el servicio de Windows no fue modificado");
    }
  } finally { await client.close(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  ejecutar(process.argv[2]).catch(error => { console.error(error.message); process.exitCode = 1; });
}
