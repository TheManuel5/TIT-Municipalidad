import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Save, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { CATALOGOS } from '../catalogos.js';

function fechaISOValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const camposObligatorios = [
      ['id_activo', 'ID único'],
      ['categoria', 'categoría'],
      ['marca_modelo', 'marca y modelo'],
      ['ubicacion', 'ubicación física'],
      ['unidad', 'unidad municipal'],
      ['custodio', 'funcionario custodio'],
      ['proveedor', 'proveedor'],
      ['contrato_oc', 'orden de compra o contrato'],
      ['fecha_adquisicion', 'fecha de adquisición'],
      ['fecha_garantia', 'fecha de vencimiento de garantía'],
      ['costo_inicial', 'costo inicial']
    ];
    const campoFaltante = camposObligatorios.find(([campo]) => !String(formData[campo] ?? '').trim());
    if (campoFaltante) {
      setError(`Completa el campo obligatorio: ${campoFaltante[1]}.`);
      return;
    }

    if (!CATALOGOS.categorias.includes(formData.categoria)) {
      setError('Selecciona una categoría válida de la lista.');
      return;
    }
    if (!CATALOGOS.unidades.includes(formData.unidad)) {
      setError('Selecciona una unidad municipal válida de la lista.');
      return;
    }
    if (!CATALOGOS.estados_operativos.includes(formData.estado_operativo)) {
      setError('Selecciona un estado operativo válido de la lista.');
      return;
    }
    if (
      formData.estado_operativo === 'De baja' &&
      (!isEdit || initialData?.estado_operativo !== 'De baja')
    ) {
      setError('Para dar de baja un activo, cancela este formulario y usa la acción “Dar de baja” para guardar el motivo y la bitácora.');
      return;
    }
    if (!CATALOGOS.criticidades.includes(formData.criticidad)) {
      setError('Selecciona una criticidad válida de la lista.');
      return;
    }
    if (!CATALOGOS.tipos_mantenimiento.includes(formData.tipo_mantenimiento)) {
      setError('Selecciona un tipo de mantención válido de la lista.');
      return;
    }

    const costoInicial = Number(formData.costo_inicial);
    const costoAnual = formData.costo_anual === '' ? 0 : Number(formData.costo_anual);
    if (!Number.isFinite(costoInicial) || costoInicial < 0) {
      setError('El costo inicial debe ser un número igual o mayor que cero.');
      return;
    }
    if (!Number.isFinite(costoAnual) || costoAnual < 0) {
      setError('El costo anual debe ser un número igual o mayor que cero.');
      return;
    }
    if (!fechaISOValida(formData.fecha_adquisicion) || !fechaISOValida(formData.fecha_garantia)) {
      setError('Revisa las fechas: usa una fecha válida en ambos campos.');
      return;
    }
    if (formData.fecha_garantia < formData.fecha_adquisicion) {
      setError('La fecha de vencimiento de garantía no puede ser anterior a la fecha de adquisición.');
      return;
    }
    if (formData.ultimo_mantenimiento && !fechaISOValida(formData.ultimo_mantenimiento)) {
      setError('La fecha del último mantenimiento no es válida. Usa el selector de fecha.');
      return;
    }
    const hoyChile = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' });
    if (formData.ultimo_mantenimiento && formData.ultimo_mantenimiento > hoyChile) {
      setError('La fecha del último mantenimiento no puede estar en el futuro.');
      return;
    }
    if (
      !isEdit &&
      formData.fecha_adquisicion > hoyChile
    ) {
      setError('La fecha de adquisición no puede estar en el futuro.');
      return;
    }
    if (!isEdit && !recepcionVerificada) {
      setError('Confirma que verificaste físicamente el bien y sus documentos antes de registrarlo.');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await api.updateActivo(formData.id_activo, {
          ...formData,
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
      onSaveSuccess(formData.id_activo.trim().toUpperCase());
    } catch (err) {
      setError(err.message || 'Error guardando datos del activo.');
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
              onChange={(event) => setRecepcionVerificada(event.target.checked)}
              style={{ marginTop: 4 }}
            />
            Confirmo que revisé físicamente el bien y cotejé su identificación, estado y orden de compra antes de registrar la recepción.
          </label>
          <p className="form-helper" style={{ marginTop: 6, marginLeft: 24 }}>
            La confirmación queda registrada en la bitácora junto al usuario responsable y la OC/contrato.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
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
                value={formData.id_activo}
                onChange={handleChange}
                placeholder="SP-HW-XXXX / SP-SW-XXXX"
                disabled={isEdit}
                maxLength={64}
                required
              />
              <span className="form-helper">Clave primaria inalterable una vez registrado.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Categoría *</label>
              <select
                className="form-select"
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
                required
              >
                {CATALOGOS.categorias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group form-grid-full">
              <label className="form-label">Marca y Modelo Comercial *</label>
              <input
                type="text"
                className="form-input"
                name="marca_modelo"
                value={formData.marca_modelo}
                onChange={handleChange}
                placeholder="Ej: Lenovo ThinkPad E14 Gen 4 / HP LaserJet Pro 4003dw"
                maxLength={200}
                required
              />
            </div>

            <div className="form-group form-grid-full">
              <label className="form-label">Descripción Técnica Detallada</label>
              <textarea
                className="form-textarea"
                rows={2}
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                placeholder="Ej: Intel Core i5 12va Gen, 16GB RAM DDR4, SSD 512GB NVMe. Incluye cargador y candado."
              />
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
                value={formData.unidad}
                onChange={handleChange}
                required
              >
                {CATALOGOS.unidades.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Funcionario Custodio / Responsable *</label>
              <input
                type="text"
                className="form-input"
                name="custodio"
                value={formData.custodio}
                onChange={handleChange}
                placeholder="Ej: Marcela Huenchumán Soto"
                maxLength={200}
                required
              />
            </div>

            <div className="form-group form-grid-full">
              <label className="form-label">Ubicación Física *</label>
              <input
                type="text"
                className="form-input"
                name="ubicacion"
                value={formData.ubicacion}
                onChange={handleChange}
                placeholder="Ej: DIDECO - Equipo Territorial Quilacahuín / Edificio Consistorial Oficina 204"
                maxLength={200}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Estado Operativo Actual *</label>
              <select
                className="form-select"
                name="estado_operativo"
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
            </div>

            <div className="form-group">
              <label className="form-label">Proceso Municipal Dependiente</label>
              <input
                type="text"
                className="form-input"
                name="proceso_asociado"
                value={formData.proceso_asociado}
                onChange={handleChange}
                placeholder="Ej: Proceso A (Solicitudes Ciudadanas)"
              />
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
                value={formData.proveedor}
                onChange={handleChange}
                placeholder="Ej: Proveedor TI Sur Ltda."
                maxLength={200}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Orden de Compra / Contrato *</label>
              <input
                type="text"
                className="form-input"
                name="contrato_oc"
                value={formData.contrato_oc}
                onChange={handleChange}
                placeholder="OC 4521-12-SE25"
                maxLength={100}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Fecha de Adquisición *</label>
              <input
                type="date"
                className="form-input"
                name="fecha_adquisicion"
                value={formData.fecha_adquisicion}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Vencimiento de Garantía *</label>
              <input
                type="date"
                className="form-input"
                name="fecha_garantia"
                value={formData.fecha_garantia}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Costo Inicial ($ CLP) *</label>
              <input
                type="number"
                className="form-input"
                name="costo_inicial"
                value={formData.costo_inicial}
                onChange={handleChange}
                placeholder="650000"
                min="0"
                step="1"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Costo Anual Recurrente ($ CLP/año)</label>
              <input
                type="number"
                className="form-input"
                name="costo_anual"
                value={formData.costo_anual}
                onChange={handleChange}
                placeholder="0"
                min="0"
                step="1"
              />
            </div>

            <div className="form-group form-grid-full">
              <label className="form-label">Licencias Asociadas y Software Preinstalado</label>
              <input
                type="text"
                className="form-input"
                name="licencias_asociadas"
                value={formData.licencias_asociadas}
                onChange={handleChange}
                placeholder="Ej: Windows 11 Pro OEM, Office 2021 Hogar y Empresas"
              />
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
                  value={formData.criticidad}
                  onChange={handleChange}
                >
                  {CATALOGOS.criticidades.map((cr) => (
                    <option key={cr} value={cr}>{cr}</option>
                  ))}
                </select>
                <span className="form-helper">Nivel de impacto en caso de falla o indisponibilidad.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Mantención Registrada</label>
                <select
                  className="form-select"
                  name="tipo_mantenimiento"
                  value={formData.tipo_mantenimiento}
                  onChange={handleChange}
                >
                  {CATALOGOS.tipos_mantenimiento.map((tm) => (
                    <option key={tm} value={tm}>{tm}</option>
                  ))}
                </select>
              </div>

              <div className="form-group form-grid-full">
                <label className="form-label">Configuración de Red / IP / VLAN / Firmware / BitLocker</label>
                <input
                  type="text"
                  className="form-input"
                  name="configuracion_red"
                  value={formData.configuracion_red}
                  onChange={handleChange}
                  placeholder="Ej: IP 192.168.20.45 / VLAN 20 / Windows 11 22H2 / BitLocker Cifrado: ACTIVO"
                />
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
