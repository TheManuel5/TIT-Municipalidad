/**
 * respaldos.test.js - Pruebas de copias de seguridad (RNF-5)
 * Responsable: Alfredo
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { usarBaseTemporal } = require('./helpers');

const dir = usarBaseTemporal();
process.env.BACKUP_DIR = path.join(dir, 'respaldos');
process.env.BACKUP_RETENCION = '3';
delete process.env.BACKUP_CLAVE;

const db = require('../../db/database');
const { seedDatabase } = require('../../db/seed');
const backup = require('../../db/backup');

const silenciar = (fn) => {
  const log = console.log;
  console.log = () => {};
  try { return fn(); } finally { console.log = log; }
};

before(() => silenciar(seedDatabase));

describe('Crear y verificar respaldos', () => {
  let respaldo;

  test('crea un respaldo consistente, verificado y con huella SHA-256', async () => {
    respaldo = await backup.crearRespaldo({ motivo: 'prueba' });
    assert.ok(fs.existsSync(respaldo.ruta));
    assert.ok(fs.existsSync(`${respaldo.ruta}.sha256`));
    assert.equal(respaldo.integridad, 'ok');
    assert.equal(respaldo.activos, 106);
    assert.equal(respaldo.cifrado, false);
  });

  test('la verificación detecta un respaldo alterado', () => {
    const copia = respaldo.ruta.replace('.db', '_alterado.db');
    fs.copyFileSync(respaldo.ruta, copia);
    fs.copyFileSync(`${respaldo.ruta}.sha256`, `${copia}.sha256`);
    const fd = fs.openSync(copia, 'r+');
    fs.writeSync(fd, Buffer.from('X'), 0, 1, 5000);
    fs.closeSync(fd);
    const v = backup.verificarRespaldo(copia);
    assert.equal(v.ok, false);
    assert.match(v.error, /SHA-256/);
    fs.unlinkSync(copia);
    fs.unlinkSync(`${copia}.sha256`);
  });

  test('queda registrado en la auditoría', () => {
    const e = db.prepare("SELECT * FROM auditoria WHERE accion = 'RESPALDO_CREADO' ORDER BY id DESC LIMIT 1").get();
    assert.ok(e);
    assert.match(e.detalle, /activos=106/);
  });

  test('rotación: conserva solo los últimos BACKUP_RETENCION respaldos', async () => {
    for (let i = 0; i < 4; i++) await backup.crearRespaldo({ motivo: `rotación ${i}` });
    assert.equal(backup.listarRespaldos().length, 3);
  });
});

describe('Respaldos cifrados (AES-256-GCM)', () => {
  after(() => { delete process.env.BACKUP_CLAVE; });

  test('con BACKUP_CLAVE el respaldo queda cifrado y solo se lee con la clave', async () => {
    process.env.BACKUP_CLAVE = 'clave-de-prueba-muy-larga-2026';
    const r = await backup.crearRespaldo({ motivo: 'cifrado' });
    assert.ok(r.ruta.endsWith('.db.enc'));
    assert.equal(r.cifrado, true);

    const contenido = fs.readFileSync(r.ruta);
    assert.ok(!contenido.includes(Buffer.from('SQLite format 3')), 'no debe ser legible como SQLite');

    process.env.BACKUP_CLAVE = 'otra-clave-incorrecta-2026';
    assert.equal(backup.verificarRespaldo(r.ruta).ok, false);

    delete process.env.BACKUP_CLAVE;
    const sinClave = backup.verificarRespaldo(r.ruta);
    assert.equal(sinClave.ok, false);
    assert.match(sinClave.error, /BACKUP_CLAVE/);

    process.env.BACKUP_CLAVE = 'clave-de-prueba-muy-larga-2026';
    assert.equal(backup.verificarRespaldo(r.ruta).ok, true);
  });
});

describe('Restauración', () => {
  test('restaura los datos y guarda antes un respaldo del estado actual', async () => {
    delete process.env.BACKUP_CLAVE;
    const r = await backup.crearRespaldo({ motivo: 'antes de cambio' });

    // Cambio posterior que la restauración debe revertir
    db.prepare("UPDATE activos SET custodio = 'Cambio a revertir' WHERE id_activo = 'SP-HW-0042'").run();
    db.close(); // la API debe estar detenida al restaurar

    const resultado = await backup.restaurarRespaldo(r.ruta);
    assert.ok(resultado.respaldo_previo && fs.existsSync(resultado.respaldo_previo));

    const Database = require('better-sqlite3');
    const restaurada = new Database(process.env.DB_PATH, { readonly: true });
    const { custodio } = restaurada.prepare("SELECT custodio FROM activos WHERE id_activo = 'SP-HW-0042'").get();
    assert.notEqual(custodio, 'Cambio a revertir');
    assert.ok(restaurada.prepare("SELECT 1 FROM auditoria WHERE accion = 'RESPALDO_RESTAURADO'").get());
    restaurada.close();
  });

  test('no restaura un respaldo inválido', async () => {
    const falso = path.join(process.env.BACKUP_DIR, 'inventario_falso.db');
    fs.writeFileSync(falso, 'esto no es una base de datos');
    await assert.rejects(() => backup.restaurarRespaldo(falso), /Respaldo inválido/);
  });
});
