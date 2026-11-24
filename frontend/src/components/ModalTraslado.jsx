import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { ArrowRightLeft, AlertCircle } from 'lucide-react';
import { CATALOGOS } from '../catalogos.js';

export function ModalTraslado({ isOpen, onClose, activo, onConfirm }) {
  const [nuevaUnidad, setNuevaUnidad] = useState('');
  const [nuevaUbicacion, setNuevaUbicacion] = useState('');
  const [nuevoCustodio, setNuevoCustodio] = useState('');
  const [motivo, setMotivo] = useState('');
  const [detalles, setDetalles] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activo) {
      setNuevaUnidad(activo.unidad || '');
      setNuevaUbicacion(activo.ubicacion || '');
      setNuevoCustodio(activo.custodio || '');
      setMotivo('');
      setDetalles('');
      setError('');
    }
  }, [activo, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!nuevaUnidad || !nuevaUbicacion.trim() || !nuevoCustodio.trim()) {
      setError('Completa unidad, ubicación y nombre del nuevo custodio. No dejes estos campos vacíos.');
      return;
    }

    if (!motivo.trim()) {
      setError('El motivo del traslado es obligatorio para la bitácora de auditoría.');
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
      <form onSubmit={handleSubmit}>
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
              onChange={(e) => setNuevaUnidad(e.target.value)}
              required
            >
              <option value="">Seleccione una unidad municipal...</option>
              {CATALOGOS.unidades.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Nueva Ubicación Física *</label>
            <input
              type="text"
              className="form-input"
              value={nuevaUbicacion}
              onChange={(e) => setNuevaUbicacion(e.target.value)}
              placeholder="Ej: DIDECO - Equipo Territorial Quilacahuín"
              maxLength={200}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nuevo Funcionario Custodio / Responsable *</label>
            <input
              type="text"
              className="form-input"
              value={nuevoCustodio}
              onChange={(e) => setNuevoCustodio(e.target.value)}
              placeholder="Ej: Marcela Huenchumán Soto"
              maxLength={200}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Motivo del Traslado *</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Justificación formal de la reasignación (requerida por auditoría Ley 21.459)..."
              maxLength={1000}
              required
            />
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
