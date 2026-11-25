import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Wrench } from 'lucide-react';
import { FieldError } from './FieldError';

/**
 * ModalMantenimiento - Registro de mantención preventiva/correctiva
 * Llama a POST /api/activos/:id/mantenimiento y queda en la bitácora como MANTENIMIENTO.
 */
const hoyLocal = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' });

function fechaValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

export function ModalMantenimiento({ isOpen, onClose, activo, onConfirm }) {
  const [tipo, setTipo] = useState('Preventiva');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(hoyLocal());
  const [estadoResultante, setEstadoResultante] = useState('');
  const [responsable, setResponsable] = useState('');
  const [costo, setCosto] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTipo('Preventiva');
      setDescripcion('');
      setFecha(hoyLocal());
      setEstadoResultante('');
      setResponsable('');
      setCosto('');
      setError('');
      setFieldErrors({});
    }
  }, [activo, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const errores = {};
    if (!descripcion.trim()) errores.descripcion = 'Describe el trabajo realizado.';
    if (fecha && !fechaValida(fecha)) {
      errores.fecha = 'Selecciona una fecha válida.';
    } else if (fecha && fecha > hoyLocal()) {
      errores.fecha = 'La fecha no puede estar en el futuro.';
    }
    if (costo !== '' && (!Number.isFinite(Number(costo)) || Number(costo) <= 0)) {
      errores.costo = 'Ingresa un costo mayor que 0.';
    } else if (fieldErrors.costo && costo === '') {
      errores.costo = fieldErrors.costo;
    }
    setFieldErrors(errores);
    if (Object.keys(errores).length > 0) {
      setError('Corrige los campos marcados antes de registrar.');
      return;
    }
    setLoading(true);
    try {
      await onConfirm({
        tipo_mantenimiento: tipo,
        descripcion: descripcion.trim(),
        ...(fecha ? { fecha } : {}),
        ...(estadoResultante ? { estado_resultante: estadoResultante } : {}),
        ...(responsable.trim() ? { responsable: responsable.trim() } : {}),
        ...(costo !== '' ? { costo: Number(costo) } : {})
      });
      onClose();
    } catch (err) {
      const detalle = Array.isArray(err.details) && err.details.length
        ? ` (${err.details.map((d) => d.mensaje || d.campo).join('; ')})`
        : '';
      setError((err.message || 'Error al registrar la mantención.') + detalle);
    } finally {
      setLoading(false);
    }
  };

  if (!activo) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Registrar Mantención: ${activo.id_activo}`}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="modal-body">
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Tipo de mantención <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select className="form-select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="Preventiva">Preventiva</option>
                <option value="Correctiva">Correctiva</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Fecha de ejecución</label>
              <input
                type="date"
                className="form-input"
                value={fecha}
                max={hoyLocal()}
                aria-invalid={Boolean(fieldErrors.fecha)}
                aria-describedby={fieldErrors.fecha ? 'mantenimiento-fecha-error' : undefined}
                onChange={(e) => {
                  setFecha(e.target.value);
                  setFieldErrors((previous) => ({ ...previous, fecha: '' }));
                }}
              />
              <FieldError id="mantenimiento-fecha-error" message={fieldErrors.fecha} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Trabajo realizado <span style={{ color: 'var(--danger)' }}>*</span></label>
            <textarea
              className="form-textarea"
              rows={3}
              value={descripcion}
              aria-invalid={Boolean(fieldErrors.descripcion)}
              aria-describedby={fieldErrors.descripcion ? 'mantenimiento-descripcion-error' : undefined}
              onChange={(e) => {
                setDescripcion(e.target.value);
                setFieldErrors((previous) => ({ ...previous, descripcion: '' }));
              }}
              placeholder="Ej: Limpieza interna, cambio de pasta térmica y actualización de BIOS / Reemplazo de fusor"
            />
            <FieldError id="mantenimiento-descripcion-error" message={fieldErrors.descripcion} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Estado tras la mantención</label>
              <select className="form-select" value={estadoResultante} onChange={(e) => setEstadoResultante(e.target.value)}>
                <option value="">Sin cambio ({activo.estado_operativo})</option>
                <option value="Bueno">Bueno</option>
                <option value="Regular">Regular</option>
                <option value="Malo">Malo</option>
                <option value="En reparación">En reparación</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Costo (CLP, opcional; mayor que 0)</label>
              <input
                type="number"
                min="1"
                step="1"
                className="form-input"
                value={costo}
                aria-invalid={Boolean(fieldErrors.costo)}
                aria-describedby={fieldErrors.costo ? 'mantenimiento-costo-error' : undefined}
                onChange={(e) => {
                  const valor = e.target.value;
                  if (valor === '' || (Number.isFinite(Number(valor)) && Number(valor) > 0)) {
                    setCosto(valor);
                    setFieldErrors((previous) => ({ ...previous, costo: '' }));
                    setError('');
                  } else {
                    setCosto('');
                    setFieldErrors((previous) => ({ ...previous, costo: 'El costo debe ser mayor que 0.' }));
                    setError('Corrige los campos marcados antes de registrar.');
                  }
                }}
                placeholder="Opcional"
              />
              <FieldError id="mantenimiento-costo-error" message={fieldErrors.costo} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Técnico o proveedor responsable</label>
            <input
              type="text"
              className="form-input"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              placeholder="Ej: Soporte TI interno / Sistemas & Redes Austral SpA"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Wrench size={16} />
            {loading ? 'Registrando...' : 'Registrar Mantención'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
