/**
 * importar.js - Carga masiva de activos desde filas CSV convertidas a JSON.
 * Responsable según reparto: Gaby
 */

const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const { requerirRol } = require('../middlewares/roles');
const { fechaHoyLocal } = require('../utils/alertas');
const db = require('../../db/database');

const CATEGORIAS_VALIDAS = ['PC', 'Portátil', 'Servidor', 'Red', 'Impresora', 'Software', 'Nube'];
const ESTADOS_VALIDOS = ['Bueno', 'Regular', 'Malo', 'En reparación', 'De baja'];
const CRITICIDADES_VALIDAS = ['Alta', 'Media', 'Baja'];
const TIPOS_MANTENIMIENTO_VALIDOS = ['Preventiva', 'Correctiva', 'Sin mantención'];
const soloAdmin = [verificarToken, requerirRol('admin_ti')];

function fechaValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

function numeroNoNegativo(valor) {
  if (valor === undefined || valor === null || valor === '') return 0;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

// Solo /importar: el alias '/' hacía que un POST /api a secas ejecutara una importación.
router.post('/importar', soloAdmin, (req, res) => {
  const filas = req.body && req.body.filas;
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

  if (req.body.recepcion_verificada !== true) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Confirme la verificación física y documental del lote antes de registrar su recepción.',
        details: []
      }
    });
  }

  const hoy = fechaHoyLocal();
  const filasInvalidas = [];
  const filasValidas = [];
  const idsVistos = new Set();
  const existeActivo = db.prepare('SELECT 1 FROM activos WHERE id_activo = ?');

  filas.forEach((fila, index) => {
    const numeroFila = index + 1;
    if (!fila || typeof fila !== 'object' || Array.isArray(fila)) {
      filasInvalidas.push({ fila: numeroFila, id_activo: null, error: 'La fila debe ser un objeto de activo.' });
      return;
    }

    const id = String(fila.id_activo || '').trim().toUpperCase();
    const errores = [];

    if (!id) {
      errores.push('Falta identificador id_activo.');
    } else {
      if (idsVistos.has(id)) errores.push(`ID '${id}' está duplicado en el archivo.`);
      else idsVistos.add(id);
      if (existeActivo.get(id)) errores.push(`ID '${id}' ya existe en la base de datos (clave duplicada).`);
    }

    if (!CATEGORIAS_VALIDAS.includes(fila.categoria)) {
      errores.push(`Categoría '${fila.categoria || ''}' no permitida en lista cerrada.`);
    }

    for (const campo of ['marca_modelo', 'ubicacion', 'unidad', 'custodio', 'contrato_oc']) {
      if (!String(fila[campo] || '').trim()) errores.push(`Falta el campo obligatorio ${campo}.`);
    }

    const estado = fila.estado_operativo || 'Bueno';
    const criticidad = fila.criticidad || 'Media';
    const tipoMantenimiento = fila.tipo_mantenimiento || 'Preventiva';
    if (!ESTADOS_VALIDOS.includes(estado)) errores.push(`Estado operativo '${estado}' no permitido.`);
    if (!CRITICIDADES_VALIDAS.includes(criticidad)) errores.push(`Criticidad '${criticidad}' no permitida.`);
    if (!TIPOS_MANTENIMIENTO_VALIDOS.includes(tipoMantenimiento)) {
      errores.push(`Tipo de mantenimiento '${tipoMantenimiento}' no permitido.`);
    }

    const costoInicial = numeroNoNegativo(fila.costo_inicial);
    const costoAnual = numeroNoNegativo(fila.costo_anual);
    if (costoInicial === null) errores.push('costo_inicial debe ser un número no negativo.');
    if (costoAnual === null) errores.push('costo_anual debe ser un número no negativo.');

    for (const campo of ['fecha_adquisicion', 'fecha_garantia', 'ultimo_mantenimiento']) {
      if (fila[campo] && !fechaValida(String(fila[campo]).trim())) {
        errores.push(`${campo} debe tener formato de fecha YYYY-MM-DD.`);
      }
    }
    if (estado === 'De baja' && !String(fila.motivo_baja || '').trim()) {
      errores.push("El campo motivo_baja es obligatorio para activos 'De baja'.");
    }

    if (errores.length) {
      filasInvalidas.push({ fila: numeroFila, id_activo: id || null, error: errores.join(' ') });
      return;
    }

    filasValidas.push({
      ...fila,
      id_activo: id,
      marca_modelo: String(fila.marca_modelo).trim(),
      ubicacion: String(fila.ubicacion).trim(),
      unidad: String(fila.unidad).trim(),
      custodio: String(fila.custodio).trim(),
      contrato_oc: String(fila.contrato_oc).trim(),
      estado_operativo: estado,
      criticidad,
      tipo_mantenimiento: tipoMantenimiento,
      costo_inicial: costoInicial,
      costo_anual: costoAnual,
      fecha_adquisicion: fila.fecha_adquisicion || hoy,
      fecha_garantia: fila.fecha_garantia || hoy
    });
  });

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
        id_activo, fecha, tipo_evento, usuario, unidad_origen, unidad_destino,
        custodio_anterior, custodio_nuevo, motivo, detalles
      ) VALUES (?, ?, 'IMPORTACION', ?, null, ?, null, ?, 'Importación masiva CSV', ?)
    `);
    const fechaEvento = new Date().toISOString();
    const usuario = req.user.nombre || req.user.username;

    db.transaction(() => {
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
          tipo_mantenimiento: item.tipo_mantenimiento,
          criticidad: item.criticidad,
          proceso_asociado: item.proceso_asociado || null,
          fecha_adquisicion: item.fecha_adquisicion,
          fecha_garantia: item.fecha_garantia,
          licencias_asociadas: item.licencias_asociadas || null,
          proveedor: item.proveedor || 'Sin proveedor asignado',
          contrato_oc: item.contrato_oc,
          costo_inicial: item.costo_inicial,
          costo_anual: item.costo_anual,
          configuracion_red: item.configuracion_red || null,
          fecha_revision: hoy,
          responsable_revision: usuario,
          motivo_baja: item.motivo_baja || null
        });
        insertHistorial.run(
          item.id_activo,
          fechaEvento,
          usuario,
          item.unidad,
          item.custodio,
          `Control de recepción física y documental confirmado antes del alta; documento: ${item.contrato_oc || 'Sin OC'}.`
        );
      }
    })();
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
