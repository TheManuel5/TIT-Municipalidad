/**
 * seguridad.test.js - Pruebas de seguridad: contraseñas, sesión, cabeceras, usuarios,
 * auditoría y exportación.
 * Responsable: Alfredo
 * Ejecutar: cd backend && npm test
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('child_process');
const path = require('path');
const jwt = require('jsonwebtoken');
const { usarBaseTemporal, iniciarServidor, activoDePrueba, insertarActivo } = require('./helpers');

usarBaseTemporal();
const db = require('../../db/database');
const { seedDatabase } = require('../../db/seed');
const app = require('../server');

let api;
let admin, jefe, auditor;

before(async () => {
  const log = console.log;
  console.log = () => {};
  seedDatabase();
  api = await iniciarServidor(app);
  admin = await api.login('admin');
  jefe = await api.login('jefe_dideco');
  auditor = await api.login('auditor');
  after(() => { console.log = log; });
});

after(() => api && api.cerrar());

const post = (ruta, token, body) => api.request('POST', ruta, { token, body });
const put = (ruta, token, body) => api.request('PUT', ruta, { token, body });
const ultimaAuditoria = (accion) =>
  db.prepare('SELECT * FROM auditoria WHERE accion = ? ORDER BY id DESC LIMIT 1').get(accion);

describe('Contraseñas con bcryptjs', () => {
  test('ninguna contraseña está guardada en texto plano', () => {
    const usuarios = db.prepare('SELECT username, password FROM usuarios').all();
    for (const u of usuarios) {
      assert.match(u.password, /^\$2[aby]\$10\$/, u.username);
      assert.notEqual(u.password, 'password123');
    }
  });

  test('una base antigua con contraseñas en texto plano se migra a hash al abrirla', () => {
    db.prepare("UPDATE usuarios SET password = 'TextoPlano123' WHERE username = 'auditor'").run();
    execFileSync(process.execPath, ['-e', `require(${JSON.stringify(path.join(__dirname, '../../db/database'))})`], {
      env: { ...process.env },
      stdio: 'ignore'
    });
    const { password } = db.prepare("SELECT password FROM usuarios WHERE username = 'auditor'").get();
    assert.match(password, /^\$2[aby]\$/);
    // restaurar la contraseña de prueba para el resto de las pruebas
    db.prepare("UPDATE usuarios SET password = ? WHERE username = 'auditor'")
      .run(db.bcrypt.hashSync('password123', 10));
  });

  test('las contraseñas alternativas que estaban escritas en el código ya no funcionan', async () => {
    for (const [username, password] of [['admin', 'admin123'], ['jefe_dideco', 'dideco123'], ['auditor', 'control123']]) {
      const r = await api.request('POST', '/auth/login', { body: { username, password } });
      assert.equal(r.status, 401, `${username}/${password}`);
    }
  });

  test('usuario inexistente y contraseña incorrecta dan el mismo mensaje (no revela usuarios)', async () => {
    const a = await api.request('POST', '/auth/login', { body: { username: 'no_existe', password: 'Algo12345' } });
    const b = await api.request('POST', '/auth/login', { body: { username: 'admin', password: 'Incorrecta123' } });
    assert.equal(a.status, 401);
    assert.equal(b.status, 401);
    assert.equal(a.body.error.message, b.body.error.message);
  });

  test('login exitoso registra ultimo_acceso', () => {
    const { ultimo_acceso } = db.prepare("SELECT ultimo_acceso FROM usuarios WHERE username = 'admin'").get();
    assert.ok(ultimo_acceso);
  });
});

describe('Sesión JWT', () => {
  test('un token firmado con la antigua clave fija publicada en el repo es rechazado', async () => {
    const falso = jwt.sign(
      { id: 1, username: 'admin', rol: 'admin_ti', unidad: 'Informática', nombre: 'x' },
      'san_pablo_secret_jwt_key_2027_2031',
      { expiresIn: '1h' }
    );
    const r = await api.get('/activos', falso);
    assert.equal(r.status, 401);
  });

  test('un token con algoritmo "none" es rechazado', async () => {
    const sinFirma = jwt.sign({ id: 1, username: 'admin', rol: 'admin_ti' }, '', { algorithm: 'none' });
    const r = await api.get('/activos', sinFirma);
    assert.equal(r.status, 401);
  });
});

describe('Cabeceras de seguridad (helmet) y CORS', () => {
  test('cabeceras en una respuesta real de la API', async () => {
    const r = await fetch(apiUrl('/catalogos'), { headers: { Authorization: `Bearer ${admin}` } });
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(r.headers.get('x-frame-options'));
    assert.equal(r.headers.get('x-powered-by'), null);
  });

  test('CORS permite el frontend local y no un origen desconocido', async () => {
    const ok = await fetch(apiUrl('/catalogos'), { headers: { Origin: 'http://localhost:5173', Authorization: `Bearer ${admin}` } });
    assert.equal(ok.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    const malo = await fetch(apiUrl('/catalogos'), { headers: { Origin: 'https://sitio-malicioso.example', Authorization: `Bearer ${admin}` } });
    assert.equal(malo.headers.get('access-control-allow-origin'), null);
  });
});

const apiUrl = (ruta) => api.base + ruta;

describe('Gestión de usuarios (RF-6)', () => {
  let idNuevo;
  let tokenNuevo;

  test('solo admin_ti puede gestionar usuarios', async () => {
    assert.equal((await api.get('/usuarios', jefe)).status, 403);
    assert.equal((await api.get('/usuarios', auditor)).status, 403);
    assert.equal((await api.get('/usuarios')).status, 401);
  });

  test('el listado nunca incluye contraseñas ni hashes', async () => {
    const r = await api.get('/usuarios', admin);
    assert.equal(r.status, 200);
    assert.ok(r.body.data.length >= 3);
    assert.ok(r.body.data.every((u) => !('password' in u)));
  });

  test('rechaza contraseñas débiles, usernames inválidos y unidades inexistentes', async () => {
    const base = { username: 'jefe_dom', nombre: 'Jefa DOM', rol: 'jefatura', unidad: 'DOM', password: 'ClaveSegura2026' };
    for (const malo of [
      { password: 'corta1' },
      { password: 'sololetrasaqui' },
      { username: 'Con Espacios' },
      { unidad: 'Unidad Fantasma' },
      { rol: 'superadmin' }
    ]) {
      const r = await post('/usuarios', admin, { ...base, ...malo });
      assert.equal(r.status, 400, JSON.stringify(malo));
    }
  });

  test('crea un usuario con contraseña hasheada y puede iniciar sesión', async () => {
    const r = await post('/usuarios', admin, {
      username: 'jefe_dom', nombre: 'Jefa DOM', rol: 'jefatura', unidad: 'DOM', password: 'ClaveSegura2026'
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.activo, true);
    idNuevo = r.body.data.id;
    const { password } = db.prepare('SELECT password FROM usuarios WHERE id = ?').get(idNuevo);
    assert.match(password, /^\$2[aby]\$/);
    tokenNuevo = await api.login('jefe_dom', 'ClaveSegura2026');
    const activos = await api.get('/activos?limit=100', tokenNuevo);
    assert.ok(activos.body.data.every((a) => a.unidad === 'DOM'));
  });

  test('username duplicado -> 409', async () => {
    const r = await post('/usuarios', admin, {
      username: 'jefe_dom', nombre: 'Otro', rol: 'lectura', unidad: 'DOM', password: 'ClaveSegura2026'
    });
    assert.equal(r.status, 409);
  });

  test('un cambio de unidad se aplica de inmediato a la sesión abierta', async () => {
    await put(`/usuarios/${idNuevo}`, admin, { unidad: 'DAF' });
    const r = await api.get('/activos?limit=100', tokenNuevo);
    assert.ok(r.body.data.length > 0);
    assert.ok(r.body.data.every((a) => a.unidad === 'DAF'));
  });

  test('revocar el acceso invalida de inmediato el token vigente y el login', async () => {
    const r = await put(`/usuarios/${idNuevo}`, admin, { activo: false });
    assert.equal(r.status, 200);
    assert.equal((await api.get('/activos', tokenNuevo)).status, 401);
    const login = await api.request('POST', '/auth/login', { body: { username: 'jefe_dom', password: 'ClaveSegura2026' } });
    assert.equal(login.status, 401);
    assert.equal(ultimaAuditoria('USUARIO_REVOCADO').detalle.includes('jefe_dom'), true);
  });

  test('reactivar devuelve el acceso', async () => {
    await put(`/usuarios/${idNuevo}`, admin, { activo: true });
    tokenNuevo = await api.login('jefe_dom', 'ClaveSegura2026');
    assert.equal((await api.get('/activos', tokenNuevo)).status, 200);
  });

  test('admin_ti no puede revocarse ni quitarse el rol a sí mismo', async () => {
    const yo = db.prepare("SELECT id FROM usuarios WHERE username = 'admin'").get().id;
    assert.equal((await put(`/usuarios/${yo}`, admin, { activo: false })).status, 409);
    assert.equal((await put(`/usuarios/${yo}`, admin, { rol: 'lectura' })).status, 409);
  });

  test('restablecer contraseña (admin) y cambiarla (el propio usuario)', async () => {
    assert.equal((await put(`/usuarios/${idNuevo}/password`, admin, { password_nueva: 'Temporal2026' })).status, 200);
    tokenNuevo = await api.login('jefe_dom', 'Temporal2026');

    const incorrecta = await put('/auth/password', tokenNuevo, { password_actual: 'NoEs1234', password_nueva: 'Definitiva2026' });
    assert.equal(incorrecta.status, 401);
    const debil = await put('/auth/password', tokenNuevo, { password_actual: 'Temporal2026', password_nueva: 'abc' });
    assert.equal(debil.status, 400);
    const ok = await put('/auth/password', tokenNuevo, { password_actual: 'Temporal2026', password_nueva: 'Definitiva2026' });
    assert.equal(ok.status, 200);
    await api.login('jefe_dom', 'Definitiva2026');
  });

  test('usuario inexistente -> 404', async () => {
    assert.equal((await put('/usuarios/99999', admin, { nombre: 'x' })).status, 404);
  });
});

describe('Registro de auditoría (RNF-6)', () => {
  test('registra inicios de sesión exitosos y fallidos', () => {
    assert.ok(ultimaAuditoria('LOGIN_OK'));
    const fallido = ultimaAuditoria('LOGIN_FALLIDO');
    assert.ok(fallido);
    assert.equal(fallido.resultado, 'RECHAZADO');
  });

  test('registra escrituras con su resultado HTTP', async () => {
    await post('/activos/SP-HW-0042/mantenimiento', jefe, { tipo_mantenimiento: 'Preventiva', descripcion: 'x' });
    const e = db.prepare("SELECT * FROM auditoria WHERE ruta = '/api/activos/SP-HW-0042/mantenimiento' ORDER BY id DESC LIMIT 1").get();
    assert.equal(e.usuario, 'jefe_dideco');
    assert.equal(e.estado_http, 403);
    assert.equal(e.resultado, 'RECHAZADO');
  });

  test('nunca guarda contraseñas en el registro', () => {
    const filas = db.prepare('SELECT detalle, ruta FROM auditoria').all();
    const texto = JSON.stringify(filas);
    for (const secreto of ['password123', 'ClaveSegura2026', 'Temporal2026', 'Definitiva2026']) {
      assert.ok(!texto.includes(secreto), secreto);
    }
  });

  test('es inmutable', () => {
    assert.throws(() => db.prepare("UPDATE auditoria SET accion = 'X' WHERE id = 1").run(), /inmutable/);
    assert.throws(() => db.prepare('DELETE FROM auditoria').run(), /inmutable/);
  });

  test('admin_ti y lectura (Control) pueden consultarlo; jefatura no', async () => {
    assert.equal((await api.get('/auditoria', admin)).status, 200);
    const r = await api.get('/auditoria?accion=LOGIN&limit=5', auditor);
    assert.equal(r.status, 200);
    assert.ok(r.body.data.every((e) => e.accion.startsWith('LOGIN')));
    assert.ok(r.body.data.every((e) => !('criticidad' in e)), 'no se mezclan campos de activos');
    assert.equal((await api.get('/auditoria', jefe)).status, 403);
  });

  test('valida el formato de fechas del filtro', async () => {
    assert.equal((await api.get('/auditoria?desde=24-11-2026', admin)).status, 400);
    assert.equal((await api.get('/auditoria?desde=2020-01-01&hasta=2099-12-31', admin)).status, 200);
  });
});

describe('Exportación CSV', () => {
  before(() => {
    insertarActivo(db, activoDePrueba({
      id_activo: 'SP-HW-9100', unidad: 'DIDECO', marca_modelo: '=HYPERLINK("http://malicioso.example","clic")',
      configuracion_red: 'IP 10.0.0.99 / VLAN 99'
    }));
  });

  test('jefatura y lectura reciben el CSV con campos reservados enmascarados', async () => {
    for (const token of [jefe, auditor]) {
      const r = await fetch(apiUrl('/exportar?formato=csv'), { headers: { Authorization: `Bearer ${token}` } });
      const csv = await r.text();
      assert.equal(r.status, 200);
      assert.ok(!csv.includes('10.0.0.99'), 'no debe exponer IP');
      assert.ok(!/"(Alta|Media|Baja)"/.test(csv), 'no debe exponer criticidad');
      assert.ok(csv.includes('[RESERVADO'));
    }
  });

  test('admin_ti recibe los valores reales', async () => {
    const r = await fetch(apiUrl('/exportar?formato=csv'), { headers: { Authorization: `Bearer ${admin}` } });
    assert.ok((await r.text()).includes('10.0.0.99'));
  });

  test('neutraliza fórmulas para que Excel no las ejecute', async () => {
    const r = await fetch(apiUrl('/exportar?formato=csv'), { headers: { Authorization: `Bearer ${admin}` } });
    const csv = await r.text();
    assert.ok(csv.includes(`"'=HYPERLINK(`));
    assert.ok(!csv.includes('"=HYPERLINK('));
  });

  test('cada exportación queda auditada', () => {
    assert.ok(ultimaAuditoria('EXPORTACION'));
  });

  test('POST /api a secas ya no ejecuta una importación', async () => {
    const r = await post('', admin, { filas: [] });
    assert.equal(r.status, 404);
  });
});

// Debe ir al final: bloquea los intentos de login desde esta IP durante la ventana
describe('Límite de intentos de inicio de sesión', () => {
  test('tras 10 intentos fallidos responde 429 y lo audita', async () => {
    let ultimo;
    for (let i = 0; i < 12; i++) {
      ultimo = await api.request('POST', '/auth/login', { body: { username: 'admin', password: `MalaClave${i}` } });
    }
    assert.equal(ultimo.status, 429);
    assert.equal(ultimo.body.error.code, 'TOO_MANY_REQUESTS');
    assert.ok(ultimaAuditoria('LOGIN_BLOQUEADO'));
  });
});
