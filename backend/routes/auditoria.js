/**
 * auditoria.js - Consulta del registro de auditoría (RNF-6)
 * Responsable: Alfredo
 *
 * GET /api/auditoria?usuario=&accion=&resultado=&desde=YYYY-MM-DD&hasta=YYYY-MM-DD&page=&limit=
 * Acceso: admin_ti y lectura (Control / auditoría interna). Jefatura no tiene acceso.
 * El registro es de solo lectura: no existen endpoints para modificarlo ni borrarlo.
 */

const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const { requerirRol } = require('../middlewares/roles');
const { registrarAuditoria } = require('../utils/auditoria');
const db = require('../../db/database');

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

router.get('/', verificarToken, requerirRol('admin_ti', 'lectura'), (req, res) => {
  const { usuario, accion, resultado, desde, hasta } = req.query;
  const condiciones = [];
  const params = {};

  if (typeof usuario === 'string' && usuario.trim()) {
    condiciones.push('usuario = @usuario');
    params.usuario = usuario.trim();
  }
  if (typeof accion === 'string' && accion.trim()) {
    condiciones.push('accion LIKE @accion');
    params.accion = `${accion.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    condiciones[condiciones.length - 1] += " ESCAPE '\\'";
  }
  if (typeof resultado === 'string' && ['OK', 'RECHAZADO', 'ERROR'].includes(resultado)) {
    condiciones.push('resultado = @resultado');
    params.resultado = resultado;
  }
  for (const [campo, valor] of [['desde', desde], ['hasta', hasta]]) {
    if (valor === undefined || valor === '') continue;
    if (typeof valor !== 'string' || !FECHA_REGEX.test(valor)) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: `El parámetro '${campo}' debe tener formato YYYY-MM-DD.`, details: [] }
      });
    }
  }
  if (desde) { condiciones.push('fecha >= @desde'); params.desde = `${desde}T00:00:00.000Z`; }
  if (hasta) { condiciones.push('fecha <= @hasta'); params.hasta = `${hasta}T23:59:59.999Z`; }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));

  const total = db.prepare(`SELECT COUNT(*) AS n FROM auditoria ${where}`).get(params).n;
  const data = db.prepare(`
    SELECT id, fecha, usuario, rol, ip, accion, metodo, ruta, estado_http, resultado, detalle
    FROM auditoria ${where}
    ORDER BY id DESC
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit, offset: (page - 1) * limit });

  // Quién consulta la auditoría también queda auditado
  registrarAuditoria({ req, accion: 'AUDITORIA_CONSULTADA', estado: 200 });

  return res.status(200).json({
    success: true,
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
  });
});

module.exports = router;
