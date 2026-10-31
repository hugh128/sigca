import sharp from "sharp";
const B = "http://localhost:4000/api";
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

r = await req("GET", "/pacientes"); ok(r.s === 401, "pacientes sin token 401");
r = await req("GET", "/pacientes", { token: prof }); ok(r.s === 403, "pacientes como profesional 403");
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

// --- rate limit login
let got429 = false;
for (let i = 0; i < 12; i++) { const x = await login("admin@sigca.test", "mal" + i + "xx"); if (x.s === 429) { got429 = true; break; } }
ok(got429, "rate limit del login activa 429 tras intentos fallidos");

console.log(`\n${pass} OK, ${fail} fallos`);
process.exit(fail ? 1 : 0);
