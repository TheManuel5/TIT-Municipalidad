/**
 * usuarios.js - Gestión de usuarios y privilegios de acceso (RF-6)
 * Responsable: Alfredo
 * Municipalidad de San Pablo - Plan Informático Municipal 2027-2031 (Proyecto A)
 *
 * Solo admin_ti. Flujo de privilegios:
 *  - Solicitar: la jefatura solicita el acceso al Administrador TI (fuera del sistema, por
 *    memo/correo institucional, que queda como respaldo documental).
 *  - Aprobar: admin_ti crea la cuenta con el rol y la unidad aprobados (POST).
 *  - Modificar: admin_ti cambia rol, unidad o nombre (PUT).
 *  - Revocar: admin_ti desactiva la cuenta (PUT activo=false); el efecto es inmediato,
 *    incluso para sesiones abiertas. Las cuentas no se eliminan para conservar la trazabilidad.
 * Toda operación queda en el registro de auditoría.
 */

const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const { requerirRol } = require('../middlewares/roles');
const { registrarAuditoria } = require('../utils/auditoria');
const { validarPassword, hashPassword } = require('../utils/password');
const db = require('../../db/database');

const ROLES_VALIDOS = ['admin_ti', 'jefatura', 'lectura'];
const USERNAME_REGEX = /^[a-z0-9._-]{3,30}$/;

router.use(verificarToken, requerirRol('admin_ti'));

const COLUMNAS_PUBLICAS = 'id, username, nombre, rol, unidad, activo, creado_en, actualizado_en, ultimo_acceso';

function aPublico(u) {
  return u ? { ...u, activo: u.activo === 1 } : u;
}

function error(res, status, code, message, details = []) {
  return res.status(status).json({ success: false, error: { code, message, details } });
}

const existeUnidad = (unidad) =>
  !!db.prepare('SELECT 1 FROM unidades WHERE nombre = ?').get(unidad);

const adminsActivos = () =>
  db.prepare("SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'admin_ti' AND activo = 1").get().n;

/**
 * GET /api/usuarios
 */
router.get('/', (req, res) => {
  const usuarios = db.prepare(`SELECT ${COLUMNAS_PUBLICAS} FROM usuarios ORDER BY id`).all().map(aPublico);
  return res.status(200).json({ success: true, data: usuarios });
});

/**
 * POST /api/usuarios
 * Body: { username, nombre, rol, unidad, password }
 */
router.post('/', (req, res) => {
  const { username, nombre, rol, unidad, password } = req.body || {};
  const errores = [];

  if (typeof username !== 'string' || !USERNAME_REGEX.test(username)) {
    errores.push({ campo: 'username', mensaje: 'Entre 3 y 30 caracteres: minúsculas, números, punto, guion o guion bajo.' });
  }
  if (typeof nombre !== 'string' || !nombre.trim()) errores.push({ campo: 'nombre', mensaje: 'Obligatorio.' });
  if (!ROLES_VALIDOS.includes(rol)) errores.push({ campo: 'rol', mensaje: `Debe ser uno de: ${ROLES_VALIDOS.join(', ')}.` });
  if (typeof unidad !== 'string' || !existeUnidad(unidad)) errores.push({ campo: 'unidad', mensaje: 'Unidad inexistente en el catálogo.' });
  const errorPassword = validarPassword(password);
  if (errorPassword) errores.push({ campo: 'password', mensaje: errorPassword });

  if (errores.length) return error(res, 400, 'BAD_REQUEST', 'Datos de usuario inválidos.', errores);

  if (db.prepare('SELECT 1 FROM usuarios WHERE username = ?').get(username)) {
    return error(res, 409, 'CONFLICT', `El nombre de usuario '${username}' ya existe.`);
  }

  const ahora = new Date().toISOString();
  const r = db.prepare(`
    INSERT INTO usuarios (username, password, nombre, rol, unidad, activo, creado_en, actualizado_en)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `).run(username, hashPassword(password), nombre.trim(), rol, unidad, ahora, ahora);

  registrarAuditoria({
    req, accion: 'USUARIO_CREADO', estado: 201,
    detalle: `username=${username}; rol=${rol}; unidad=${unidad}`
  });

  const creado = db.prepare(`SELECT ${COLUMNAS_PUBLICAS} FROM usuarios WHERE id = ?`).get(r.lastInsertRowid);
  return res.status(201).json({ success: true, message: 'Usuario creado.', data: aPublico(creado) });
});

/**
 * PUT /api/usuarios/:id
 * Body (todos opcionales): { nombre, rol, unidad, activo }
 */
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const actual = db.prepare(`SELECT ${COLUMNAS_PUBLICAS} FROM usuarios WHERE id = ?`).get(id);
  if (!actual) return error(res, 404, 'NOT_FOUND', `Usuario con id '${req.params.id}' no encontrado.`);

  const { nombre, rol, unidad, activo } = req.body || {};
  const cambios = {};
  const errores = [];

  if (nombre !== undefined) {
    if (typeof nombre !== 'string' || !nombre.trim()) errores.push({ campo: 'nombre', mensaje: 'No puede estar vacío.' });
    else cambios.nombre = nombre.trim();
  }
  if (rol !== undefined) {
    if (!ROLES_VALIDOS.includes(rol)) errores.push({ campo: 'rol', mensaje: `Debe ser uno de: ${ROLES_VALIDOS.join(', ')}.` });
    else cambios.rol = rol;
  }
  if (unidad !== undefined) {
    if (typeof unidad !== 'string' || !existeUnidad(unidad)) errores.push({ campo: 'unidad', mensaje: 'Unidad inexistente en el catálogo.' });
    else cambios.unidad = unidad;
  }
  if (activo !== undefined) {
    if (typeof activo !== 'boolean') errores.push({ campo: 'activo', mensaje: 'Debe ser true o false.' });
    else cambios.activo = activo ? 1 : 0;
  }
  if (errores.length) return error(res, 400, 'BAD_REQUEST', 'Datos de usuario inválidos.', errores);
  if (Object.keys(cambios).length === 0) return error(res, 400, 'BAD_REQUEST', 'No se indicó ningún cambio.');

  const esUnoMismo = id === req.user.id;
  if (esUnoMismo && (cambios.activo === 0 || (cambios.rol && cambios.rol !== 'admin_ti'))) {
    return error(res, 409, 'CONFLICT', 'No puede desactivar su propia cuenta ni quitarse el rol admin_ti.');
  }

  const dejaDeSerAdminActivo = actual.rol === 'admin_ti' && actual.activo === 1 &&
    ((cambios.rol && cambios.rol !== 'admin_ti') || cambios.activo === 0);
  if (dejaDeSerAdminActivo && adminsActivos() <= 1) {
    return error(res, 409, 'CONFLICT', 'Debe existir al menos un administrador TI activo.');
  }

  const sets = Object.keys(cambios).map((c) => `${c} = @${c}`).join(', ');
  db.prepare(`UPDATE usuarios SET ${sets}, actualizado_en = @actualizado_en WHERE id = @id`)
    .run({ ...cambios, actualizado_en: new Date().toISOString(), id });

  const accion = cambios.activo === 0 ? 'USUARIO_REVOCADO' : cambios.activo === 1 && actual.activo === 0
    ? 'USUARIO_REACTIVADO' : 'USUARIO_MODIFICADO';
  registrarAuditoria({
    req, accion, estado: 200,
    detalle: `username=${actual.username}; ` + Object.entries(cambios)
      .map(([k, v]) => `${k}: ${actual[k]} -> ${v}`).join('; ')
  });

  const actualizado = db.prepare(`SELECT ${COLUMNAS_PUBLICAS} FROM usuarios WHERE id = ?`).get(id);
  return res.status(200).json({ success: true, message: 'Usuario actualizado.', data: aPublico(actualizado) });
});

/**
 * PUT /api/usuarios/:id/password
 * Restablecimiento de contraseña por admin_ti. Body: { password_nueva }
 */
router.put('/:id/password', (req, res) => {
  const id = Number(req.params.id);
  const actual = db.prepare('SELECT id, username FROM usuarios WHERE id = ?').get(id);
  if (!actual) return error(res, 404, 'NOT_FOUND', `Usuario con id '${req.params.id}' no encontrado.`);

  const errorPassword = validarPassword(req.body && req.body.password_nueva);
  if (errorPassword) return error(res, 400, 'BAD_REQUEST', errorPassword, [{ campo: 'password_nueva' }]);

  db.prepare('UPDATE usuarios SET password = ?, actualizado_en = ? WHERE id = ?')
    .run(hashPassword(req.body.password_nueva), new Date().toISOString(), id);

  registrarAuditoria({ req, accion: 'USUARIO_PASSWORD_RESTABLECIDA', estado: 200, detalle: `username=${actual.username}` });
  return res.status(200).json({ success: true, message: 'Contraseña restablecida.' });
});

module.exports = router;
