/**
 * Prueba del driver de R2 SIN credenciales ni internet: levanta un servidor que imita a S3 y comprueba
 * que el driver envia lo correcto (ruta, firma, tipo de contenido, cache, cuerpo).
 *
 *   npm run test:r2
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer, type IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";
import { AlmacenamientoR2 } from "../storage/r2";

interface Peticion { metodo?: string; ruta?: string; cabeceras: IncomingHttpHeaders; cuerpo: Buffer }
const recibidas: Peticion[] = [];

const servidor = createServer((req, res) => {
  const trozos: Buffer[] = [];
  req.on("data", (c: Buffer) => trozos.push(c));
  req.on("end", () => {
    // El SDK agrega "?x-id=PutObject": se compara solo la ruta.
    recibidas.push({ metodo: req.method, ruta: new URL(req.url ?? "/", "http://x").pathname, cabeceras: req.headers, cuerpo: Buffer.concat(trozos) });
    res.statusCode = req.method === "DELETE" ? 204 : 200;
    res.setHeader("ETag", '"fake-etag"');
    res.end();
  });
});

async function main() {
  await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
  const { port } = servidor.address() as AddressInfo;

  const r2 = new AlmacenamientoR2({
    accountId: "cuenta123",
    accessKeyId: "AKIDPRUEBA",
    secretAccessKey: "secreto-de-prueba",
    bucket: "mi-bucket",
    urlPublica: "https://imagenes.ejemplo.com/", // con "/" final a proposito
    endpoint: `http://127.0.0.1:${port}`,
  });

  const contenido = Buffer.from("contenido-de-prueba-de-una-imagen");
  const key = "carrusel/2026/abc.webp";

  const resultado = await r2.guardar(key, contenido, "image/webp");
  assert.deepEqual(resultado, { key, url: "https://imagenes.ejemplo.com/carrusel/2026/abc.webp" });
  console.log("OK  la URL publica se arma sin barras dobles");

  const put = recibidas[0]!;
  assert.equal(put.metodo, "PUT");
  assert.equal(put.ruta, "/mi-bucket/carrusel/2026/abc.webp");
  console.log("OK  PUT a /<bucket>/<llave> (direccionamiento por ruta, el que usa R2)");
  assert.equal(put.cabeceras["content-type"], "image/webp");
  assert.equal(put.cabeceras["cache-control"], "public, max-age=31536000, immutable");
  console.log("OK  Content-Type image/webp y Cache-Control de un año");
  assert.match(String(put.cabeceras.authorization), /^AWS4-HMAC-SHA256 Credential=AKIDPRUEBA\/\d{8}\/auto\/s3\/aws4_request/);
  console.log("OK  firma AWS4 con region 'auto'");
  assert.equal(createHash("sha256").update(put.cuerpo).digest("hex"), createHash("sha256").update(contenido).digest("hex"));
  console.log("OK  el cuerpo llega idéntico");
  assert.equal(put.cabeceras["x-amz-checksum-crc32"], undefined);
  console.log("OK  sin checksum CRC32 opcional (R2 puede rechazarlo)");

  await r2.eliminar(key);
  const del = recibidas[1]!;
  assert.equal(del.metodo, "DELETE");
  assert.equal(del.ruta, "/mi-bucket/carrusel/2026/abc.webp");
  console.log("OK  DELETE a la misma llave");

  servidor.close();
  console.log("\nDriver de R2: todo correcto");
}

main().catch((e) => {
  console.error("FALLO:", e instanceof Error ? e.message : e);
  process.exit(1);
});
