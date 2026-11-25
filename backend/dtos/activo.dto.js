const CATEGORIAS_VALIDAS = ['PC', 'Portátil', 'Servidor', 'Red', 'Impresora', 'Software', 'Nube'];
const ESTADOS_VALIDOS = ['Bueno', 'Regular', 'Malo', 'En reparación', 'De baja'];
const CRITICIDADES_VALIDAS = ['Baja', 'Media', 'Alta'];
const MANTENIMIENTOS_VALIDOS = ['Preventiva', 'Correctiva', 'Sin mantención'];

const TEXTO_MAXIMO = {
  id_activo: 64,
  categoria: 50,
  marca_modelo: 200,
  descripcion: 2000,
  ubicacion: 200,
  unidad: 100,
  custodio: 200,
  estado_operativo: 50,
  ultimo_mantenimiento: 10,
  tipo_mantenimiento: 50,
  criticidad: 30,
  proceso_asociado: 200,
  fecha_adquisicion: 10,
  fecha_garantia: 10,
  licencias_asociadas: 1000,
  proveedor: 200,
  contrato_oc: 200,
  configuracion_red: 2000,
  motivo: 500,
  detalles: 2000
};

const CAMPOS_REQUERIDOS_ALTA = [
  'id_activo',
  'categoria',
  'marca_modelo',
  'ubicacion',
  'unidad',
  'custodio',
  'proveedor',
  'contrato_oc',
  'fecha_adquisicion',
  'fecha_garantia'
];

const CAMPOS_TEXTO_NULABLES = new Set([
  'descripcion',
  'ultimo_mantenimiento',
  'tipo_mantenimiento',
  'proceso_asociado',
  'licencias_asociadas',
  'proveedor',
  'configuracion_red',
  'motivo',
  'detalles'
]);

const CAMPOS_FECHA = new Set(['ultimo_mantenimiento', 'fecha_adquisicion', 'fecha_garantia']);
const CAMPOS_COSTO = new Set(['costo_inicial', 'costo_anual']);

const CAMPOS_COMUNES = [
  ...Object.keys(TEXTO_MAXIMO),
  'costo_inicial',
  'costo_anual'
];

function fechaValida(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseActivoDto(input, { create = false } = {}) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { data: null, errors: [{ campo: 'body', mensaje: 'El cuerpo de la solicitud debe ser un objeto.' }] };
  }

  const allowedFields = new Set([
    ...CAMPOS_COMUNES,
    ...(create ? ['recepcion_verificada'] : [])
  ]);
  const data = {};

  for (const [field, value] of Object.entries(input)) {
    if (allowedFields.has(field)) data[field] = value;
  }

  for (const field of Object.keys(TEXTO_MAXIMO)) {
    if (!(field in data)) {
      if (create && CAMPOS_REQUERIDOS_ALTA.includes(field)) {
        errors.push({ campo: field, mensaje: 'Este campo es obligatorio.' });
      }
      continue;
    }
    const value = data[field];
    if (value === null && CAMPOS_TEXTO_NULABLES.has(field) && !(create && CAMPOS_REQUERIDOS_ALTA.includes(field))) continue;
    if (typeof value !== 'string') {
      errors.push({ campo: field, mensaje: 'Debe ser texto.' });
      continue;
    }

    data[field] = value.trim();
    // Un campo opcional enviado vacío ("") significa "sin dato": se guarda como NULL.
    // El formulario envía "" en ultimo_mantenimiento al dar de alta un equipo que aún no tiene
    // mantenciones; antes se validaba como fecha y el alta fallaba siempre.
    // Excepción: si el campo es obligatorio en el alta (ej. proveedor), vacío sigue siendo error.
    if (data[field] === '' && CAMPOS_TEXTO_NULABLES.has(field) && !(create && CAMPOS_REQUERIDOS_ALTA.includes(field))) {
      data[field] = null;
      continue;
    }
    if (data[field].length > TEXTO_MAXIMO[field]) {
      errors.push({ campo: field, mensaje: `No puede superar ${TEXTO_MAXIMO[field]} caracteres.` });
    } else if (create && CAMPOS_REQUERIDOS_ALTA.includes(field) && !data[field]) {
      errors.push({ campo: field, mensaje: 'Este campo es obligatorio.' });
    }
  }

  if (data.id_activo) data.id_activo = data.id_activo.toUpperCase();

  for (const field of CAMPOS_COSTO) {
    if (!(field in data)) {
      if (create) errors.push({ campo: field, mensaje: 'Debe ingresar un monto (0 si no aplica).' });
      continue;
    }
    const value = typeof data[field] === 'string' && data[field].trim() !== ''
      ? Number(data[field])
      : data[field];
    // Obligatorio, pero 0 es válido: equipos sin costo recurrente o software gratuito/donado
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1_000_000_000_000) {
      errors.push({ campo: field, mensaje: 'Ingrese un monto entre 0 y 1.000.000.000.000.' });
    } else {
      data[field] = value;
    }
  }

  for (const field of CAMPOS_FECHA) {
    if (!(field in data) || data[field] === null) continue;
    if (field === 'ultimo_mantenimiento' && data[field] === '') {
      data[field] = null;
      continue;
    }
    if (typeof data[field] !== 'string' || !fechaValida(data[field])) {
      errors.push({ campo: field, mensaje: 'Use una fecha válida en formato AAAA-MM-DD.' });
    }
  }

  const listas = [
    ['categoria', CATEGORIAS_VALIDAS],
    ['estado_operativo', ESTADOS_VALIDOS],
    ['criticidad', CRITICIDADES_VALIDAS],
    ['tipo_mantenimiento', MANTENIMIENTOS_VALIDOS]
  ];
  for (const [field, values] of listas) {
    if (data[field] != null && !values.includes(data[field])) {
      errors.push({ campo: field, mensaje: `Seleccione uno de los valores permitidos: ${values.join(', ')}.` });
    }
  }

  if ('recepcion_verificada' in data && typeof data.recepcion_verificada !== 'boolean') {
    errors.push({ campo: 'recepcion_verificada', mensaje: 'Debe ser una confirmación sí/no.' });
  }

  if (
    data.fecha_adquisicion &&
    data.fecha_garantia &&
    fechaValida(data.fecha_adquisicion) &&
    fechaValida(data.fecha_garantia) &&
    data.fecha_garantia < data.fecha_adquisicion
  ) {
    errors.push({ campo: 'fecha_garantia', mensaje: 'No puede ser anterior a la fecha de adquisición.' });
  }

  return { data: errors.length ? null : data, errors };
}

module.exports = { parseActivoDto };
