/**
 * helpers.js - Utilidades compartidas para las pruebas automáticas
 * Responsable: Alfredo
 *
 * Cada archivo de pruebas corre en su propio proceso (node --test) y llama a
 * usarBaseTemporal() ANTES de requerir cualquier módulo que abra la base, de modo
 * que las pruebas nunca tocan db/inventario.db.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

function usarBaseTemporal() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tit-inventario-test-'));
  process.env.DB_PATH = path.join(dir, 'test.db');
  process.env.NODE_ENV = 'test';
  process.on('exit', () => {
    try {
      // Cerrar la conexión antes de borrar (en Windows no se puede borrar un archivo abierto)
      const db = require.cache[require.resolve('../../db/database')];
      if (db && db.exports && db.exports.open) db.exports.close();
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) { /* limpieza best-effort */ }
  });
  return dir;
}

/** Fecha local de Chile (YYYY-MM-DD), mismo criterio que consultas.js */
function hoyLocal() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' });
}

/** Suma días a una fecha YYYY-MM-DD sin problemas de zona horaria */
function sumarDias(fechaISO, dias) {
  const d = new Date(`${fechaISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Levanta la app Express en un puerto libre y entrega un cliente HTTP mínimo */
async function iniciarServidor(app) {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;

  async function request(metodo, ruta, { token, body } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(base + ruta, {
      method: metodo,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, body: json };
  }

  async function login(username, password = 'password123') {
    const r = await request('POST', '/auth/login', { body: { username, password } });
    if (r.status !== 200) throw new Error(`Login falló para ${username}: ${r.status}`);
    return r.body.data.token;
  }

  return {
    get: (ruta, token) => request('GET', ruta, { token }),
    request,
    login,
    cerrar: () => new Promise((resolve) => server.close(resolve))
  };
}

/** Activo mínimo válido para insertar directamente en la base durante las pruebas */
function activoDePrueba(overrides = {}) {
  return {
    id_activo: 'SP-HW-9000',
    categoria: 'PC',
    marca_modelo: 'Equipo de prueba',
    descripcion: null,
    ubicacion: 'Oficina de prueba',
    unidad: 'DAF',
    custodio: 'Funcionario de prueba',
    estado_operativo: 'Bueno',
    ultimo_mantenimiento: null,
    tipo_mantenimiento: null,
    criticidad: 'Baja',
    proceso_asociado: null,
    fecha_adquisicion: '2025-01-01',
    fecha_garantia: '2030-01-01',
    licencias_asociadas: null,
    proveedor: 'Proveedor de prueba',
    contrato_oc: 'OC TEST',
    costo_inicial: 0,
    costo_anual: 0,
    configuracion_red: null,
    fecha_revision: null,
    responsable_revision: null,
    motivo_baja: null,
    ...overrides
  };
}

function insertarActivo(db, activo) {
  const cols = Object.keys(activo);
  db.prepare(
    `INSERT INTO activos (${cols.join(', ')}) VALUES (${cols.map((c) => '@' + c).join(', ')})`
  ).run(activo);
}

module.exports = {
  usarBaseTemporal,
  hoyLocal,
  sumarDias,
  iniciarServidor,
  activoDePrueba,
  insertarActivo
};
