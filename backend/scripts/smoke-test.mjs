import sharp from "sharp";
const B = process.env.TEST_API_URL ?? "http://localhost:4100/api";
let pass = 0, fail = 0;
const ok = (c, name, extra = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${c ? "" : "  -> " + extra}`); };
async function req(method, path, { token, body, raw } = {}) {
  const r = await fetch(B + path, {
    method,
    headers: { ...(body !== undefined || raw ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  let json = null; try { json = await r.json(); } catch {}
  return { s: r.status, j: json };
}
const login = async (email, password = "Sigca2026!") => req("POST", "/auth/login", { body: { email, password } });

// --- básicos
let r = await req("GET", "/health"); ok(r.s === 200 && r.j.status === "ok", "health 200");
r = await req("GET", "/nada"); ok(r.s === 404 && r.j.message, "ruta inexistente 404", JSON.stringify(r));
r = await req("POST", "/auth/login", { raw: "{malformado" }); ok(r.s === 400, "JSON malformado 400", JSON.stringify(r));

// --- login
r = await req("POST", "/auth/login", { body: {} }); ok(r.s === 400 && Array.isArray(r.j.errors) && r.j.errors.length >= 1, "login vacío 400 con errores por campo", JSON.stringify(r));
r = await req("POST", "/auth/login", { body: { email: { $gt: "" }, password: { $gt: "" } } }); ok(r.s === 400, "inyección NoSQL en login rechazada 400", JSON.stringify(r));
r = await login("admin@sigca.test", "incorrecta1"); ok(r.s === 401, "password incorrecta 401");
r = await login("noexiste@sigca.test"); ok(r.s === 401 && r.j.message === "Credenciales inválidas", "correo inexistente 401 mismo mensaje");
r = await login("admin@sigca.test"); ok(r.s === 200 && r.j.token && r.j.usuario.rol === "ADMINISTRADOR", "login admin OK");
ok(!JSON.stringify(r.j).includes("passwordHash") && !JSON.stringify(r.j).includes("$2"), "la respuesta no expone hash de contraseña");
ok(r.j.usuario.id && !r.j.usuario._id && !r.j.usuario.__v, "usuario con `id` (sin _id ni __v)");
const admin = r.j.token;
const recep = (await login("recepcion1@sigca.test")).j.token;
const prof = (await login("profesional1@sigca.test")).j.token;

// --- /me
r = await req("GET", "/auth/me", { token: admin }); ok(r.s === 200 && r.j.usuario.email === "admin@sigca.test", "/me con token 200");
r = await req("GET", "/auth/me"); ok(r.s === 401, "/me sin token 401");
r = await req("GET", "/auth/me", { token: "abc.def.ghi" }); ok(r.s === 401, "/me token inválido 401");

// --- usuarios: autorización
r = await req("GET", "/usuarios"); ok(r.s === 401, "GET /usuarios sin token 401");
r = await req("GET", "/usuarios", { token: recep }); ok(r.s === 403, "GET /usuarios como recepcionista 403");
r = await req("GET", "/usuarios", { token: prof }); ok(r.s === 403, "GET /usuarios como profesional 403");
r = await req("GET", "/usuarios", { token: admin }); ok(r.s === 200 && r.j.length === 6, "GET /usuarios admin: 6 usuarios", JSON.stringify(r).slice(0, 200));
ok(!JSON.stringify(r.j).includes("passwordHash"), "listado de usuarios sin hashes");
r = await req("GET", "/usuarios?rol=PROFESIONAL", { token: admin }); ok(r.s === 200 && r.j.length === 3, "filtro rol=PROFESIONAL: 3", JSON.stringify(r).slice(0, 200));
r = await req("GET", "/usuarios?rol=HACKER", { token: admin }); ok(r.s === 400, "filtro con rol inválido 400");
r = await req("GET", "/usuarios?q=laura", { token: admin }); ok(r.s === 200 && r.j.length === 1, "búsqueda q=laura: 1", JSON.stringify(r).slice(0, 200));
r = await req("GET", "/usuarios/profesionales", { token: recep }); ok(r.s === 200 && r.j.length === 3, "profesionales visibles para recepcionista");
ok(r.j.every((p) => !("rol" in p) || true) && !JSON.stringify(r.j).includes("passwordHash"), "profesionales sin datos sensibles");
r = await req("GET", "/usuarios/profesionales", { token: prof }); ok(r.s === 403, "profesionales NO visibles para profesional 403");
r = await req("GET", "/usuarios/noesid", { token: admin }); ok(r.s === 400, "id inválido 400");
r = await req("GET", "/usuarios/aaaaaaaaaaaaaaaaaaaaaaaa", { token: admin }); ok(r.s === 404, "usuario inexistente 404");

// --- usuarios: crear / validar
const nuevo = { nombre: "Usuario Prueba", email: "Prueba@Sigca.test", password: "Clave1234", rol: "RECEPCIONISTA" };
r = await req("POST", "/usuarios", { token: admin, body: { ...nuevo, password: "corta" } }); ok(r.s === 400, "password débil 400");
r = await req("POST", "/usuarios", { token: admin, body: { ...nuevo, password: "soloLetrasaaa" } }); ok(r.s === 400, "password sin número 400");
r = await req("POST", "/usuarios", { token: admin, body: { ...nuevo, rol: "SUPERADMIN" } }); ok(r.s === 400, "rol inválido 400");
r = await req("POST", "/usuarios", { token: recep, body: nuevo }); ok(r.s === 403, "crear usuario como recepcionista 403");
r = await req("POST", "/usuarios", { token: admin, body: nuevo }); ok(r.s === 201 && r.j.email === "prueba@sigca.test", "crear usuario 201 (email normalizado)", JSON.stringify(r));
ok(!JSON.stringify(r.j).includes("passwordHash") && !("password" in r.j), "creación no devuelve contraseña ni hash");
const nuevoId = r.j.id;
r = await req("POST", "/usuarios", { token: admin, body: nuevo }); ok(r.s === 409, "correo duplicado 409");

// --- RN-08: usuario inactivo
const tokenNuevo = (await login("prueba@sigca.test", "Clave1234")).j.token;
ok(!!tokenNuevo, "nuevo usuario puede iniciar sesión");
r = await req("PATCH", `/usuarios/${nuevoId}/estado`, { token: admin, body: { activo: false } }); ok(r.s === 200 && r.j.activo === false, "desactivar usuario 200");
r = await login("prueba@sigca.test", "Clave1234"); ok(r.s === 403, "RN-08: inactivo no puede iniciar sesión (403)", JSON.stringify(r));
r = await req("GET", "/auth/me", { token: tokenNuevo }); ok(r.s === 401, "RN-08: token previo de usuario inactivo deja de funcionar 401");
r = await req("PUT", `/usuarios/${nuevoId}`, { token: admin, body: { activo: true, nombre: "Usuario Prueba 2" } }); ok(r.s === 200 && r.j.activo === true && r.j.nombre === "Usuario Prueba 2", "reactivar + editar con PUT");
r = await req("PUT", `/usuarios/${nuevoId}`, { token: admin, body: {} }); ok(r.s === 400, "PUT vacío 400");
r = await req("PUT", `/usuarios/${nuevoId}`, { token: admin, body: { email: "admin@sigca.test" } }); ok(r.s === 409, "PUT con correo de otro usuario 409");

// --- auto-bloqueo del admin
const adminId = (await req("GET", "/auth/me", { token: admin })).j.usuario.id;
r = await req("PATCH", `/usuarios/${adminId}/estado`, { token: admin, body: { activo: false } }); ok(r.s === 422, "admin no puede desactivarse a sí mismo 422");
r = await req("PUT", `/usuarios/${adminId}`, { token: admin, body: { rol: "RECEPCIONISTA" } }); ok(r.s === 422, "admin no puede quitarse su rol 422");

// --- reset de contraseña invalida tokens
const t2 = (await login("prueba@sigca.test", "Clave1234")).j.token;
await new Promise((x) => setTimeout(x, 1100));
r = await req("PATCH", `/usuarios/${nuevoId}/password`, { token: admin, body: { password: "NuevaClave99" } }); ok(r.s === 200, "restablecer contraseña 200", JSON.stringify(r));
r = await req("GET", "/auth/me", { token: t2 }); ok(r.s === 401, "token anterior al reset deja de ser válido 401");
r = await login("prueba@sigca.test", "Clave1234"); ok(r.s === 401, "contraseña vieja ya no sirve");
r = await login("prueba@sigca.test", "NuevaClave99"); ok(r.s === 200, "contraseña nueva funciona");

// --- servicios
r = await req("GET", "/servicios"); ok(r.s === 200 && r.j.length === 5, "público: lista 5 servicios activos", JSON.stringify(r).slice(0, 200));
ok(r.j.every((s) => !("precioCentavos" in s)), "público: sin precio");
r = await req("GET", "/servicios", { token: recep }); ok(r.j.every((s) => Number.isInteger(s.precioCentavos)), "personal: con precio entero (centavos)");
const svc = r.j[0];
r = await req("POST", "/servicios", { body: {} }); ok(r.s === 401, "crear servicio sin token 401");
const bodySvc = { nombre: "Servicio Nuevo", descripcion: "Descripción de prueba", duracionMin: 30, precioCentavos: 15000 };
r = await req("POST", "/servicios", { token: recep, body: bodySvc }); ok(r.s === 403, "crear servicio como recepcionista 403");
r = await req("POST", "/servicios", { token: admin, body: { ...bodySvc, precioCentavos: 150.5 } }); ok(r.s === 400, "precio decimal rechazado (RN-28) 400");
r = await req("POST", "/servicios", { token: admin, body: { ...bodySvc, precioCentavos: 0 } }); ok(r.s === 400, "precio 0 rechazado 400");
r = await req("POST", "/servicios", { token: admin, body: { ...bodySvc, duracionMin: 3 } }); ok(r.s === 400, "duración 3 min rechazada 400");
r = await req("POST", "/servicios", { token: admin, body: { ...bodySvc, imagenUrl: "no-es-url" } }); ok(r.s === 400, "URL de imagen inválida 400");
r = await req("POST", "/servicios", { token: admin, body: bodySvc }); ok(r.s === 201 && r.j.estado === "ACTIVO", "crear servicio admin 201 (ACTIVO por defecto)", JSON.stringify(r));
const svcId = r.j.id;
r = await req("PUT", `/servicios/${svcId}`, { token: admin, body: { precioCentavos: 17500 } }); ok(r.s === 200 && r.j.precioCentavos === 17500, "actualizar precio");
r = await req("GET", "/servicios", { token: admin }); ok(r.j.length === 6, "admin ve 6 servicios");
r = await req("PATCH", `/servicios/${svcId}/estado`, { token: admin, body: { estado: "INACTIVO" } }); ok(r.s === 200 && r.j.estado === "INACTIVO", "desactivar servicio");
r = await req("GET", "/servicios"); ok(r.j.length === 5 && !r.j.some((s) => s.id === svcId), "público: ya no ve el inactivo");
r = await req("PUT", `/servicios/${svcId}`, { token: admin, body: { precioCentavos: 19000 } }); ok(r.s === 200 && r.j.estado === "INACTIVO" && r.j.precioCentavos === 19000, "regresión: editar solo el precio NO reactiva un servicio inactivo", JSON.stringify(r));
r = await req("PUT", `/servicios/${svcId}`, { token: admin, body: { imagenUrl: "https://example.com/a.png" } }); ok(r.s === 200 && r.j.imagenUrl, "agregar imagen por URL");
r = await req("PUT", `/servicios/${svcId}`, { token: admin, body: { imagenUrl: "" } }); ok(r.s === 200 && !r.j.imagenUrl, "vaciar la URL de imagen la elimina");

r = await req("GET", `/servicios/${svcId}`); ok(r.s === 404, "público: GET de servicio inactivo 404");
r = await req("GET", `/servicios/${svcId}`, { token: admin }); ok(r.s === 200, "personal: GET de servicio inactivo 200");
r = await req("GET", "/servicios?estado=INACTIVO", { token: admin }); ok(r.j.length === 1, "filtro estado=INACTIVO (personal): 1");
r = await req("PATCH", `/servicios/${svcId}/estado`, { token: admin, body: { estado: "BORRADO" } }); ok(r.s === 400, "estado inválido 400");

// --- contenido institucional
r = await req("GET", "/contenido"); ok(r.s === 200 && ["general","inicio","misionVision","contacto","corporativo","educativo"].every((k) => k in r.j), "contenido público: 6 secciones", JSON.stringify(r).slice(0, 200));
ok(r.j.inicio.carrusel.length >= 5, "carrusel con al menos 5 imágenes");
ok(r.j.educativo.publicaciones.length === 3 && r.j.educativo.publicaciones[0].fechaPublicacion >= r.j.educativo.publicaciones[1].fechaPublicacion, "publicaciones ordenadas de más reciente a más antigua");
r = await req("GET", "/contenido/misionVision"); ok(r.s === 200 && r.j.mision && r.j.vision, "GET sección misionVision");
r = await req("GET", "/contenido/otraCosa"); ok(r.s === 400, "sección inexistente 400");
r = await req("PUT", "/contenido/misionVision", { body: { mision: "x", vision: "y" } }); ok(r.s === 401, "editar contenido sin token 401");
r = await req("PUT", "/contenido/misionVision", { token: recep, body: { mision: "x", vision: "y" } }); ok(r.s === 403, "editar contenido como recepcionista 403");
r = await req("PUT", "/contenido/misionVision", { token: admin, body: { mision: "", vision: "y" } }); ok(r.s === 400 && r.j.errors?.[0]?.campo === "mision", "misión vacía 400 con campo", JSON.stringify(r));
r = await req("PUT", "/contenido/misionVision", { token: admin, body: { mision: "Nueva misión", vision: "Nueva visión" } }); ok(r.s === 200 && r.j.mision === "Nueva misión", "admin edita misión/visión");
r = await req("GET", "/contenido"); ok(r.j.misionVision.mision === "Nueva misión", "el cambio se ve en el portal público sin tocar código (RF-12)");
r = await req("PUT", "/contenido/general", { token: admin, body: { nombreCentro: "Centro Nuevo Nombre", logoUrl: "https://example.com/logo.png" } }); ok(r.s === 200 && r.j.nombreCentro === "Centro Nuevo Nombre" && r.j.logoUrl, "admin cambia nombre y logo del centro");
r = await req("PUT", "/contenido/general", { token: admin, body: { nombreCentro: "Centro", logoUrl: "no-url" } }); ok(r.s === 400, "logo con URL inválida 400");
const carrusel4 = [1,2,3,4].map((n) => ({ url: `https://picsum.photos/seed/${n}/800/400` }));
r = await req("PUT", "/contenido/inicio", { token: admin, body: { titulo: "Hola", carrusel: carrusel4 } }); ok(r.s === 400, "carrusel con 4 imágenes rechazado 400", JSON.stringify(r).slice(0, 200));
r = await req("PUT", "/contenido/inicio", { token: admin, body: { titulo: "Hola", carrusel: [...carrusel4, { url: "https://picsum.photos/seed/5/800/400" }] } }); ok(r.s === 200 && r.j.carrusel.length === 5 && r.j.carrusel.every((c) => c.id), "carrusel con 5 imágenes OK (ids asignados)", JSON.stringify(r).slice(0, 200));
r = await req("PUT", "/contenido/contacto", { token: admin, body: { direccion: "Zona 1", telefono: "5555-5555", correo: "no-es-correo" } }); ok(r.s === 400, "contacto con correo inválido 400");
r = await req("PUT", "/contenido/educativo", { token: admin, body: { publicaciones: [{ titulo: "T", descripcion: "D", fechaPublicacion: "15/09/2026" }] } }); ok(r.s === 400, "fecha de publicación con formato inválido 400");
r = await req("PUT", "/contenido/educativo", { token: admin, body: { publicaciones: [{ titulo: "Antigua", descripcion: "D", fechaPublicacion: "2025-01-01" }, { titulo: "Reciente", descripcion: "D", fechaPublicacion: "2026-10-01", imagenUrl: "", enlaceUrl: "https://example.com" }] } });
ok(r.s === 200 && r.j.publicaciones[0].titulo === "Reciente" && r.j.publicaciones[0].id && !("imagenUrl" in r.j.publicaciones[0]), "publicaciones: orden, id automático y URL vacía omitida", JSON.stringify(r).slice(0, 250));

// --- horarios
r = await req("GET", "/horarios"); ok(r.s === 200 && r.j.dias.length === 7 && r.j.dias[0].dia === "LUNES" && r.j.dias[6].dia === "DOMINGO", "horarios públicos: 7 días en orden", JSON.stringify(r).slice(0, 200));
ok(r.j.dias[0].franjas.length === 2 && r.j.dias[6].atiende === false, "lunes con 2 franjas, domingo sin atención");
const DIAS = ["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO","DOMINGO"];
const semana = (fn) => ({ dias: DIAS.map((d, i) => fn(d, i)) });
const normal = (d) => ({ dia: d, atiende: !["SABADO","DOMINGO"].includes(d), franjas: ["SABADO","DOMINGO"].includes(d) ? [] : [{ inicio: "09:00", fin: "13:00" }] });
r = await req("PUT", "/horarios", { body: semana(normal) }); ok(r.s === 401, "editar horarios sin token 401");
r = await req("PUT", "/horarios", { token: recep, body: semana(normal) }); ok(r.s === 403, "editar horarios como recepcionista 403");
r = await req("GET", "/horarios", { token: recep }); ok(r.s === 200 && r.j.dias.length === 7, "RF-02: recepcion consulta los siete dias de horario");
r = await req("PUT", "/horarios", { token: admin, body: { dias: DIAS.slice(0, 6).map(normal) } }); ok(r.s === 400, "faltando un día 400");
r = await req("PUT", "/horarios", { token: admin, body: semana((d, i) => normal(i === 6 ? "LUNES" : d)) }); ok(r.s === 400, "día repetido 400");
r = await req("PUT", "/horarios", { token: admin, body: semana((d) => d === "LUNES" ? { dia: d, atiende: true, franjas: [{ inicio: "12:00", fin: "08:00" }] } : normal(d)) }); ok(r.s === 400, "inicio mayor que fin 400");
r = await req("PUT", "/horarios", { token: admin, body: semana((d) => d === "LUNES" ? { dia: d, atiende: true, franjas: [] } : normal(d)) }); ok(r.s === 400, "día con atención sin franjas 400");
r = await req("PUT", "/horarios", { token: admin, body: semana((d) => d === "LUNES" ? { dia: d, atiende: true, franjas: [{ inicio: "08:00", fin: "12:00" }, { inicio: "11:00", fin: "15:00" }] } : normal(d)) }); ok(r.s === 400, "franjas traslapadas 400");
r = await req("PUT", "/horarios", { token: admin, body: semana((d) => d === "LUNES" ? { dia: d, atiende: true, franjas: [{ inicio: "8:00", fin: "12:00" }] } : normal(d)) }); ok(r.s === 400, "hora con formato inválido 400");
r = await req("PUT", "/horarios", { token: admin, body: semana((d) => d === "LUNES" ? { dia: d, atiende: true, franjas: [{ inicio: "14:00", fin: "18:00" }, { inicio: "08:00", fin: "12:00" }] } : d === "DOMINGO" ? { dia: d, atiende: false, franjas: [{ inicio: "08:00", fin: "09:00" }] } : normal(d)) });
ok(r.s === 200 && r.j.dias[0].franjas[0].inicio === "08:00" && r.j.dias[6].franjas.length === 0, "guardar semana: ordena franjas y limpia días sin atención", JSON.stringify(r).slice(0, 250));
r = await req("GET", "/horarios"); ok(r.j.dias[1].franjas[0].inicio === "09:00" && r.j.dias[5].atiende === false, "el nuevo horario se ve en el portal público");

// --- pacientes y responsables
const hoyGT = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guatemala", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const sumaDias = (f, n) => { const d = new Date(f + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const haceAnios = (n, extraDias = 0) => sumaDias(`${Number(hoyGT.slice(0, 4)) - n}${hoyGT.slice(4)}`, extraDias);
const pac = (extra = {}) => ({ nombres: "Prueba", apellidos: "Paciente", fechaNacimiento: haceAnios(30), sexo: "FEMENINO", telefono: "5555-9999", direccion: "Zona 1, Ciudad de Guatemala", ...extra });
const resp = (extra = {}) => ({ nombres: "Rosario", apellidos: "Prueba", parentesco: "Tía", telefono: "5555-8888", email: "Rosario@Sigca.test", direccion: "Zona 2, Ciudad de Guatemala", ...extra });
const inexistente = "aaaaaaaaaaaaaaaaaaaaaaaa";
const responsablePorNombreId = (n) => respIds[n];
const respIds = {};

r = await req("GET", "/pacientes"); ok(r.s === 401, "pacientes sin token 401");
r = await req("POST", "/pacientes", { token: prof, body: {} }); ok(r.s === 403, "crear paciente como profesional 403");
r = await req("GET", "/responsables", { token: prof }); ok(r.s === 403, "responsables como profesional 403");

r = await req("GET", "/pacientes", { token: recep });
ok(r.s === 200 && r.j.total === 10 && r.j.items.length === 10 && r.j.page === 1 && r.j.limit === 20 && r.j.pages === 1, "listado de pacientes con paginación: 10 en total", JSON.stringify(r.j).slice(0, 200));
ok(r.j.items[0].apellidos === "Alvarado Méndez" && r.j.items[0].edad === 34 && r.j.items[0].esMenor === false, "ordenados por apellido; edad calculada automáticamente");
ok(r.j.items.every((p) => !("busqueda" in p) && !("orden" in p) && p.id && !p._id), "no se exponen campos internos de búsqueda");
r = await req("GET", "/pacientes?limit=3&page=2", { token: recep }); ok(r.s === 200 && r.j.items.length === 3 && r.j.pages === 4 && r.j.page === 2, "paginación: página 2 de 4 con límite 3");
r = await req("GET", "/pacientes?limit=101", { token: recep }); ok(r.s === 400, "límite mayor a 100 rechazado 400");
r = await req("GET", "/pacientes?page=0", { token: recep }); ok(r.s === 400, "página 0 rechazada 400");

r = await req("GET", "/pacientes?q=hernandez", { token: recep }); ok(r.j.total === 2, "búsqueda sin tildes: «hernandez» encuentra «Hernández» (2)", JSON.stringify(r.j.total));
r = await req("GET", "/pacientes?q=MATEO%20HERNANDEZ", { token: recep }); ok(r.j.total === 1 && r.j.items[0].nombres === "Mateo", "búsqueda con varias palabras y mayúsculas");
r = await req("GET", "/pacientes?q=sebastian", { token: recep }); ok(r.j.total === 1, "«sebastian» encuentra «Sebastián»");
r = await req("GET", "/pacientes?q=5555-0206", { token: recep }); ok(r.j.total === 1 && r.j.items[0].nombres === "Jorge", "búsqueda por teléfono");
r = await req("GET", "/pacientes?q=zzzz", { token: recep }); ok(r.s === 200 && r.j.total === 0 && r.j.items.length === 0 && r.j.pages === 1, "sin resultados: lista vacía");
r = await req("GET", "/pacientes?q=.*", { token: recep }); ok(r.s === 200 && r.j.total === 0, "los caracteres de expresión regular se buscan como texto");
r = await req("GET", "/pacientes?estado=INACTIVO", { token: recep }); ok(r.j.total === 1 && r.j.items[0].nombres === "Elena", "filtro por estado INACTIVO");
r = await req("GET", "/pacientes?menores=true", { token: recep }); ok(r.j.total === 6 && r.j.items.every((p) => p.edad < 18 && p.esMenor), "filtro «solo menores»: 6");
r = await req("GET", "/pacientes?menores=false", { token: recep }); ok(r.j.total === 4 && r.j.items.every((p) => p.edad >= 18 && !p.esMenor), "filtro «solo mayores»: 4");
r = await req("GET", "/pacientes?estado=ACTIVO&menores=false", { token: recep }); ok(r.j.total === 3, "filtros combinados");

r = await req("GET", "/pacientes?q=sebastian", { token: recep });
const sebastian = r.j.items[0];
r = await req("GET", `/pacientes/${sebastian.id}`, { token: recep });
ok(r.s === 200 && r.j.edad === 17 && r.j.esMenor && r.j.responsables.length === 2 && r.j.responsables[0].nombres && r.j.responsables.every((x) => x.id && !("busqueda" in x)), "detalle con responsables completos (populate) y sin campos internos", JSON.stringify(r.j).slice(0, 250));
r = await req("GET", "/pacientes/noesid", { token: recep }); ok(r.s === 400, "id inválido 400");
r = await req("GET", `/pacientes/${inexistente}`, { token: recep }); ok(r.s === 404, "paciente inexistente 404");

// ---- crear
r = await req("POST", "/pacientes", { token: recep, body: pac() }); ok(r.s === 201 && r.j.estado === "ACTIVO" && r.j.edad === 30 && r.j.fechaInicio === hoyGT && r.j.responsables.length === 0, "crear paciente adulto 201: ACTIVO, edad 30, inicio = hoy", JSON.stringify(r));
const adulto = r.j;
const mal = async (cambio, nombre) => { const x = await req("POST", "/pacientes", { token: admin, body: pac(cambio) }); ok(x.s === 400, `crear: ${nombre} -> 400`, JSON.stringify(x)); };
await mal({ nombres: "Juan123" }, "nombre con números");
await mal({ nombres: "A" }, "nombre de un carácter");
await mal({ fechaNacimiento: sumaDias(hoyGT, 1) }, "fecha de nacimiento futura");
await mal({ fechaNacimiento: "2010-02-30" }, "fecha inexistente (30 de febrero)");
await mal({ fechaNacimiento: "15/03/2010" }, "formato de fecha incorrecto");
await mal({ fechaNacimiento: "1850-01-01" }, "fecha demasiado antigua");
await mal({ sexo: "X" }, "sexo inválido");
await mal({ telefono: "abc" }, "teléfono inválido");
await mal({ direccion: "" }, "dirección vacía");
await mal({ fotoUrl: "no-es-url" }, "URL de foto inválida");
r = await req("POST", "/pacientes", { token: admin, body: pac({ responsables: [inexistente] }) }); ok(r.s === 422, "responsable inexistente al crear 422");
r = await req("POST", "/pacientes", { token: admin, body: pac({ nombres: "María José", apellidos: "O'Connor de la Cruz", telefono: "+502 5555-1234" }) }); ok(r.s === 201, "nombres con tilde, apóstrofe y teléfono internacional aceptados");

// límite de los 18 años
r = await req("POST", "/pacientes", { token: admin, body: pac({ nombres: "Justo", apellidos: "Dieciocho", fechaNacimiento: haceAnios(18) }) });
ok(r.s === 201 && r.j.edad === 18 && r.j.esMenor === false, "cumple 18 hoy -> edad 18, ya no es menor", JSON.stringify(r.j));
r = await req("POST", "/pacientes", { token: admin, body: pac({ nombres: "Casi", apellidos: "Dieciocho", fechaNacimiento: haceAnios(18, 1) }) });
ok(r.s === 201 && r.j.edad === 17 && r.j.esMenor === true, "cumple 18 mañana -> edad 17, todavía es menor", JSON.stringify(r.j));
r = await req("GET", "/pacientes?q=dieciocho&menores=true", { token: admin }); ok(r.j.total === 1 && r.j.items[0].nombres === "Casi", "el filtro de menores coincide con el cálculo de edad en el límite");
r = await req("GET", "/pacientes?q=dieciocho&menores=false", { token: admin }); ok(r.j.total === 1 && r.j.items[0].nombres === "Justo", "…y el de mayores también");

// ---- responsables
r = await req("GET", "/responsables", { token: recep });
ok(r.s === 200 && r.j.total === 5 && r.j.items.every((x) => Array.isArray(x.pacientes) && x.id && !("busqueda" in x)), "listado de responsables (5) con sus pacientes", JSON.stringify(r.j).slice(0, 200));
const ana = r.j.items.find((x) => x.nombres === "Ana María");
ok(ana.pacientes.length === 2 && ana.pacientes.map((p) => p.nombres).sort().join() === "Diego,Mateo", "Ana María es responsable de Diego y Mateo");
r = await req("GET", "/responsables?q=perez", { token: recep }); ok(r.j.total === 1 && r.j.items[0].nombres === "Marta", "buscar responsable sin tildes («perez» -> Pérez)");
r = await req("GET", "/responsables?q=carlos.castillo", { token: recep }); ok(r.j.total === 1, "buscar responsable por correo");
r = await req("POST", "/responsables", { token: recep, body: resp({ email: undefined }) }); ok(r.s === 400, "responsable sin correo 400");
r = await req("POST", "/responsables", { token: recep, body: resp({ email: "no-es-correo" }) }); ok(r.s === 400, "responsable con correo inválido 400");
r = await req("POST", "/responsables", { token: recep, body: resp({ parentesco: undefined }) }); ok(r.s === 400, "responsable sin parentesco 400");
r = await req("POST", "/responsables", { token: recep, body: resp({ pacientes: [inexistente] }) }); ok(r.s === 422, "responsable con paciente inexistente 422");
r = await req("POST", "/responsables", { token: recep, body: resp() }); ok(r.s === 201 && r.j.email === "rosario@sigca.test" && r.j.pacientes.length === 0, "crear responsable 201 (correo en minúsculas)", JSON.stringify(r));
const rosario = r.j;

// ---- asociaciones desde el paciente
r = await req("POST", `/pacientes/${adulto.id}/responsables`, { token: recep, body: { responsableId: rosario.id } });
ok(r.s === 200 && r.j.responsables.length === 1 && r.j.responsables[0].id === rosario.id, "asociar responsable a un paciente");
r = await req("POST", `/pacientes/${adulto.id}/responsables`, { token: recep, body: { responsableId: rosario.id } }); ok(r.s === 200 && r.j.responsables.length === 1, "asociar dos veces no duplica");
r = await req("POST", `/pacientes/${adulto.id}/responsables`, { token: recep, body: { responsableId: inexistente } }); ok(r.s === 404, "asociar responsable inexistente 404");
r = await req("POST", `/pacientes/${inexistente}/responsables`, { token: recep, body: { responsableId: rosario.id } }); ok(r.s === 404, "asociar a paciente inexistente 404");
r = await req("GET", `/responsables/${rosario.id}`, { token: recep }); ok(r.s === 200 && r.j.pacientes.length === 1 && r.j.pacientes[0].id === adulto.id, "el responsable ve a sus pacientes asociados");
r = await req("DELETE", `/pacientes/${adulto.id}/responsables/${rosario.id}`, { token: recep }); ok(r.s === 200 && r.j.responsables.length === 0, "desasociar responsable");
r = await req("DELETE", `/pacientes/${adulto.id}/responsables/${rosario.id}`, { token: recep }); ok(r.s === 200, "desasociar de nuevo es inofensivo (idempotente)");

// ---- asociaciones desde el responsable
r = await req("POST", `/responsables/${rosario.id}/pacientes`, { token: recep, body: { pacienteId: adulto.id } }); ok(r.s === 200 && r.j.pacientes.length === 1, "asociar paciente desde el responsable");
r = await req("POST", `/responsables/${rosario.id}/pacientes`, { token: recep, body: { pacienteId: sebastian.id } }); ok(r.s === 200 && r.j.pacientes.length === 2, "un responsable puede tener varios pacientes");
r = await req("GET", `/pacientes/${sebastian.id}`, { token: recep }); ok(r.j.responsables.length === 3, "el paciente refleja la nueva asociación");
r = await req("DELETE", `/responsables/${rosario.id}/pacientes/${sebastian.id}`, { token: recep }); ok(r.s === 200 && r.j.pacientes.length === 1, "desasociar paciente desde el responsable");
r = await req("POST", `/responsables/${inexistente}/pacientes`, { token: recep, body: { pacienteId: adulto.id } }); ok(r.s === 404, "responsable inexistente 404");

// ---- crear paciente / responsable ya asociados
r = await req("POST", "/pacientes", { token: recep, body: pac({ nombres: "Niño", apellidos: "Asociado", fechaNacimiento: haceAnios(7), responsables: [rosario.id, rosario.id] }) });
ok(r.s === 201 && r.j.responsables.length === 1 && r.j.esMenor, "crear menor con responsable (ids repetidos se unifican)", JSON.stringify(r.j).slice(0, 200));
const menorAsociado = r.j;
r = await req("POST", "/responsables", { token: recep, body: resp({ nombres: "Nueva", email: "nueva@sigca.test", pacientes: [menorAsociado.id] }) });
ok(r.s === 201 && r.j.pacientes.length === 1, "crear responsable asociado a un paciente");
r = await req("GET", `/pacientes/${menorAsociado.id}`, { token: recep }); ok(r.j.responsables.length === 2, "…y el paciente lo refleja");
r = await req("DELETE", `/responsables/${rosario.id}`, { token: admin }); ok(r.s === 404, "los responsables no se eliminan (no existe DELETE)");

// ---- actualizar / eliminación lógica
r = await req("PUT", `/pacientes/${adulto.id}`, { token: recep, body: { telefono: "5555-7777" } }); ok(r.s === 200 && r.j.telefono === "5555-7777" && r.j.nombres === "Prueba" && r.j.estado === "ACTIVO", "PUT parcial: solo cambia el teléfono");
r = await req("GET", "/pacientes?q=5555-7777", { token: recep }); ok(r.j.total === 1, "la búsqueda se actualiza con el cambio");
r = await req("PUT", `/pacientes/${adulto.id}`, { token: recep, body: {} }); ok(r.s === 400, "PUT vacío 400");
r = await req("PUT", `/pacientes/${adulto.id}`, { token: recep, body: { fechaNacimiento: sumaDias(hoyGT, 5) } }); ok(r.s === 400, "PUT con fecha futura 400");
r = await req("PUT", `/pacientes/${adulto.id}`, { token: recep, body: { nombres: "Prueba Nuevo", fotoUrl: "https://example.com/f.png" } }); ok(r.s === 200 && r.j.fotoUrl, "agregar foto por URL");
r = await req("PUT", `/pacientes/${adulto.id}`, { token: recep, body: { fotoUrl: "" } }); ok(r.s === 200 && !r.j.fotoUrl, "vaciar la foto la elimina");
r = await req("PUT", `/pacientes/${inexistente}`, { token: recep, body: { telefono: "5555-7777" } }); ok(r.s === 404, "PUT a paciente inexistente 404");
r = await req("PATCH", `/pacientes/${adulto.id}/estado`, { token: recep, body: { estado: "INACTIVO" } }); ok(r.s === 200 && r.j.estado === "INACTIVO", "desactivar paciente (eliminación lógica)");
r = await req("PATCH", `/pacientes/${adulto.id}/estado`, { token: recep, body: { estado: "BORRADO" } }); ok(r.s === 400, "estado inválido 400");
r = await req("PUT", `/pacientes/${adulto.id}`, { token: recep, body: { telefono: "5555-6666" } }); ok(r.s === 200 && r.j.estado === "INACTIVO", "regresión: un PUT no reactiva a un paciente inactivo");
r = await req("GET", `/pacientes/${adulto.id}`, { token: recep }); ok(r.s === 200 && r.j.estado === "INACTIVO", "el paciente desactivado sigue existiendo (no se borra)");
r = await req("DELETE", `/pacientes/${adulto.id}`, { token: admin }); ok(r.s === 404, "los pacientes no se eliminan (no existe DELETE)");
r = await req("PATCH", `/pacientes/${adulto.id}/estado`, { token: recep, body: { estado: "ACTIVO" } }); ok(r.s === 200 && r.j.estado === "ACTIVO", "reactivar paciente");
r = await req("PUT", `/responsables/${rosario.id}`, { token: recep, body: { telefono: "5555-1111", parentesco: "Madrina" } }); ok(r.s === 200 && r.j.telefono === "5555-1111" && r.j.parentesco === "Madrina" && r.j.nombres === "Rosario", "PUT parcial de responsable");
r = await req("PUT", `/responsables/${rosario.id}`, { token: recep, body: { email: "malo" } }); ok(r.s === 400, "PUT de responsable con correo inválido 400");

// --- citas
const dow = (f) => new Date(f + "T00:00:00Z").getUTCDay();
const proximo = (n, bueno) => { let f = sumaDias(hoyGT, n); while (!bueno(dow(f))) f = sumaDias(f, 1); return f; };
const laboral = (n) => proximo(n, (d) => d >= 1 && d <= 5);
const D = laboral(12), D2 = laboral(14), D3 = laboral(16), D4 = laboral(18), D5 = laboral(20), D6 = laboral(22);
const dom = proximo(5, (d) => d === 0), sab = proximo(30, (d) => d === 6);

const profs = (await req("GET", "/usuarios/profesionales", { token: recep })).j;
const pAna = profs.find((p) => p.email === "profesional1@sigca.test"), pMario = profs.find((p) => p.email === "profesional2@sigca.test");
const pSofia = profs.find((p) => p.email === "profesional3@sigca.test");
const svcs = (await req("GET", "/servicios", { token: admin })).j;
const svcC = (n) => svcs.find((s) => s.nombre === n);
const atencion = svcC("Atención psicológica"), evaluacion = svcC("Evaluación psicológica"), terapia = svcC("Terapia de lenguaje");
const buscarPac = async (q) => (await req("GET", `/pacientes?q=${encodeURIComponent(q)}`, { token: recep })).j.items[0];
const valeria = await buscarPac("valeria"), lucia = await buscarPac("lucia"), elena = await buscarPac("elena"), mateo = await buscarPac("mateo"), camila = await buscarPac("camila");
const cita = (o = {}) => ({ pacienteId: valeria.id, servicioId: atencion.id, profesionalId: pAna.id, fecha: D, horaInicio: "14:00", ...o });
const crearC = (o, token = recep) => req("POST", "/citas", { token, body: cita(o) });
const todas = async (qs = "") => (await req("GET", `/citas?limit=500${qs}`, { token: admin })).j;

// ---- preparación: las pruebas de horarios (más arriba) cambian el horario global; aquí se restablece el del seed
const franjasSeed = { MA: [{ inicio: "08:00", fin: "12:00" }, { inicio: "14:00", fin: "18:00" }] };
const semanaSeed = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"].map((dia) => ({
  dia, atiende: dia !== "DOMINGO", franjas: dia === "DOMINGO" ? [] : dia === "SABADO" ? [{ inicio: "08:00", fin: "12:00" }] : franjasSeed.MA,
}));
r = await req("PUT", "/horarios", { token: admin, body: { dias: semanaSeed } }); ok(r.s === 200, "preparación: horario de atención restablecido (lun–vie 8–12 y 14–18, sáb 8–12)");

// ---- acceso y listado
for (const x of (await req("GET", "/responsables?limit=50", { token: recep })).j.items) respIds[x.nombres] = x.id;
r = await req("GET", "/citas"); ok(r.s === 401, "citas sin token 401");
r = await crearC({}, prof); ok(r.s === 403, "profesional no puede programar citas 403");
r = await req("GET", "/citas", { token: recep });
ok(r.s === 200 && r.j.total === 17 && r.j.items.length === 17 && r.j.limit === 50, "listado de citas (seed): 17", JSON.stringify(r.j).slice(0, 200));
const it0 = r.j.items[0];
ok(it0.paciente.nombres && it0.paciente.apellidos && typeof it0.paciente.edad === "number" && it0.servicio.nombre && it0.profesional.nombre, "cada cita trae paciente, servicio y profesional");
ok(/^\d{4}-\d{2}-\d{2}$/.test(it0.fecha) && /^\d\d:\d\d$/.test(it0.horaInicio) && /^\d\d:\d\d$/.test(it0.horaFin) && it0.duracionMin > 0 && it0.precioCentavos > 0 && it0.id && !it0._id, "fecha y horas en hora de Guatemala, duración y precio copiados");
ok(r.j.items.every((c, i, a) => i === 0 || a[i - 1].inicio <= c.inicio), "ordenadas por fecha ascendente");
r = await req("GET", "/citas?orden=desc", { token: recep }); ok(r.j.items.every((c, i, a) => i === 0 || a[i - 1].inicio >= c.inicio), "orden descendente");
const cuenta = async (qs) => (await req("GET", `/citas${qs}`, { token: recep })).j.total;
ok((await cuenta("?estado=COMPLETADA")) === 7 && (await cuenta("?estado=CANCELADA")) === 2 && (await cuenta("?estado=PENDIENTE")) === 4 && (await cuenta("?estado=CONFIRMADA")) === 4, "filtro por estado: 7 completadas, 2 canceladas, 4 pendientes, 4 confirmadas");
ok((await cuenta("?estado=PENDIENTE,CONFIRMADA")) === 8, "filtro con varios estados");
ok((await cuenta(`?profesionalId=${pAna.id}`)) === 7 && (await cuenta(`?pacienteId=${mateo.id}`)) === 5, "filtros por profesional (7) y por paciente (5: historial)");
ok((await cuenta(`?desde=${hoyGT}&hasta=${sumaDias(hoyGT, 60)}`)) === 9 && (await cuenta(`?hasta=${sumaDias(hoyGT, -1)}`)) === 8, "filtro por rango de fechas: 9 futuras y 8 pasadas");
r = await req("GET", `/citas?desde=${sumaDias(hoyGT, 5)}&hasta=${hoyGT}`, { token: recep }); ok(r.s === 400, "rango invertido 400");
r = await req("GET", "/citas?desde=2026-02-30", { token: recep }); ok(r.s === 400, "fecha inexistente en el filtro 400");
r = await req("GET", "/citas?estado=NADA", { token: recep }); ok(r.s === 400, "estado inválido en el filtro 400");
r = await req("GET", "/citas?limit=501", { token: recep }); ok(r.s === 400, "límite mayor a 500 rechazado 400");
r = await req("GET", "/citas?limit=5&page=2", { token: recep }); ok(r.j.items.length === 5 && r.j.pages === 4, "paginación de citas");

// ---- el profesional solo ve lo suyo
r = await req("GET", "/citas", { token: prof });
ok(r.s === 200 && r.j.total === 7 && r.j.items.every((c) => c.profesional.id === pAna.id), "el profesional ve solo SUS 7 citas");
ok(r.j.items.every((c) => !("precioCentavos" in c)), "el profesional no ve precios");
r = await req("GET", `/citas?profesionalId=${pMario.id}`, { token: prof }); ok(r.j.total === 7 && r.j.items.every((c) => c.profesional.id === pAna.id), "pedir otro profesional no le muestra citas ajenas");
const deMario = (await todas(`&profesionalId=${pMario.id}&estado=CONFIRMADA`)).items[0];
r = await req("GET", `/citas/${deMario.id}`, { token: prof }); ok(r.s === 404, "el profesional no puede ver la cita de otro (404, ni siquiera sabe que existe)");
r = await req("GET", `/citas/${deMario.id}`, { token: recep }); ok(r.s === 200 && r.j.historial.length >= 2 && r.j.historial[0].usuario.nombre, "detalle con historial y nombre de quién hizo cada cambio");
r = await req("GET", "/citas/noesid", { token: recep }); ok(r.s === 400, "id de cita inválido 400");
r = await req("GET", `/citas/${inexistente}`, { token: recep }); ok(r.s === 404, "cita inexistente 404");

// ---- programar: caso feliz, RN-12 y RF-07
r = await crearC({}); ok(r.s === 201 && r.j.estado === "PENDIENTE" && r.j.horaInicio === "14:00" && r.j.horaFin === "14:50" && r.j.fecha === D, "programar cita: queda PENDIENTE y la hora de fin sale de la duración del servicio (14:00 + 50 = 14:50)", JSON.stringify(r));
const c1 = r.j;
ok(c1.duracionMin === 50 && c1.precioCentavos === atencion.precioCentavos && c1.historial.length === 1 && c1.historial[0].nota === "Cita programada", "copia duración y precio del servicio y abre el historial");
await req("PUT", `/servicios/${atencion.id}`, { token: admin, body: { precioCentavos: 99900, duracionMin: 90 } });
r = await req("GET", `/citas/${c1.id}`, { token: recep }); ok(r.j.precioCentavos === atencion.precioCentavos && r.j.duracionMin === 50 && r.j.horaFin === "14:50", "RF-07: si el servicio cambia después, la cita conserva su precio y duración");
await req("PUT", `/servicios/${atencion.id}`, { token: admin, body: { precioCentavos: atencion.precioCentavos, duracionMin: atencion.duracionMin } });

// ---- RN-01: traslapes
r = await crearC({ horaInicio: "14:30" }); ok(r.s === 409 && /14:00 a 14:50/.test(r.j.message) && r.j.detalles?.conflicto?.horaInicio === "14:00" && !r.j.errors, "RN-01: traslape con la cita de 14:00–14:50 -> 409 con el detalle del choque", JSON.stringify(r));
r = await crearC({ horaInicio: "14:00" }); ok(r.s === 409, "RN-01: misma hora exacta 409");
r = await crearC({ horaInicio: "14:50" }); ok(r.s === 201 && r.j.horaInicio === "14:50" && r.j.horaFin === "15:40", "citas «pegadas» (14:50 empieza cuando la otra termina) NO se traslapan", JSON.stringify(r));
const c2 = r.j;
r = await crearC({ horaInicio: "15:30" }); ok(r.s === 409, "RN-01: traslape por el final de otra cita (15:30 vs 14:50–15:40) 409");
r = await crearC({ horaInicio: "14:00", profesionalId: pMario.id }); ok(r.s === 201, "otro profesional sí puede atender a la misma hora");
const cMario = r.j;
r = await req("PATCH", `/citas/${c2.id}/estado`, { token: recep, body: { estado: "CANCELADA", motivo: "El paciente pidió cambiar la hora" } });
ok(r.s === 200 && r.j.estado === "CANCELADA" && r.j.motivoCancelacion === "El paciente pidió cambiar la hora", "cancelar con motivo");
r = await crearC({ horaInicio: "14:50" }); ok(r.s === 201, "RN-13: una cita cancelada libera el horario");
const c3 = r.j;

// carrera: 6 peticiones simultáneas para el mismo horario
const carrera = await Promise.all(Array.from({ length: 6 }, () => crearC({ horaInicio: "16:30", profesionalId: pMario.id, pacienteId: camila.id })));
const estados = carrera.map((x) => x.s).sort();
ok(estados.filter((s) => s === 201).length === 1 && estados.filter((s) => s === 409).length === 5, `concurrencia: 6 peticiones simultáneas al mismo horario -> exactamente 1 cita y 5 rechazos (${estados.join(",")})`);
const alt = carrera.find((x) => x.s === 201).j;

// ---- RN-02: horario de atención
r = await crearC({ fecha: dom, horaInicio: "09:00" }); ok(r.s === 422 && /no atiende los domingos/.test(r.j.message), "RN-02: domingo sin atención 422", JSON.stringify(r));
r = await crearC({ horaInicio: "07:00" }); ok(r.s === 422 && /08:00–12:00 y 14:00–18:00/.test(r.j.message), "RN-02: antes de abrir 422 (el mensaje indica el horario)", JSON.stringify(r));
r = await crearC({ horaInicio: "12:30" }); ok(r.s === 422, "RN-02: en el receso del mediodía 422");
r = await crearC({ fecha: D2, horaInicio: "11:30", servicioId: evaluacion.id }); ok(r.s === 422, "RN-02: la cita (11:30 + 60 min) termina fuera de la franja de la mañana 422", JSON.stringify(r));
r = await crearC({ fecha: D2, horaInicio: "17:30" }); ok(r.s === 422, "RN-02: termina después del cierre (17:30 + 50 = 18:20) 422");
r = await crearC({ fecha: D2, horaInicio: "23:30" }); ok(r.s === 422, "RN-02: de madrugada / cruza la medianoche 422");
r = await crearC({ fecha: sab, horaInicio: "14:00" }); ok(r.s === 422, "RN-02: el sábado solo se atiende por la mañana 422");
r = await crearC({ fecha: sab, horaInicio: "08:00" }); ok(r.s === 201, "RN-02: sábado por la mañana sí 201", JSON.stringify(r));
r = await crearC({ fecha: D2, horaInicio: "17:10" }); ok(r.s === 201 && r.j.horaFin === "18:00", "RN-02: puede terminar justo a la hora de cierre (17:10 + 50 = 18:00)", JSON.stringify(r));
r = await crearC({ fecha: D2, horaInicio: "08:00", servicioId: evaluacion.id }); ok(r.s === 201 && r.j.horaFin === "09:00", "RN-02: puede empezar justo a la hora de apertura", JSON.stringify(r));

// ---- RN-11 y formato
r = await crearC({ fecha: sumaDias(hoyGT, -1), horaInicio: "14:00" }); ok(r.s === 422 && /pasadas/.test(r.j.message), "RN-11: no se programa en el pasado 422");
r = await crearC({ fecha: "15/10/2026" }); ok(r.s === 400, "fecha con formato incorrecto 400");
r = await crearC({ fecha: "2026-02-30" }); ok(r.s === 400, "fecha inexistente 400");
r = await crearC({ horaInicio: "9:30" }); ok(r.s === 400, "hora sin cero inicial 400");
r = await crearC({ horaInicio: "25:00" }); ok(r.s === 400, "hora inexistente 400");
r = await crearC({ observaciones: "x".repeat(501) }); ok(r.s === 400, "observaciones demasiado largas 400");
r = await crearC({ pacienteId: "noesid" }); ok(r.s === 400, "paciente con id inválido 400");

// ---- RN-03, RN-04, RN-07, RN-14: quién puede tener citas
r = await crearC({ fecha: D3, pacienteId: lucia.id }); ok(r.s === 422 && /menor de edad/.test(r.j.message) && /responsable/.test(r.j.message), "RN-04: un menor sin responsable no puede programar citas 422", JSON.stringify(r));
const carlos = (await req("GET", "/responsables?q=carlos", { token: recep })).j.items[0];
await req("POST", `/pacientes/${lucia.id}/responsables`, { token: recep, body: { responsableId: carlos.id } });
r = await crearC({ fecha: D3, pacienteId: lucia.id }); ok(r.s === 201, "RN-04: al registrarle un responsable, ya puede programar", JSON.stringify(r));
const cLucia = r.j;
r = await crearC({ fecha: D3, pacienteId: elena.id }); ok(r.s === 422 && /inactivo/.test(r.j.message), "RN-14: paciente inactivo no puede recibir citas 422");
r = await req("POST", "/servicios", { token: admin, body: { nombre: "Servicio descontinuado", descripcion: "x", duracionMin: 30, precioCentavos: 10000, estado: "INACTIVO" } });
const svcInactivo = r.j;
r = await crearC({ fecha: D3, servicioId: svcInactivo.id }); ok(r.s === 422 && /servicio está inactivo/.test(r.j.message), "RN-07: servicio inactivo no se puede elegir 422");
r = await crearC({ fecha: D3, profesionalId: (await req("GET", "/auth/me", { token: recep })).j.usuario.id }); ok(r.s === 422 && /no es un profesional/.test(r.j.message), "RN-03: el «profesional» debe tener rol PROFESIONAL 422");
r = await req("POST", "/usuarios", { token: admin, body: { nombre: "Profesional Baja", email: "baja@sigca.test", password: "Clave1234", rol: "PROFESIONAL" } });
const baja = r.j;
await req("PATCH", `/usuarios/${baja.id}/estado`, { token: admin, body: { activo: false } });
r = await crearC({ fecha: D3, profesionalId: baja.id }); ok(r.s === 422 && /profesional está inactivo/.test(r.j.message), "RN-03: profesional inactivo no puede recibir citas 422");
r = await crearC({ profesionalId: inexistente }); ok(r.s === 404, "profesional inexistente 404");
r = await crearC({ pacienteId: inexistente }); ok(r.s === 404, "paciente inexistente 404");
r = await crearC({ servicioId: inexistente }); ok(r.s === 404, "servicio inexistente 404");

// ---- reprogramar
r = await req("PUT", `/citas/${c3.id}`, { token: recep, body: { horaInicio: "16:00" } });
ok(r.s === 200 && r.j.horaInicio === "16:00" && r.j.horaFin === "16:50" && r.j.fecha === D && r.j.estado === "PENDIENTE", "reprogramar: nueva hora, la duración se conserva (16:00–16:50)", JSON.stringify(r));
ok(r.j.historial.length === 2 && /Reprogramada/.test(r.j.historial[1].nota), "la reprogramación queda en el historial");
r = await req("PUT", `/citas/${c3.id}`, { token: recep, body: { horaInicio: "16:00" } }); ok(r.s === 200, "reprogramar al mismo horario no choca consigo misma");
r = await req("PUT", `/citas/${c3.id}`, { token: recep, body: { horaInicio: "14:30" } }); ok(r.s === 409, "reprogramar sobre otra cita 409");
r = await req("PUT", `/citas/${c3.id}`, { token: recep, body: { observaciones: "Traer informe de la escuela" } }); ok(r.s === 200 && r.j.observaciones === "Traer informe de la escuela" && r.j.horaInicio === "16:00", "editar solo las observaciones");
r = await req("PUT", `/citas/${c3.id}`, { token: recep, body: { fecha: sumaDias(hoyGT, -2) } }); ok(r.s === 422, "RN-11 también al reprogramar: no al pasado");
r = await req("PUT", `/citas/${c3.id}`, { token: recep, body: { fecha: dom } }); ok(r.s === 422, "RN-02 también al reprogramar: no un domingo");
r = await req("PUT", `/citas/${c3.id}`, { token: recep, body: { fecha: D4 } }); ok(r.s === 200 && r.j.fecha === D4 && r.j.horaInicio === "16:00", "reprogramar solo la fecha mantiene la hora");
r = await req("PUT", `/citas/${c3.id}`, { token: recep, body: { fecha: D, profesionalId: pMario.id } }); ok(r.s === 409, "cambiar de profesional a uno ocupado 409 (Mario ya atiende 16:30–17:20 y esta sería 16:00–16:50)");
r = await req("PUT", `/citas/${c3.id}`, { token: recep, body: { fecha: D, horaInicio: "15:00", profesionalId: pMario.id } }); ok(r.s === 200 && r.j.profesional.id === pMario.id, "cambiar de profesional a uno libre (15:00–15:50)", JSON.stringify(r));
r = await req("PUT", `/citas/${c3.id}`, { token: recep, body: {} }); ok(r.s === 400, "PUT vacío 400");
r = await req("PUT", `/citas/${c3.id}`, { token: prof, body: { horaInicio: "15:00" } }); ok(r.s === 403, "el profesional no puede reprogramar 403");
r = await req("PUT", `/citas/${c3.id}`, { token: recep, body: { pacienteId: mateo.id } }); ok(r.s === 400, "un PUT que solo trae campos no editables (paciente) se rechaza 400", JSON.stringify(r));
r = await req("PUT", `/citas/${c3.id}`, { token: recep, body: { pacienteId: mateo.id, observaciones: "Otra nota" } }); ok(r.s === 200 && r.j.paciente.id === valeria.id && r.j.observaciones === "Otra nota", "el paciente de una cita no se puede cambiar: se ignora y se aplica lo demás", JSON.stringify(r));
const completada = (await todas("&estado=COMPLETADA")).items[0];
r = await req("PUT", `/citas/${completada.id}`, { token: recep, body: { observaciones: "x" } }); ok(r.s === 422 && /completada/.test(r.j.message), "RN-06: una cita completada no puede modificarse ni reprogramarse 422");
const cancelada = (await todas("&estado=CANCELADA")).items[0];
r = await req("PUT", `/citas/${cancelada.id}`, { token: recep, body: { observaciones: "x" } }); ok(r.s === 422, "una cita cancelada no puede modificarse 422");

// ---- estados
r = await req("PATCH", `/citas/${c1.id}/estado`, { token: recep, body: { estado: "CONFIRMADA" } });
ok(r.s === 200 && r.j.estado === "CONFIRMADA" && r.j.historial.length === 2 && r.j.historial[1].estado === "CONFIRMADA", "confirmar cita (recepción)");
r = await req("PATCH", `/citas/${c1.id}/estado`, { token: recep, body: { estado: "CONFIRMADA" } }); ok(r.s === 422 && /ya está confirmada/.test(r.j.message), "confirmar dos veces 422");
r = await req("PATCH", `/citas/${c1.id}/estado`, { token: recep, body: { estado: "COMPLETADA" } }); ok(r.s === 403, "la recepción no puede marcar como completada 403");
r = await req("PATCH", `/citas/${c1.id}/estado`, { token: prof, body: { estado: "CANCELADA" } }); ok(r.s === 403, "el profesional no puede cancelar 403");
r = await req("PATCH", `/citas/${c1.id}/estado`, { token: prof, body: { estado: "CONFIRMADA" } }); ok(r.s === 403, "el profesional no puede confirmar 403");
r = await req("PATCH", `/citas/${cMario.id}/estado`, { token: prof, body: { estado: "COMPLETADA" } }); ok(r.s === 404, "el profesional no puede tocar citas de otro (404)");
r = await req("PATCH", `/citas/${alt.id}/estado`, { token: recep, body: { estado: "CONFIRMADA" } });
const pendienteAna = (await crearC({ fecha: D5, horaInicio: "14:00", pacienteId: camila.id })).j;
r = await req("PATCH", `/citas/${pendienteAna.id}/estado`, { token: prof, body: { estado: "COMPLETADA" } }); ok(r.s === 422 && /Confirma la cita antes/.test(r.j.message), "no se completa una cita pendiente: primero se confirma 422");
r = await req("PATCH", `/citas/${c1.id}/estado`, { token: prof, body: { estado: "COMPLETADA" } }); ok(r.s === 200 && r.j.estado === "COMPLETADA", "el profesional completa SU cita confirmada");
ok(!("precioCentavos" in r.j), "…y en la respuesta no ve el precio");
r = await req("PATCH", `/citas/${c1.id}/estado`, { token: recep, body: { estado: "CANCELADA" } }); ok(r.s === 422 && /completada/.test(r.j.message), "una cita completada no puede cancelarse 422");
r = await req("PATCH", `/citas/${c1.id}/estado`, { token: admin, body: { estado: "CONFIRMADA" } }); ok(r.s === 422, "una cita completada no cambia de estado 422");
r = await req("PATCH", `/citas/${c2.id}/estado`, { token: admin, body: { estado: "COMPLETADA" } }); ok(r.s === 422 && /cancelada no puede pasar a completada/.test(r.j.message), "RN-05: cancelada -> completada 422", JSON.stringify(r));
r = await req("PATCH", `/citas/${c2.id}/estado`, { token: recep, body: { estado: "CONFIRMADA" } }); ok(r.s === 422 && /no puede volver a activarse/.test(r.j.message), "una cancelada no vuelve a activarse 422");
r = await req("PATCH", `/citas/${c2.id}/estado`, { token: recep, body: { estado: "CANCELADA" } }); ok(r.s === 422, "cancelar dos veces 422");
r = await req("PATCH", `/citas/${pendienteAna.id}/estado`, { token: recep, body: { estado: "PENDIENTE" } }); ok(r.s === 403, "nadie puede volver una cita a pendiente (ningún rol lo tiene permitido) 403");
r = await req("PATCH", `/citas/${pendienteAna.id}/estado`, { token: recep, body: { estado: "NADA" } }); ok(r.s === 400, "estado inválido 400");
r = await req("PATCH", `/citas/${pendienteAna.id}/estado`, { token: admin, body: { estado: "CANCELADA", motivo: "x".repeat(301) } }); ok(r.s === 400, "motivo demasiado largo 400");
r = await req("PATCH", `/citas/${inexistente}/estado`, { token: recep, body: { estado: "CONFIRMADA" } }); ok(r.s === 404, "estado de cita inexistente 404");

// ---- disponibilidad
const disp = async (o = {}, token = recep) => req("GET", `/citas/disponibilidad?${new URLSearchParams({ profesionalId: pMario.id, servicioId: terapia.id, fecha: D, ...o })}`, { token });
r = await disp();
ok(r.s === 200 && r.j.duracionMin === 45 && r.j.horarios.length > 0, "disponibilidad: devuelve horarios libres", JSON.stringify(r.j).slice(0, 160));
const lib = r.j.horarios;
ok(lib.every((h) => h.horaInicio >= "08:00" && h.horaFin <= "18:00" && !(h.horaInicio < "14:00" && h.horaFin > "12:00")), "…todos dentro de las franjas de atención (sin cruzar el receso)");
const minutos = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3));
ok(lib.every((h) => minutos(h.horaFin) - minutos(h.horaInicio) === 45), "…cada uno dura lo que dura el servicio");
const delDia = (await todas(`&profesionalId=${pMario.id}&desde=${D}&hasta=${D}&estado=PENDIENTE,CONFIRMADA`)).items;
ok(delDia.length >= 2 && lib.every((h) => delDia.every((c) => !(h.horaInicio < c.horaFin && h.horaFin > c.horaInicio))), `…ninguno se traslapa con las ${delDia.length} citas que Mario ya tiene ese día`);
r = await crearC({ profesionalId: pSofia.id, pacienteId: mateo.id }); ok(r.s === 201, "preparación: Sofía tiene una cita de 14:00 a 14:50");
const dS = (await disp({ profesionalId: pSofia.id })).j.horarios;
ok(!dS.some((h) => h.horaInicio >= "14:00" && h.horaInicio < "14:50") && dS.some((h) => h.horaInicio === "14:50"), "…ocupado 14:00–14:50: se ofrece justo a las 14:50 (cita pegada) aunque no caiga en la cuadrícula de 15 min", JSON.stringify(dS.filter((h) => h.horaInicio >= "13:00" && h.horaInicio < "15:30")));
ok(dS.some((h) => h.horaInicio === "15:00") && dS.some((h) => h.horaInicio === "08:00"), "…y se siguen ofreciendo los demás horarios de la cuadrícula")
const elegido = lib[0];
r = await crearC({ fecha: D, horaInicio: elegido.horaInicio, servicioId: terapia.id, profesionalId: pMario.id, pacienteId: mateo.id });
ok(r.s === 201 && r.j.horaFin === elegido.horaFin, "un horario ofrecido por disponibilidad siempre se puede agendar (coherencia con las reglas)");
r = await disp({}); ok(!r.j.horarios.some((h) => h.horaInicio === elegido.horaInicio), "tras agendarlo, ya no se ofrece");
r = await disp({ excluirCitaId: r.s === 200 ? (await todas(`&profesionalId=${pMario.id}&desde=${D}&hasta=${D}`)).items.find((c) => c.horaInicio === elegido.horaInicio).id : "x" }); ok(r.j.horarios.some((h) => h.horaInicio === elegido.horaInicio), "al reprogramar, la propia cita no cuenta como ocupada (excluirCitaId)");
r = await disp({ fecha: dom }); ok(r.s === 200 && r.j.horarios.length === 0, "domingo: sin horarios");
r = await disp({ fecha: sumaDias(hoyGT, -3) }); ok(r.s === 200 && r.j.horarios.length === 0, "fecha pasada: sin horarios");
r = await disp({ servicioId: svcInactivo.id }); ok(r.s === 422, "disponibilidad con servicio inactivo 422");
r = await disp({ profesionalId: baja.id }); ok(r.s === 422, "disponibilidad con profesional inactivo 422");
r = await disp({ fecha: "mañana" }); ok(r.s === 400, "disponibilidad con fecha inválida 400");
r = await disp({}, prof); ok(r.s === 403, "el profesional no consulta disponibilidad 403");

// ---- integridad con otros módulos
r = await req("PATCH", `/pacientes/${valeria.id}/estado`, { token: recep, body: { estado: "INACTIVO" } }); ok(r.s === 422 && /cita/.test(r.j.message) && /pendiente/.test(r.j.message), "no se desactiva a un paciente con citas pendientes 422", JSON.stringify(r));
r = await req("PATCH", `/usuarios/${pAna.id}/estado`, { token: admin, body: { activo: false } }); ok(r.s === 422 && /cita/.test(r.j.message), "no se desactiva a un profesional con citas pendientes 422", JSON.stringify(r));
r = await req("PUT", `/usuarios/${pAna.id}`, { token: admin, body: { rol: "RECEPCIONISTA" } }); ok(r.s === 422, "un profesional con citas pendientes no puede cambiar de rol 422");
r = await req("PATCH", `/usuarios/${baja.id}/estado`, { token: admin, body: { activo: true } }); ok(r.s === 200, "un profesional sin citas sí puede reactivarse/desactivarse");
r = await req("DELETE", `/pacientes/${valeria.id}/responsables/${responsablePorNombreId("Carlos")}`, { token: recep }); ok(r.s === 422 && /único responsable/.test(r.j.message), "RN-04: no se quita al único responsable de un menor con citas pendientes 422", JSON.stringify(r));
r = await req("DELETE", `/responsables/${responsablePorNombreId("Carlos")}/pacientes/${valeria.id}`, { token: recep }); ok(r.s === 422, "…ni desde el responsable 422");
r = await req("DELETE", `/pacientes/${lucia.id}/responsables/${carlos.id}`, { token: recep }); ok(r.s === 422, "…tampoco a Lucía (su cita futura lo impide) 422", JSON.stringify(r));
r = await req("PATCH", `/citas/${cLucia.id}/estado`, { token: recep, body: { estado: "CANCELADA", motivo: "Prueba" } });
r = await req("DELETE", `/pacientes/${lucia.id}/responsables/${carlos.id}`, { token: recep }); ok(r.s === 200, "al cancelar sus citas, ya se puede quitar al responsable");
r = await req("PATCH", `/pacientes/${lucia.id}/estado`, { token: recep, body: { estado: "INACTIVO" } }); ok(r.s === 200, "un paciente con solo citas canceladas/completadas sí puede desactivarse");
await req("PATCH", `/pacientes/${lucia.id}/estado`, { token: recep, body: { estado: "ACTIVO" } });

// ---- el profesional consulta a SUS pacientes (información básica)
r = await req("GET", "/pacientes", { token: prof });
ok(r.s === 200 && r.j.total >= 4 && r.j.items.every((p) => !("telefono" in p) && !("direccion" in p) && !("responsables" in p) && !("observaciones" in p) && p.nombres && typeof p.edad === "number"), "el profesional ve a sus pacientes solo con información básica (sin teléfono, dirección ni responsables)", JSON.stringify(r.j).slice(0, 200));
ok(!r.j.items.some((p) => p.id === mateo.id), "…y no ve a los pacientes de otros profesionales");
r = await req("GET", `/pacientes/${valeria.id}`, { token: prof }); ok(r.s === 200 && r.j.nombres === "Valeria" && !("telefono" in r.j), "detalle básico de un paciente suyo");
r = await req("GET", `/pacientes/${mateo.id}`, { token: prof }); ok(r.s === 404, "el paciente de otro profesional: 404");
r = await req("PUT", `/pacientes/${valeria.id}`, { token: prof, body: { telefono: "5555-0000" } }); ok(r.s === 403, "el profesional no puede modificar pacientes 403");
r = await req("GET", `/citas?pacienteId=${valeria.id}`, { token: prof }); ok(r.j.items.length >= 3 && r.j.items.every((c) => c.profesional.id === pAna.id), "historial del paciente, solo con este profesional");

// --- subida de imágenes (modo local)
const subir = async (token, { buffer, nombre = "foto.png", tipo = "image/png", carpeta, campo = "archivo" } = {}) => {
  const fd = new FormData();
  if (buffer) fd.append(campo, new Blob([buffer], { type: tipo }), nombre);
  if (carpeta !== undefined) fd.append("carpeta", carpeta);
  const rr = await fetch(B + "/uploads", { method: "POST", headers: token ? { Authorization: "Bearer " + token } : {}, body: fd });
  let j = null; try { j = await rr.json(); } catch {}
  return { s: rr.status, j };
};
const png = (w, h, color = "#17525b") => sharp({ create: { width: w, height: h, channels: 3, background: color } }).png().toBuffer();
const pequena = await png(64, 64);

r = await subir(undefined, { buffer: pequena }); ok(r.s === 401, "subir imagen sin sesión 401");
r = await subir(prof, { buffer: pequena }); ok(r.s === 403, "subir imagen como profesional 403");
r = await subir(admin, {}); ok(r.s === 400, "subir sin archivo 400", JSON.stringify(r));
r = await subir(admin, { buffer: pequena, campo: "foto" }); ok(r.s === 400, "archivo en un campo distinto de «archivo» 400", JSON.stringify(r));
r = await subir(admin, { buffer: pequena, carpeta: "../../etc" }); ok(r.s === 400 && r.j.errors?.[0]?.campo === "carpeta", "carpeta inválida 400 con campo", JSON.stringify(r));

r = await subir(admin, { buffer: pequena }); ok(r.s === 201 && r.j.key.startsWith("general/") && r.j.key.endsWith(".webp"), "subir PNG válido 201: carpeta general por defecto y .webp", JSON.stringify(r));
const sub = r.j;
ok(new URL(sub.url).origin === new URL(B).origin, "la imagen apunta a la misma API del recorrido");
ok(sub.ancho === 64 && sub.alto === 64 && sub.bytes > 0 && /^https?:\/\//.test(sub.url), "respuesta con url, key, ancho, alto y bytes");
const img = await fetch(sub.url);
ok(img.status === 200 && img.headers.get("content-type") === "image/webp", "la imagen subida se sirve como image/webp");
ok(img.headers.get("cross-origin-resource-policy") === "cross-origin", "CORP cross-origin: el frontend (otro origen) puede mostrarla");
ok(/immutable/.test(img.headers.get("cache-control") ?? ""), "se sirve con caché larga e immutable");
r = await subir(recep, { buffer: pequena, carpeta: "pacientes" }); ok(r.s === 201 && r.j.key.startsWith("pacientes/"), "recepcionista puede subir (fotos de pacientes)");
r = await subir(admin, { buffer: pequena, nombre: "a.jpg", tipo: "image/jpeg" }); ok(r.s === 201, "el tipo/nombre declarado no importa: se decodifica la imagen real");

const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
r = await subir(admin, { buffer: svg, nombre: "x.svg", tipo: "image/svg+xml" }); ok(r.s === 422, "SVG rechazado (puede contener scripts) 422", JSON.stringify(r));
r = await subir(admin, { buffer: Buffer.from("esto es texto, no una imagen"), nombre: "falsa.png", tipo: "image/png" }); ok(r.s === 422, "texto disfrazado de .png rechazado 422");
r = await subir(admin, { buffer: Buffer.from("<?php echo 1; ?>"), nombre: "x.php.jpg", tipo: "image/jpeg" }); ok(r.s === 422, "script disfrazado de .jpg rechazado 422");
r = await subir(admin, { buffer: Buffer.alloc(6 * 1024 * 1024, 1), nombre: "grande.png" }); ok(r.s === 413 && /5 MB/.test(r.j.message), "más de 5 MB rechazado 413", JSON.stringify(r));
const bomba = await png(6500, 6500);
r = await subir(admin, { buffer: bomba }); ok(r.s === 422, `imagen con >40 millones de píxeles rechazada 422 (pesa solo ${Math.round(bomba.length / 1024)} KB)`, JSON.stringify(r));

// foto grande, con orientación EXIF y metadatos privados
const conExif = await sharp({ create: { width: 3200, height: 2000, channels: 3, background: "#456" } })
  .jpeg().withExif({ IFD0: { Copyright: "Privado", Software: "Camara X" } }).withMetadata({ orientation: 6 }).toBuffer();
r = await subir(admin, { buffer: conExif, nombre: "IMG_0001.jpg", tipo: "image/jpeg", carpeta: "pacientes" });
ok(r.s === 201 && r.j.ancho === 1000 && r.j.alto === 1600, "se gira según EXIF (6) y se reduce a máx. 1600 px: 1000x1600", JSON.stringify(r));
const guardada = Buffer.from(await (await fetch(r.j.url)).arrayBuffer());
const meta = await sharp(guardada).metadata();
ok(meta.format === "webp" && !meta.exif && !meta.orientation, "la imagen guardada no conserva metadatos EXIF");
const chica = await png(300, 200);
r = await subir(admin, { buffer: chica }); ok(r.s === 201 && r.j.ancho === 300 && r.j.alto === 200, "una imagen pequeña no se agranda");

for (const ruta of ["/uploads/%2e%2e/package.json", "/uploads/..%2f..%2f.env", "/uploads/general"]) {
  const x = await fetch(B.replace("/api", "") + ruta);
  ok(x.status !== 200, `no se puede salir de la carpeta de subidas (${ruta} -> ${x.status})`);
}

// --- contacto: persistencia publica y lectura privada
const mensajeContacto = { nombre: "Visitante de prueba", correo: "visitante@example.test", telefono: "5555-0901", asunto: "Prueba de contacto", mensaje: "Quisiera información sobre los servicios de atención del centro." };
r = await req("GET", "/contacto"); ok(r.s === 401, "contacto: listado privado 401");
r = await req("GET", "/contacto", { token: recep }); ok(r.s === 403, "contacto: recepcion sin acceso 403");
r = await req("GET", "/contacto", { token: prof }); ok(r.s === 403, "contacto: profesional sin acceso 403");
r = await req("GET", "/contacto", { token: admin }); const mensajesAntes = r.j.total;
ok(r.s === 200 && mensajesAntes === 3, "contacto: seed incluye tres mensajes ficticios");
r = await req("POST", "/contacto", { body: mensajeContacto }); ok(r.s === 201 && !r.j.id && !r.j.correo, "contacto: envio publico confirma sin exponer datos");
r = await req("GET", "/contacto?limit=1", { token: admin });
ok(r.s === 200 && r.j.total === mensajesAntes + 1 && r.j.items[0].asunto === mensajeContacto.asunto, "contacto: el administrador recibe el mensaje persistido mas reciente");
ok(r.j.items[0].fecha && r.j.items[0].id && !r.j.items[0]._id, "contacto: fecha del servidor e id de API");
r = await req("POST", "/contacto", { body: { ...mensajeContacto, correo: "incorrecto" } }); ok(r.s === 400 && r.j.errors.some(e => e.campo === "correo"), "contacto: correo invalido 400 con campo");
r = await req("POST", "/contacto", { body: { ...mensajeContacto, mensaje: "" } }); ok(r.s === 400, "contacto: mensaje vacio 400");
r = await req("GET", "/contacto", { token: admin }); ok(r.j.total === mensajesAntes + 1, "contacto: datos invalidos no se guardan");

// --- solicitudes: visitante -> recepcion -> cita consultable en agenda
r = await req("GET", "/solicitudes-cita"); ok(r.s === 401, "solicitudes: listado privado 401");
r = await req("GET", "/solicitudes-cita", { token: prof }); ok(r.s === 403, "solicitudes: profesional sin acceso 403");
r = await req("GET", "/solicitudes-cita", { token: recep }); ok(r.s === 200 && r.j.total === 5, "solicitudes: seed incluye cinco solicitudes");
const solicitudPrueba = { nombre: "Visitante de prueba", correo: "solicitud@example.test", telefono: "5555-0902", servicioId: evaluacion.id, fechaPreferida: laboral(60), mensaje: "Solicitud ficticia para prueba integral" };
r = await req("POST", "/solicitudes-cita", { body: solicitudPrueba }); ok(r.s === 201 && !r.j.id && !r.j.correo, "solicitudes: envio publico sin exponer datos");
r = await req("GET", "/solicitudes-cita?estado=PENDIENTE", { token: recep });
const solicitudNueva = r.j.items.find(s => s.correo === solicitudPrueba.correo);
ok(solicitudNueva?.estado === "PENDIENTE" && !solicitudNueva.cita, "solicitudes: persistida pendiente sin reservar cita");
r = await req("POST", "/pacientes", { token: recep, body: pac({ nombres: "Paciente", apellidos: "Solicitud" }) });
const datosConversion = { pacienteId: r.j.id, profesionalId: pAna.id, fecha: solicitudPrueba.fechaPreferida, horaInicio: "08:00" };
r = await req("POST", `/solicitudes-cita/${solicitudNueva.id}/convertir`, { token: recep, body: datosConversion });
ok(r.s === 201 && r.j.estado === "ATENDIDA" && r.j.cita?.id, "solicitudes: recepcion convierte y conserva referencia", JSON.stringify(r));
const citaSolicitud = r.j.cita.id;
r = await req("GET", `/citas/${citaSolicitud}`, { token: recep });
ok(r.s === 200 && r.j.estado === "PENDIENTE" && r.j.servicio.id === evaluacion.id, "solicitudes: cita generada accesible con servicio solicitado");
r = await req("GET", `/citas?desde=${datosConversion.fecha}&hasta=${datosConversion.fecha}`, { token: recep });
ok(r.s === 200 && r.j.items.some(c => c.id === citaSolicitud), "solicitudes: cita incluida en el rango de agenda");
r = await req("POST", `/solicitudes-cita/${solicitudNueva.id}/convertir`, { token: admin, body: datosConversion }); ok(r.s === 409, "solicitudes: conversion repetida bloqueada 409");
r = await req("GET", "/solicitudes-cita?estado=PENDIENTE", { token: recep }); const pendienteRechazo = r.j.items[0].id;
r = await req("PATCH", `/solicitudes-cita/${pendienteRechazo}/rechazar`, { token: recep, body: { motivo: "El solicitante desistio" } });
ok(r.s === 200 && r.j.estado === "RECHAZADA" && r.j.fechaGestion && !r.j.cita, "solicitudes: rechazo auditado sin crear cita");
r = await req("PATCH", `/solicitudes-cita/${pendienteRechazo}/rechazar`, { token: admin, body: {} }); ok(r.s === 409, "solicitudes: rechazo repetido bloqueado 409");

// --- materiales: catalogo privado, asignacion e historial
r = await req("GET", "/materiales"); ok(r.s === 401, "materiales: catalogo privado 401");
r = await req("GET", "/materiales", { token: recep }); ok(r.s === 403, "materiales: recepcion sin acceso 403");
r = await req("GET", "/materiales", { token: admin }); ok(r.s === 200 && r.j.total === 5, "materiales: cinco recursos ficticios en seed");
r = await req("GET", "/materiales", { token: prof }); ok(r.s === 200 && r.j.items.every(m => m.estado === "ACTIVO"), "materiales: profesional consulta solo activos");
const recursoDemo = { titulo: "Recurso de prueba", descripcion: "Descripcion ficticia para la verificacion integral", tipo: "Documento", enlace: "https://example.test/recurso" };
r = await req("POST", "/materiales", { token: prof, body: recursoDemo }); ok(r.s === 403, "materiales: profesional no administra catalogo");
r = await req("POST", "/materiales", { token: admin, body: { ...recursoDemo, enlace: "javascript:alert(1)" } }); ok(r.s === 400, "materiales: esquema de enlace inseguro rechazado");
r = await req("POST", "/materiales", { token: admin, body: recursoDemo }); const materialDemo = r.j;
ok(r.s === 201 && materialDemo.createdAt && materialDemo.estado === "ACTIVO", "materiales: alta con fecha del servidor");
r = await req("POST", `/materiales/pacientes/${datosConversion.pacienteId}`, { token: admin, body: { materialId: materialDemo.id } }); ok(r.s === 201 && r.j.asignadoPor.nombre, "materiales: asignacion auditada");
r = await req("POST", `/materiales/pacientes/${datosConversion.pacienteId}`, { token: admin, body: { materialId: materialDemo.id } }); ok(r.s === 409, "materiales: duplicado bloqueado");
r = await req("PATCH", `/materiales/${materialDemo.id}/estado`, { token: admin, body: { estado: "INACTIVO" } }); ok(r.s === 200, "materiales: desactivar sin borrar");
r = await req("GET", `/materiales/pacientes/${datosConversion.pacienteId}`, { token: admin }); ok(r.s === 200 && r.j.items[0].material.estado === "INACTIVO", "materiales: historial conserva recurso inactivo");

// --- apertura de caja y propiedad
r = await req("GET", "/cajas/actual"); ok(r.s === 401, "cajas: requiere sesion");
r = await req("GET", "/cajas", { token: prof }); ok(r.s === 403, "cajas: profesional sin acceso");
r = await req("GET", "/cajas", { token: admin }); ok(r.s === 200 && r.j.total === 3, "cajas: seed deja tres cajas, abiertas y cerradas");
const cajaAjena = r.j.items[0];
r = await req("GET", `/cajas/${cajaAjena.id}`, { token: recep }); ok(r.s === 404, "cajas: recepcion no consulta caja ajena");
r = await req("GET", "/cajas/actual", { token: recep }); ok(r.s === 200 && r.j === null, "cajas: recepcion1 aun sin caja");
r = await req("POST", "/cajas/abrir", { token: recep, body: { montoInicialCentavos: -1 } }); ok(r.s === 400, "cajas: monto negativo rechazado");
r = await req("POST", "/cajas/abrir", { token: recep, body: { montoInicialCentavos: 1999 } }); ok(r.s === 201 && r.j.montoInicialCentavos === 1999 && r.j.estado === "ABIERTA", "cajas: apertura con centavos exactos");
r = await req("POST", "/cajas/abrir", { token: recep, body: { montoInicialCentavos: 0 } }); ok(r.s === 409, "cajas: segunda apertura rechazada");
r = await req("GET", "/cajas", { token: recep }); ok(r.s === 200 && r.j.total === 2 && r.j.items.every(c => c.id !== cajaAjena.id), "cajas: recepcion lista solo propias, incluida historica");
const cajaPropia = r.j.items.find(c => c.estado === "ABIERTA");
r = await req("GET", "/cajas", { token: admin }); ok(r.s === 200 && r.j.total === 4, "cajas: administrador lista todas");
r = await req("GET", "/cajas/actual", { token: admin }); ok(r.s === 200 && r.j === null, "cajas: caja actual del admin es solo la propia");

// --- pagos: saldo derivado, comprobante y caja propia
r = await req("GET", "/pagos", { token: prof }); ok(r.s === 403, "pagos: profesional sin acceso financiero");
r = await req("GET", "/pagos", { token: admin }); ok(r.s === 200 && r.j.total === 10, "pagos: diez abonos ficticios en seed");
r = await req("GET", `/pagos/citas/${citaSolicitud}/resumen`, { token: recep });
const costoPago = r.j.costoCentavos, primerPago = Math.floor(costoPago / 2);
ok(r.s === 200 && r.j.estadoFinanciero === "PENDIENTE" && r.j.saldoCentavos === costoPago, "pagos: cita nueva sin pagos");
r = await req("POST", "/pagos", { token: recep, body: { citaId: citaSolicitud, montoCentavos: primerPago, metodo: "EFECTIVO" } });
ok(r.s === 201 && r.j.comprobante && r.j.caja && r.j.montoCentavos === primerPago, "pagos: abono con comprobante y caja");
r = await req("GET", `/pagos/citas/${citaSolicitud}/resumen`, { token: recep }); ok(r.j.estadoFinanciero === "PARCIAL" && r.j.saldoCentavos === costoPago - primerPago, "pagos: saldo parcial calculado");
r = await req("PATCH", `/citas/${citaSolicitud}/estado`, { token: recep, body: { estado: "CANCELADA" } }); ok(r.s === 422, "pagos: RN-27 no cancela cita con pagos validos");
r = await req("POST", "/pagos", { token: recep, body: { citaId: citaSolicitud, montoCentavos: costoPago - primerPago, metodo: "TRANSFERENCIA" } }); ok(r.s === 201, "pagos: segundo abono completa costo");
r = await req("GET", `/pagos/citas/${citaSolicitud}/resumen`, { token: recep }); ok(r.j.estadoFinanciero === "PAGADO" && r.j.saldoCentavos === 0, "pagos: saldo cero y estado pagado");
r = await req("POST", "/pagos", { token: recep, body: { citaId: citaSolicitud, montoCentavos: 1, metodo: "EFECTIVO" } }); ok(r.s === 422, "pagos: sobrepago rechazado");
r = await req("GET", `/pagos?pacienteId=${datosConversion.pacienteId}`, { token: recep }); ok(r.s === 200 && r.j.total === 2, "pagos: consulta por paciente");
const pagosAnular = r.j.items;
r = await req("GET", `/pagos/${pagosAnular[0].id}`, { token: recep }); ok(r.s === 200 && r.j.puedeAnular && r.j.cajaEstado === "ABIERTA", "anulacion: detalle fresco de caja abierta propia");
r = await req("PATCH", `/pagos/${pagosAnular[0].id}/anular`, { token: prof, body: { motivo: "Error de registro" } }); ok(r.s === 403, "anulacion: profesional sin permiso");
r = await req("PATCH", `/pagos/${pagosAnular[0].id}/anular`, { token: recep, body: { motivo: " " } }); ok(r.s === 400, "anulacion: exige motivo");
r = await req("PATCH", `/pagos/${pagosAnular[0].id}/anular`, { token: recep, body: { motivo: "Error de registro de prueba" } }); ok(r.s === 200 && r.j.estado === "ANULADO" && r.j.fechaAnulacion && r.j.anuladoPor.nombre, "anulacion: persiste auditoria sin borrar pago");
r = await req("GET", `/pagos/citas/${citaSolicitud}/resumen`, { token: recep }); ok(r.j.estadoFinanciero === "PARCIAL" && r.j.saldoCentavos > 0, "anulacion: recalcula saldo con pagos restantes");
r = await req("PATCH", `/citas/${citaSolicitud}/estado`, { token: recep, body: { estado: "CANCELADA" } }); ok(r.s === 422, "anulacion: pagos restantes aun bloquean cancelacion");
r = await req("PATCH", `/pagos/${pagosAnular[0].id}/anular`, { token: recep, body: { motivo: "Segundo intento" } }); ok(r.s === 409, "anulacion: repeticion rechazada");
r = await req("PATCH", `/pagos/${pagosAnular[1].id}/anular`, { token: recep, body: { motivo: "Error de registro de prueba" } }); ok(r.s === 200, "anulacion: segundo pago anulado");
r = await req("GET", `/pagos/citas/${citaSolicitud}/resumen`, { token: recep }); ok(r.j.estadoFinanciero === "PENDIENTE" && r.j.totalPagadoCentavos === 0, "anulacion: todos anulados no suman al saldo");
r = await req("PATCH", `/citas/${citaSolicitud}/estado`, { token: recep, body: { estado: "CANCELADA" } }); ok(r.s === 200, "anulacion: cancelacion permitida tras anular todos");
r = await req("GET", `/cajas/${cajaPropia.id}`, { token: recep }); ok(r.s === 200 && r.j.resumen.totalIngresosCentavos === 0 && r.j.resumen.efectivoEsperadoCentavos === 1999, "cierre: anulados no cuentan en ingresos");
r = await req("GET", `/cajas/${cajaPropia.id}/movimientos`, { token: recep }); ok(r.s === 200 && r.j.total === 2 && r.j.items.every(p => p.estado === "ANULADO"), "cierre: conserva movimientos anulados");
r = await req("POST", `/cajas/${cajaPropia.id}/cerrar`, { token: recep, body: { efectivoContadoCentavos: 1998 } }); ok(r.s === 200 && r.j.estado === "CERRADA" && r.j.diferenciaCentavos === -1 && r.j.cerradoPor.nombre, "cierre: guarda diferencia y auditoria exactas");
r = await req("POST", `/cajas/${cajaPropia.id}/cerrar`, { token: recep, body: { efectivoContadoCentavos: 1998 } }); ok(r.s === 409, "cierre: repeticion rechazada");
r = await req("GET", "/cajas/actual", { token: recep }); ok(r.s === 200 && r.j === null, "cierre: libera caja actual");
r = await req("POST", "/cajas/abrir", { token: recep, body: { montoInicialCentavos: 0 } }); ok(r.s === 201, "cierre: permite nueva caja sin reabrir la anterior");
r = await req("GET", `/cajas/${cajaPropia.id}`, { token: recep }); ok(r.s === 200 && r.j.resumen.totalIngresosCentavos === 0 && r.j.diferenciaCentavos === -1, "cierre: historial y snapshot permanecen");

// --- rate limit login
let got429 = false;
for (let i = 0; i < 12; i++) { const x = await login("admin@sigca.test", "mal" + i + "xx"); if (x.s === 429) { got429 = true; break; } }
ok(got429, "rate limit del login activa 429 tras intentos fallidos");

console.log(`\n${pass} OK, ${fail} fallos`);
process.exit(fail ? 1 : 0);
