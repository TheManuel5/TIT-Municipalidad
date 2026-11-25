/**
 * activos.js - Endpoints de Escritura de Activos Tecnológicos
 * Responsable: Ivan
 * Municipalidad de San Pablo - Plan Informático Municipal 2027-2031 (Proyecto A)
 * Cumple con docs/contrato-api.md (Sección 4.3: Endpoints 7, 8, 9 y 10)
 */

const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const { requerirRol } = require('../middlewares/roles');
const db = require('../../db/database');
const { parseActivoDto } = require('../dtos/activo.dto');

// Listas cerradas del Contrato de API (Sección 2 y 4.2)
const CATEGORIAS_VALIDAS = ['PC', 'Portátil', 'Servidor', 'Red', 'Impresora', 'Software', 'Nube'];
const ESTADOS_VALIDOS = ['Bueno', 'Regular', 'Malo', 'En reparación', 'De baja'];

// Middleware compuesto para endpoints de escritura (Solo Admin TI)
const soloAdminTI = [verificarToken, requerirRol('admin_ti')];

/**
 * Endpoint 7: POST /api/activos
 * Alta de un nuevo activo institucional
 * Registra automáticamente el evento 'ALTA' en la bitácora inmutable de historial
 */
router.post('/', soloAdminTI, (req, res) => {
  const parsed = parseActivoDto(req.body, { create: true });
  if (parsed.errors.length) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Revise los datos del activo.',
        details: parsed.errors
      }
    });
  }
  const data = parsed.data;
  const {
    id_activo,
    categoria,
    marca_modelo,
    descripcion,
    ubicacion,
    unidad,
    custodio,
    estado_operativo = 'Bueno',
    ultimo_mantenimiento,
    tipo_mantenimiento,
    criticidad = 'Media',
    proceso_asociado,
    fecha_adquisicion,
    fecha_garantia,
    licencias_asociadas,
    proveedor,
    contrato_oc,
    costo_inicial,
    costo_anual,
    configuracion_red,
    motivo
  } = data;

  if (data.recepcion_verificada !== true) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Confirme la verificación física y documental de la recepción antes de registrar el activo.',
        details: []
      }
    });
  }

  if (!db.prepare('SELECT 1 FROM unidades WHERE nombre = ?').get(unidad.trim())) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: `La unidad '${unidad}' no está registrada en el catálogo municipal.`,
        details: []
      }
    });
  }

  if (estado_operativo === 'De baja') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Use el procedimiento de baja para registrar activos dados de baja.',
        details: []
      }
    });
  }

  // 3. Validación de unicidad de ID (Evitar duplicados)
  const existe = db.prepare('SELECT id_activo FROM activos WHERE id_activo = ?').get(id_activo.trim());
  if (existe) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: `El ID de activo '${id_activo.trim()}' ya existe en el sistema. Ingrese un identificador único.`,
        details: []
      }
    });
  }

  // 4. Inserción del activo y registro automático de bitácora en transacción atómica
  const hoyISO = new Date().toISOString();
  const fechaHoy = hoyISO.split('T')[0];

  const insertActivo = db.prepare(`
    INSERT INTO activos (
      id_activo, categoria, marca_modelo, descripcion, ubicacion, unidad, custodio,
      estado_operativo, ultimo_mantenimiento, tipo_mantenimiento, criticidad, proceso_asociado,
      fecha_adquisicion, fecha_garantia, licencias_asociadas, proveedor, contrato_oc,
      costo_inicial, costo_anual, configuracion_red, fecha_revision, responsable_revision, motivo_baja
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
  `);

  const insertHistorial = db.prepare(`
    INSERT INTO historial (
      id_activo, fecha, tipo_evento, usuario, unidad_origen, unidad_destino,
      custodio_anterior, custodio_nuevo, motivo, detalles
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  try {
    const transaction = db.transaction(() => {
      insertActivo.run(
        id_activo.trim(),
        categoria,
        marca_modelo.trim(),
        descripcion || null,
        ubicacion.trim(),
        unidad.trim(),
        custodio.trim(),
        estado_operativo,
        ultimo_mantenimiento || null,
        tipo_mantenimiento || 'Preventiva',
        criticidad,
        proceso_asociado || null,
        fecha_adquisicion || fechaHoy,
        fecha_garantia || fechaHoy,
        licencias_asociadas || null,
        proveedor || 'Sin proveedor asignado',
        contrato_oc || 'Sin OC registrada',
        Number(costo_inicial),
        Number(costo_anual),
        configuracion_red || null,
        fechaHoy,
        req.user.nombre || req.user.username,
        null
      );

      insertHistorial.run(
        id_activo.trim(),
        hoyISO,
        'ALTA',
        req.user.nombre || req.user.username,
        null,
        unidad.trim(),
        null,
        custodio.trim(),
        motivo || 'Alta inicial del activo en el sistema de inventario tecnológico',
        `Recepción física y documental verificada por ${req.user.nombre || req.user.username} antes del alta; documento: ${contrato_oc.trim()}.`
      );
    });

    transaction();

    return res.status(201).json({
      success: true,
      message: 'Activo creado exitosamente con registro en bitácora.',
      data: { id_activo: id_activo.trim() }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error al registrar el activo en la base de datos.',
        details: [err.message]
      }
    });
  }
});

/**
 * Endpoint 8: PUT /api/activos/:id
 * Modificación general de datos del activo
 * Registra automáticamente el evento 'EDICION' en el historial
 */
router.put('/:id', soloAdminTI, (req, res) => {
  const { id } = req.params;
  const parsed = parseActivoDto(req.body);
  if (parsed.errors.length) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Revise los datos del activo.',
        details: parsed.errors
      }
    });
  }
  const data = parsed.data;

  const activoActual = db.prepare('SELECT * FROM activos WHERE id_activo = ?').get(id);
  if (!activoActual) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Activo con identificador '${id}' no encontrado.`,
        details: []
      }
    });
  }

  // Si intentan cambiar de categoría o estado, validar que sean permitidos
  if (data.categoria && !CATEGORIAS_VALIDAS.includes(data.categoria)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: `Categoría '${data.categoria}' no válida.`,
        details: []
      }
    });
  }

  if (data.estado_operativo && !ESTADOS_VALIDOS.includes(data.estado_operativo)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: `Estado operativo '${data.estado_operativo}' no válido.`,
        details: []
      }
    });
  }

  if (data.estado_operativo === 'De baja' && activoActual.estado_operativo !== 'De baja') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Use el procedimiento de baja para registrar la causal y la bitácora correspondiente.',
        details: []
      }
    });
  }

  if (data.unidad && !db.prepare('SELECT 1 FROM unidades WHERE nombre = ?').get(data.unidad)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: `La unidad '${data.unidad}' no está registrada en el catálogo municipal.`,
        details: []
      }
    });
  }

  const fechaAdquisicion = data.fecha_adquisicion !== undefined
    ? data.fecha_adquisicion
    : activoActual.fecha_adquisicion;
  const fechaGarantia = data.fecha_garantia !== undefined
    ? data.fecha_garantia
    : activoActual.fecha_garantia;
  if (fechaAdquisicion && fechaGarantia && fechaGarantia < fechaAdquisicion) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'La fecha de garantía no puede ser anterior a la fecha de adquisición.',
        details: []
      }
    });
  }

  const updateFields = {
    categoria: data.categoria !== undefined ? data.categoria : activoActual.categoria,
    marca_modelo: data.marca_modelo !== undefined ? data.marca_modelo : activoActual.marca_modelo,
    descripcion: data.descripcion !== undefined ? data.descripcion : activoActual.descripcion,
    ubicacion: data.ubicacion !== undefined ? data.ubicacion : activoActual.ubicacion,
    unidad: data.unidad !== undefined ? data.unidad : activoActual.unidad,
    custodio: data.custodio !== undefined ? data.custodio : activoActual.custodio,
    estado_operativo: data.estado_operativo !== undefined ? data.estado_operativo : activoActual.estado_operativo,
    ultimo_mantenimiento: data.ultimo_mantenimiento !== undefined ? data.ultimo_mantenimiento : activoActual.ultimo_mantenimiento,
    tipo_mantenimiento: data.tipo_mantenimiento !== undefined ? data.tipo_mantenimiento : activoActual.tipo_mantenimiento,
    criticidad: data.criticidad !== undefined ? data.criticidad : activoActual.criticidad,
    proceso_asociado: data.proceso_asociado !== undefined ? data.proceso_asociado : activoActual.proceso_asociado,
    fecha_adquisicion: data.fecha_adquisicion !== undefined ? data.fecha_adquisicion : activoActual.fecha_adquisicion,
    fecha_garantia: data.fecha_garantia !== undefined ? data.fecha_garantia : activoActual.fecha_garantia,
    licencias_asociadas: data.licencias_asociadas !== undefined ? data.licencias_asociadas : activoActual.licencias_asociadas,
    proveedor: data.proveedor !== undefined ? data.proveedor : activoActual.proveedor,
    contrato_oc: data.contrato_oc !== undefined ? data.contrato_oc : activoActual.contrato_oc,
    costo_inicial: data.costo_inicial !== undefined ? Number(data.costo_inicial) : activoActual.costo_inicial,
    costo_anual: data.costo_anual !== undefined ? Number(data.costo_anual) : activoActual.costo_anual,
    configuracion_red: data.configuracion_red !== undefined ? data.configuracion_red : activoActual.configuracion_red,
    fecha_revision: new Date().toISOString().split('T')[0],
    responsable_revision: req.user.nombre || req.user.username,
    motivo_baja: activoActual.motivo_baja
  };

  const updateStmt = db.prepare(`
    UPDATE activos SET
      categoria = ?, marca_modelo = ?, descripcion = ?, ubicacion = ?, unidad = ?, custodio = ?,
      estado_operativo = ?, ultimo_mantenimiento = ?, tipo_mantenimiento = ?, criticidad = ?,
      proceso_asociado = ?, fecha_adquisicion = ?, fecha_garantia = ?, licencias_asociadas = ?,
      proveedor = ?, contrato_oc = ?, costo_inicial = ?, costo_anual = ?, configuracion_red = ?,
      fecha_revision = ?, responsable_revision = ?, motivo_baja = ?
    WHERE id_activo = ?
  `);

  const insertHistorial = db.prepare(`
    INSERT INTO historial (
      id_activo, fecha, tipo_evento, usuario, unidad_origen, unidad_destino,
      custodio_anterior, custodio_nuevo, motivo, detalles
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  try {
    const transaction = db.transaction(() => {
      updateStmt.run(
        updateFields.categoria,
        updateFields.marca_modelo,
        updateFields.descripcion,
        updateFields.ubicacion,
        updateFields.unidad,
        updateFields.custodio,
        updateFields.estado_operativo,
        updateFields.ultimo_mantenimiento,
        updateFields.tipo_mantenimiento,
        updateFields.criticidad,
        updateFields.proceso_asociado,
        updateFields.fecha_adquisicion,
        updateFields.fecha_garantia,
        updateFields.licencias_asociadas,
        updateFields.proveedor,
        updateFields.contrato_oc,
        updateFields.costo_inicial,
        updateFields.costo_anual,
        updateFields.configuracion_red,
        updateFields.fecha_revision,
        updateFields.responsable_revision,
        updateFields.motivo_baja,
        id
      );

      insertHistorial.run(
        id,
        new Date().toISOString(),
        'EDICION',
        req.user.nombre || req.user.username,
        activoActual.unidad,
        updateFields.unidad,
        activoActual.custodio,
        updateFields.custodio,
        data.motivo || 'Actualización de especificaciones generales del activo',
        data.detalles || 'Modificación técnica efectuada desde la ficha de edición'
      );
    });

    transaction();

    return res.status(200).json({
      success: true,
      message: 'Activo actualizado exitosamente.',
      data: { id_activo: id }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error al actualizar el activo.',
        details: [err.message]
      }
    });
  }
});

/**
 * Endpoint 9: POST /api/activos/:id/traslado
 * Registra el traslado físico y cambio de custodio
 * Registra evento 'TRASLADO' en historial
 */
router.post('/:id/traslado', soloAdminTI, (req, res) => {
  const { id } = req.params;
  const {
    nueva_unidad,
    nueva_ubicacion,
    nuevo_custodio,
    nuevoCustodio, // compatibilidad con camelCase
    motivo,
    detalles
  } = req.body || {};

  const custodioDestino = nuevo_custodio || nuevoCustodio;

  // Validación de campos requeridos
  if (!nueva_unidad || !nueva_ubicacion || !custodioDestino) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Debe ingresar nueva_unidad, nueva_ubicacion y nuevo_custodio para efectuar el traslado.',
        details: []
      }
    });
  }

  if (!motivo || !motivo.trim()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'El motivo del traslado es obligatorio para la bitácora de auditoría.',
        details: []
      }
    });
  }

  const activoActual = db.prepare('SELECT * FROM activos WHERE id_activo = ?').get(id);
  if (!activoActual) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Activo con identificador '${id}' no encontrado.`,
        details: []
      }
    });
  }

  if (activoActual.estado_operativo === 'De baja') {
    return res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: `No se puede trasladar el activo '${id}': está dado de baja.`,
        details: []
      }
    });
  }

  const updateTraslado = db.prepare(`
    UPDATE activos SET
      unidad = ?,
      ubicacion = ?,
      custodio = ?,
      fecha_revision = ?
    WHERE id_activo = ?
  `);

  const insertHistorial = db.prepare(`
    INSERT INTO historial (
      id_activo, fecha, tipo_evento, usuario, unidad_origen, unidad_destino,
      custodio_anterior, custodio_nuevo, motivo, detalles
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  const hoyISO = new Date().toISOString();
  const fechaHoy = hoyISO.split('T')[0];

  try {
    const transaction = db.transaction(() => {
      updateTraslado.run(nueva_unidad.trim(), nueva_ubicacion.trim(), custodioDestino.trim(), fechaHoy, id);

      insertHistorial.run(
        id,
        hoyISO,
        'TRASLADO',
        req.user.nombre || req.user.username,
        activoActual.unidad,
        nueva_unidad.trim(),
        activoActual.custodio,
        custodioDestino.trim(),
        motivo.trim(),
        detalles ? detalles.trim() : 'Reasignación de dependencia conforme a procedimiento de control interno'
      );
    });

    transaction();

    return res.status(200).json({
      success: true,
      message: 'Traslado registrado exitosamente.',
      data: {
        id_activo: id,
        unidad: nueva_unidad.trim(),
        ubicacion: nueva_ubicacion.trim(),
        custodio: custodioDestino.trim()
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error al procesar el traslado.',
        details: [err.message]
      }
    });
  }
});

/**
 * Endpoint 10: POST /api/activos/:id/baja
 * Da de baja institucional a un activo
 * Regla de negocio crítica: El motivo es estrictamente obligatorio (Ley N.º 18.695)
 */
router.post('/:id/baja', soloAdminTI, (req, res) => {
  const { id } = req.params;
  const { motivo, detalles } = req.body || {};

  // Validación crítica exigida por el contrato y la ley
  if (!motivo || typeof motivo !== 'string' || !motivo.trim()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'El motivo de la baja es ESTRICTAMENTE OBLIGATORIO por exigencia de la Ley N.º 18.695 (Administración de Bienes Municipales).',
        details: []
      }
    });
  }

  const activoActual = db.prepare('SELECT * FROM activos WHERE id_activo = ?').get(id);
  if (!activoActual) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Activo con identificador '${id}' no encontrado.`,
        details: []
      }
    });
  }

  if (activoActual.estado_operativo === 'De baja') {
    return res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: `El activo '${id}' ya se encuentra dado de baja.`,
        details: []
      }
    });
  }

  const updateBaja = db.prepare(`
    UPDATE activos SET
      estado_operativo = 'De baja',
      motivo_baja = ?,
      fecha_revision = ?
    WHERE id_activo = ?
  `);

  const insertHistorial = db.prepare(`
    INSERT INTO historial (
      id_activo, fecha, tipo_evento, usuario, unidad_origen, unidad_destino,
      custodio_anterior, custodio_nuevo, motivo, detalles
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  const hoyISO = new Date().toISOString();
  const fechaHoy = hoyISO.split('T')[0];

  try {
    const transaction = db.transaction(() => {
      updateBaja.run(motivo.trim(), fechaHoy, id);

      insertHistorial.run(
        id,
        hoyISO,
        'BAJA',
        req.user.nombre || req.user.username,
        activoActual.unidad,
        activoActual.unidad,
        activoActual.custodio,
        null,
        motivo.trim(),
        detalles ? detalles.trim() : 'Decreto de baja técnica definitiva e incorporación al registro de bienes dados de baja'
      );
    });

    transaction();

    return res.status(200).json({
      success: true,
      message: 'Activo dado de baja con causal registrada en auditoría.',
      data: {
        id_activo: id,
        estado_operativo: 'De baja'
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error al decretar la baja del activo.',
        details: [err.message]
      }
    });
  }
});

/**
 * Endpoint 20: POST /api/activos/:id/mantenimiento
 * Registro de una mantención preventiva o correctiva (RF-2: trazabilidad de mantenciones).
 * Responsable: Alfredo (agregado para cubrir el evento MANTENIMIENTO de la bitácora)
 *
 * Body: {
 *   tipo_mantenimiento: 'Preventiva' | 'Correctiva'   (obligatorio)
 *   descripcion: string                                (obligatorio: qué se hizo)
 *   fecha?: 'YYYY-MM-DD'                               (por defecto hoy; no puede ser futura)
 *   estado_resultante?: 'Bueno' | 'Regular' | 'Malo' | 'En reparación'
 *   responsable?: string                               (técnico o proveedor que la realizó)
 *   costo?: number                                     (CLP, informativo)
 * }
 * Actualiza ultimo_mantenimiento, tipo_mantenimiento y (opcional) estado_operativo,
 * y registra el evento MANTENIMIENTO en la bitácora inmutable.
 */
router.post('/:id/mantenimiento', soloAdminTI, (req, res) => {
  const { id } = req.params;
  const { tipo_mantenimiento, descripcion, fecha, estado_resultante, responsable, costo } = req.body || {};
  const TIPOS = ['Preventiva', 'Correctiva'];
  const ESTADOS_RESULTANTES = ['Bueno', 'Regular', 'Malo', 'En reparación'];
  const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: process.env.APP_TZ || 'America/Santiago' });
  const errores = [];

  if (!TIPOS.includes(tipo_mantenimiento)) {
    errores.push({ campo: 'tipo_mantenimiento', mensaje: `Debe ser: ${TIPOS.join(' o ')}.` });
  }
  if (typeof descripcion !== 'string' || !descripcion.trim()) {
    errores.push({ campo: 'descripcion', mensaje: 'Describa el trabajo realizado.' });
  }
  const fechaMant = fecha === undefined || fecha === '' ? hoy : fecha;
  if (typeof fechaMant !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fechaMant) || Number.isNaN(Date.parse(fechaMant))) {
    errores.push({ campo: 'fecha', mensaje: 'Formato YYYY-MM-DD.' });
  } else if (fechaMant > hoy) {
    errores.push({ campo: 'fecha', mensaje: 'La fecha de mantención no puede ser futura.' });
  }
  if (estado_resultante !== undefined && estado_resultante !== '' && !ESTADOS_RESULTANTES.includes(estado_resultante)) {
    errores.push({ campo: 'estado_resultante', mensaje: `Debe ser: ${ESTADOS_RESULTANTES.join(', ')}. Para dar de baja use el endpoint de baja.` });
  }
  if (costo !== undefined && costo !== '' && (typeof costo !== 'number' || !Number.isFinite(costo) || costo <= 0)) {
    errores.push({ campo: 'costo', mensaje: 'Debe ser un número mayor que 0.' });
  }

  if (errores.length) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Datos de mantención inválidos.', details: errores }
    });
  }

  const activo = db.prepare('SELECT * FROM activos WHERE id_activo = ?').get(id);
  if (!activo) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Activo con identificador '${id}' no encontrado.`, details: [] }
    });
  }
  if (activo.estado_operativo === 'De baja') {
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: 'No se puede registrar mantención en un activo dado de baja.', details: [] }
    });
  }

  const nuevoEstado = estado_resultante || activo.estado_operativo;
  // Si ya hay una mantención más reciente registrada, no se retrocede la fecha
  const ultimo = !activo.ultimo_mantenimiento || fechaMant >= activo.ultimo_mantenimiento;

  const detalles = [
    `Estado: ${activo.estado_operativo} -> ${nuevoEstado}`,
    responsable ? `Responsable: ${String(responsable).trim()}` : null,
    costo !== undefined && costo !== '' ? `Costo: $${Number(costo).toLocaleString('es-CL')} CLP` : null,
    `Fecha de ejecución: ${fechaMant}`
  ].filter(Boolean).join(' | ');

  db.transaction(() => {
    db.prepare(`
      UPDATE activos SET
        ultimo_mantenimiento = CASE WHEN @ultimo THEN @fecha ELSE ultimo_mantenimiento END,
        tipo_mantenimiento   = CASE WHEN @ultimo THEN @tipo ELSE tipo_mantenimiento END,
        estado_operativo     = @estado
      WHERE id_activo = @id
    `).run({ ultimo: ultimo ? 1 : 0, fecha: fechaMant, tipo: tipo_mantenimiento, estado: nuevoEstado, id });

    db.prepare(`
      INSERT INTO historial (id_activo, fecha, tipo_evento, usuario, unidad_origen, unidad_destino,
                             custodio_anterior, custodio_nuevo, motivo, detalles)
      VALUES (?, ?, 'MANTENIMIENTO', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, new Date().toISOString(), req.user.nombre || req.user.username,
      activo.unidad, activo.unidad, activo.custodio, activo.custodio,
      `Mantención ${tipo_mantenimiento.toLowerCase()}: ${descripcion.trim()}`, detalles
    );
  })();

  return res.status(201).json({
    success: true,
    message: 'Mantención registrada en la bitácora.',
    data: {
      id_activo: id,
      tipo_mantenimiento,
      ultimo_mantenimiento: ultimo ? fechaMant : activo.ultimo_mantenimiento,
      estado_operativo: nuevoEstado
    }
  });
});

module.exports = router;
