import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext';
import { CategoryBadge, StatusBadge } from '../components/Badge';
import { ModalTraslado } from '../components/ModalTraslado';
import { ModalBaja } from '../components/ModalBaja';
import { 
  ArrowLeft, 
  Edit3, 
  ArrowRightLeft, 
  Archive, 
  Lock, 
  Clock, 
  ShieldCheck, 
  Calendar, 
  User, 
  Building2, 
  MapPin, 
  DollarSign, 
  Layers, 
  FileText,
  AlertTriangle,
  History,
  CheckCircle2
} from 'lucide-react';

export function ActivoDetailScreen({ idActivo, onBack, onEdit }) {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin_ti';

  const [activo, setActivo] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Modales
  const [trasladoModalOpen, setTrasladoModalOpen] = useState(false);
  const [bajaModalOpen, setBajaModalOpen] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const cargarFicha = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resActivo, resHistorial] = await Promise.all([
        api.getActivoById(idActivo),
        api.getHistorial(idActivo)
      ]);
      setActivo(resActivo.data);
      setHistorial(resHistorial.data);
    } catch (err) {
      setError(err.message || 'Error al obtener la ficha del activo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idActivo) {
      cargarFicha();
    }
  }, [idActivo, user]);

  const handleConfirmTraslado = async (datos) => {
    await api.trasladarActivo(activo.id_activo, datos);
    showToast(`Traslado registrado exitosamente para ${activo.id_activo}.`);
    cargarFicha();
  };

  const handleConfirmBaja = async (datos) => {
    await api.bajaActivo(activo.id_activo, datos);
    showToast(`Activo ${activo.id_activo} dado de baja con justificación registrada.`);
    cargarFicha();
  };

  if (loading) {
    return (
      <div className="page-wrapper" style={{ textAlign: 'center', padding: '80px 0' }}>
        <Clock size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
        <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>Cargando expediente técnico del activo...</p>
      </div>
    );
  }

  if (error || !activo) {
    return (
      <div className="page-wrapper">
        <div className="alert alert-danger">
          <AlertTriangle size={18} />
          <div>{error || 'No fue posible cargar el activo.'}</div>
        </div>
        <button className="btn btn-outline" onClick={onBack}>
          <ArrowLeft size={16} /> Volver al Listado
        </button>
      </div>
    );
  }

  const isReservadoCriticidad = activo.criticidad === '[RESERVADO]';
  const isReservadoRed = activo.configuracion_red && activo.configuracion_red.startsWith('[RESERVADO');

  return (
    <div className="page-wrapper">
      {/* Toast Feedback */}
      {toastMessage && (
        <div 
          className={`alert ${toastMessage.type === 'danger' ? 'alert-danger' : 'alert-success'}`}
          style={{ position: 'fixed', top: 20, right: 24, zIndex: 9999, boxShadow: 'var(--shadow-lg)' }}
        >
          <CheckCircle2 size={18} />
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* Barra de Navegación y Acciones */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
        <button type="button" className="btn btn-outline btn-sm" onClick={onBack}>
          <ArrowLeft size={15} />
          Volver al Inventario
        </button>

        {isAdmin && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={() => onEdit(activo)}
            >
              <Edit3 size={15} />
              Editar Especificaciones
            </button>

            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={() => setTrasladoModalOpen(true)}
            >
              <ArrowRightLeft size={15} />
              Registrar Traslado
            </button>

            {activo.estado_operativo !== 'De baja' && (
              <button 
                type="button" 
                className="btn btn-danger btn-sm"
                onClick={() => setBajaModalOpen(true)}
              >
                <Archive size={15} />
                Decretar Baja
              </button>
            )}
          </div>
        )}
      </div>

      {/* Banner de Baja si aplica */}
      {activo.estado_operativo === 'De baja' && (
        <div className="alert alert-danger" style={{ marginBottom: 20 }}>
          <Archive size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Activo Dado de Baja en Inventario Municipal:</strong>
            <p style={{ marginTop: 4 }}>
              <strong>Motivo Legal/Técnico:</strong> {activo.motivo_baja || 'Obsolescencia o daño irreparable sin especificación.'}
            </p>
          </div>
        </div>
      )}

      {/* Encabezado Principal de la Ficha */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--primary)' }}>
                {activo.id_activo}
              </span>
              <CategoryBadge categoria={activo.categoria} />
              <StatusBadge estado={activo.estado_operativo} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--secondary)' }}>
              {activo.marca_modelo}
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {activo.descripcion || 'Sin descripción adicional registrada.'}
            </p>
          </div>

          <div style={{ textAlign: 'right', background: '#f8fafc', padding: '12px 18px', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Última Validación Física/Lógica</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: 2 }}>{activo.fecha_revision || 'Pendiente'}</div>
            <div style={{ fontSize: '0.75rem', color: '#1e40af', marginTop: 2 }}>Por: {activo.responsable_revision || 'TI'}</div>
          </div>
        </div>
      </div>

      {/* Cuadrícula de Atributos Estandarizados (Tabla 7 del Informe) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 28 }}>
        {/* Bloque 1: Ubicación y Custodia */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">
              <MapPin size={18} />
              <span>Ubicación y Custodia (Proceso C)</span>
            </div>
            <span className="badge badge-secondary">Interno</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.875rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Unidad Municipal Dependiente:</span>
              <strong>{activo.unidad}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Ubicación Física Específica:</span>
              <span>{activo.ubicacion}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Funcionario Custodio Responsable:</span>
              <strong style={{ color: '#0f172a' }}>{activo.custodio || 'Por asignar'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Proceso Municipal Dependiente:</span>
              <span>{activo.proceso_asociado || 'General'}</span>
            </div>
          </div>
        </div>

        {/* Bloque 2: Mantenimiento y Cobertura */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">
              <Clock size={18} />
              <span>Mantenimiento y Garantías</span>
            </div>
            <span className="badge badge-secondary">Interno / Compras</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.875rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Última Mantención Registrada:</span>
              <span>{activo.ultimo_mantenimiento || 'Sin registro'} ({activo.tipo_mantenimiento || 'Sin mantención'})</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Fecha de Adquisición / Alta:</span>
              <span>{activo.fecha_adquisicion}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Vigencia Cobertura de Garantía:</span>
              <strong style={{ color: '#0f172a' }}>{activo.fecha_garantia}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Licencias y Software Asociado:</span>
              <span>{activo.licencias_asociadas || 'Ninguna declarada'}</span>
            </div>
          </div>
        </div>

        {/* Bloque 3: Datos Financieros y Contratación (Ley 19.886 / 21.634) */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">
              <DollarSign size={18} />
              <span>Presupuesto y TCO (Ley 19.886)</span>
            </div>
            <span className="badge badge-secondary">Público</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.875rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Proveedor Oficial:</span>
              <strong>{activo.proveedor}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Orden de Compra / Contrato:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{activo.contrato_oc}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Costo Inicial de Adquisición:</span>
              <span style={{ fontWeight: 700, color: '#059669' }}>
                ${(activo.costo_inicial || 0).toLocaleString('es-CL')} CLP
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Costo Recurrente Anual (Mantenimiento/Soporte):</span>
              <span style={{ fontWeight: 600 }}>
                ${(activo.costo_anual || 0).toLocaleString('es-CL')} CLP / año
              </span>
            </div>
          </div>
        </div>

        {/* Bloque 4: Datos Técnicos y Ciberseguridad (RESERVADOS Ley 21.663) */}
        <div className="card" style={{ 
          marginBottom: 0, 
          borderColor: isReservadoCriticidad ? '#e2e8f0' : '#bfdbfe',
          background: isReservadoCriticidad ? '#f8fafc' : '#ffffff' 
        }}>
          <div className="card-header">
            <div className="card-title">
              <ShieldCheck size={18} style={{ color: isReservadoCriticidad ? 'var(--text-muted)' : 'var(--primary)' }} />
              <span>Seguridad y Red (Ley 21.663)</span>
            </div>
            <span className="badge badge-purple">
              {isReservadoCriticidad ? 'Restringido' : 'Admin TI'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.875rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>
                Nivel de Criticidad Institucional:
              </span>
              {isReservadoCriticidad ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>
                  <Lock size={12} /> Campo Reservado (Solo Admin TI)
                </div>
              ) : (
                <span className={`badge ${activo.criticidad === 'Alta' ? 'badge-danger' : 'badge-warning'}`}>
                  {activo.criticidad} Impacto
                </span>
              )}
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>
                Configuración de Red / IP / VLAN / SO / Parches:
              </span>
              {isReservadoRed ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>
                  <Lock size={12} /> Estrictamente Reservado (Ley N.º 21.663)
                </div>
              ) : (
                <div style={{ 
                  fontFamily: 'monospace', 
                  fontSize: '0.8rem', 
                  background: '#f1f5f9', 
                  padding: '8px 10px', 
                  borderRadius: 6,
                  color: '#0f172a'
                }}>
                  {activo.configuracion_red || 'Sin dirección IP asignada'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bitácora de Auditoría e Historial de Eventos (Trazabilidad Ley 21.459) */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <History size={18} />
            <span>Bitácora de Trazabilidad e Historial del Activo</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Registro Inmutable de Eventos
          </span>
        </div>

        {historial.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
            <p>No se registran eventos adicionales en la bitácora de este activo.</p>
          </div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 24, borderLeft: '2px solid #e2e8f0', marginLeft: 12 }}>
            {historial.map((ev, index) => {
              let badgeType = 'badge-info';
              if (ev.tipo_evento === 'ALTA') badgeType = 'badge-success';
              if (ev.tipo_evento === 'TRASLADO') badgeType = 'badge-purple';
              if (ev.tipo_evento === 'EDICION') badgeType = 'badge-warning';
              if (ev.tipo_evento === 'BAJA') badgeType = 'badge-danger';

              const fechaFormatted = new Date(ev.fecha).toLocaleString('es-CL', {
                dateStyle: 'medium',
                timeStyle: 'short'
              });

              return (
                <div key={ev.id || index} style={{ marginBottom: 24, position: 'relative' }}>
                  {/* Punto en timeline */}
                  <div style={{
                    position: 'absolute',
                    left: -31,
                    top: 2,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: ev.tipo_evento === 'BAJA' ? '#dc2626' : (ev.tipo_evento === 'ALTA' ? '#059669' : '#2563eb'),
                    border: '2px solid white',
                    boxShadow: '0 0 0 2px #cbd5e1'
                  }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span className={`badge ${badgeType}`}>{ev.tipo_evento}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fechaFormatted}</span>
                    <span style={{ fontSize: '0.8rem', color: '#475569' }}>por <strong>{ev.usuario}</strong></span>
                  </div>

                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--secondary)' }}>
                    {ev.motivo}
                  </div>

                  {ev.detalles && (
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {ev.detalles}
                    </div>
                  )}

                  {ev.tipo_evento === 'TRASLADO' && (
                    <div style={{ 
                      marginTop: 6, 
                      fontSize: '0.78rem', 
                      background: '#f8fafc', 
                      padding: '6px 10px', 
                      borderRadius: 6,
                      border: '1px solid #e2e8f0',
                      display: 'inline-block'
                    }}>
                      <strong>De:</strong> {ev.unidad_origen || 'Origen'} ({ev.custodio_anterior || 'S/C'}) 
                      {' → '} 
                      <strong>A:</strong> {ev.unidad_destino} ({ev.custodio_nuevo})
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modales */}
      <ModalTraslado
        isOpen={trasladoModalOpen}
        onClose={() => setTrasladoModalOpen(false)}
        activo={activo}
        onConfirm={handleConfirmTraslado}
      />

      <ModalBaja
        isOpen={bajaModalOpen}
        onClose={() => setBajaModalOpen(false)}
        activo={activo}
        onConfirm={handleConfirmBaja}
      />
    </div>
  );
}
