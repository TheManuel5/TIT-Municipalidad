/**
 * escrituras.test.js - Pruebas de los endpoints de escritura (Endpoints 7-10 de Ivan)
 * y del registro de mantenciones (Endpoint 20).
 * Responsable de las pruebas: Alfredo
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { usarBaseTemporal, iniciarServidor, hoyLocal, sumarDias } = require('./helpers');

usarBaseTemporal();
const db = require('../../db/database');
const { seedDatabase } = require('../../db/seed');
const app = require('../server');

let api, admin, jefe, auditor;

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
const eventos = (id) => db.prepare('SELECT tipo_evento FROM historial WHERE id_activo = ? ORDER BY id').all(id).map((e) => e.tipo_evento);

const NUEVO = {
  id_activo: 'SP-HW-0200',
  categoria: 'PC',
  marca_modelo: 'HP ProDesk 400 G9',
  ubicacion: 'Oficina DAF - Puesto 3',
  unidad: 'DAF',
  custodio: 'Carolina Muñoz Vera',
  estado_operativo: 'Bueno',
  criticidad: 'Media',
  fecha_adquisicion: '2026-11-01',
  fecha_garantia: '2029-11-01',
  proveedor: 'Tech Patagonia Ltda.',
  contrato_oc: 'OC 9999-11-SE26',
  costo_inicial: 750000,
  costo_anual: 18000,
  recepcion_verificada: true
};

describe('Permisos de escritura', () => {
  for (const [rol, tokenFn] of [['jefatura', () => jefe], ['lectura', () => auditor]]) {
    test(`${rol} no puede crear, editar, trasladar, dar de baja ni registrar mantenciones`, async () => {
      const t = tokenFn();
      assert.equal((await post('/activos', t, NUEVO)).status, 403);
      assert.equal((await put('/activos/SP-HW-0042', t, { estado_operativo: 'Regular' })).status, 403);
      assert.equal((await post('/activos/SP-HW-0042/traslado', t, { nueva_unidad: 'DAF', nueva_ubicacion: 'x', nuevo_custodio: 'y', motivo: 'z' })).status, 403);
      assert.equal((await post('/activos/SP-HW-0042/baja', t, { motivo: 'x' })).status, 403);
      assert.equal((await post('/activos/SP-HW-0042/mantenimiento', t, { tipo_mantenimiento: 'Preventiva', descripcion: 'x' })).status, 403);
    });
  }
});

describe('Alta (Endpoint 7)', () => {
  test('crea el activo y registra ALTA en la bitácora', async () => {
    const r = await post('/activos', admin, NUEVO);
    assert.equal(r.status, 201);
    assert.ok(db.prepare("SELECT 1 FROM activos WHERE id_activo = 'SP-HW-0200'").get());
    assert.deepEqual(eventos('SP-HW-0200'), ['ALTA']);
  });

  test('acepta ultimo_mantenimiento vacío como campo opcional', async () => {
    const r = await post('/activos', admin, {
      ...NUEVO,
      id_activo: 'SP-HW-0203',
      ultimo_mantenimiento: ''
    });
    assert.equal(r.status, 201);
    assert.equal(
      db.prepare("SELECT ultimo_mantenimiento FROM activos WHERE id_activo = 'SP-HW-0203'").get().ultimo_mantenimiento,
      null
    );
  });

  test('id duplicado -> 409', async () => {
    assert.equal((await post('/activos', admin, NUEVO)).status, 409);
  });

  test('exige confirmar la recepción y la orden de compra', async () => {
    const recepcion = await post('/activos', admin, { ...NUEVO, id_activo: 'SP-HW-0201', recepcion_verificada: false });
    assert.equal(recepcion.status, 400);
    assert.ok(recepcion.body.error.details.some((detalle) => detalle.campo === 'recepcion_verificada'));

    const contrato = await post('/activos', admin, { ...NUEVO, id_activo: 'SP-HW-0202', contrato_oc: '' });
    assert.equal(contrato.status, 400);
    assert.ok(contrato.body.error.details.some((detalle) => detalle.campo === 'contrato_oc'));
  });

  test('exige proveedor y fechas en la respuesta marcada por campo', async () => {
    for (const campo of ['proveedor', 'fecha_adquisicion', 'fecha_garantia']) {
      const payload = { ...NUEVO, id_activo: `SP-HW-02${campo.length}` };
      delete payload[campo];
      const r = await post('/activos', admin, payload);
      assert.equal(r.status, 400);
      assert.ok(r.body.error.details.some((detalle) => detalle.campo === campo));
    }

    const proveedorNulo = await post('/activos', admin, {
      ...NUEVO,
      id_activo: 'SP-HW-0215',
      proveedor: null
    });
    assert.equal(proveedorNulo.status, 400);
    assert.ok(proveedorNulo.body.error.details.some((detalle) => detalle.campo === 'proveedor'));
  });

  test('exige costos inicial y anual mayores que cero', async () => {
    let id = 210;
    for (const campo of ['costo_inicial', 'costo_anual']) {
      for (const valor of [0, -1]) {
        const r = await post('/activos', admin, {
          ...NUEVO,
          id_activo: `SP-HW-${id++}`,
          [campo]: valor
        });
        assert.equal(r.status, 400, `${campo}=${valor}`);
      }
    }

    const sinCostoAnual = { ...NUEVO, id_activo: 'SP-HW-0214' };
    delete sinCostoAnual.costo_anual;
    assert.equal((await post('/activos', admin, sinCostoAnual)).status, 400);
  });
});

describe('Edición (Endpoint 8)', () => {
  test('actualiza y registra EDICION', async () => {
    const r = await put('/activos/SP-HW-0200', admin, { estado_operativo: 'Regular' });
    assert.equal(r.status, 200);
    assert.equal(db.prepare("SELECT estado_operativo FROM activos WHERE id_activo = 'SP-HW-0200'").get().estado_operativo, 'Regular');
    assert.ok(eventos('SP-HW-0200').includes('EDICION'));
  });

  test('activo inexistente -> 404', async () => {
    assert.equal((await put('/activos/SP-XX-0000', admin, { estado_operativo: 'Regular' })).status, 404);
  });

  test('rechaza costos inicial o anual en cero o negativos', async () => {
    for (const campo of ['costo_inicial', 'costo_anual']) {
      for (const valor of [0, -1]) {
        const r = await put('/activos/SP-HW-0200', admin, { [campo]: valor });
        assert.equal(r.status, 400, `${campo}=${valor}`);
      }
    }
  });
});

describe('Mantención (Endpoint 20, RF-2)', () => {
  test('registra la mantención, actualiza el activo y la bitácora', async () => {
    const r = await post('/activos/SP-HW-0200/mantenimiento', admin, {
      tipo_mantenimiento: 'Correctiva',
      descripcion: 'Cambio de fuente de poder',
      estado_resultante: 'Bueno',
      responsable: 'Soporte TI interno',
      costo: 45000
    });
    assert.equal(r.status, 201);
    const a = db.prepare("SELECT * FROM activos WHERE id_activo = 'SP-HW-0200'").get();
    assert.equal(a.tipo_mantenimiento, 'Correctiva');
    assert.equal(a.ultimo_mantenimiento, hoyLocal());
    assert.equal(a.estado_operativo, 'Bueno');
    const ev = db.prepare("SELECT * FROM historial WHERE id_activo = 'SP-HW-0200' AND tipo_evento = 'MANTENIMIENTO'").get();
    assert.match(ev.motivo, /Cambio de fuente de poder/);
    assert.match(ev.detalles, /Regular -> Bueno/);
  });

  test('una mantención con fecha anterior no retrocede la última mantención', async () => {
    const r = await post('/activos/SP-HW-0200/mantenimiento', admin, {
      tipo_mantenimiento: 'Preventiva', descripcion: 'Registro atrasado', fecha: sumarDias(hoyLocal(), -30)
    });
    assert.equal(r.status, 201);
    const a = db.prepare("SELECT * FROM activos WHERE id_activo = 'SP-HW-0200'").get();
    assert.equal(a.ultimo_mantenimiento, hoyLocal());
    assert.equal(a.tipo_mantenimiento, 'Correctiva');
  });

  test('validaciones: tipo, descripción, fecha futura, estado y costo', async () => {
    const base = { tipo_mantenimiento: 'Preventiva', descripcion: 'x' };
    for (const malo of [
      { tipo_mantenimiento: 'Sin mantención' },
      { descripcion: '  ' },
      { fecha: sumarDias(hoyLocal(), 1) },
      { fecha: '24/11/2026' },
      { estado_resultante: 'De baja' },
      { costo: 0 },
      { costo: -10 }
    ]) {
      const r = await post('/activos/SP-HW-0200/mantenimiento', admin, { ...base, ...malo });
      assert.equal(r.status, 400, JSON.stringify(malo));
    }
  });

  test('activo inexistente -> 404', async () => {
    assert.equal((await post('/activos/SP-XX-0000/mantenimiento', admin, { tipo_mantenimiento: 'Preventiva', descripcion: 'x' })).status, 404);
  });
});

describe('Traslado (Endpoint 9)', () => {
  test('cambia unidad, ubicación y custodio, y registra TRASLADO', async () => {
    const r = await post('/activos/SP-HW-0200/traslado', admin, {
      nueva_unidad: 'DOM', nueva_ubicacion: 'Oficina DOM', nuevo_custodio: 'Rodrigo Alarcón', motivo: 'Reasignación'
    });
    assert.equal(r.status, 200);
    const a = db.prepare("SELECT unidad, custodio FROM activos WHERE id_activo = 'SP-HW-0200'").get();
    assert.deepEqual(a, { unidad: 'DOM', custodio: 'Rodrigo Alarcón' });
    assert.ok(eventos('SP-HW-0200').includes('TRASLADO'));
  });

  test('motivo obligatorio', async () => {
    const r = await post('/activos/SP-HW-0200/traslado', admin, {
      nueva_unidad: 'DAF', nueva_ubicacion: 'x', nuevo_custodio: 'y'
    });
    assert.equal(r.status, 400);
  });
});

describe('Baja (Endpoint 10)', () => {
  test('motivo obligatorio (Ley 18.695)', async () => {
    assert.equal((await post('/activos/SP-HW-0200/baja', admin, {})).status, 400);
  });

  test('da de baja y registra BAJA', async () => {
    const r = await post('/activos/SP-HW-0200/baja', admin, { motivo: 'Daño irreparable' });
    assert.equal(r.status, 200);
    assert.equal(db.prepare("SELECT estado_operativo FROM activos WHERE id_activo = 'SP-HW-0200'").get().estado_operativo, 'De baja');
    assert.equal(eventos('SP-HW-0200').filter((e) => e === 'BAJA').length, 1);
  });

  test('un activo de baja no se puede dar de baja de nuevo, trasladar ni mantener (409)', async () => {
    assert.equal((await post('/activos/SP-HW-0200/baja', admin, { motivo: 'otra vez' })).status, 409);
    assert.equal((await post('/activos/SP-HW-0200/traslado', admin, {
      nueva_unidad: 'DAF', nueva_ubicacion: 'x', nuevo_custodio: 'y', motivo: 'z'
    })).status, 409);
    assert.equal((await post('/activos/SP-HW-0200/mantenimiento', admin, {
      tipo_mantenimiento: 'Preventiva', descripcion: 'x'
    })).status, 409);
    assert.equal(eventos('SP-HW-0200').filter((e) => e === 'BAJA').length, 1);
  });
});
