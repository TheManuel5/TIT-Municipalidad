import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Archive, AlertTriangle } from 'lucide-react';

export function ModalBaja({ isOpen, onClose, activo, onConfirm }) {
  const [motivo, setMotivo] = useState('');
  const [detalles, setDetalles] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activo) {
      setMotivo('');
      setDetalles('');
      setError('');
    }
  }, [activo, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // REGLA CRÍTICA DEL CONTRATO: El motivo es estrictamente obligatorio
    if (!motivo || !motivo.trim()) {
      setError('El motivo de la baja es ESTRICTAMENTE OBLIGATORIO por exigencia de la Ley N.º 18.695 (Administración de Bienes Municipales).');
      return;
    }

    setLoading(true);
    try {
      await onConfirm({
        motivo: motivo.trim(),
        detalles: detalles.trim()
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Error al decretar baja del activo.');
    } finally {
      setLoading(false);
    }
  };

  if (!activo) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Decretar Baja de Activo: ${activo.id_activo}`}
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <div className="alert alert-danger" style={{ marginBottom: 18 }}>
            <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>¡Acción Institucional Irreversible!</strong>
              <p style={{ marginTop: 4, fontSize: '0.825rem' }}>
                Está a punto de dar de baja el activo <strong>{activo.marca_modelo}</strong> ({activo.id_activo}) de la unidad <strong>{activo.unidad}</strong>. El estado cambiará a <em>'De baja'</em> y quedará registrado de forma inmutable en la bitácora municipal.
              </p>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              Motivo Técnico / Legal de la Baja <span style={{ color: 'var(--danger)' }}>* (Obligatorio)</span>
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Falla irreversible en tarjeta madre y costo de reparación supera el 60% del valor residual / Pérdida en terreno / Obsolescencia..."
              maxLength={1000}
              required
            />
            <span className="form-helper">
              Justificación requerida por Contraloría y DAF conforme a la Ley Orgánica de Municipalidades.
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Referencia Documental o Decreto de Baja</label>
            <input
              type="text"
              className="form-input"
              value={detalles}
              onChange={(e) => setDetalles(e.target.value)}
              placeholder="Ej: Informe Técnico TI N° 08-2026 / Acta de Enajenación DAF"
              maxLength={500}
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
            className="btn btn-danger"
            disabled={loading || !motivo.trim()}
          >
            <Archive size={16} />
            {loading ? 'Procesando baja...' : 'Confirmar Baja de Activo'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
