/**
 * auth.js - Rutas de Autenticación
 * Responsable: Ivan (endurecimiento de seguridad: Alfredo)
 * Municipalidad de San Pablo - Plan Informático Municipal 2027-2031 (Proyecto A)
 * Cumple con docs/contrato-api.md (Endpoint 1: POST /api/auth/login)
 *
 * Cambios de seguridad:
 *  - Las contraseñas se verifican contra su hash bcrypt (bcryptjs). Se eliminó la lista de
 *    usuarios con contraseñas escritas en el código, que permitía entrar con contraseñas
 *    alternativas aunque se cambiaran en la base (puerta trasera).
 *  - Límite de intentos fallidos por IP (express-rate-limit) contra fuerza bruta.
 *  - Todos los intentos de inicio de sesión quedan en el registro de auditoría.
 *  - Mismo mensaje de error si el usuario no existe, la clave es incorrecta o la cuenta está
 *    desactivada (no revela qué usuarios existen).
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { rateLimit } = require('express-rate-limit');
const { JWT_SECRET, JWT_EXPIRACION, verificarToken } = require('../middlewares/auth');
const { registrarAuditoria } = require('../utils/auditoria');
const { validarPassword, hashPassword, compararPassword } = require('../utils/password');
const { parseLoginDto } = require('../dtos/auth.dto');
const db = require('../../db/database');

const MAX_INTENTOS = Number(process.env.LOGIN_MAX_INTENTOS) || 10;
const VENTANA_MINUTOS = Number(process.env.LOGIN_VENTANA_MINUTOS) || 15;

const limiteLogin = rateLimit({
  windowMs: VENTANA_MINUTOS * 60 * 1000,
  limit: MAX_INTENTOS,
  skipSuccessfulRequests: true, // solo cuentan los intentos fallidos
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    registrarAuditoria({
      req,
      accion: 'LOGIN_BLOQUEADO',
      usuario: typeof req.body?.username === 'string' ? req.body.username.slice(0, 50) : null,
      estado: 429,
      detalle: `Más de ${MAX_INTENTOS} intentos fallidos en ${VENTANA_MINUTOS} minutos`
    });
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: `Demasiados intentos fallidos. Espere ${VENTANA_MINUTOS} minutos antes de volver a intentarlo.`,
        details: []
      }
    });
  }
});

const buscarPorUsername = db.prepare(
  'SELECT id, username, password, nombre, rol, unidad, activo FROM usuarios WHERE username = ?'
);
const marcarAcceso = db.prepare('UPDATE usuarios SET ultimo_acceso = ? WHERE id = ?');

const CREDENCIALES_INVALIDAS = 'Credenciales inválidas. Verifique su nombre de usuario y contraseña.';

/**
 * Endpoint 1: POST /api/auth/login
 * Inicio de sesión con generación de JWT Bearer
 */
router.post('/login', limiteLogin, (req, res) => {
  const parsed = parseLoginDto(req.body);
  if (parsed.errors.length) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Revise los datos de inicio de sesión.',
        details: parsed.errors
      }
    });
  }

  const { username, password } = parsed.data;
  const nombreUsuario = username;
  const row = buscarPorUsername.get(nombreUsuario);
  const passwordOk = compararPassword(password, row ? row.password : null);

  if (!row || !passwordOk || row.activo !== 1) {
    const motivo = !row ? 'usuario inexistente' : !passwordOk ? 'contraseña incorrecta' : 'cuenta desactivada';
    registrarAuditoria({
      req,
      accion: 'LOGIN_FALLIDO',
      usuario: nombreUsuario.slice(0, 50),
      rol: row ? row.rol : null,
      estado: 401,
      detalle: motivo
    });
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: CREDENCIALES_INVALIDAS, details: [] }
    });
  }

  const usuario = {
    id: row.id,
    username: row.username,
    nombre: row.nombre,
    rol: row.rol,
    unidad: row.unidad
  };

  const token = jwt.sign(usuario, JWT_SECRET, { expiresIn: JWT_EXPIRACION, algorithm: 'HS256' });
  marcarAcceso.run(new Date().toISOString(), row.id);
  registrarAuditoria({ req, accion: 'LOGIN_OK', usuario: usuario.username, rol: usuario.rol, estado: 200 });

  return res.status(200).json({
    success: true,
    data: {
      token,
      user: usuario
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

/**
 * PUT /api/auth/password
 * Cambio de contraseña del propio usuario (cualquier rol).
 * Body: { password_actual, password_nueva }
 */
router.put('/password', verificarToken, (req, res) => {
  const { password_actual, password_nueva } = req.body || {};
  const row = db.prepare('SELECT password FROM usuarios WHERE id = ?').get(req.user.id);

  if (!compararPassword(password_actual, row && row.password)) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'La contraseña actual no es correcta.', details: [] }
    });
  }

  const errorPolitica = validarPassword(password_nueva);
  if (errorPolitica) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: errorPolitica, details: [{ campo: 'password_nueva' }] }
    });
  }

  if (password_nueva === password_actual) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'La nueva contraseña debe ser distinta de la actual.', details: [] }
    });
  }

  db.prepare('UPDATE usuarios SET password = ?, actualizado_en = ? WHERE id = ?')
    .run(hashPassword(password_nueva), new Date().toISOString(), req.user.id);

  return res.status(200).json({
    success: true,
    message: 'Contraseña actualizada correctamente.'
  });
});

module.exports = router;
