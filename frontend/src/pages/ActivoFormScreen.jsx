import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Save, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { CATALOGOS } from '../catalogos.js';
import { FieldError } from '../components/FieldError';

function fechaISOValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

function validarFormularioActivo(formData, { isEdit, initialData, recepcionVerificada }) {
  const errores = {};
  const obligatorios = [
    ['id_activo', 'Escribe un ID único.'],
    ['categoria', 'Selecciona una categoría.'],
    ['marca_modelo', 'Escribe la marca y el modelo.'],
    ['ubicacion', 'Escribe la ubicación física.'],
    ['unidad', 'Selecciona una unidad municipal.'],
    ['custodio', 'Escribe el nombre del funcionario custodio.'],
    ['proveedor', 'Escribe el proveedor.'],
    ['contrato_oc', 'Escribe la orden de compra o contrato.'],
    ['fecha_adquisicion', 'Selecciona la fecha de adquisición.'],
    ['fecha_garantia', 'Selecciona la fecha de vencimiento de garantía.'],
    ['costo_inicial', 'Escribe el costo inicial.']
  ];

  obligatorios.forEach(([campo, mensaje]) => {
    if (!String(formData[campo] ?? '').trim()) errores[campo] = mensaje;
  });

  const limites = {
    id_activo: 64,
    marca_modelo: 200,
    descripcion: 2000,
    ubicacion: 200,
    custodio: 200,
    proceso_asociado: 200,
    proveedor: 200,
    contrato_oc: 200,
    licencias_asociadas: 1000,
    configuracion_red: 2000
  };
  Object.entries(limites).forEach(([campo, maximo]) => {
    if (String(formData[campo] ?? '').length > maximo) {
      errores[campo] = `No puede superar ${maximo} caracteres.`;
    }
  });

  if (!CATALOGOS.categorias.includes(formData.categoria)) {
    errores.categoria = 'Selecciona una categoría válida de la lista.';
  }
  if (!CATALOGOS.unidades.includes(formData.unidad)) {
    errores.unidad = 'Selecciona una unidad municipal válida de la lista.';
  }
  if (!CATALOGOS.estados_operativos.includes(formData.estado_operativo)) {
    errores.estado_operativo = 'Selecciona un estado operativo válido.';
  } else if (
    formData.estado_operativo === 'De baja' &&
    (!isEdit || initialData?.estado_operativo !== 'De baja')
  ) {
    errores.estado_operativo = 'Usa la acción “Dar de baja” para registrar el motivo y la bitácora.';
  }
  if (!CATALOGOS.criticidades.includes(formData.criticidad)) {
    errores.criticidad = 'Selecciona una criticidad válida.';
  }
  if (!CATALOGOS.tipos_mantenimiento.includes(formData.tipo_mantenimiento)) {
    errores.tipo_mantenimiento = 'Selecciona un tipo de mantención válido.';
  }

  const costoInicial = Number(formData.costo_inicial);
  const costoAnual = formData.costo_anual === '' ? 0 : Number(formData.costo_anual);
  if (!errores.costo_inicial && (!Number.isFinite(costoInicial) || costoInicial < 0 || costoInicial > 1_000_000_000_000)) {
    errores.costo_inicial = 'Ingresa un monto entre 0 y 1.000.000.000.000.';
  }
  if (!Number.isFinite(costoAnual) || costoAnual < 0 || costoAnual > 1_000_000_000_000) {
    errores.costo_anual = 'Ingresa un monto entre 0 y 1.000.000.000.000.';
  }

  ['fecha_adquisicion', 'fecha_garantia'].forEach((campo) => {
    if (!errores[campo] && !fechaISOValida(formData[campo])) {
      errores[campo] = 'Selecciona una fecha válida.';
    }
  });
  if (
    !errores.fecha_adquisicion &&
    !errores.fecha_garantia &&
    formData.fecha_garantia < formData.fecha_adquisicion
  ) {
    errores.fecha_garantia = 'No puede ser anterior a la fecha de adquisición.';
  }
  const hoyChile = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' });
  if (!isEdit && formData.fecha_adquisicion && formData.fecha_adquisicion > hoyChile) {
    errores.fecha_adquisicion = 'La fecha de adquisición no puede estar en el futuro.';
  }
  if (!isEdit && !recepcionVerificada) {
    errores.recepcion_verificada = 'Confirma que verificaste físicamente el bien y sus documentos.';
  }

  return errores;
}

export function ActivoFormScreen({ initialData, isEdit = false, onSaveSuccess, onCancel }) {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin_ti';

  const [formData, setFormData] = useState({
    id_activo: '',
    categoria: 'PC',
    marca_modelo: '',
    descripcion: '',
    ubicacion: '',
    unidad: 'DIDECO',
    custodio: '',
    estado_operativo: 'Bueno',
    ultimo_mantenimiento: '',
    tipo_mantenimiento: 'Preventiva',
    criticidad: 'Media',
    proceso_asociado: 'Proceso A (Solicitudes)',
    fecha_adquisicion: new Date().toISOString().split('T')[0],
    fecha_garantia: '2028-12-31',
    licencias_asociadas: '',
    proveedor: '',
    contrato_oc: '',
    costo_inicial: '',
    costo_anual: 0,
    configuracion_red: '',
    responsable_revision: user?.nombre || 'TI'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [recepcionVerificada, setRecepcionVerificada] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        costo_inicial: initialData.costo_inicial || '',
        costo_anual: initialData.costo_anual || 0,
        ultimo_mantenimiento: initialData.ultimo_mantenimiento || '',
        configuracion_red: initialData.configuracion_red && !initialData.configuracion_red.startsWith('[RESERVADO') 
          ? initialData.configuracion_red 
          : ''
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    setFieldErrors((previous) => ({ ...previous, [name]: '' }));
    setError(null);
  };

  const fieldError = (name) => (
    <FieldError id={`activo-${name}-error`} message={fieldErrors[name]} />
  );
  const fieldA11y = (name) => ({
    'aria-invalid': Boolean(fieldErrors[name]),
    ...(fieldErrors[name] ? { 'aria-describedby': `activo-${name}-error` } : {})
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const errores = validarFormularioActivo(formData, { isEdit, initialData, recepcionVerificada });
    setFieldErrors(errores);
    if (Object.keys(errores).length > 0) {
      setError('Corrige los campos marcados antes de guardar.');
      return;
    }

    const costoInicial = Number(formData.costo_inicial);
    const costoAnual = formData.costo_anual === '' ? 0 : Number(formData.costo_anual);

    setLoading(true);
    try {
      if (isEdit) {
        await api.updateActivo(formData.id_activo, {
          ...Object.fromEntries(
            Object.entries(formData).filter(([field]) => field !== 'ultimo_mantenimiento')
          ),
          costo_inicial: costoInicial,
          costo_anual: costoAnual
        });
      } else {
        await api.createActivo({
          ...formData,
          id_activo: formData.id_activo.trim().toUpperCase(),
          marca_modelo: formData.marca_modelo.trim(),
          ubicacion: formData.ubicacion.trim(),
          custodio: formData.custodio.trim(),
          proveedor: formData.proveedor.trim(),
          contrato_oc: formData.contrato_oc.trim(),
          costo_inicial: costoInicial,
          costo_anual: costoAnual,
          recepcion_verificada: true
        });
      }
      onSaveSuccess(formData.id_activo.trim().toUpperCase(), isEdit ? 'updated' : 'created');
    } catch (err) {
      const erroresServidor = Object.fromEntries(
        (Array.isArray(err.details) ? err.details : [])
          .filter((detalle) => detalle.campo && detalle.mensaje)
          .map((detalle) => [detalle.campo, detalle.mensaje])
      );
      if (err.status === 409) erroresServidor.id_activo = err.message;
      setFieldErrors(erroresServidor);
      setError(Object.keys(erroresServidor).length
        ? 'Revisa los campos marcados por el servidor.'
        : (err.message || 'Error guardando datos del activo.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '960px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <button type="button" className="btn btn-outline btn-sm" onClick={onCancel} style={{ marginBottom: 8 }}>
            <ArrowLeft size={15} /> Volver
          </button>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)' }}>
            {isEdit ? `Editar Activo: ${formData.id_activo}` : 'Alta de Nuevo Activo Tecnológico'}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Registro formal en el Inventario Municipal según modelo de la Tabla 7
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 20 }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {!isEdit && (
        <div className="card" style={{ marginBottom: 18, borderLeft: '4px solid #2563eb' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontWeight: 700 }}>
            <input
              type="checkbox"
              checked={recepcionVerificada}
              aria-invalid={Boolean(fieldErrors.recepcion_verificada)}
              aria-describedby={fieldErrors.recepcion_verificada ? 'activo-recepcion-error' : undefined}
              onChange={(event) => {
                setRecepcionVerificada(event.target.checked);
                setFieldErrors((previous) => ({ ...previous, recepcion_verificada: '' }));
                setError(null);
              }}
              style={{ marginTop: 4 }}
            />
            Confirmo que revisé físicamente el bien y cotejé su identificación, estado y orden de compra antes de registrar la recepción.
          </label>
          {fieldError('recepcion_verificada')}
          <p className="form-helper" style={{ marginTop: 6, marginLeft: 24 }}>
            La confirmación queda registrada en la bitácora junto al usuario responsable y la OC/contrato.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Sección 1: Identificación y Clasificación */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">1. Identificación y Clasificación del Bien</div>
            <span className="badge badge-secondary">Público</span>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">ID Único Institucional *</label>
              <input
                type="text"
                className="form-input"
                name="id_activo"
                {...fieldA11y('id_activo')}
                value={formData.id_activo}
                onChange={handleChange}
                placeholder="SP-HW-XXXX / SP-SW-XXXX"
                disabled={isEdit}
                maxLength={64}
                required
              />
              {fieldError('id_activo')}
              <span className="form-helper">Clave primaria inalterable una vez registrado.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Categoría *</label>
              <select
                className="form-select"
                name="categoria"
                {...fieldA11y('categoria')}
                value={formData.categoria}
                onChange={handleChange}
                required
              >
                {CATALOGOS.categorias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {fieldError('categoria')}
            </div>

            <div className="form-group form-grid-full">
              <label className="form-label">Marca y Modelo Comercial *</label>
              <input
                type="text"
                className="form-input"
                name="marca_modelo"
                {...fieldA11y('marca_modelo')}
                value={formData.marca_modelo}
                onChange={handleChange}
                placeholder="Ej: Lenovo ThinkPad E14 Gen 4 / HP LaserJet Pro 4003dw"
                maxLength={200}
                required
              />
              {fieldError('marca_modelo')}
            </div>

            <div className="form-group form-grid-full">
              <label className="form-label">Descripción Técnica Detallada</label>
              <textarea
                className="form-textarea"
                rows={2}
                name="descripcion"
                {...fieldA11y('descripcion')}
                value={formData.descripcion}
                onChange={handleChange}
                placeholder="Ej: Intel Core i5 12va Gen, 16GB RAM DDR4, SSD 512GB NVMe. Incluye cargador y candado."
              />
              {fieldError('descripcion')}
            </div>
          </div>
        </div>

        {/* Sección 2: Ubicación, Custodia y Condición */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">2. Asignación, Custodia y Estado Operativo</div>
            <span className="badge badge-secondary">Interno</span>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Unidad Municipal Asignada *</label>
              <select
                className="form-select"
                name="unidad"
                {...fieldA11y('unidad')}
                value={formData.unidad}
                onChange={handleChange}
                required
              >
                {CATALOGOS.unidades.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              {fieldError('unidad')}
            </div>

            <div className="form-group">
              <label className="form-label">Funcionario Custodio / Responsable *</label>
              <input
                type="text"
                className="form-input"
                name="custodio"
                {...fieldA11y('custodio')}
                value={formData.custodio}
                onChange={handleChange}
                placeholder="Ej: Marcela Huenchumán Soto"
                maxLength={200}
                required
              />
              {fieldError('custodio')}
            </div>

            <div className="form-group form-grid-full">
              <label className="form-label">Ubicación Física *</label>
              <input
                type="text"
                className="form-input"
                name="ubicacion"
                {...fieldA11y('ubicacion')}
                value={formData.ubicacion}
                onChange={handleChange}
                placeholder="Ej: DIDECO - Equipo Territorial Quilacahuín / Edificio Consistorial Oficina 204"
                maxLength={200}
                required
              />
              {fieldError('ubicacion')}
            </div>

            <div className="form-group">
              <label className="form-label">Estado Operativo Actual *</label>
              <select
                className="form-select"
                name="estado_operativo"
                {...fieldA11y('estado_operativo')}
                value={formData.estado_operativo}
                onChange={handleChange}
                required
              >
                {CATALOGOS.estados_operativos
                  .filter((estado) =>
                    estado !== 'De baja' ||
                    (isEdit && initialData?.estado_operativo === 'De baja')
                  )
                  .map((e) => (
                  <option key={e} value={e}>{e}</option>
                  ))}
              </select>
              {fieldError('estado_operativo')}
            </div>

            <div className="form-group">
              <label className="form-label">Proceso Municipal Dependiente</label>
              <input
                type="text"
                className="form-input"
                name="proceso_asociado"
                {...fieldA11y('proceso_asociado')}
                value={formData.proceso_asociado}
                onChange={handleChange}
                placeholder="Ej: Proceso A (Solicitudes Ciudadanas)"
              />
              {fieldError('proceso_asociado')}
            </div>
          </div>
        </div>

        {/* Sección 3: Proveedor, Compras y Garantía */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">3. Adquisición, Garantía y TCO (Ley N.º 19.886)</div>
            <span className="badge badge-secondary">Público</span>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Proveedor Adjudicado *</label>
              <input
                type="text"
                className="form-input"
                name="proveedor"
                {...fieldA11y('proveedor')}
                value={formData.proveedor}
                onChange={handleChange}
                placeholder="Ej: Proveedor TI Sur Ltda."
                maxLength={200}
                required
              />
              {fieldError('proveedor')}
            </div>

            <div className="form-group">
              <label className="form-label">Orden de Compra / Contrato *</label>
              <input
                type="text"
                className="form-input"
                name="contrato_oc"
                {...fieldA11y('contrato_oc')}
                value={formData.contrato_oc}
                onChange={handleChange}
                placeholder="OC 4521-12-SE25"
                maxLength={100}
                required
              />
              {fieldError('contrato_oc')}
            </div>

            <div className="form-group">
              <label className="form-label">Fecha de Adquisición *</label>
              <input
                type="date"
                className="form-input"
                name="fecha_adquisicion"
                {...fieldA11y('fecha_adquisicion')}
                value={formData.fecha_adquisicion}
                onChange={handleChange}
                required
              />
              {fieldError('fecha_adquisicion')}
            </div>

            <div className="form-group">
              <label className="form-label">Vencimiento de Garantía *</label>
              <input
                type="date"
                className="form-input"
                name="fecha_garantia"
                {...fieldA11y('fecha_garantia')}
                value={formData.fecha_garantia}
                onChange={handleChange}
                required
              />
              {fieldError('fecha_garantia')}
            </div>

            <div className="form-group">
              <label className="form-label">Costo Inicial ($ CLP) *</label>
              <input
                type="number"
                className="form-input"
                name="costo_inicial"
                {...fieldA11y('costo_inicial')}
                value={formData.costo_inicial}
                onChange={handleChange}
                placeholder="650000"
                min="0"
                step="1"
                required
              />
              {fieldError('costo_inicial')}
            </div>

            <div className="form-group">
              <label className="form-label">Costo Anual Recurrente ($ CLP/año)</label>
              <input
                type="number"
                className="form-input"
                name="costo_anual"
                {...fieldA11y('costo_anual')}
                value={formData.costo_anual}
                onChange={handleChange}
                placeholder="0"
                min="0"
                step="1"
              />
              {fieldError('costo_anual')}
            </div>

            <div className="form-group form-grid-full">
              <label className="form-label">Licencias Asociadas y Software Preinstalado</label>
              <input
                type="text"
                className="form-input"
                name="licencias_asociadas"
                {...fieldA11y('licencias_asociadas')}
                value={formData.licencias_asociadas}
                onChange={handleChange}
                placeholder="Ej: Windows 11 Pro OEM, Office 2021 Hogar y Empresas"
              />
              {fieldError('licencias_asociadas')}
            </div>
          </div>
        </div>

        {/* Sección 4: Configuración Reservada de Seguridad (Solo Admin TI) */}
        {isAdmin && (
          <div className="card" style={{ borderColor: '#bfdbfe', background: '#f8fafc' }}>
            <div className="card-header">
              <div className="card-title">
                <ShieldAlert size={18} style={{ color: 'var(--primary)' }} />
                <span>4. Parámetros Técnicos Reservados (Ley N.º 21.663)</span>
              </div>
              <span className="badge badge-purple">Solo Administrador TI</span>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Nivel de Criticidad Institucional</label>
                <select
                  className="form-select"
                  name="criticidad"
                  {...fieldA11y('criticidad')}
                  value={formData.criticidad}
                  onChange={handleChange}
                >
                  {CATALOGOS.criticidades.map((cr) => (
                    <option key={cr} value={cr}>{cr}</option>
                  ))}
                </select>
                {fieldError('criticidad')}
                <span className="form-helper">Nivel de impacto en caso de falla o indisponibilidad.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Mantención Registrada</label>
                <select
                  className="form-select"
                  name="tipo_mantenimiento"
                  {...fieldA11y('tipo_mantenimiento')}
                  value={formData.tipo_mantenimiento}
                  onChange={handleChange}
                >
                  {CATALOGOS.tipos_mantenimiento.map((tm) => (
                    <option key={tm} value={tm}>{tm}</option>
                  ))}
                </select>
                {fieldError('tipo_mantenimiento')}
              </div>

              <div className="form-group form-grid-full">
                <label className="form-label">Configuración de Red / IP / VLAN / Firmware / BitLocker</label>
                <input
                  type="text"
                  className="form-input"
                  name="configuracion_red"
                  {...fieldA11y('configuracion_red')}
                  value={formData.configuracion_red}
                  onChange={handleChange}
                  placeholder="Ej: IP 192.168.20.45 / VLAN 20 / Windows 11 22H2 / BitLocker Cifrado: ACTIVO"
                />
                {fieldError('configuracion_red')}
                <span className="form-helper">
                  Información estrictamente clasificada. No se divulga en perfiles de jefatura ni auditoría.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Botones de acción del formulario */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || (!isEdit && !recepcionVerificada)}
            style={{ padding: '10px 24px' }}
          >
            <Save size={16} />
            {loading ? 'Guardando en Inventario...' : (isEdit ? 'Actualizar Activo' : 'Completar Registro')}
          </button>
        </div>
      </form>
    </div>
  );
}
