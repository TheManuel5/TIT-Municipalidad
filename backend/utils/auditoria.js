/**
 * auditoria.js - Registro de auditoría de seguridad (RNF-6)
 * Responsable: Alfredo
 * Municipalidad de San Pablo - Plan Informático Municipal 2027-2031 (Proyecto A)
 *
 * Deja constancia inalterable (tabla `auditoria`, protegida con triggers) de:
 *  - inicios de sesión exitosos, fallidos y bloqueados,
 *  - toda operación de escritura (POST/PUT/PATCH/DELETE) con su resultado HTTP,
 *  - exportaciones del inventario y consultas al propio registro de auditoría,
 *  - gestión de usuarios y respaldos.
 *
 * NUNCA registra contraseñas, tokens ni el cuerpo de las peticiones.
 * Registrar es "best effort": un fallo al auditar nunca interrumpe la operación del usuario,
 * pero sí se informa por consola.
 */

const db = require('../../db/database');

const insertar = db.prepare(`
  INSERT INTO auditoria (fecha, usuario, rol, ip, accion, metodo, ruta, estado_http, resultado, detalle)
  VALUES (@fecha, @usuario, @rol, @ip, @accion, @metodo, @ruta, @estado_http, @resultado, @detalle)
`);

function ipDe(req) {
  if (!req) return null;
  return req.ip || (req.socket && req.socket.remoteAddress) || null;
}

function resultadoDesdeEstado(estado) {
  if (estado >= 500) return 'ERROR';
  if (estado >= 400) return 'RECHAZADO';
  return 'OK';
}

/**
 * Registra una entrada de auditoría.
 * @param {object} e
 * @param {object} [e.req]        Petición Express (se toman usuario, rol, IP, método y ruta)
 * @param {string}  e.accion      Código de la acción, ej. 'LOGIN_OK', 'USUARIO_CREADO'
 * @param {string} [e.usuario]    Sobrescribe el usuario (ej. intento de login sin sesión)
 * @param {number} [e.estado]     Código HTTP resultante
 * @param {string} [e.resultado]  'OK' | 'RECHAZADO' | 'ERROR' (por defecto se deduce del estado)
 * @param {string} [e.detalle]    Texto breve, sin datos sensibles
 */
function registrarAuditoria({ req, accion, usuario, rol, estado, resultado, detalle } = {}) {
  try {
    insertar.run({
      fecha: new Date().toISOString(),
      usuario: usuario ?? (req && req.user ? req.user.username : null),
      rol: rol ?? (req && req.user ? req.user.rol : null),
      ip: ipDe(req),
      accion,
      metodo: req ? req.method : null,
      ruta: req ? (req.originalUrl || req.url || '').split('?')[0] : null,
      estado_http: estado ?? null,
      resultado: resultado || (estado ? resultadoDesdeEstado(estado) : 'OK'),
      detalle: detalle ? String(detalle).slice(0, 500) : null
    });
  } catch (err) {
    console.error('[AUDITORIA] No se pudo registrar la acción', accion, '-', err.message);
  }
}

// Acciones registradas explícitamente por su propia ruta (no duplicar en el middleware)
const RUTAS_CON_REGISTRO_PROPIO = ['/api/auth/login'];

/**
 * Middleware global: audita automáticamente toda escritura y las exportaciones,
 * una vez enviada la respuesta (para conocer el código HTTP final).
 */
function middlewareAuditoria(req, res, next) {
  const ruta = (req.originalUrl || req.url || '').split('?')[0];
  const esEscritura = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const esExportacion = req.method === 'GET' && /^\/api\/(reportes\/)?exportar\/?$/.test(ruta);

  if ((esEscritura || esExportacion) && !RUTAS_CON_REGISTRO_PROPIO.includes(ruta)) {
    res.on('finish', () => {
      registrarAuditoria({
        req,
        accion: esExportacion ? 'EXPORTACION' : `ESCRITURA ${req.method}`,
        estado: res.statusCode,
        detalle: esExportacion ? `formato=${req.query.formato || 'csv'}` : null
      });
    });
  }
  next();
}

module.exports = { registrarAuditoria, middlewareAuditoria, ipDe };
