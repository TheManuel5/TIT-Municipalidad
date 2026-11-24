/**
 * auth.js - Middleware de Autenticación JWT
 * Responsable: Ivan (endurecimiento de seguridad: Alfredo)
 * Municipalidad de San Pablo - Plan Informático Municipal 2027-2031 (Proyecto A)
 * Cumple con docs/contrato-api.md (Sección 1 y 4.1)
 *
 * Seguridad:
 *  - JWT_SECRET es OBLIGATORIO en producción. En desarrollo, si no está definido, se genera
 *    uno aleatorio al iniciar (antes había una clave fija publicada en el repositorio, con
 *    la que cualquiera podía fabricar un token de admin_ti).
 *  - En cada petición se consulta el usuario en la base: si la cuenta fue desactivada, el
 *    acceso se revoca de inmediato aunque el token siga vigente; y el rol/unidad usados son
 *    los actuales, no los que tenía al iniciar sesión.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../../db/database');

const SECRETO_DE_EJEMPLO = 'tu_clave_secreta_jwt_aqui';

function obtenerSecretoJWT() {
  const secreto = process.env.JWT_SECRET;
  const valido = secreto && secreto !== SECRETO_DE_EJEMPLO && secreto.length >= 32;

  if (valido) return secreto;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[SEGURIDAD] JWT_SECRET no está definido o es inseguro (mínimo 32 caracteres). ' +
      'Defínalo en backend/.env antes de iniciar en producción.'
    );
  }

  if (process.env.NODE_ENV !== 'test') {
    console.warn(
      '[SEGURIDAD] JWT_SECRET no definido (o menor a 32 caracteres): se usará una clave aleatoria ' +
      'temporal. Las sesiones se cerrarán al reiniciar el servidor. Configure backend/.env.'
    );
  }
  return crypto.randomBytes(48).toString('hex');
}

const JWT_SECRET = obtenerSecretoJWT();
const JWT_EXPIRACION = '8h';

const buscarUsuario = db.prepare(
  'SELECT id, username, nombre, rol, unidad, activo FROM usuarios WHERE id = ?'
);

function noAutorizado(res, message, details = []) {
  return res.status(401).json({
    success: false,
    error: { code: 'UNAUTHORIZED', message, details }
  });
}

/**
 * Middleware para verificar Bearer Token JWT en cabeceras HTTP
 */
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return noAutorizado(res, 'Token de autenticación no proporcionado o formato inválido (debe ser Bearer <token>).');
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return noAutorizado(res, isExpired ? 'El token de sesión ha expirado.' : 'Token de autenticación inválido.');
  }

  // Revocación inmediata: la cuenta debe existir y seguir activa
  const usuario = buscarUsuario.get(decoded.id);
  if (!usuario || usuario.activo !== 1 || usuario.username !== decoded.username) {
    return noAutorizado(res, 'La cuenta fue desactivada o ya no existe. Contacte al administrador TI.');
  }

  req.user = {
    id: usuario.id,
    username: usuario.username,
    nombre: usuario.nombre,
    rol: usuario.rol,
    unidad: usuario.unidad
  };
  next();
}

module.exports = {
  verificarToken,
  JWT_SECRET,
  JWT_EXPIRACION
};
