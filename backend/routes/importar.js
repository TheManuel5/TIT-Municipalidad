/**
 * importar.js - Carga Masiva de Activos (CSV o JSON)
 * Responsable según reparto: Gaby
 * Municipalidad de San Pablo - Plan Informático Municipal 2027-2031 (Proyecto A)
 * Cumple con docs/contrato-api.md (Sección 4.4: Endpoint 13)
 */

const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const { requerirRol } = require('../middlewares/roles');
const db = require('../../db/database');

const CATEGORIAS_VALIDAS = ['PC', 'Portátil', 'Servidor', 'Red', 'Impresora', 'Software', 'Nube'];
const ESTADOS_VALIDOS = ['Bueno', 'Regular', 'Malo', 'En reparación', 'De baja'];

const soloAdmin = [verificarToken, requerirRol('admin_ti')];

/**
 * Endpoint 13: POST /api/importar (y /api/importar masivo)
 * Carga masiva de activos con discriminación de filas válidas y erróneas
 */
router.post(['/importar', '/'], soloAdmin, (req, res) => {
  const filas = req.body.filas || [];

  if (!Array.isArray(filas) || filas.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'No se recibieron filas para procesar. Envíe un arreglo de activos en el campo "filas".',
        details: []
      }
    });
  }

  const filasInvalidas = [];
  const filasValidas = [];

  const checkStmt = db.prepare('SELECT id_activo FROM activos WHERE id_activo = ?');

  // Evaluar cada fila
  filas.forEach((fila, index) => {
    const numFila = index + 1;
    const id = fila.id_activo ? String(fila.id_activo).trim() : '';

    if (!id) {
      filasInvalidas.push({ fila: numFila, id_activo: null, error: 'Falta identificador id_activo.' });
      return;
    }

    if (checkStmt.get(id)) {
      filasInvalidas.push({ fila: numFila, id_activo: id, error: `ID '${id}' ya existe en la base de datos (clave duplicada).` });
      return;
    }

    if (!fila.categoria || !CATEGORIAS_VALIDAS.includes(fila.categoria)) {
      filasInvalidas.push({
        fila: numFila,
        id_activo: id,
        error: `Categoría '${fila.categoria || ''}' no permitida en lista cerrada.`
      });
      return;
    }

    if (!fila.marca_modelo || !fila.ubicacion || !fila.unidad || !fila.custodio) {
      filasInvalidas.push({
        fila: numFila,
        id_activo: id,
        error: 'Faltan campos obligatorios (marca_modelo, ubicacion, unidad o custodio).'
      });
      return;
    }

    filasValidas.push({
      ...fila,
      id_activo: id,
      estado_operativo: ESTADOS_VALIDOS.includes(fila.estado_operativo) ? fila.estado_operativo : 'Bueno',
      criticidad: ['Alta', 'Media', 'Baja'].includes(fila.criticidad) ? fila.criticidad : 'Media',
      costo_inicial: Number(fila.costo_inicial) || 0,
      costo_anual: Number(fila.costo_anual) || 0
    });
  });

  // Insertar filas válidas en transacción
  if (filasValidas.length > 0) {
    const insertActivo = db.prepare(`
      INSERT INTO activos (
        id_activo, categoria, marca_modelo, descripcion, ubicacion, unidad, custodio,
        estado_operativo, ultimo_mantenimiento, tipo_mantenimiento, criticidad, proceso_asociado,
        fecha_adquisicion, fecha_garantia, licencias_asociadas, proveedor, contrato_oc,
        costo_inicial, costo_anual, configuracion_red, fecha_revision, responsable_revision, motivo_baja
      ) VALUES (
        @id_activo, @categoria, @marca_modelo, @descripcion, @ubicacion, @unidad, @custodio,
        @estado_operativo, @ultimo_mantenimiento, @tipo_mantenimiento, @criticidad, @proceso_asociado,
        @fecha_adquisicion, @fecha_garantia, @licencias_asociadas, @proveedor, @contrato_oc,
        @costo_inicial, @costo_anual, @configuracion_red, @fecha_revision, @responsable_revision, @motivo_baja
      )
    `);

    const insertHistorial = db.prepare(`
      INSERT INTO historial (
        id_activo, fecha, tipo_evento, usuario, unidad_origen, unidad_destino, custodio_anterior, custodio_nuevo, motivo, detalles
      ) VALUES (
        ?, ?, 'ALTA', ?, null, ?, null, ?, 'Carga masiva por importación CSV', 'Importación institucional por lote'
      )
    `);

    const hoyISO = new Date().toISOString();
    const hoyStr = hoyISO.split('T')[0];

    const runImport = db.transaction(() => {
      for (const item of filasValidas) {
        insertActivo.run({
          id_activo: item.id_activo,
          categoria: item.categoria,
          marca_modelo: item.marca_modelo,
          descripcion: item.descripcion || null,
          ubicacion: item.ubicacion,
          unidad: item.unidad,
          custodio: item.custodio,
          estado_operativo: item.estado_operativo,
          ultimo_mantenimiento: item.ultimo_mantenimiento || null,
          tipo_mantenimiento: item.tipo_mantenimiento || 'Preventiva',
          criticidad: item.criticidad,
          proceso_asociado: item.proceso_asociado || null,
          fecha_adquisicion: item.fecha_adquisicion || hoyStr,
          fecha_garantia: item.fecha_garantia || hoyStr,
          licencias_asociadas: item.licencias_asociadas || null,
          proveedor: item.proveedor || 'Sin proveedor asignado',
          contrato_oc: item.contrato_oc || 'Sin OC',
          costo_inicial: item.costo_inicial,
          costo_anual: item.costo_anual,
          configuracion_red: item.configuracion_red || null,
          fecha_revision: hoyStr,
          responsable_revision: req.user.nombre,
          motivo_baja: null
        });

        insertHistorial.run(
          item.id_activo,
          hoyISO,
          req.user.nombre || req.user.username,
          item.unidad,
          item.custodio
        );
      }
    });

    runImport();
  }

  return res.status(200).json({
    success: true,
    data: {
      resumen: {
        total_procesadas: filas.length,
        validas: filasValidas.length,
        con_error: filasInvalidas.length
      },
      filas_invalidas: filasInvalidas
    }
  });
});

module.exports = router;
