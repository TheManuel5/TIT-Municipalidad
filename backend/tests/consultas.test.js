/**
 * consultas.test.js - Pruebas de los endpoints de lectura (contrato, sección 4.2)
 * Responsable: Alfredo
 * Cubre: GET /api/activos, /api/activos/:id, /api/activos/:id/historial,
 *        /api/alertas y /api/catalogos con los 3 roles (admin_ti, jefatura, lectura).
 * Ejecutar: cd backend && npm test
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
  usarBaseTemporal, hoyLocal, sumarDias, iniciarServidor, activoDePrueba, insertarActivo
} = require('./helpers');

usarBaseTemporal();
const db = require('../../db/database');
const { seedDatabase } = require('../../db/seed');
const app = require('../server');

const RESERVADO = (valor) => typeof valor === 'string' && valor.startsWith('[RESERVADO');

let api;
let admin, jefe, auditor;

before(async () => {
  const log = console.log;
  console.log = () => {}; // silenciar seed y logger de peticiones
  seedDatabase();
  api = await iniciarServidor(app);
  admin = await api.login('admin');
  jefe = await api.login('jefe_dideco');
  auditor = await api.login('auditor');
  after(() => { console.log = log; });
});

after(() => api && api.cerrar());

describe('Autenticación requerida', () => {
  const rutas = ['/activos', '/activos/SP-HW-0042', '/activos/SP-HW-0042/historial', '/alertas', '/catalogos'];

  for (const ruta of rutas) {
    test(`GET ${ruta} sin token -> 401`, async () => {
      const r = await api.get(ruta);
      assert.equal(r.status, 401);
      assert.equal(r.body.success, false);
      assert.equal(r.body.error.code, 'UNAUTHORIZED');
    });
  }

  test('token inválido -> 401', async () => {
    const r = await api.get('/activos', 'token.falso.123');
    assert.equal(r.status, 401);
  });
});

describe('GET /api/catalogos (Endpoint 6)', () => {
  test('devuelve las 5 listas maestras para cualquier rol', async () => {
    for (const token of [admin, jefe, auditor]) {
      const r = await api.get('/catalogos', token);
      assert.equal(r.status, 200);
      assert.deepEqual(Object.keys(r.body.data).sort(), [
        'categorias', 'criticidades', 'estados_operativos', 'tipos_mantenimiento', 'unidades'
      ]);
    }
  });

  test('las unidades del catálogo coinciden con la tabla de unidades', async () => {
    const r = await api.get('/catalogos', admin);
    const enBase = db.prepare('SELECT nombre FROM unidades').all().map((u) => u.nombre).sort();
    assert.deepEqual([...r.body.data.unidades].sort(), enBase);
  });
});

describe('GET /api/activos (Endpoint 2) - listado, filtros y paginación', () => {
  test('admin: estructura del contrato y paginación por defecto (10 por página)', async () => {
    const r = await api.get('/activos', admin);
    assert.equal(r.status, 200);
    assert.equal(r.body.success, true);
    assert.equal(r.body.data.length, 10);
    assert.deepEqual(r.body.meta, { total: 106, page: 1, limit: 10, totalPages: 11 });
  });

  test('limit se acota a 100 y page inválido vuelve a 1', async () => {
    const r = await api.get('/activos?limit=500&page=-3', admin);
    assert.equal(r.body.meta.limit, 100);
    assert.equal(r.body.meta.page, 1);
    assert.equal(r.body.data.length, 100);
  });

  test('una página fuera de rango devuelve lista vacía', async () => {
    const r = await api.get('/activos?page=999', admin);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.length, 0);
  });

  test('las páginas no se repiten ni pierden activos', async () => {
    const p1 = await api.get('/activos?limit=60&page=1', admin);
    const p2 = await api.get('/activos?limit=60&page=2', admin);
    const ids = new Set([...p1.body.data, ...p2.body.data].map((a) => a.id_activo));
    assert.equal(ids.size, 106);
  });

  test('filtro por categoría', async () => {
    const r = await api.get('/activos?categoria=Impresora&limit=100', admin);
    assert.equal(r.body.meta.total, 18);
    assert.ok(r.body.data.every((a) => a.categoria === 'Impresora'));
  });

  test('filtro por estado', async () => {
    const r = await api.get(`/activos?estado=${encodeURIComponent('De baja')}&limit=100`, admin);
    assert.ok(r.body.meta.total > 0);
    assert.ok(r.body.data.every((a) => a.estado_operativo === 'De baja'));
  });

  test('filtro por unidad (admin)', async () => {
    const r = await api.get('/activos?unidad=DAF&limit=100', admin);
    assert.ok(r.body.meta.total > 0);
    assert.ok(r.body.data.every((a) => a.unidad === 'DAF'));
  });

  test('filtros combinados', async () => {
    const r = await api.get('/activos?unidad=DIDECO&categoria=PC&limit=100', admin);
    assert.ok(r.body.data.every((a) => a.unidad === 'DIDECO' && a.categoria === 'PC'));
  });

  test('búsqueda libre q (sin distinguir mayúsculas)', async () => {
    const r = await api.get('/activos?q=THINKPAD&limit=100', admin);
    assert.ok(r.body.meta.total > 0);
    assert.ok(r.body.data.every((a) => /thinkpad/i.test(a.marca_modelo + a.descripcion)));
  });

  test('búsqueda por id_activo exacto', async () => {
    const r = await api.get('/activos?q=SP-SRV-0001', admin);
    assert.equal(r.body.meta.total, 1);
    assert.equal(r.body.data[0].id_activo, 'SP-SRV-0001');
  });

  test('los comodines % y _ se buscan como texto literal', async () => {
    for (const q of ['%', '_', '%%']) {
      const r = await api.get(`/activos?q=${encodeURIComponent(q)}`, admin);
      assert.equal(r.body.meta.total, 0, `q=${q}`);
    }
  });

  test('los filtros de búsqueda no permiten alterar la consulta SQL', async () => {
    const q = "' OR 1=1 --";
    const busqueda = await api.get(`/activos?q=${encodeURIComponent(q)}`, admin);
    const categoria = await api.get(`/activos?categoria=${encodeURIComponent(q)}`, admin);
    assert.equal(busqueda.status, 200);
    assert.equal(busqueda.body.meta.total, 0);
    assert.equal(categoria.status, 200);
    assert.equal(categoria.body.meta.total, 0);
  });

  test('parámetros repetidos no provocan error 500', async () => {
    const r = await api.get('/activos?categoria=PC&categoria=Red', admin);
    assert.equal(r.status, 200);
  });

  test('cada activo trae los 23 campos de la Tabla 7', async () => {
    const r = await api.get('/activos?limit=1', admin);
    assert.equal(Object.keys(r.body.data[0]).length, 23);
  });
});

describe('Matriz de roles (contrato, sección 3)', () => {
  test('admin_ti ve criticidad y configuracion_red reales', async () => {
    const r = await api.get('/activos?limit=100', admin);
    assert.ok(r.body.data.every((a) => ['Alta', 'Media', 'Baja'].includes(a.criticidad)));
    assert.ok(!r.body.data.some((a) => RESERVADO(a.configuracion_red)));
  });

  test('lectura ve todo el municipio pero con campos reservados enmascarados', async () => {
    const r = await api.get('/activos?limit=100', auditor);
    assert.equal(r.body.meta.total, 106);
    assert.ok(r.body.data.every((a) => RESERVADO(a.criticidad) && RESERVADO(a.configuracion_red)));
  });

  test('jefatura solo ve su unidad, aunque pida otra', async () => {
    const totalDideco = db.prepare("SELECT COUNT(*) n FROM activos WHERE unidad = 'DIDECO'").get().n;
    for (const ruta of ['/activos?limit=100', '/activos?unidad=DAF&limit=100']) {
      const r = await api.get(ruta, jefe);
      assert.equal(r.body.meta.total, totalDideco, ruta);
      assert.ok(r.body.data.every((a) => a.unidad === 'DIDECO'), ruta);
    }
  });

  test('jefatura ve campos reservados enmascarados', async () => {
    const r = await api.get('/activos?limit=100', jefe);
    assert.ok(r.body.data.every((a) => RESERVADO(a.criticidad) && RESERVADO(a.configuracion_red)));
  });

  test('la búsqueda de jefatura tampoco sale de su unidad', async () => {
    const r = await api.get('/activos?q=SP-SRV-0001', jefe);
    assert.equal(r.body.meta.total, 0);
  });
});

describe('GET /api/activos/:id (Endpoint 3)', () => {
  test('admin obtiene la ficha completa', async () => {
    const r = await api.get('/activos/SP-HW-0042', admin);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.id_activo, 'SP-HW-0042');
    assert.ok(!RESERVADO(r.body.data.criticidad));
  });

  test('id inexistente -> 404 con formato de error del contrato', async () => {
    const r = await api.get('/activos/SP-XX-0000', admin);
    assert.equal(r.status, 404);
    assert.equal(r.body.error.code, 'NOT_FOUND');
  });

  test('jefatura puede ver un activo de su unidad (enmascarado)', async () => {
    const r = await api.get('/activos/SP-HW-0042', jefe);
    assert.equal(r.status, 200);
    assert.ok(RESERVADO(r.body.data.criticidad));
  });

  test('jefatura NO puede ver un activo de otra unidad -> 403', async () => {
    const r = await api.get('/activos/SP-SRV-0001', jefe);
    assert.equal(r.status, 403);
    assert.equal(r.body.error.code, 'FORBIDDEN');
  });

  test('lectura ve cualquier activo, enmascarado', async () => {
    const r = await api.get('/activos/SP-SRV-0001', auditor);
    assert.equal(r.status, 200);
    assert.ok(RESERVADO(r.body.data.configuracion_red));
  });
});

describe('GET /api/activos/:id/historial (Endpoint 4)', () => {
  test('devuelve los eventos del más reciente al más antiguo', async () => {
    const r = await api.get('/activos/SP-HW-0003/historial', admin);
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data.map((e) => e.tipo_evento), ['TRASLADO', 'ALTA']);
  });

  test('todo activo tiene al menos su evento ALTA', async () => {
    const r = await api.get('/activos/SP-HW-0042/historial', admin);
    assert.ok(r.body.data.some((e) => e.tipo_evento === 'ALTA'));
  });

  test('los eventos traen los campos del contrato', async () => {
    const r = await api.get('/activos/SP-HW-0003/historial', admin);
    assert.deepEqual(Object.keys(r.body.data[0]).sort(), [
      'custodio_anterior', 'custodio_nuevo', 'detalles', 'fecha', 'id', 'id_activo',
      'motivo', 'tipo_evento', 'unidad_destino', 'unidad_origen', 'usuario'
    ]);
  });

  test('id inexistente -> 404', async () => {
    const r = await api.get('/activos/SP-XX-0000/historial', admin);
    assert.equal(r.status, 404);
  });

  test('jefatura no puede ver la bitácora de otra unidad -> 403', async () => {
    const r = await api.get('/activos/SP-SRV-0001/historial', jefe);
    assert.equal(r.status, 403);
  });
});

describe('GET /api/alertas (Endpoint 5)', () => {
  const hoy = hoyLocal();

  before(() => {
    // Activos controlados para no depender de la fecha en que se ejecuten las pruebas
    insertarActivo(db, activoDePrueba({ id_activo: 'SP-HW-9010', unidad: 'DAF', fecha_garantia: sumarDias(hoy, 10) }));
    insertarActivo(db, activoDePrueba({ id_activo: 'SP-HW-9011', unidad: 'DIDECO', fecha_garantia: hoy }));
    insertarActivo(db, activoDePrueba({ id_activo: 'SP-HW-9012', unidad: 'DAF', fecha_garantia: sumarDias(hoy, 61) }));
    insertarActivo(db, activoDePrueba({ id_activo: 'SP-HW-9013', unidad: 'DAF', fecha_garantia: sumarDias(hoy, -1) }));
    insertarActivo(db, activoDePrueba({
      id_activo: 'SP-HW-9014', unidad: 'DAF', fecha_garantia: sumarDias(hoy, 5),
      estado_operativo: 'De baja', motivo_baja: 'prueba'
    }));
    insertarActivo(db, activoDePrueba({
      id_activo: 'SP-SW-9015', categoria: 'Software', marca_modelo: 'Licencia de prueba',
      unidad: 'DAF', fecha_garantia: sumarDias(hoy, 20), costo_anual: 123000
    }));
  });

  const ids = (lista) => lista.map((x) => x.id_activo);

  test('estructura del contrato', async () => {
    const r = await api.get('/alertas', admin);
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.data.garantias_por_vencer));
    assert.ok(Array.isArray(r.body.data.licencias_por_vencer));
  });

  test('incluye garantías que vencen hoy y dentro de 60 días, con dias_restantes exacto', async () => {
    const r = await api.get('/alertas', admin);
    const g = Object.fromEntries(r.body.data.garantias_por_vencer.map((x) => [x.id_activo, x]));
    assert.equal(g['SP-HW-9010'].dias_restantes, 10);
    assert.equal(g['SP-HW-9011'].dias_restantes, 0);
  });

  test('excluye garantías ya vencidas, fuera de plazo o de activos dados de baja', async () => {
    const r = await api.get('/alertas', admin);
    const g = ids(r.body.data.garantias_por_vencer);
    assert.ok(!g.includes('SP-HW-9012'), 'fuera de 60 días');
    assert.ok(!g.includes('SP-HW-9013'), 'ya vencida');
    assert.ok(!g.includes('SP-HW-9014'), 'de baja');
  });

  test('el software aparece en licencias y no en garantías', async () => {
    const r = await api.get('/alertas', admin);
    assert.ok(!ids(r.body.data.garantias_por_vencer).includes('SP-SW-9015'));
    const lic = r.body.data.licencias_por_vencer.find((x) => x.id_activo === 'SP-SW-9015');
    assert.ok(lic, 'licencia de prueba presente');
    assert.equal(lic.nombre_software, 'Licencia de prueba');
    assert.equal(lic.dias_restantes, 20);
    assert.equal(lic.costo_renovacion, 123000);
  });

  test('todas las alertas están dentro del plazo y ordenadas por fecha', async () => {
    const r = await api.get('/alertas?dias=60', admin);
    const limite = sumarDias(hoy, 60);
    const g = r.body.data.garantias_por_vencer;
    assert.ok(g.every((x) => x.fecha_garantia >= hoy && x.fecha_garantia <= limite));
    assert.ok(g.every((x, i) => i === 0 || g[i - 1].fecha_garantia <= x.fecha_garantia));
  });

  test('?dias amplía o reduce la ventana', async () => {
    const r61 = await api.get('/alertas?dias=61', admin);
    assert.ok(ids(r61.body.data.garantias_por_vencer).includes('SP-HW-9012'));
    const r0 = await api.get('/alertas?dias=0', admin);
    assert.deepEqual(r0.body.data.garantias_por_vencer.every((x) => x.dias_restantes === 0), true);
    assert.ok(ids(r0.body.data.garantias_por_vencer).includes('SP-HW-9011'));
  });

  test('?dias inválido -> 400', async () => {
    for (const dias of ['abc', '-5', '1.5', '99999']) {
      const r = await api.get(`/alertas?dias=${dias}`, admin);
      assert.equal(r.status, 400, `dias=${dias}`);
      assert.equal(r.body.error.code, 'BAD_REQUEST');
    }
  });

  test('jefatura solo recibe alertas de su unidad', async () => {
    const r = await api.get('/alertas', jefe);
    const todas = [...r.body.data.garantias_por_vencer, ...r.body.data.licencias_por_vencer];
    assert.ok(todas.every((x) => x.unidad === 'DIDECO'));
    assert.ok(ids(r.body.data.garantias_por_vencer).includes('SP-HW-9011'));
    assert.ok(!ids(r.body.data.garantias_por_vencer).includes('SP-HW-9010'));
  });
});
