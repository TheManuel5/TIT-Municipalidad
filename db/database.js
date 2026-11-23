/**
 * database.js - Conexión SQLite con better-sqlite3
 * Ilustre Municipalidad de San Pablo - Plan Informático Municipal 2027-2031 (Proyecto A)
 * Cumple con docs/contrato-api.md
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

  // Verificar si hay usuarios, si no hay insertar los 3 de prueba obligatorios del contrato
  const countUsers = db.prepare('SELECT COUNT(*) AS total FROM usuarios').get().total;
  if (countUsers === 0) {
    const insertUser = db.prepare(`
      INSERT INTO usuarios (username, password, nombre, rol, unidad)
      VALUES (?, ?, ?, ?, ?)
    `);

    const defaultUsers = [
      ['admin', 'password123', 'Felipe Oyarzún Mansilla', 'admin_ti', 'Informática'],
      ['jefe_dideco', 'password123', 'Marcela Huenchumán Soto', 'jefatura', 'DIDECO'],
      ['auditor', 'password123', 'Luis Contreras Paredes', 'lectura', 'Control']
    ];

    const insertTx = db.transaction(() => {
      for (const u of defaultUsers) {
        insertUser.run(...u);
      }
    });
    insertTx();
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

initSchema();

module.exports = db;
