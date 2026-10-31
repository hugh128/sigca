import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Script, runInNewContext } from 'node:vm';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const collection = JSON.parse(read('SIGCA.postman_collection.json'));
const environment = JSON.parse(read('SIGCA-local.postman_environment.json'));
const variables = new Map(environment.values.map(v => [v.key, v.value]));
const flatten = items => items.flatMap(i => i.item ? flatten(i.item) : [i]);
const requests = flatten(collection.item);
assert.ok(collection.info.schema.endsWith('/v2.1.0/collection.json'));
assert.equal(variables.get('token'), '', 'No exportar sesiones');
assert.equal(variables.get('tokenProfesional'), '', 'No exportar sesiones');
for (const item of requests) {
  for (const match of JSON.stringify(item).matchAll(/\{\{(\w+)\}\}/g)) assert.ok(variables.has(match[1]), `Variable sin definir: ${match[1]}`);
  if (item.request.body?.mode === 'raw') JSON.parse(item.request.body.raw);
  for (const event of item.event ?? []) new Script(event.script.exec.join('\n'));
}
// Comparar el catalogo con las rutas reales, incluidas las rutas multilínea.
const index = read('../backend/src/routes/index.ts');
const imports = Object.fromEntries([...index.matchAll(/import (\w+) from "\.\/(.*?)"/g)].map(m => [m[1], m[2]]));
let routes = 0;
for (const mount of index.matchAll(/router.use\("\/([^"]+)", (\w+)\)/g)) {
  const module = mount[1];
  const source = read('../backend/src/routes/' + imports[mount[2]] + '.ts');
  const folder = collection.item.find(f => f.name === module);
  assert.ok(folder, `Falta modulo ${module}`);
  for (const route of source.matchAll(/router\.(get|post|put|patch|delete)\(\s*"([^"]+)"/g)) {
    const path = '/' + module + (route[2] === '/' ? '' : route[2]);
    const key = route[1].toUpperCase() + ' ' + path;
    const found = folder.item.find(i => i.name === key || key === 'POST /auth/login' && i.request.url === '{{baseUrl}}/auth/login');
    assert.ok(found, `Falta ruta ${key}`);
    assert.equal(found.request.method, route[1].toUpperCase());
    const normalize = p => p.split('?')[0].replace(/\{\{\w+\}\}|:\w+/g, ':param');
    assert.equal(normalize(found.request.url.replace('{{baseUrl}}', '')), normalize(path));
    routes++;
  }
}
console.log(`JSON, variables, scripts y cobertura de ${routes} rutas verificados.`);

if (process.argv.includes('--api')) {
  // Solo esta carpeta puede ejecutarse: login y GET. No escribe datos del negocio.
  const base = process.env.POSTMAN_API_URL ?? variables.get('baseUrl');
  assert.ok(/^http:\/\/(localhost|127\.0\.0\.1):\d+\/api$/.test(base), 'Usar una API local');
  variables.set('baseUrl', base);
  for (const item of collection.item[0].item) {
    const r = item.request;
    assert.ok(r.method === 'GET' || r.url.endsWith('/auth/login'), 'Escritura fuera de alcance');
    const replace = value => value.replace(/\{\{(\w+)\}\}/g, (_, key) => variables.get(key));
    const headers = Object.fromEntries(r.header.map(h => [h.key, h.value]));
    if (r.auth?.type !== 'noauth') headers.Authorization = 'Bearer ' + variables.get('token');
    const response = await fetch(replace(r.url), { method: r.method, headers, body: r.body ? replace(r.body.raw) : undefined });
    const json = await response.json();
    // Ejecutar los mismos asserts y captura de token incluidos en la coleccion.
    const pm = {
      test: (_name, fn) => fn(),
      response: { code: response.status, json: () => json, to: { have: { status: expected => assert.equal(response.status, expected, item.name) } } },
      expect: value => ({ to: { be: { a: type => assert.equal(typeof value, type) } } }),
      environment: { set: (key, value) => variables.set(key, value) },
    };
    for (const event of item.event ?? []) runInNewContext(event.script.exec.join('\n'), { pm }, { timeout: 1000 });
    console.log(`OK ${item.name}`);
  }
  console.log('16 peticiones y scripts verificados contra la API. Sesion conservada solo en memoria.');
}
