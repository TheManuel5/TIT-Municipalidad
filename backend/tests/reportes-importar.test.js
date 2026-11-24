const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { usarBaseTemporal, hoyLocal, sumarDias, iniciarServidor } = require('./helpers');

usarBaseTemporal();
const db = require('../../db/database');
const { seedDatabase } = require('../../db/seed');
const app = require('../server');

let api;
let admin;
let jefe;
let auditor;
let logOriginal;

before(async () => {
  logOriginal = console.log;
  console.log = () => {};
  seedDatabase();
  api = await iniciarServidor(app);
  admin = await api.login('admin');
  jefe = await api.login('jefe_dideco');
  auditor = await api.login('auditor');
});

after(async () => {
  if (api) await api.cerrar();
  console.log = logOriginal;
});

describe('Reportes de Gaby', () => {
  test('resumen calcula operativos como Bueno o Regular y reporta garantías futuras', async () => {
    const r = await api.get('/reportes/resumen', admin);
    const expectedOperativos = db.prepare(`
      SELECT COUNT(*) AS n FROM activos WHERE estado_operativo IN ('Bueno', 'Regular')
    `).get().n;
    assert.equal(r.status, 200);
    assert.equal(r.body.data.totales.operativos, expectedOperativos);
    assert.ok(r.body.data.totales.alertas_garantia >= 0);
  });

  test('resumen calcula validación por custodio y revisión, no por estado operativo', async () => {
    db.prepare(`
      INSERT INTO activos (
        id_activo, categoria, marca_modelo, ubicacion, unidad, custodio, estado_operativo,
        criticidad, fecha_adquisicion, fecha_garantia, proveedor, contrato_oc, costo_inicial,
        costo_anual, fecha_revision, responsable_revision
      ) VALUES (?, 'PC', 'Pendiente de revisión', 'DAF', 'DAF', 'Custodio', 'Bueno',
        'Baja', '2026-01-01', '2027-01-01', 'Proveedor', 'OC', 1, 0, NULL, NULL)
    `).run('SP-GAB-9003');

    const r = await api.get('/reportes/resumen', admin);
    const total = db.prepare('SELECT COUNT(*) AS n FROM activos').get().n;
    const validados = db.prepare(`
      SELECT COUNT(*) AS n FROM activos
      WHERE NULLIF(TRIM(custodio), '') IS NOT NULL
        AND NULLIF(TRIM(estado_operativo), '') IS NOT NULL
        AND NULLIF(TRIM(fecha_revision), '') IS NOT NULL
        AND NULLIF(TRIM(responsable_revision), '') IS NOT NULL
    `).get().n;
    assert.equal(r.status, 200);
    assert.equal(r.body.data.totales.activos_validados, validados);
    assert.equal(r.body.data.totales.porcentaje_activos_validados, Math.round((validados / total) * 100));
    assert.notEqual(r.body.data.totales.operativos, validados);
  });

  test('costos incluye cantidad por categoría y por unidad', async () => {
    const r = await api.get('/reportes/costos', jefe);
    assert.equal(r.status, 200);
    assert.ok(r.body.data.desglose_por_categoria.every((item) => Number.isInteger(item.cantidad)));
    assert.ok(r.body.data.desglose_por_unidad.every((item) => item.unidad === 'DIDECO'));
  });

  test('reporte de garantías excluye vencidas y respeta el alcance de jefatura', async () => {
    const hoy = hoyLocal();
    const vencida = sumarDias(hoy, -1);
    const proxima = sumarDias(hoy, 5);
    db.prepare(`
      INSERT INTO activos (
        id_activo, categoria, marca_modelo, ubicacion, unidad, custodio, estado_operativo,
        criticidad, fecha_adquisicion, fecha_garantia, proveedor, contrato_oc, costo_inicial, costo_anual
      ) VALUES (?, 'PC', 'Vencida', 'DAF', 'DAF', 'Custodio', 'Bueno', 'Baja', ?, ?, 'Proveedor', 'OC', 1, 0)
    `).run('SP-GAB-9001', vencida, vencida);
    db.prepare(`
      INSERT INTO activos (
        id_activo, categoria, marca_modelo, ubicacion, unidad, custodio, estado_operativo,
        criticidad, fecha_adquisicion, fecha_garantia, proveedor, contrato_oc, costo_inicial, costo_anual
      ) VALUES (?, 'PC', 'Próxima', 'DIDECO', 'DIDECO', 'Custodio', 'Bueno', 'Baja', ?, ?, 'Proveedor', 'OC', 1, 0)
    `).run('SP-GAB-9002', hoy, proxima);

    const adminReporte = await api.get('/reportes/garantias?dias=10', admin);
    const jefeReporte = await api.get('/reportes/garantias?dias=10', jefe);
    const adminIds = adminReporte.body.data.garantias_por_vencer.map((a) => a.id_activo);
    assert.ok(!adminIds.includes('SP-GAB-9001'));
    assert.ok(adminIds.includes('SP-GAB-9002'));
    assert.ok(jefeReporte.body.data.garantias_por_vencer.every((a) => a.unidad === 'DIDECO'));
  });

  test('exportación devuelve CSV y protege campos por rol; rechaza formatos inválidos', async () => {
    const csvResponse = await fetch(`${api.base}/exportar?formato=csv`, {
      headers: { Authorization: `Bearer ${admin}` }
    });
    assert.equal(csvResponse.status, 200);
    assert.match(await csvResponse.text(), /^id_activo,/);

    const json = await api.get('/exportar?formato=json', auditor);
    assert.equal(json.status, 200);
    assert.ok(json.body.data.every((activo) => String(activo.criticidad).startsWith('[RESERVADO')));

    const exportacionJefatura = await api.get('/exportar?formato=json', jefe);
    assert.equal(exportacionJefatura.status, 200);
    assert.ok(exportacionJefatura.body.data.every((activo) => activo.unidad === 'DIDECO'));

    const badFormat = await api.get('/exportar?formato=xml', admin);
    assert.equal(badFormat.status, 400);
  });
});

describe('Importación de activos', () => {
  const fila = (id) => ({
    id_activo: id,
    categoria: 'PC',
    marca_modelo: 'Equipo Gaby',
    ubicacion: 'Informática',
    unidad: 'Informática',
    custodio: 'Responsable',
    contrato_oc: 'OC TEST',
    estado_operativo: 'Bueno',
    fecha_adquisicion: '2026-01-01',
    fecha_garantia: '2028-01-01',
    costo_inicial: 123000
  });

  test('admin importa una vez, detecta duplicados del lote y registra IMPORTACION', async () => {
    const r = await api.request('POST', '/importar', {
      token: admin,
      body: {
        recepcion_verificada: true,
        filas: [fila('sp-gab-9010'), fila('SP-GAB-9010'), { ...fila('SP-GAB-9011'), categoria: 'Pantalla' }]
      }
    });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data.resumen, { total_procesadas: 3, validas: 1, con_error: 2 });
    assert.equal(
      db.prepare("SELECT tipo_evento FROM historial WHERE id_activo = 'SP-GAB-9010'").get().tipo_evento,
      'IMPORTACION'
    );
    assert.match(
      db.prepare("SELECT detalles FROM historial WHERE id_activo = 'SP-GAB-9010'").get().detalles,
      /Control de recepción física y documental confirmado/
    );
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM activos WHERE id_activo = 'SP-GAB-9010'").get().n, 1);
  });

  test('bloquea importación sin comprobación previa de recepción', async () => {
    const r = await api.request('POST', '/importar', {
      token: admin,
      body: { filas: [fila('SP-GAB-9012')] }
    });
    assert.equal(r.status, 400);
    assert.match(r.body.error.message, /verificación física y documental/);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM activos WHERE id_activo = 'SP-GAB-9012'").get().n, 0);
  });

  test('rechaza roles sin permiso y cuerpo vacío con el formato de error del contrato', async () => {
    const noAutorizado = await api.request('POST', '/importar', {
      token: auditor,
      body: { recepcion_verificada: true, filas: [fila('SP-GAB-9020')] }
    });
    assert.equal(noAutorizado.status, 403);
    const vacio = await api.request('POST', '/importar', { token: admin, body: { filas: [] } });
    assert.equal(vacio.status, 400);
    assert.equal(vacio.body.error.code, 'BAD_REQUEST');
  });
});

test('el alta manual exige y registra la verificación de recepción', async () => {
  const payload = {
    id_activo: 'SP-GAB-9030',
    categoria: 'PC',
    marca_modelo: 'Equipo recibido',
    ubicacion: 'Informática',
    unidad: 'Informática',
    custodio: 'Responsable',
    fecha_adquisicion: '2026-01-01',
    fecha_garantia: '2028-01-01',
    contrato_oc: 'OC-RECEPCION-TEST',
    costo_inicial: 100000,
    fecha_revision: '2000-01-01',
    responsable_revision: 'Usuario no autorizado',
    motivo_baja: 'Intento de asignación desde el cliente',
    rol: 'admin_ti'
  };
  const sinConfirmacion = await api.request('POST', '/activos', { token: admin, body: payload });
  assert.equal(sinConfirmacion.status, 400);

  const conConfirmacion = await api.request('POST', '/activos', {
    token: admin,
    body: { ...payload, recepcion_verificada: true }
  });
  assert.equal(conConfirmacion.status, 201);
  const activo = db.prepare(`
    SELECT fecha_revision, responsable_revision, motivo_baja
    FROM activos WHERE id_activo = ?
  `).get(payload.id_activo);
  assert.notEqual(activo.fecha_revision, payload.fecha_revision);
  assert.equal(activo.responsable_revision, 'Felipe Oyarzún Mansilla');
  assert.equal(activo.motivo_baja, null);
  const evento = db.prepare(`
    SELECT tipo_evento, detalles FROM historial WHERE id_activo = ? AND tipo_evento = 'ALTA'
  `).get(payload.id_activo);
  assert.match(evento.detalles, /Recepción física y documental verificada/);
  assert.match(evento.detalles, /OC-RECEPCION-TEST/);
});

test('edición CRUD persiste en SQLite y descarta campos protegidos del DTO', async () => {
  const id = 'SP-GAB-9031';
  const alta = await api.request('POST', '/activos', {
    token: admin,
    body: {
      id_activo: id,
      categoria: 'PC',
      marca_modelo: 'Equipo antes de editar',
      ubicacion: 'Informática',
      unidad: 'Informática',
      custodio: 'Responsable inicial',
      fecha_adquisicion: '2026-01-01',
      fecha_garantia: '2028-01-01',
      contrato_oc: 'OC-DTO-TEST',
      costo_inicial: 100000,
      recepcion_verificada: true
    }
  });
  assert.equal(alta.status, 201);

  const edicion = await api.request('PUT', `/activos/${id}`, {
    token: admin,
    body: {
      id_activo: 'SP-GAB-OTRO',
      marca_modelo: 'Equipo editado',
      custodio: 'Responsable actualizado',
      fecha_revision: '2000-01-01',
      responsable_revision: 'Usuario no autorizado',
      motivo_baja: 'No debe permitir darlo de baja por edición'
    }
  });
  assert.equal(edicion.status, 200);

  const actualizado = db.prepare('SELECT * FROM activos WHERE id_activo = ?').get(id);
  assert.equal(actualizado.marca_modelo, 'Equipo editado');
  assert.equal(actualizado.custodio, 'Responsable actualizado');
  assert.equal(actualizado.responsable_revision, 'Felipe Oyarzún Mansilla');
  assert.notEqual(actualizado.fecha_revision, '2000-01-01');
  assert.equal(actualizado.motivo_baja, null);
  assert.equal(db.prepare('SELECT id_activo FROM activos WHERE id_activo = ?').get('SP-GAB-OTRO'), undefined);
  assert.equal(
    db.prepare("SELECT COUNT(*) AS n FROM historial WHERE id_activo = ? AND tipo_evento = 'EDICION'").get(id).n,
    1
  );
});
