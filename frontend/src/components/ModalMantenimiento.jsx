import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Wrench } from 'lucide-react';

/**
 * ModalMantenimiento - Registro de mantención preventiva/correctiva (RF-2)
 * Llama a POST /api/activos/:id/mantenimiento y queda en la bitácora como MANTENIMIENTO.
 */
const hoyLocal = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' });

export function ModalMantenimiento({ isOpen, onClose, activo, onConfirm }) {
  const [tipo, setTipo] = useState('Preventiva');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(hoyLocal());
  const [estadoResultante, setEstadoResultante] = useState('');
  const [responsable, setResponsable] = useState('');
  const [costo, setCosto] = useState('');
  const [error, setError] = useState('');
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
    }
  }, [activo, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!descripcion.trim()) {
      setError('Describa el trabajo realizado.');
      return;
    }
    setLoading(true);
    try {
      await onConfirm({
        tipo_mantenimiento: tipo,
        descripcion: descripcion.trim(),
        fecha,
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
      <form onSubmit={handleSubmit}>
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
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Trabajo realizado <span style={{ color: 'var(--danger)' }}>*</span></label>
            <textarea
              className="form-textarea"
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Limpieza interna, cambio de pasta térmica y actualización de BIOS / Reemplazo de fusor"
              required
            />
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
              <label className="form-label">Costo (CLP)</label>
              <input
                type="number"
                min="0"
                step="1"
                className="form-input"
                value={costo}
                onChange={(e) => setCosto(e.target.value)}
                placeholder="Opcional"
              />
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
          <button type="submit" className="btn btn-primary" disabled={loading || !descripcion.trim()}>
            <Wrench size={16} />
            {loading ? 'Registrando...' : 'Registrar Mantención'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
