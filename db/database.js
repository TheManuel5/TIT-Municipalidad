/**
 * database.js - Conexión SQLite con better-sqlite3
 * Ilustre Municipalidad de San Pablo - Plan Informático Municipal 2027-2031 (Proyecto A)
 * Cumple con docs/contrato-api.md
 * Responsable: Alfredo
 *
 * Seguridad:
 *  - Las contraseñas se guardan SOLO como hash bcrypt (bcryptjs). Si se abre una base
 *    antigua con contraseñas en texto plano, se migran a hash automáticamente.
 *  - Las bases creadas con versiones anteriores reciben las columnas nuevas de `usuarios`
 *    (activo, creado_en, actualizado_en, ultimo_acceso) sin perder datos.
 */

const path = require('path');
const fs = require('fs');

let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  try {
    Database = require(path.join(__dirname, '../backend/node_modules/better-sqlite3'));
  } catch (err2) {
    throw new Error('No se encontró el módulo better-sqlite3. Ejecute npm install en la carpeta backend.');
  }
}

// bcryptjs (JS puro, sin compilación) para el hash de contraseñas
function cargarModulo(nombre) {
  try {
    return require(nombre);
  } catch (e) {
    return require(path.join(__dirname, '../backend/node_modules', nombre));
  }
}
const bcrypt = cargarModulo('bcryptjs');
const BCRYPT_COSTO = 10;
const esHashBcrypt = (valor) => typeof valor === 'string' && /^\$2[aby]\$\d{2}\$/.test(valor);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'inventario.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Crear o abrir base de datos SQLite
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Inicializar esquema si es necesario
function initSchema() {
  if (fs.existsSync(SCHEMA_PATH)) {
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schemaSql);
  }

  migrarColumnasUsuarios();

  // Usuarios de prueba obligatorios del contrato (solo si la tabla está vacía).
  // Contraseña de prueba: password123 -> se guarda únicamente su hash bcrypt.
  const countUsers = db.prepare('SELECT COUNT(*) AS total FROM usuarios').get().total;
  if (countUsers === 0) {
    const ahora = new Date().toISOString();
    const insertUser = db.prepare(`
      INSERT INTO usuarios (username, password, nombre, rol, unidad, activo, creado_en, actualizado_en)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `);

    const defaultUsers = [
      ['admin', 'Felipe Oyarzún Mansilla', 'admin_ti', 'Informática'],
      ['jefe_dideco', 'Marcela Huenchumán Soto', 'jefatura', 'DIDECO'],
      ['auditor', 'Luis Contreras Paredes', 'lectura', 'Control']
    ];
    const hashPrueba = bcrypt.hashSync('password123', BCRYPT_COSTO);

    const insertTx = db.transaction(() => {
      for (const [username, nombre, rol, unidad] of defaultUsers) {
        insertUser.run(username, hashPrueba, nombre, rol, unidad, ahora, ahora);
      }
    });
    insertTx();
  }

  // Migración: cualquier contraseña que siga en texto plano (bases antiguas) pasa a hash
  const enTextoPlano = db.prepare('SELECT id, password FROM usuarios').all()
    .filter((u) => !esHashBcrypt(u.password));
  if (enTextoPlano.length > 0) {
    const actualizar = db.prepare('UPDATE usuarios SET password = ? WHERE id = ?');
    db.transaction(() => {
      for (const u of enTextoPlano) actualizar.run(bcrypt.hashSync(u.password, BCRYPT_COSTO), u.id);
    })();
    console.log(`[SEGURIDAD] ${enTextoPlano.length} contraseña(s) en texto plano migradas a hash bcrypt.`);
  }

  // Insertar unidades si no existen
  const countUnidades = db.prepare('SELECT COUNT(*) AS total FROM unidades').get().total;
  if (countUnidades === 0) {
    const defaultUnidades = [
      'Alcaldía', 'Secretaría Municipal', 'Control', 'SECPLAN',
      'Juzgado de Policía Local', 'Asesoría Jurídica', 'DOM',
      'Aseo y Ornato', 'DIDECO', 'Salud', 'Educación', 'DAF', 'Informática'
    ];
    const insertUnidad = db.prepare('INSERT INTO unidades (nombre) VALUES (?)');
    const unidadTx = db.transaction(() => {
      for (const un of defaultUnidades) {
        insertUnidad.run(un);
      }
    });
    unidadTx();
  }
}

/**
 * Agrega a `usuarios` las columnas introducidas después de la versión inicial,
 * para que una base existente siga funcionando sin tener que recrearla.
 */
function migrarColumnasUsuarios() {
  const columnas = new Set(db.prepare('PRAGMA table_info(usuarios)').all().map((c) => c.name));
  const nuevas = [
    ['activo', 'INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1))'],
    ['creado_en', 'TEXT'],
    ['actualizado_en', 'TEXT'],
    ['ultimo_acceso', 'TEXT']
  ];
  for (const [nombre, definicion] of nuevas) {
    if (!columnas.has(nombre)) db.exec(`ALTER TABLE usuarios ADD COLUMN ${nombre} ${definicion}`);
  }
}

initSchema();

module.exports = db;
module.exports.DB_PATH = DB_PATH;
module.exports.bcrypt = bcrypt;
module.exports.BCRYPT_COSTO = BCRYPT_COSTO;
