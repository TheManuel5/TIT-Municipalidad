/**
 * auth.js - Middleware de Autenticación JWT
 * Responsable: Ivan
 * Municipalidad de San Pablo - Plan Informático Municipal 2027-2031 (Proyecto A)
 * Cumple con docs/contrato-api.md (Sección 1 y 4.1)
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'san_pablo_secret_jwt_key_2027_2031';

/**
 * Middleware para verificar Bearer Token JWT en cabeceras HTTP
 */
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token de autenticación no proporcionado o formato inválido (debe ser Bearer <token>).',
        details: []
      }
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, rol, unidad, nombre }
    next();
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: isExpired ? 'El token de sesión ha expirado.' : 'Token de autenticación inválido.',
        details: [err.message]
      }
    });
  }
}

module.exports = {
  verificarToken,
  JWT_SECRET
};
