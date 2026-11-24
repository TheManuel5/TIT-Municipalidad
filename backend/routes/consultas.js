/**
 * consultas.js - Endpoints de Lectura de Activos Tecnológicos
 * Responsable según reparto: Alfredo
 * Municipalidad de San Pablo - Plan Informático Municipal 2027-2031 (Proyecto A)
 * Cumple con docs/contrato-api.md (Sección 4.2: Endpoints 2, 3, 4, 5 y 6)
 */

const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const { aplicarFiltroUnidad, sanitizarActivo } = require('../middlewares/roles');
const db = require('../../db/database');
const { leerDias, obtenerAlertas } = require('../utils/alertas');

// Proteger únicamente los endpoints de este módulo con autenticación Bearer
router.use('/activos', verificarToken);
router.use('/alertas', verificarToken);
router.use('/catalogos', verificarToken);

// Listas maestras para Endpoint 6: GET /api/catalogos
const CATALOGOS_SISTEMA = {
  categorias: ['PC', 'Portátil', 'Servidor', 'Red', 'Impresora', 'Software', 'Nube'],
  estados_operativos: ['Bueno', 'Regular', 'Malo', 'En reparación', 'De baja'],
  unidades: [
    'Alcaldía',
    'Secretaría Municipal',
    'Control',
    'SECPLAN',
    'Juzgado de Policía Local',
    'Asesoría Jurídica',
    'DOM',
    'Aseo y Ornato',
    'DIDECO',
    'Salud',
    'Educación',
    'DAF',
    'Informática'
  ],
  criticidades: ['Alta', 'Media', 'Baja'],
  tipos_mantenimiento: ['Preventiva', 'Correctiva', 'Sin mantención']
};

/**
 * Endpoint 6: GET /api/catalogos
 * Listas maestras para filtros y desplegables
 */
router.get('/catalogos', (req, res) => {
  return res.status(200).json({
    success: true,
    data: CATALOGOS_SISTEMA
  });
});

/**
 * Endpoint 5: GET /api/alertas?dias=60
 * Garantías (hardware) y licencias (software) por vencer dentro de los próximos `dias` días.
 * - Los activos 'De baja' no generan alertas.
 * - Los activos de categoría 'Software' se informan como licencias, no como garantías
 *   (mismo criterio que frontend/src/catalogos.js).
 * - dias_restantes es la diferencia exacta en días calendario respecto de hoy (0 = vence hoy).
 */
router.get('/alertas', aplicarFiltroUnidad, (req, res) => {
  const dias = leerDias(req.query.dias);
  if (dias === null) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: "El parámetro 'dias' debe ser un entero entre 0 y 3650.",
        details: [{ campo: 'dias', valor: req.query.dias }]
      }
    });
  }

  return res.status(200).json({
    success: true,
    data: obtenerAlertas(db, {
      dias,
      unidad: req.user.rol === 'jefatura' ? req.user.unidad : null
    })
  });
});

/**
 * Endpoint 2: GET /api/activos
 * Listado paginado con filtros y búsqueda
 */
router.get('/activos', aplicarFiltroUnidad, (req, res) => {
  const { q, categoria, estado, unidad, page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  const params = [];

  // Filtro de búsqueda libre. Se escapan los comodines de LIKE (% y _) para que el
  // usuario busque el texto literal (antes q=% devolvía todo el inventario).
  if (typeof q === 'string' && q.trim()) {
    conditions.push(`(
      id_activo LIKE ? ESCAPE '\\' OR
      marca_modelo LIKE ? ESCAPE '\\' OR
      custodio LIKE ? ESCAPE '\\' OR
      ubicacion LIKE ? ESCAPE '\\' OR
      descripcion LIKE ? ESCAPE '\\'
    )`);
    const term = `%${q.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    params.push(term, term, term, term, term);
  }

  // Filtro por categoría
  if (typeof categoria === 'string' && categoria.trim()) {
    conditions.push('categoria = ?');
    params.push(categoria.trim());
  }

  // Filtro por estado operativo
  if (typeof estado === 'string' && estado.trim()) {
    conditions.push('estado_operativo = ?');
    params.push(estado.trim());
  }

  // Filtro por unidad: Jefatura SIEMPRE ve únicamente su propia unidad institucional
  const unidadFiltro = req.filtroUnidad || (req.user && req.user.rol === 'jefatura' ? req.user.unidad : (typeof unidad === 'string' && unidad.trim()));
  if (unidadFiltro) {
    conditions.push('unidad = ?');
    params.push(unidadFiltro);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Conteo total para paginación
  const countSql = `SELECT COUNT(*) AS total FROM activos ${whereClause}`;
  const total = db.prepare(countSql).get(...params).total;

  // Consulta paginada
  const dataSql = `
    SELECT * FROM activos
    ${whereClause}
    ORDER BY id_activo ASC
    LIMIT ? OFFSET ?
  `;
  const rows = db.prepare(dataSql).all(...params, limitNum, offset);

  return res.status(200).json({
    success: true,
    data: rows,
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1
    }
  });
});

/**
 * Endpoint 3: GET /api/activos/:id
 * Ficha técnica de un activo específico
 */
router.get('/activos/:id', (req, res) => {
  const { id } = req.params;

  const activo = db.prepare('SELECT * FROM activos WHERE id_activo = ?').get(id);

  if (!activo) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Activo con identificador '${id}' no encontrado.`,
        details: []
      }
    });
  }

  // Regla de privacidad: Jefatura solo puede consultar activos de su propia unidad
  if (req.user.rol === 'jefatura' && activo.unidad !== req.user.unidad) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: `Acceso denegado: El activo pertenece a la unidad '${activo.unidad}'. Su rol solo permite consultar '${req.user.unidad}'.`,
        details: []
      }
    });
  }

  return res.status(200).json({
    success: true,
    data: activo
  });
});

/**
 * Endpoint 4: GET /api/activos/:id/historial
 * Bitácora inmutable de auditoría y ciclo de vida
 */
router.get('/activos/:id/historial', (req, res) => {
  const { id } = req.params;

  // Verificar que el activo existe
  const activo = db.prepare('SELECT id_activo, unidad FROM activos WHERE id_activo = ?').get(id);
  if (!activo) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Activo con identificador '${id}' no encontrado.`,
        details: []
      }
    });
  }

  // Regla para jefatura
  if (req.user.rol === 'jefatura' && activo.unidad !== req.user.unidad) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'No tiene permisos para ver la bitácora de activos de otra unidad.',
        details: []
      }
    });
  }

  const eventos = db.prepare(`
    SELECT * FROM historial
    WHERE id_activo = ?
    ORDER BY fecha DESC, id DESC
  `).all(id);

  return res.status(200).json({
    success: true,
    data: eventos
  });
});

module.exports = router;
