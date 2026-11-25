import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { ArrowRightLeft, AlertCircle } from 'lucide-react';
import { CATALOGOS } from '../catalogos.js';
import { FieldError } from './FieldError';

export function ModalTraslado({ isOpen, onClose, activo, onConfirm }) {
  const [nuevaUnidad, setNuevaUnidad] = useState('');
  const [nuevaUbicacion, setNuevaUbicacion] = useState('');
  const [nuevoCustodio, setNuevoCustodio] = useState('');
  const [motivo, setMotivo] = useState('');
  const [detalles, setDetalles] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activo) {
      setNuevaUnidad(activo.unidad || '');
      setNuevaUbicacion(activo.ubicacion || '');
      setNuevoCustodio(activo.custodio || '');
      setMotivo('');
      setDetalles('');
      setError('');
      setFieldErrors({});
    }
  }, [activo, isOpen]);

  const clearFieldError = (name) => {
    setFieldErrors((previous) => ({ ...previous, [name]: '' }));
  };
  const fieldError = (name) => (
    <FieldError id={`traslado-${name}-error`} message={fieldErrors[name]} />
  );
  const fieldA11y = (name) => ({
    'aria-invalid': Boolean(fieldErrors[name]),
    ...(fieldErrors[name] ? { 'aria-describedby': `traslado-${name}-error` } : {})
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const errores = {};
    if (!nuevaUnidad.trim()) errores.nueva_unidad = 'Selecciona la nueva unidad.';
    if (!nuevaUbicacion.trim()) errores.nueva_ubicacion = 'Escribe la nueva ubicación.';
    if (!nuevoCustodio.trim()) errores.nuevo_custodio = 'Escribe el nombre del nuevo custodio.';
    if (!motivo.trim()) errores.motivo = 'Escribe el motivo del traslado.';
    setFieldErrors(errores);
    if (Object.keys(errores).length > 0) {
      setError('Corrige los campos marcados antes de continuar.');
      return;
    }

    setLoading(true);
    try {
      await onConfirm({
        nueva_unidad: nuevaUnidad,
        nueva_ubicacion: nuevaUbicacion.trim(),
        nuevoCustodio: nuevoCustodio.trim(),
        nuevo_custodio: nuevoCustodio.trim(),
        motivo: motivo.trim(),
        detalles: detalles.trim()
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Error al registrar traslado.');
    } finally {
      setLoading(false);
    }
  };

  if (!activo) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Traslado de Activo: ${activo.id_activo}`}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="modal-body">
          <div className="alert alert-info" style={{ marginBottom: 16 }}>
            <div>
              <strong>Activo:</strong> {activo.marca_modelo} ({activo.categoria})<br />
              <strong>Custodio actual:</strong> {activo.custodio} ({activo.unidad})
            </div>
          </div>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Nueva Unidad de Destino *</label>
            <select
              className="form-select"
              value={nuevaUnidad}
              {...fieldA11y('nueva_unidad')}
              onChange={(e) => {
                setNuevaUnidad(e.target.value);
                clearFieldError('nueva_unidad');
              }}
            >
              <option value="">Seleccione una unidad municipal...</option>
              {CATALOGOS.unidades.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            {fieldError('nueva_unidad')}
          </div>

          <div className="form-group">
            <label className="form-label">Nueva Ubicación Física *</label>
            <input
              type="text"
              className="form-input"
              value={nuevaUbicacion}
              {...fieldA11y('nueva_ubicacion')}
              onChange={(e) => {
                setNuevaUbicacion(e.target.value);
                clearFieldError('nueva_ubicacion');
              }}
              placeholder="Ej: DIDECO - Equipo Territorial Quilacahuín"
              maxLength={200}
            />
            {fieldError('nueva_ubicacion')}
          </div>

          <div className="form-group">
            <label className="form-label">Nuevo Funcionario Custodio / Responsable *</label>
            <input
              type="text"
              className="form-input"
              value={nuevoCustodio}
              {...fieldA11y('nuevo_custodio')}
              onChange={(e) => {
                setNuevoCustodio(e.target.value);
                clearFieldError('nuevo_custodio');
              }}
              placeholder="Ej: Marcela Huenchumán Soto"
              maxLength={200}
            />
            {fieldError('nuevo_custodio')}
          </div>

          <div className="form-group">
            <label className="form-label">Motivo del Traslado *</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={motivo}
              {...fieldA11y('motivo')}
              onChange={(e) => {
                setMotivo(e.target.value);
                clearFieldError('motivo');
              }}
              placeholder="Justificación formal de la reasignación (requerida por auditoría Ley 21.459)..."
              maxLength={1000}
            />
            {fieldError('motivo')}
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Detalles u Observaciones Adicionales</label>
            <input
              type="text"
              className="form-input"
              value={detalles}
              onChange={(e) => setDetalles(e.target.value)}
              placeholder="Ej: Se entrega con bolso y cargador original."
            />
          </div>
        </div>

        <div className="modal-footer">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            <ArrowRightLeft size={16} />
            {loading ? 'Guardando traslado...' : 'Registrar Traslado'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
