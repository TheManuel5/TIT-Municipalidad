const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { usarBaseTemporal, iniciarServidor } = require('./helpers');

usarBaseTemporal();
const db = require('../../db/database');
const { seedDatabase } = require('../../db/seed');
const app = require('../server');

let api;
let admin;
let jefatura;
let auditor;

before(async () => {
  const logOriginal = console.log;
  console.log = () => {};
  try {
    seedDatabase();
  } finally {
    console.log = logOriginal;
  }
  api = await iniciarServidor(app);
  admin = await api.login('admin');
  jefatura = await api.login('jefe_dideco');
  auditor = await api.login('auditor');
});

after(async () => {
  if (api) await api.cerrar();
});

async function iniciarConciliacion() {
  return api.request('POST', '/conciliaciones', { token: admin, body: {} });
}

function observacionCoincidente(activo) {
  return {
    encontrado: true,
    id_activo_observado: activo.id_activo,
    ubicacion_observado: activo.ubicacion,
    unidad_observado: activo.unidad,
    custodio_observado: activo.custodio,
    estado_operativo_observado: activo.estado_operativo
  };
}

describe('Conciliación física del inventario', () => {
  test('crea y persiste una muestra aleatoria del 10% de activos vigentes', async () => {
    const r = await iniciarConciliacion();
    const totalActivosVigentes = db.prepare(`
      SELECT COUNT(*) AS n FROM activos WHERE estado_operativo <> 'De baja'
    `).get().n;
    const tamanoEsperado = Math.max(1, Math.ceil(totalActivosVigentes * 0.1));

    assert.equal(r.status, 201);
    assert.equal(r.body.data.total_activos, totalActivosVigentes);
    assert.equal(r.body.data.tamano_muestra, tamanoEsperado);
    assert.equal(r.body.data.activos.length, tamanoEsperado);
    assert.ok(r.body.data.activos.every((item) => item.resultado === 'Pendiente'));
    assert.equal(new Set(r.body.data.activos.map((item) => item.id_activo)).size, tamanoEsperado);
    assert.equal(
      r.body.data.activos.some((item) => item.datos_registrados.estado_operativo === 'De baja'),
      false
    );
  });

  test('requiere admin para operar y permite lectura institucional de resultados', async () => {
    const sinToken = await api.request('POST', '/conciliaciones', { body: {} });
    const soloLectura = await api.request('POST', '/conciliaciones', { token: auditor, body: {} });
    const jefaturaLectura = await api.get('/conciliaciones', jefatura);
    const auditorLectura = await api.get('/conciliaciones', auditor);

    assert.equal(sinToken.status, 401);
    assert.equal(soloLectura.status, 403);
    assert.equal(jefaturaLectura.status, 403);
    assert.equal(auditorLectura.status, 200);
  });

  test('cierra como Cumple cuando no hay discrepancias y bloquea cambios posteriores', async () => {
    const creada = await iniciarConciliacion();
    const sesion = creada.body.data;

    for (const activo of sesion.activos) {
      const resultado = await api.request(
        'PUT',
        `/conciliaciones/${sesion.id}/activos/${encodeURIComponent(activo.id_activo)}`,
        { token: admin, body: observacionCoincidente(activo.datos_registrados) }
      );
      assert.equal(resultado.status, 200);
    }

    const cerrada = await api.get(`/conciliaciones/${sesion.id}`, admin);
    assert.equal(cerrada.body.data.resultado, 'Cumple');
    assert.equal(cerrada.body.data.porcentaje_discrepancias, 0);
    assert.equal(cerrada.body.data.inspeccionados, sesion.tamano_muestra);

    const cambioPosterior = await api.request(
      'PUT',
      `/conciliaciones/${sesion.id}/activos/${encodeURIComponent(sesion.activos[0].id_activo)}`,
      { token: admin, body: observacionCoincidente(sesion.activos[0].datos_registrados) }
    );
    assert.equal(cambioPosterior.status, 409);
  });

  test('cierra como No cumple si la tasa de discrepancias supera el 5%', async () => {
    const creada = await iniciarConciliacion();
    const sesion = creada.body.data;

    for (const [index, activo] of sesion.activos.entries()) {
      const observacion = observacionCoincidente(activo.datos_registrados);
      if (index === 0) {
        observacion.custodio_observado = 'Custodio distinto';
        observacion.detalle = 'El equipo se encontró asignado a otra persona.';
      }
      const resultado = await api.request(
        'PUT',
        `/conciliaciones/${sesion.id}/activos/${encodeURIComponent(activo.id_activo)}`,
        { token: admin, body: observacion }
      );
      assert.equal(resultado.status, 200);
    }

    const cerrada = await api.get(`/conciliaciones/${sesion.id}`, admin);
    assert.equal(cerrada.body.data.resultado, 'No cumple');
    assert.ok(cerrada.body.data.porcentaje_discrepancias > 5);
    assert.equal(cerrada.body.data.discrepancias, 1);
  });

  test('rechaza observaciones incompletas o discrepancias sin detalle', async () => {
    const creada = await iniciarConciliacion();
    const sesion = creada.body.data;
    const activo = sesion.activos[0];

    const incompleta = await api.request(
      'PUT',
      `/conciliaciones/${sesion.id}/activos/${encodeURIComponent(activo.id_activo)}`,
      { token: admin, body: { encontrado: true } }
    );
    assert.equal(incompleta.status, 400);

    const sinDetalle = observacionCoincidente(activo.datos_registrados);
    sinDetalle.custodio_observado = 'Custodio distinto';
    const discrepanciaSinDetalle = await api.request(
      'PUT',
      `/conciliaciones/${sesion.id}/activos/${encodeURIComponent(activo.id_activo)}`,
      { token: admin, body: sinDetalle }
    );
    assert.equal(discrepanciaSinDetalle.status, 400);

    const noEncontrado = await api.request(
      'PUT',
      `/conciliaciones/${sesion.id}/activos/${encodeURIComponent(activo.id_activo)}`,
      { token: admin, body: { encontrado: false, detalle: 'No encontrado en la ubicación informada.' } }
    );
    assert.equal(noEncontrado.status, 200);
    const inspeccion = noEncontrado.body.data.activos.find((item) => item.id_activo === activo.id_activo);
    assert.equal(inspeccion.resultado, 'Discrepancia');
  });

  test('permite corregir una inspección guardada mientras queden activos pendientes', async () => {
    const creada = await iniciarConciliacion();
    const sesion = creada.body.data;
    const activo = sesion.activos[0];
    const discrepancia = observacionCoincidente(activo.datos_registrados);
    discrepancia.custodio_observado = 'Custodio incorrecto';
    discrepancia.detalle = 'Se digitó un custodio equivocado.';

    const primeraRevision = await api.request(
      'PUT',
      `/conciliaciones/${sesion.id}/activos/${encodeURIComponent(activo.id_activo)}`,
      { token: admin, body: discrepancia }
    );
    assert.equal(primeraRevision.status, 200);
    assert.equal(primeraRevision.body.data.inspeccionados, 1);
    assert.equal(primeraRevision.body.data.discrepancias, 1);
    assert.equal(primeraRevision.body.data.resultado, 'En curso');

    const revisionCorregida = await api.request(
      'PUT',
      `/conciliaciones/${sesion.id}/activos/${encodeURIComponent(activo.id_activo)}`,
      { token: admin, body: observacionCoincidente(activo.datos_registrados) }
    );
    assert.equal(revisionCorregida.status, 200);
    const actualizado = revisionCorregida.body.data.activos.find((item) => item.id_activo === activo.id_activo);
    assert.equal(actualizado.resultado, 'Coincide');
    assert.equal(actualizado.detalle, null);
    assert.equal(revisionCorregida.body.data.inspeccionados, 1);
    assert.equal(revisionCorregida.body.data.discrepancias, 0);
    assert.equal(revisionCorregida.body.data.resultado, 'En curso');
  });

  test('acepta exactamente 5% de discrepancias', async () => {
    const vigentes = db.prepare(`
      SELECT COUNT(*) AS n FROM activos WHERE estado_operativo <> 'De baja'
    `).get().n;
    const faltantes = Math.max(0, 191 - vigentes);
    const insertarActivo = db.prepare(`
      INSERT INTO activos (
        id_activo, categoria, marca_modelo, ubicacion, unidad, custodio, estado_operativo,
        criticidad, fecha_adquisicion, fecha_garantia, proveedor, contrato_oc
      ) VALUES (?, 'PC', 'Activo de prueba', 'DAF', 'DAF', 'Custodio', 'Bueno',
        'Baja', '2026-01-01', '2028-01-01', 'Proveedor', 'OC TEST')
    `);
    db.transaction(() => {
      for (let index = 0; index < faltantes; index++) {
        insertarActivo.run(`SP-GAB-CONC-${String(index).padStart(3, '0')}`);
      }
    })();

    const creada = await iniciarConciliacion();
    const sesion = creada.body.data;
    assert.equal(sesion.tamano_muestra, 20);

    for (const [index, activo] of sesion.activos.entries()) {
      const observacion = observacionCoincidente(activo.datos_registrados);
      if (index === 0) {
        observacion.custodio_observado = 'Custodio distinto';
        observacion.detalle = 'Discrepancia registrada para probar el límite de aceptación.';
      }
      const resultado = await api.request(
        'PUT',
        `/conciliaciones/${sesion.id}/activos/${encodeURIComponent(activo.id_activo)}`,
        { token: admin, body: observacion }
      );
      assert.equal(resultado.status, 200);
    }

    const cerrada = await api.get(`/conciliaciones/${sesion.id}`, admin);
    assert.equal(cerrada.body.data.porcentaje_discrepancias, 5);
    assert.equal(cerrada.body.data.resultado, 'Cumple');
  });
});
