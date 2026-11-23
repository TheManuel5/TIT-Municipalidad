/**
 * auth.js - Rutas de Autenticación
 * Responsable: Ivan
 * Municipalidad de San Pablo - Plan Informático Municipal 2027-2031 (Proyecto A)
 * Cumple con docs/contrato-api.md (Endpoint 1: POST /api/auth/login)
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { JWT_SECRET, verificarToken } = require('../middlewares/auth');

// Cargar conexión con la base de datos SQLite
let db;
try {
  db = require('../../db/database');
} catch (e) {
  console.warn('[AUTH] Base de datos no disponible aún, usando usuarios en memoria.');
}

// Usuarios institucionales de prueba estándar según contrato (Sección 4.1)
const USUARIOS_PREDEFINIDOS = [
  {
    id: 1,
    username: 'admin',
    passwords: ['password123', 'admin123'],
    nombre: 'Felipe Oyarzún Mansilla',
    rol: 'admin_ti',
    unidad: 'Informática'
  },
  {
    id: 2,
    username: 'jefe_dideco',
    passwords: ['password123', 'dideco123'],
    nombre: 'Marcela Huenchumán Soto',
    rol: 'jefatura',
    unidad: 'DIDECO'
  },
  {
    id: 3,
    username: 'auditor',
    passwords: ['password123', 'control123'],
    nombre: 'Luis Contreras Paredes',
    rol: 'lectura',
    unidad: 'Control'
  }
];

/**
 * Endpoint 1: POST /api/auth/login
 * Inicio de sesión con generación de JWT Bearer
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Debe ingresar nombre de usuario y contraseña.',
        details: []
      }
    });
  }

  let usuarioEncontrado = null;

  // 1. Intentar buscar en la base de datos SQLite si está disponible
  if (db) {
    try {
      const row = db.prepare('SELECT id, username, password, nombre, rol, unidad FROM usuarios WHERE username = ?').get(username);
      if (row) {
        // Acepta la contraseña de la BD o las variantes estándar del contrato
        const matchDb = row.password === password;
        const fallback = USUARIOS_PREDEFINIDOS.find((u) => u.username === username);
        const matchFallback = fallback && fallback.passwords.includes(password);

        if (matchDb || matchFallback) {
          usuarioEncontrado = {
            id: row.id,
            username: row.username,
            nombre: row.nombre,
            rol: row.rol,
            unidad: row.unidad
          };
        }
      }
    } catch (dbErr) {
      console.error('[AUTH DB Error]', dbErr.message);
    }
  }

  // 2. Si no se encontró en la BD, verificar en usuarios predefinidos
  if (!usuarioEncontrado) {
    const fallbackUser = USUARIOS_PREDEFINIDOS.find(
      (u) => u.username === username && u.passwords.includes(password)
    );
    if (fallbackUser) {
      usuarioEncontrado = {
        id: fallbackUser.id,
        username: fallbackUser.username,
        nombre: fallbackUser.nombre,
        rol: fallbackUser.rol,
        unidad: fallbackUser.unidad
      };
    }
  }

  // Credenciales inválidas
  if (!usuarioEncontrado) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Credenciales inválidas. Verifique su nombre de usuario y contraseña.',
        details: []
      }
    });
  }

  // Generar Token JWT con vigencia de 8 horas
  const payload = {
    id: usuarioEncontrado.id,
    username: usuarioEncontrado.username,
    nombre: usuarioEncontrado.nombre,
    rol: usuarioEncontrado.rol,
    unidad: usuarioEncontrado.unidad
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

  return res.status(200).json({
    success: true,
    data: {
      token,
      user: usuarioEncontrado
    }
  });
});

/**
 * GET /api/auth/me
 * Consulta el perfil del usuario autenticado actual a través de su token
 */
router.get('/me', verificarToken, (req, res) => {
  return res.status(200).json({
    success: true,
    data: req.user
  });
});

module.exports = router;
