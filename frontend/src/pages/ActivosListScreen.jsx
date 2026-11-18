import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext';
import { CategoryBadge, StatusBadge } from '../components/Badge';
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
  ChevronRight
} from 'lucide-react';
import { CATALOGOS } from '../api.mock.js';

export function ActivosListScreen({ onSelectActivo, onNewActivo, onEditActivo }) {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin_ti';
  const isJefatura = user?.rol === 'jefatura';

  // Filtros y estados de búsqueda
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState('');
  const [estado, setEstado] = useState('');
  const [unidad, setUnidad] = useState(isJefatura ? user.unidad : '');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Datos
  const [activos, setActivos] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, page: 1, limit: 10 });
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

  // Recargar al cambiar filtros
  useEffect(() => {
    cargarActivos();
  }, [q, categoria, estado, unidad, page, limit, user]);

  // Manejador de traslado
  const handleConfirmTraslado = async (datos) => {
    await api.trasladarActivo(trasladoModal.activo.id_activo, datos);
    showToast(`Traslado de ${trasladoModal.activo.id_activo} registrado exitosamente.`);
    cargarActivos();
  };

  // Manejador de baja
  const handleConfirmBaja = async (datos) => {
    await api.bajaActivo(bajaModal.activo.id_activo, datos);
    showToast(`Activo ${bajaModal.activo.id_activo} dado de baja formalmente.`);
    cargarActivos();
  };

  // Exportar
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

      {/* Header con Título y Botones de Acción */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)' }}>
            Inventario de Activos Tecnológicos
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Catálogo unificado y registro de ciclo de vida municipal (Tabla 7 del Informe)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Botones de Exportar */}
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => handleExport('csv')}
            title="Exportar a archivo CSV (conforme a Ley 21.180)"
          >
            <Download size={14} />
            Exportar CSV
          </button>

          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => handleExport('json')}
            title="Exportar a JSON estructurado"
          >
            <Download size={14} />
            Exportar JSON
          </button>

          {/* Botón Alta (Solo Admin TI) */}
          {isAdmin ? (
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={onNewActivo}
            >
              <Plus size={16} />
              Registrar Nuevo Activo
            </button>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Lock size={12} /> Alta restringida a Admin TI
            </span>
          )}
        </div>
      </div>

      {/* Alerta de restricción por rol */}
      {isJefatura && (
        <div className="alert alert-info">
          <Lock size={18} />
          <div>
            <strong>Perfil de Jefatura de Unidad:</strong> La consulta está filtrada automáticamente a su unidad dependiente (<strong>{user.unidad}</strong>). Los campos de configuración de red y criticidad se encuentran resguardados conforme a la Ley N.º 20.285 y Ley N.º 21.663.
          </div>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, alignItems: 'center' }}>
          {/* Input búsqueda */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 36 }}
              placeholder="Buscar por ID, modelo, custodio..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Categoría */}
          <div>
            <select
              className="form-select"
              value={categoria}
              onChange={(e) => {
                setCategoria(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas las Categorías</option>
              {CATALOGOS.categorias.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div>
            <select
              className="form-select"
              value={estado}
              onChange={(e) => {
                setEstado(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos los Estados</option>
              {CATALOGOS.estados_operativos.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          {/* Unidad (Si no es jefatura) */}
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

          {/* Reset button */}
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

      {/* Tabla de Activos */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
            <p style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cargando inventario...</p>
          </div>
        ) : error ? (
          <div style={{ padding: 24 }}>
            <div className="alert alert-danger">{error}</div>
          </div>
        ) : activos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <AlertCircle size={36} style={{ color: '#94a3b8', marginBottom: 12 }} />
            <h4>No se encontraron activos con los filtros seleccionados</h4>
            <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Intente modificando la búsqueda o seleccionando otra categoría.</p>
          </div>
        ) : (
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
                      <td>
                        <CategoryBadge categoria={a.categoria} />
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{a.unidad}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{a.ubicacion}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {a.custodio || 'Sin custodio asignado'}
                      </td>
                      <td>
                        <StatusBadge estado={a.estado_operativo} />
                      </td>
                      <td>
                        {isReservado ? (
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Lock size={11} /> Reservado
                          </span>
                        ) : (
                          <span className={`badge ${a.criticidad === 'Alta' ? 'badge-danger' : (a.criticidad === 'Media' ? 'badge-warning' : 'badge-secondary')}`}>
                            {a.criticidad}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          {/* Ver Ficha (Todos) */}
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            title="Ver Ficha Técnica e Historial"
                            onClick={() => onSelectActivo(a.id_activo)}
                          >
                            <Eye size={14} />
                          </button>

                          {/* Acciones de modificación (Solo Admin TI) */}
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
        )}

        {/* Paginación */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Mostrando {activos.length > 0 ? (meta.page - 1) * meta.limit + 1 : 0} a {Math.min(meta.page * meta.limit, meta.total)} de {meta.total} activos
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
              <span>Filas por pág:</span>
              <select 
                className="form-select" 
                style={{ padding: '2px 8px', width: 'auto', fontSize: '0.8rem' }}
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

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
              <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.825rem', padding: '0 8px' }}>
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
      </div>

      {/* Modales Reutilizables */}
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
