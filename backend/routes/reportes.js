/**
 * reportes.js - Endpoints de Reportes Estadísticos y Exportación
 * Responsable según reparto: Gaby
 * Municipalidad de San Pablo - Plan Informático Municipal 2027-2031 (Proyecto A)
 * Cumple con docs/contrato-api.md (Sección 4.4: Endpoints 11, 12 y Exportar)
 */

const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const { aplicarFiltroUnidad } = require('../middlewares/roles');
const db = require('../../db/database');

router.use('/reportes', verificarToken);
router.use('/resumen', verificarToken);
router.use('/costos', verificarToken);
router.use('/exportar', verificarToken);

/**
 * Endpoint 11: GET /api/reportes/resumen (y /api/resumen por compatibilidad)
 * Métricas consolidadas para el Dashboard
 */
router.get(['/reportes/resumen', '/resumen'], aplicarFiltroUnidad, (req, res) => {
  let filterSql = '';
  const params = [];

  if (req.user.rol === 'jefatura') {
    filterSql = 'WHERE unidad = ?';
    params.push(req.user.unidad);
  }

  // 1. Totales globales
  const totalActivos = db.prepare(`SELECT COUNT(*) AS c FROM activos ${filterSql}`).get(...params).c;
  
  const opSql = filterSql ? `${filterSql} AND estado_operativo = 'Bueno'` : "WHERE estado_operativo = 'Bueno'";
  const operativos = db.prepare(`SELECT COUNT(*) AS c FROM activos ${opSql}`).get(...params).c;

  const repSql = filterSql ? `${filterSql} AND estado_operativo = 'En reparación'` : "WHERE estado_operativo = 'En reparación'";
  const enReparacion = db.prepare(`SELECT COUNT(*) AS c FROM activos ${repSql}`).get(...params).c;

  const bajaSql = filterSql ? `${filterSql} AND estado_operativo = 'De baja'` : "WHERE estado_operativo = 'De baja'";
  const deBaja = db.prepare(`SELECT COUNT(*) AS c FROM activos ${bajaSql}`).get(...params).c;

  // Alertas de garantía (próximos 60 días)
  const hoy = new Date().toISOString().split('T')[0];
  const lim = new Date();
  lim.setDate(lim.getDate() + 60);
  const limStr = lim.toISOString().split('T')[0];

  const alertaSql = filterSql
    ? `${filterSql} AND fecha_garantia >= '${hoy}' AND fecha_garantia <= '${limStr}'`
    : `WHERE fecha_garantia >= '${hoy}' AND fecha_garantia <= '${limStr}'`;
  const alertasGarantia = db.prepare(`SELECT COUNT(*) AS c FROM activos ${alertaSql}`).get(...params).c;

  // 2. Desglose por categoría
  const porCategoria = db.prepare(`
    SELECT categoria, COUNT(*) AS cantidad
    FROM activos
    ${filterSql}
    GROUP BY categoria
    ORDER BY cantidad DESC
  `).all(...params);

  // 3. Desglose por estado
  const porEstado = db.prepare(`
    SELECT estado_operativo AS estado, COUNT(*) AS cantidad
    FROM activos
    ${filterSql}
    GROUP BY estado_operativo
    ORDER BY cantidad DESC
  `).all(...params);

  // 4. Desglose por unidad
  const porUnidad = db.prepare(`
    SELECT unidad, COUNT(*) AS cantidad
    FROM activos
    ${filterSql}
    GROUP BY unidad
    ORDER BY cantidad DESC
  `).all(...params);

  return res.status(200).json({
    success: true,
    data: {
      totales: {
        total_activos: totalActivos,
        operativos,
        en_reparacion: enReparacion,
        de_baja: deBaja,
        alertas_garantia: alertasGarantia
      },
      por_categoria: porCategoria,
      por_estado: porEstado,
      por_unidad: porUnidad
    }
  });
});

/**
 * Endpoint 12: GET /api/reportes/costos (y /api/costos por compatibilidad)
 * Reporte financiero de TCO y costos por categoría
 */
router.get(['/reportes/costos', '/costos'], aplicarFiltroUnidad, (req, res) => {
  let filterSql = '';
  const params = [];

  if (req.user.rol === 'jefatura') {
    filterSql = 'WHERE unidad = ?';
    params.push(req.user.unidad);
  }

  const totalesFinancieros = db.prepare(`
    SELECT
      SUM(costo_inicial) AS inversion_total_inicial,
      SUM(costo_anual) AS costo_anual_recurrente_total
    FROM activos
    ${filterSql}
  `).get(...params);

  const inversionInicial = totalesFinancieros.inversion_total_inicial || 0;
  const costoAnual = totalesFinancieros.costo_anual_recurrente_total || 0;
  const tco5Anos = inversionInicial + (costoAnual * 5);

  const desgloseCategoria = db.prepare(`
    SELECT
      categoria,
      SUM(costo_inicial) AS inversion_inicial,
      SUM(costo_anual) AS costo_anual
    FROM activos
    ${filterSql}
    GROUP BY categoria
    ORDER BY inversion_inicial DESC
  `).all(...params);

  return res.status(200).json({
    success: true,
    data: {
      inversion_total_inicial: inversionInicial,
      costo_anual_recurrente_total: costoAnual,
      tco_estimado_5_anos: tco5Anos,
      desglose_por_categoria: desgloseCategoria
    }
  });
});

/**
 * Endpoint Complementario: GET /api/exportar?formato=csv|json (y /api/reportes/exportar)
 * Exportación del inventario institucional
 */
router.get(['/exportar', '/reportes/exportar'], aplicarFiltroUnidad, (req, res) => {
  const formato = (req.query.formato || 'csv').toLowerCase();

  let filterSql = '';
  const params = [];

  if (req.user.rol === 'jefatura') {
    filterSql = 'WHERE unidad = ?';
    params.push(req.user.unidad);
  }

  const activos = db.prepare(`SELECT * FROM activos ${filterSql} ORDER BY id_activo ASC`).all(...params);

  if (formato === 'json') {
    return res.status(200).json({
      success: true,
      data: activos
    });
  }

  // Generar CSV
  if (activos.length === 0) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="inventario_san_pablo.csv"');
    return res.send('');
  }

  const headers = Object.keys(activos[0]);
  const csvRows = [headers.join(',')];

  for (const activo of activos) {
    const values = headers.map((header) => {
      let val = activo[header];
      if (val === null || val === undefined) val = '';
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    });
    csvRows.push(values.join(','));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="inventario_san_pablo.csv"');
  return res.status(200).send(csvRows.join('\n'));
});

module.exports = router;
