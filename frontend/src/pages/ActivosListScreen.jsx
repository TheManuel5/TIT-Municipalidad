import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext';
import { CategoryBadge, StatusBadge, getCategoryIcon } from '../components/Badge';
import { ModalTraslado } from '../components/ModalTraslado';
import { ModalBaja } from '../components/ModalBaja';
import { 
  Search, 
  Filter, 
  Plus, 
  ArrowRightLeft, 
  Archive, 
  Edit3, 
  Eye, 
  Download, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  Lock,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Table as TableIcon,
  MapPin,
  User,
  Shield,
  Calendar,
  Layers
} from 'lucide-react';
import { CATALOGOS } from '../catalogos.js';

export function ActivosListScreen({ onSelectActivo, onNewActivo, onEditActivo }) {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin_ti';
  const isJefatura = user?.rol === 'jefatura';

  // Modo de vista: 'grid' (tarjetas visuales) o 'table' (tabla compacta)
  const [vistaModo, setVistaModo] = useState('grid');

  // Filtros y estados de búsqueda
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState('');
  const [estado, setEstado] = useState('');
  const [unidad, setUnidad] = useState(isJefatura ? user.unidad : '');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(vistaModo === 'grid' ? 12 : 10);

  // Datos
  const [activos, setActivos] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, page: 1, limit: 12 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Modales
  const [trasladoModal, setTrasladoModal] = useState({ isOpen: false, activo: null });
  const [bajaModal, setBajaModal] = useState({ isOpen: false, activo: null });

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const cargarActivos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getActivos({
        q,
        categoria,
        estado,
        unidad: isJefatura ? user.unidad : unidad,
        page,
        limit
      });
      setActivos(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err.message || 'Error al obtener lista de activos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarActivos();
  }, [q, categoria, estado, unidad, page, limit, user]);

  const handleConfirmTraslado = async (datos) => {
    await api.trasladarActivo(trasladoModal.activo.id_activo, datos);
    showToast(`Traslado de ${trasladoModal.activo.id_activo} registrado exitosamente.`);
    cargarActivos();
  };

  const handleConfirmBaja = async (datos) => {
    await api.bajaActivo(bajaModal.activo.id_activo, datos);
    showToast(`Activo ${bajaModal.activo.id_activo} dado de baja formalmente.`);
    cargarActivos();
  };

  const handleExport = async (formato) => {
    try {
      const res = await api.exportarActivos(formato);
      if (formato === 'csv') {
        const blob = new Blob([res], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `inventario_san_pablo_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `inventario_san_pablo_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      showToast(`Inventario exportado en formato ${formato.toUpperCase()}.`);
    } catch (err) {
      showToast(`Error al exportar: ${err.message}`, 'danger');
    }
  };

  return (
    <div className="page-wrapper">
      {/* Toast Feedback */}
      {toastMessage && (
        <div 
          className={`alert ${toastMessage.type === 'danger' ? 'alert-danger' : 'alert-success'}`}
          style={{ position: 'fixed', top: 20, right: 24, zIndex: 9999, boxShadow: 'var(--shadow-lg)' }}
        >
          {toastMessage.type === 'danger' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* Header con Título, Selector de Vista y Acciones */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)' }}>
            Inventario de Activos Tecnológicos
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Catálogo unificado y ciclo de vida de equipamiento municipal (Tabla 7 del Informe)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Selector de Vista: Tarjetas vs Tabla */}
          <div className="view-toggle">
            <button
              type="button"
              className={`view-toggle-btn ${vistaModo === 'grid' ? 'active' : ''}`}
              onClick={() => {
                setVistaModo('grid');
                setLimit(12);
                setPage(1);
              }}
              title="Vista de Cuadrícula / Tarjetas Visuales"
            >
              <LayoutGrid size={15} />
              <span>Tarjetas</span>
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${vistaModo === 'table' ? 'active' : ''}`}
              onClick={() => {
                setVistaModo('table');
                setLimit(10);
                setPage(1);
              }}
              title="Vista de Tabla Clásica"
            >
              <TableIcon size={15} />
              <span>Tabla</span>
            </button>
          </div>

          {/* Exportar */}
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => handleExport('csv')}
            title="Exportar a CSV"
          >
            <Download size={14} />
            CSV
          </button>

          {/* Alta (Admin TI) */}
          {isAdmin ? (
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={onNewActivo}
            >
              <Plus size={16} />
              Nuevo Activo
            </button>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Lock size={12} /> Alta solo Admin TI
            </span>
          )}
        </div>
      </div>

      {/* Alerta de restricción por rol */}
      {isJefatura && (
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          <Lock size={18} />
          <div>
            <strong>Perfil de Jefatura de Unidad ({user.unidad}):</strong> Su visualización está restringida exclusivamente a los activos de su dependencia conforme al principio de responsabilidad compartida (Sección 8.1 del Informe).
          </div>
        </div>
      )}

      {/* CHIPS DE FILTRO RÁPIDO (Permite filtrar sin abrir selects) */}
      <div className="filter-chips">
        <button
          type="button"
          className={`filter-chip ${!categoria && !estado ? 'active' : ''}`}
          onClick={() => {
            setCategoria('');
            setEstado('');
            setPage(1);
          }}
        >
          <span>Todos los Bienes</span>
        </button>

        {CATALOGOS.categorias.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`filter-chip ${categoria === cat ? 'active' : ''}`}
            onClick={() => {
              setCategoria(categoria === cat ? '' : cat);
              setPage(1);
            }}
          >
            {getCategoryIcon(cat, 13)}
            <span>{cat}</span>
          </button>
        ))}

        <button
          type="button"
          className={`filter-chip ${estado === 'En reparación' ? 'active' : ''}`}
          onClick={() => {
            setEstado(estado === 'En reparación' ? '' : 'En reparación');
            setPage(1);
          }}
        >
          <span>En Taller</span>
        </button>

        <button
          type="button"
          className={`filter-chip ${estado === 'De baja' ? 'active' : ''}`}
          onClick={() => {
            setEstado(estado === 'De baja' ? '' : 'De baja');
            setPage(1);
          }}
        >
          <span>Histórico Bajas</span>
        </button>
      </div>

      {/* Barra de Filtros Tradicional */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, alignItems: 'center' }}>
          {/* Búsqueda en vivo */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 36, paddingRight: 10 }}
              placeholder="Buscar por ID, modelo, custodio..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Selector Estado */}
          <div>
            <select
              className="form-select"
              value={estado}
              onChange={(e) => {
                setEstado(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Cualquier Estado</option>
              {CATALOGOS.estados_operativos.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          {/* Selector Unidad */}
          {!isJefatura && (
            <div>
              <select
                className="form-select"
                value={unidad}
                onChange={(e) => {
                  setUnidad(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todas las Unidades</option>
                {CATALOGOS.unidades.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          )}

          {/* Limpiar */}
          {(q || categoria || estado || (unidad && !isJefatura)) && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setQ('');
                setCategoria('');
                setEstado('');
                if (!isJefatura) setUnidad('');
                setPage(1);
              }}
            >
              Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL: CUADRÍCULA DE TARJETAS (GRID) O TABLA */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '70px 0' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)', margin: '0 auto' }} />
          <p style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cargando catálogo...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : activos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <AlertCircle size={36} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
          <h4>No se encontraron activos con los filtros indicados</h4>
          <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Pruebe restableciendo la búsqueda o seleccionando otra categoría.</p>
        </div>
      ) : vistaModo === 'grid' ? (
        /* VISTA DE CUADRÍCULA / TARJETAS VISUALES */
        <div className="assets-grid">
          {activos.map((a) => {
            const isBaja = a.estado_operativo === 'De baja';
            const isReservado = a.criticidad === '[RESERVADO]';

            let iconBg = '#eff6ff';
            let iconColor = '#2563eb';
            if (a.categoria === 'Servidor') { iconBg = '#f5f3ff'; iconColor = '#7c3aed'; }
            if (a.categoria === 'Red') { iconBg = '#f0f9ff'; iconColor = '#0284c7'; }
            if (a.categoria === 'Impresora') { iconBg = '#ecfdf5'; iconColor = '#059669'; }
            if (a.categoria === 'Software') { iconBg = '#fffbeb'; iconColor = '#d97706'; }

            return (
              <div 
                key={a.id_activo} 
                className={`asset-card ${isBaja ? 'de-baja' : ''}`}
              >
                <div>
                  <div className="asset-card-top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="asset-icon-box" style={{ background: iconBg, color: iconColor }}>
                        {getCategoryIcon(a.categoria, 22)}
                      </div>
                      <div>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.88rem', color: '#1e40af' }}>
                          {a.id_activo}
                        </span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{a.categoria}</div>
                      </div>
                    </div>

                    <StatusBadge estado={a.estado_operativo} />
                  </div>

                  <div className="asset-card-title">
                    {a.marca_modelo}
                  </div>

                  <p className="asset-card-desc">
                    {a.descripcion || 'Sin descripción técnica adicional registrada.'}
                  </p>

                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                    <div className="asset-card-info-row">
                      <MapPin size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.78rem', color: '#334155' }}>
                        <strong>{a.unidad}</strong> • {a.ubicacion}
                      </span>
                    </div>

                    <div className="asset-card-info-row">
                      <User size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.78rem', color: '#475569' }}>
                        Custodio: <strong>{a.custodio || 'Sin custodio asignado'}</strong>
                      </span>
                    </div>

                    <div className="asset-card-info-row" style={{ marginBottom: 0 }}>
                      <Calendar size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Garantía hasta: <strong>{a.fecha_garantia}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer de Tarjeta con Acciones */}
                <div className="asset-card-footer">
                  <div>
                    {isReservado ? (
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Lock size={11} /> Nivel Reservado
                      </span>
                    ) : (
                      <span className={`badge ${a.criticidad === 'Alta' ? 'badge-danger' : 'badge-secondary'}`} style={{ fontSize: '0.7rem' }}>
                        {a.criticidad} Criticidad
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => onSelectActivo(a.id_activo)}
                      title="Ver Ficha Técnica"
                    >
                      <Eye size={13} />
                      <span>Ficha</span>
                    </button>

                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setTrasladoModal({ isOpen: true, activo: a })}
                          title="Registrar Traslado"
                        >
                          <ArrowRightLeft size={13} />
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onEditActivo(a)}
                          title="Editar"
                        >
                          <Edit3 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA DE TABLA CLÁSICA */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Bien o Sistema</th>
                  <th>Categoría</th>
                  <th>Unidad / Ubicación</th>
                  <th>Custodio</th>
                  <th>Estado</th>
                  <th>Criticidad</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {activos.map((a) => {
                  const isReservado = a.criticidad === '[RESERVADO]';
                  return (
                    <tr key={a.id_activo}>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#1e40af' }}>
                        {a.id_activo}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{a.marca_modelo}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.descripcion || 'Sin descripción'}</div>
                      </td>
                      <td><CategoryBadge categoria={a.categoria} /></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{a.unidad}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{a.ubicacion}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{a.custodio || 'Sin custodio'}</td>
                      <td><StatusBadge estado={a.estado_operativo} /></td>
                      <td>
                        {isReservado ? (
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Lock size={11} /> Reservado
                          </span>
                        ) : (
                          <span className={`badge ${a.criticidad === 'Alta' ? 'badge-danger' : 'badge-secondary'}`}>
                            {a.criticidad}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            title="Ver Ficha Técnica"
                            onClick={() => onSelectActivo(a.id_activo)}
                          >
                            <Eye size={14} />
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                title="Editar Activo"
                                onClick={() => onEditActivo(a)}
                              >
                                <Edit3 size={14} />
                              </button>

                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                title="Registrar Traslado"
                                onClick={() => setTrasladoModal({ isOpen: true, activo: a })}
                              >
                                <ArrowRightLeft size={14} />
                              </button>

                              {a.estado_operativo !== 'De baja' && (
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
                                  title="Decretar Baja"
                                  onClick={() => setBajaModal({ isOpen: true, activo: a })}
                                >
                                  <Archive size={14} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paginación */}
      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
          Mostrando {activos.length > 0 ? (meta.page - 1) * meta.limit + 1 : 0} a {Math.min(meta.page * meta.limit, meta.total)} de {meta.total} activos
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={14} />
              Anterior
            </button>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.825rem', padding: '0 8px', fontWeight: 600 }}>
              Pág. {meta.page} de {meta.totalPages}
            </span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Modales */}
      <ModalTraslado
        isOpen={trasladoModal.isOpen}
        onClose={() => setTrasladoModal({ isOpen: false, activo: null })}
        activo={trasladoModal.activo}
        onConfirm={handleConfirmTraslado}
      />

      <ModalBaja
        isOpen={bajaModal.isOpen}
        onClose={() => setBajaModal({ isOpen: false, activo: null })}
        activo={bajaModal.activo}
        onConfirm={handleConfirmBaja}
      />
    </div>
  );
}
