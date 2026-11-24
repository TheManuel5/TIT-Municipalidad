/**
 * db.test.js - Pruebas de la base de datos SQLite (schema.sql + seed.js)
 * Responsable: Alfredo
 * Ejecutar: cd backend && npm test
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const { usarBaseTemporal, activoDePrueba, insertarActivo } = require('./helpers');

usarBaseTemporal();
const db = require('../../db/database');
const { seedDatabase } = require('../../db/seed');

const contar = (sql, ...p) => db.prepare(sql).get(...p).n;
const silenciar = (fn) => {
  const log = console.log;
  console.log = () => {};
  try { return fn(); } finally { console.log = log; }
};

before(() => silenciar(seedDatabase));

describe('Seed: inventario inicial (106 activos del informe)', () => {
  test('inserta exactamente 106 activos', () => {
    assert.equal(contar('SELECT COUNT(*) n FROM activos'), 106);
  });

  test('respeta la distribución del informe (64 PC/portátiles, 18 impresoras, 14 red, 2 servidores, 8 software)', () => {
    const porCat = Object.fromEntries(
      db.prepare('SELECT categoria, COUNT(*) n FROM activos GROUP BY categoria').all().map((r) => [r.categoria, r.n])
    );
    assert.equal((porCat.PC || 0) + (porCat['Portátil'] || 0), 64);
    assert.equal(porCat.Impresora, 18);
    assert.equal(porCat.Red, 14);
    assert.equal(porCat.Servidor, 2);
    assert.equal(porCat.Software, 8);
  });

  test('los identificadores siguen el formato SP-XXX-0000', () => {
    const ids = db.prepare('SELECT id_activo FROM activos').all().map((r) => r.id_activo);
    for (const id of ids) assert.match(id, /^SP-[A-Z]{2,3}-\d{4}$/, id);
  });

  test('todas las unidades de los activos existen en el catálogo de unidades', () => {
    assert.equal(
      contar('SELECT COUNT(*) n FROM activos WHERE unidad NOT IN (SELECT nombre FROM unidades)'),
      0
    );
  });

  test('ninguna garantía vence antes de la fecha de adquisición', () => {
    assert.equal(contar('SELECT COUNT(*) n FROM activos WHERE fecha_garantia < fecha_adquisicion'), 0);
  });

  test('todo activo dado de baja tiene motivo_baja', () => {
    assert.equal(
      contar("SELECT COUNT(*) n FROM activos WHERE estado_operativo = 'De baja' AND (motivo_baja IS NULL OR TRIM(motivo_baja) = '')"),
      0
    );
  });

  test('crea los 3 usuarios de prueba con sus roles', () => {
    const usuarios = db.prepare('SELECT username, rol, unidad FROM usuarios ORDER BY id').all();
    assert.deepEqual(usuarios, [
      { username: 'admin', rol: 'admin_ti', unidad: 'Informática' },
      { username: 'jefe_dideco', rol: 'jefatura', unidad: 'DIDECO' },
      { username: 'auditor', rol: 'lectura', unidad: 'Control' }
    ]);
  });
});

describe('Seed: bitácora inicial', () => {
  test('cada activo tiene exactamente un evento ALTA', () => {
    assert.equal(
      contar(`SELECT COUNT(*) n FROM activos a
              WHERE (SELECT COUNT(*) FROM historial h WHERE h.id_activo = a.id_activo AND h.tipo_evento = 'ALTA') <> 1`),
      0
    );
  });

  test('cada activo dado de baja tiene su evento BAJA', () => {
    assert.equal(
      contar(`SELECT COUNT(*) n FROM activos a
              WHERE a.estado_operativo = 'De baja'
                AND NOT EXISTS (SELECT 1 FROM historial h WHERE h.id_activo = a.id_activo AND h.tipo_evento = 'BAJA')`),
      0
    );
  });

  test('la secuencia de SP-HW-0003 termina en su custodio actual', () => {
    const ultimo = db
      .prepare("SELECT custodio_nuevo FROM historial WHERE id_activo = 'SP-HW-0003' ORDER BY fecha DESC LIMIT 1")
      .get();
    const activo = db.prepare("SELECT custodio FROM activos WHERE id_activo = 'SP-HW-0003'").get();
    assert.equal(ultimo.custodio_nuevo, activo.custodio);
  });
});

describe('Seed: idempotencia (se puede ejecutar varias veces sin perder datos)', () => {
  test('re-ejecutar no duplica activos ni eventos', () => {
    const activosAntes = contar('SELECT COUNT(*) n FROM activos');
    const eventosAntes = contar('SELECT COUNT(*) n FROM historial');
    silenciar(seedDatabase);
    assert.equal(contar('SELECT COUNT(*) n FROM activos'), activosAntes);
    assert.equal(contar('SELECT COUNT(*) n FROM historial'), eventosAntes);
  });

  test('re-ejecutar NO sobrescribe cambios hechos desde la aplicación', () => {
    db.prepare("UPDATE activos SET custodio = 'Custodio modificado' WHERE id_activo = 'SP-HW-0042'").run();
    silenciar(seedDatabase);
    const { custodio } = db.prepare("SELECT custodio FROM activos WHERE id_activo = 'SP-HW-0042'").get();
    assert.equal(custodio, 'Custodio modificado');
  });

  test('re-ejecutar NO borra eventos registrados por la aplicación (regresión del CASCADE)', () => {
    db.prepare(`INSERT INTO historial (id_activo, fecha, tipo_evento, usuario, motivo)
                VALUES ('SP-HW-0042', '2026-11-20T10:00:00Z', 'TRASLADO', 'test', 'evento de prueba')`).run();
    silenciar(seedDatabase);
    assert.equal(contar("SELECT COUNT(*) n FROM historial WHERE motivo = 'evento de prueba'"), 1);
  });
});

describe('Bitácora inmutable (Ley 21.459 / 20.285)', () => {
  test('no permite modificar eventos', () => {
    assert.throws(
      () => db.prepare("UPDATE historial SET motivo = 'alterado' WHERE id = 1").run(),
      /inmutable/
    );
  });

  test('no permite eliminar eventos', () => {
    assert.throws(() => db.prepare('DELETE FROM historial WHERE id = 1').run(), /inmutable/);
  });

  test('no permite eliminar físicamente un activo que tiene historial', () => {
    assert.throws(
      () => db.prepare("DELETE FROM activos WHERE id_activo = 'SP-HW-0042'").run(),
      /FOREIGN KEY/
    );
  });

  test('sí permite registrar eventos nuevos', () => {
    const r = db.prepare(`INSERT INTO historial (id_activo, fecha, tipo_evento, usuario)
                          VALUES ('SP-HW-0001', '2026-11-24T12:00:00Z', 'MANTENIMIENTO', 'test')`).run();
    assert.equal(r.changes, 1);
  });
});

describe('Restricciones del modelo (Tabla 7)', () => {
  test('rechaza categorías fuera de la lista cerrada', () => {
    assert.throws(
      () => insertarActivo(db, activoDePrueba({ id_activo: 'SP-HW-9001', categoria: 'Pantalla' })),
      /CHECK constraint/
    );
  });

  test('rechaza estados operativos inválidos', () => {
    assert.throws(
      () => insertarActivo(db, activoDePrueba({ id_activo: 'SP-HW-9002', estado_operativo: 'Perdido' })),
      /CHECK constraint/
    );
  });

  test('rechaza criticidades inválidas', () => {
    assert.throws(
      () => insertarActivo(db, activoDePrueba({ id_activo: 'SP-HW-9003', criticidad: 'Crítica' })),
      /CHECK constraint/
    );
  });

  test('rechaza id_activo duplicado', () => {
    assert.throws(
      () => insertarActivo(db, activoDePrueba({ id_activo: 'SP-HW-0042' })),
      /UNIQUE constraint|PRIMARY KEY/
    );
  });

  test('rechaza tipos de evento de historial inválidos', () => {
    assert.throws(
      () => db.prepare(`INSERT INTO historial (id_activo, fecha, tipo_evento, usuario)
                        VALUES ('SP-HW-0001', '2026-11-24T12:00:00Z', 'ROBO', 'test')`).run(),
      /CHECK constraint/
    );
  });
});
