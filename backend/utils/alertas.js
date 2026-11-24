const ZONA_HORARIA = process.env.APP_TZ || 'America/Santiago';
const DIAS_ALERTA_DEFAULT = 60;
const DIAS_ALERTA_MAX = 3650;

function fechaHoyLocal() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: ZONA_HORARIA });
}

function leerDias(valor, defecto = DIAS_ALERTA_DEFAULT) {
  if (valor === undefined || valor === '') return defecto;
  const dias = Number(valor);
  return Number.isInteger(dias) && dias >= 0 && dias <= DIAS_ALERTA_MAX ? dias : null;
}

function obtenerAlertas(db, { dias = DIAS_ALERTA_DEFAULT, unidad = null } = {}) {
  const hoy = fechaHoyLocal();

  let sqlGarantias = `
    SELECT
      id_activo, marca_modelo, categoria, unidad, custodio, fecha_garantia, proveedor,
      CAST(julianday(fecha_garantia) - julianday(@hoy) AS INTEGER) AS dias_restantes
    FROM activos
    WHERE categoria <> 'Software'
      AND estado_operativo <> 'De baja'
      AND fecha_garantia BETWEEN @hoy AND date(@hoy, '+' || @dias || ' days')
  `;
  if (unidad) sqlGarantias += ' AND unidad = @unidad';
  sqlGarantias += ' ORDER BY fecha_garantia ASC, id_activo ASC';

  let sqlLicencias = `
    SELECT * FROM (
      SELECT
        a.id_activo, a.marca_modelo AS nombre_software, a.unidad,
        a.fecha_garantia AS fecha_vencimiento, a.costo_anual AS costo_renovacion
      FROM activos a
      WHERE a.categoria = 'Software' AND a.estado_operativo <> 'De baja'
      UNION ALL
      SELECT
        l.id_activo, l.nombre_software, l.unidad, l.fecha_vencimiento, l.costo_renovacion
      FROM licencias l
      LEFT JOIN activos a ON a.id_activo = l.id_activo
      WHERE a.id_activo IS NULL
         OR (a.categoria <> 'Software' AND a.estado_operativo <> 'De baja')
    )
    WHERE fecha_vencimiento BETWEEN @hoy AND date(@hoy, '+' || @dias || ' days')
  `;
  if (unidad) sqlLicencias += ' AND unidad = @unidad';

  const params = { hoy, dias, unidad };
  const garantias = db.prepare(sqlGarantias).all(params);
  const licencias = db.prepare(`
    SELECT *, CAST(julianday(fecha_vencimiento) - julianday(@hoy) AS INTEGER) AS dias_restantes
    FROM (${sqlLicencias})
    ORDER BY fecha_vencimiento ASC, id_activo ASC
  `).all(params);

  return {
    garantias_por_vencer: garantias,
    licencias_por_vencer: licencias
  };
}

module.exports = { fechaHoyLocal, leerDias, obtenerAlertas };
