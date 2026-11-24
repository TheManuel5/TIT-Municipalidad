/**
 * Conciliaciones físicas del inventario y cumplimiento de la muestra de aceptación.
 */

const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const { requerirRol } = require('../middlewares/roles');
const db = require('../../db/database');

const SOLO_ADMIN = [verificarToken, requerirRol('admin_ti')];
const LECTURA_ADMIN = [verificarToken, requerirRol('admin_ti', 'lectura')];
const ESTADOS_VALIDOS = ['Bueno', 'Regular', 'Malo', 'En reparación', 'De baja'];
const CAMPOS_FISICOS = ['id_activo', 'ubicacion', 'unidad', 'custodio', 'estado_operativo'];
const PORCENTAJE_MUESTRA = 0.1;
const MAX_DISCREPANCIAS_PORCENTAJE = 5;

function convertirSesion(id, incluirActivos = false) {
  const sesion = db.prepare('SELECT * FROM conciliaciones WHERE id = ?').get(id);
  if (!sesion) return null;
  if (!incluirActivos) return sesion;

  const activos = db.prepare(`
    SELECT id_activo, datos_registrados, datos_observados, encontrado, resultado,
           detalle, fecha_verificacion, usuario_verificacion
    FROM conciliacion_activos
    WHERE id_conciliacion = ?
    ORDER BY id_activo
  `).all(id).map((item) => ({
    ...item,
    datos_registrados: JSON.parse(item.datos_registrados),
    datos_observados: item.datos_observados ? JSON.parse(item.datos_observados) : null,
    encontrado: item.encontrado === null ? null : Boolean(item.encontrado)
  }));

  return { ...sesion, activos };
}

function normalizar(valor) {
  return String(valor ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-CL');
}

router.get('/', ...LECTURA_ADMIN, (req, res) => {
  const conciliaciones = db.prepare(`
    SELECT id, fecha_inicio, fecha_cierre, usuario, total_activos, tamano_muestra,
           inspeccionados, discrepancias, porcentaje_discrepancias, resultado
    FROM conciliaciones
    ORDER BY id DESC
  `).all();
  return res.json({ success: true, data: conciliaciones });
});

router.get('/:id', ...LECTURA_ADMIN, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'El identificador de conciliación no es válido.', details: [] }
    });
  }

  const conciliacion = convertirSesion(id, true);
  if (!conciliacion) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'No se encontró la conciliación solicitada.', details: [] }
    });
  }
  return res.json({ success: true, data: conciliacion });
});

router.post('/', ...SOLO_ADMIN, (req, res) => {
  const activos = db.prepare(`
    SELECT id_activo, ubicacion, unidad, custodio, estado_operativo
    FROM activos
    WHERE estado_operativo <> 'De baja'
    ORDER BY RANDOM()
  `).all();

  if (activos.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'No hay activos vigentes para iniciar una conciliación física.', details: [] }
    });
  }

  const tamanoMuestra = Math.max(1, Math.ceil(activos.length * PORCENTAJE_MUESTRA));
  const muestra = activos.slice(0, tamanoMuestra);
  const fechaInicio = new Date().toISOString();
  const usuario = req.user.nombre || req.user.username;

  const crearConciliacion = db.transaction(() => {
    const insertSesion = db.prepare(`
      INSERT INTO conciliaciones (fecha_inicio, usuario, total_activos, tamano_muestra)
      VALUES (?, ?, ?, ?)
    `);
    const { lastInsertRowid } = insertSesion.run(fechaInicio, usuario, activos.length, tamanoMuestra);
    const insertActivo = db.prepare(`
      INSERT INTO conciliacion_activos (id_conciliacion, id_activo, datos_registrados)
      VALUES (?, ?, ?)
    `);
    for (const activo of muestra) {
      insertActivo.run(lastInsertRowid, activo.id_activo, JSON.stringify(activo));
    }
    return Number(lastInsertRowid);
  });

  const id = crearConciliacion();
  return res.status(201).json({ success: true, data: convertirSesion(id, true) });
});

router.put('/:id/activos/:id_activo', ...SOLO_ADMIN, (req, res) => {
  const id = Number(req.params.id);
  const idActivo = String(req.params.id_activo || '').trim();
  if (!Number.isSafeInteger(id) || id < 1 || !idActivo) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'La conciliación y el identificador de activo son obligatorios.', details: [] }
    });
  }

  const body = req.body || {};
  if (typeof body.encontrado !== 'boolean') {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Indique si el activo fue encontrado físicamente.', details: [] }
    });
  }

  const observado = {};
  if (body.encontrado) {
    for (const campo of CAMPOS_FISICOS) {
      const valor = body[`${campo}_observado`];
      if (typeof valor !== 'string' || !valor.trim()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: `El campo ${campo}_observado es obligatorio para un activo encontrado.`,
            details: []
          }
        });
      }
      observado[campo] = valor.trim();
    }
    if (!ESTADOS_VALIDOS.includes(observado.estado_operativo)) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'El estado operativo observado no es válido.', details: [] }
      });
    }
  }

  const conciliacion = db.prepare('SELECT * FROM conciliaciones WHERE id = ?').get(id);
  if (!conciliacion) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'No se encontró la conciliación solicitada.', details: [] }
    });
  }
  if (conciliacion.resultado !== 'En curso') {
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: 'La conciliación ya está cerrada y no admite nuevas inspecciones.', details: [] }
    });
  }

  const item = db.prepare(`
    SELECT datos_registrados, resultado
    FROM conciliacion_activos
    WHERE id_conciliacion = ? AND id_activo = ?
  `).get(id, idActivo);
  if (!item) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'El activo no pertenece a la muestra de esta conciliación.', details: [] }
    });
  }
  if (item.resultado !== 'Pendiente') {
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: 'La inspección de este activo ya fue registrada.', details: [] }
    });
  }

  const datosRegistrados = JSON.parse(item.datos_registrados);
  const discrepancia = !body.encontrado || CAMPOS_FISICOS.some((campo) =>
    normalizar(datosRegistrados[campo]) !== normalizar(observado[campo])
  );
  const detalle = String(body.detalle || '').trim();
  if (discrepancia && !detalle) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Describa la discrepancia observada antes de guardar.', details: [] }
    });
  }

  const fechaVerificacion = new Date().toISOString();
  const usuarioVerificacion = req.user.nombre || req.user.username;
  const resultado = discrepancia ? 'Discrepancia' : 'Coincide';

  const guardarInspeccion = db.transaction(() => {
    db.prepare(`
      UPDATE conciliacion_activos
      SET datos_observados = ?, encontrado = ?, resultado = ?, detalle = ?,
          fecha_verificacion = ?, usuario_verificacion = ?
      WHERE id_conciliacion = ? AND id_activo = ? AND resultado = 'Pendiente'
    `).run(
      body.encontrado ? JSON.stringify(observado) : null,
      body.encontrado ? 1 : 0,
      resultado,
      detalle || null,
      fechaVerificacion,
      usuarioVerificacion,
      id,
      idActivo
    );

    const resumen = db.prepare(`
      SELECT COUNT(*) AS inspeccionados,
             SUM(CASE WHEN resultado = 'Discrepancia' THEN 1 ELSE 0 END) AS discrepancias
      FROM conciliacion_activos
      WHERE id_conciliacion = ? AND resultado <> 'Pendiente'
    `).get(id);
    const porcentaje = resumen.inspeccionados
      ? Math.round((resumen.discrepancias / resumen.inspeccionados) * 10000) / 100
      : 0;
    const completada = resumen.inspeccionados === conciliacion.tamano_muestra;
    const resultadoFinal = completada
      ? (
        resumen.discrepancias * 100 <= resumen.inspeccionados * MAX_DISCREPANCIAS_PORCENTAJE
          ? 'Cumple'
          : 'No cumple'
      )
      : 'En curso';

    db.prepare(`
      UPDATE conciliaciones
      SET inspeccionados = ?, discrepancias = ?, porcentaje_discrepancias = ?,
          resultado = ?, fecha_cierre = ?
      WHERE id = ?
    `).run(
      resumen.inspeccionados,
      resumen.discrepancias,
      porcentaje,
      resultadoFinal,
      completada ? fechaVerificacion : null,
      id
    );
  });

  guardarInspeccion();
  return res.json({ success: true, data: convertirSesion(id, true) });
});

module.exports = router;
