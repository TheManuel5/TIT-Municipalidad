import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext';
import { CategoryBadge, StatusBadge } from '../components/Badge';
import { 
  Boxes, 
  CheckCircle, 
  AlertTriangle, 
  Wrench, 
  DollarSign, 
  CalendarClock, 
  ExternalLink,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

export function DashboardScreen({ onSelectActivo, onViewAllActivos }) {
  const { user } = useAuth();
  const [resumen, setResumen] = useState(null);
  const [costos, setCostos] = useState(null);
  const [alertas, setAlertas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resumenRes, costosRes, alertasRes] = await Promise.all([
        api.getReporteResumen(),
        api.getReporteCostos(),
        api.getAlertas(60)
      ]);
      setResumen(resumenRes.data);
      setCostos(costosRes.data);
      setAlertas(alertasRes.data);
    } catch (err) {
      setError(err.message || 'Error cargando datos del dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [user]);

  if (loading) {
    return (
      <div className="page-wrapper" style={{ textAlign: 'center', padding: '80px 0' }}>
        <RefreshCw size={36} className="spin-icon" style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
        <p style={{ marginTop: 14, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Cargando indicadores y métricas del Plan Informático...
        </p>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="alert alert-danger">
          <AlertTriangle size={20} />
          <div>
            <strong>Error de conexión:</strong> {error}
            <button className="btn btn-outline btn-sm" style={{ marginLeft: 12 }} onClick={cargarDatos}>
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { totales, por_categoria, por_estado, por_unidad } = resumen;
  const totalGarantiasAlertas = (alertas?.garantias_por_vencer?.length || 0) + (alertas?.licencias_por_vencer?.length || 0);

  return (
    <div className="page-wrapper">
      {/* Saludo y Contexto de Rol */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--secondary)' }}>
            Panel de Control de Activos TI
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {user?.rol === 'jefatura' 
              ? `Vista focalizada para Dirección ${user.unidad} • Municipalidad de San Pablo`
              : 'Consolidado institucional del Parque Tecnológico Municipal (Plan 2027–2031)'}
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={cargarDatos}>
          <RefreshCw size={14} />
          Actualizar Indicadores
        </button>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Boxes size={24} />
          </div>
          <div>
            <div className="stat-number">{totales.total_activos}</div>
            <div className="stat-label">Total Activos Registrados</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div className="stat-number">{totales.operativos}</div>
            <div className="stat-label">Operativos (Bueno / Regular)</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <Wrench size={24} />
          </div>
          <div>
            <div className="stat-number">{totales.en_reparacion + totales.de_baja}</div>
            <div className="stat-label">En Reparación ({totales.en_reparacion}) / Bajas ({totales.de_baja})</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
            <CalendarClock size={24} />
          </div>
          <div>
            <div className="stat-number">{totalGarantiasAlertas}</div>
            <div className="stat-label">Garantías / Licencias por Vencer (60d)</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div className="stat-number" style={{ fontSize: '1.35rem' }}>
              ${((costos?.inversion_total_inicial || 0) / 1000000).toFixed(1)} M
            </div>
            <div className="stat-label">Inversión Inicial Total (CLP)</div>
          </div>
        </div>
      </div>

      {/* Alerta Destacada de Vencimientos Próximos (Garantías & Licencias) */}
      <div className="card" style={{ borderColor: totalGarantiasAlertas > 0 ? '#fde68a' : 'var(--border)' }}>
        <div className="card-header" style={{ background: totalGarantiasAlertas > 0 ? '#fffbeb' : 'transparent', margin: '-24px -24px 20px -24px', padding: '16px 24px' }}>
          <div className="card-title" style={{ color: totalGarantiasAlertas > 0 ? '#92400e' : 'inherit' }}>
            <ShieldAlert size={20} style={{ color: totalGarantiasAlertas > 0 ? '#d97706' : 'var(--text-muted)' }} />
            <span>Alertas de Vencimiento de Cobertura y Licencias (Ventana 60 Días)</span>
          </div>
          <span className="badge badge-warning">
            {totalGarantiasAlertas} {totalGarantiasAlertas === 1 ? 'Activo en riesgo' : 'Activos en riesgo'}
          </span>
        </div>

        {totalGarantiasAlertas === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
            <CheckCircle size={32} style={{ color: '#059669', marginBottom: 8 }} />
            <p>No se registran garantías ni licencias con vencimiento dentro de los próximos 60 días.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Bien o Sistema</th>
                  <th>Categoría</th>
                  <th>Unidad Asignada</th>
                  <th>Fecha Límite</th>
                  <th>Días Restantes</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {alertas.garantias_por_vencer.map((g) => {
                  const esUrgente = g.dias_restantes <= 30;
                  return (
                    <tr key={g.id_activo}>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{g.id_activo}</td>
                      <td>
                        <strong>{g.marca_modelo}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Prov: {g.proveedor}</div>
                      </td>
                      <td><CategoryBadge categoria={g.categoria} /></td>
                      <td>{g.unidad}</td>
                      <td>{g.fecha_garantia}</td>
                      <td>
                        <span className={`badge ${esUrgente ? 'badge-danger' : 'badge-warning'}`}>
                          {g.dias_restantes > 0 ? `${g.dias_restantes} días` : '¡Vence Hoy!'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => onSelectActivo(g.id_activo)}
                        >
                          Ver Ficha
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {alertas.licencias_por_vencer.map((lic) => {
                  const esUrgente = lic.dias_restantes <= 30;
                  return (
                    <tr key={lic.id_activo}>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{lic.id_activo}</td>
                      <td>
                        <strong>{lic.nombre_software}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Costo Renovación: ${lic.costo_renovacion.toLocaleString('es-CL')}
                        </div>
                      </td>
                      <td><CategoryBadge categoria="Software" /></td>
                      <td>{lic.unidad}</td>
                      <td>{lic.fecha_vencimiento}</td>
                      <td>
                        <span className={`badge ${esUrgente ? 'badge-danger' : 'badge-warning'}`}>
                          {lic.dias_restantes > 0 ? `${lic.dias_restantes} días` : '¡Vence Hoy!'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => onSelectActivo(lic.id_activo)}
                        >
                          Ver Ficha
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Gráficos de Distribución Visuales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24, marginBottom: 24 }}>
        {/* Distribución por Categoría */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">
              <Boxes size={18} />
              <span>Distribución por Categoría</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Total: {totales.total_activos}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {por_categoria.map((c) => {
              const porcentaje = Math.round((c.cantidad / totales.total_activos) * 100) || 0;
              return (
                <div key={c.categoria}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 5 }}>
                    <span style={{ fontWeight: 600 }}>{c.categoria}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{c.cantidad} ({porcentaje}%)</span>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${porcentaje}%`, 
                        background: c.categoria === 'PC' ? '#2563eb' : (c.categoria === 'Impresora' ? '#059669' : (c.categoria === 'Red' ? '#0284c7' : '#7c3aed')),
                        borderRadius: 4,
                        transition: 'width 0.4s ease'
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribución por Estado Operativo */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">
              <TrendingUp size={18} />
              <span>Condición Operativa</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Disponibilidad Física
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {por_estado.map((e) => {
              const porcentaje = Math.round((e.cantidad / totales.total_activos) * 100) || 0;
              let barColor = '#059669';
              if (e.estado === 'Regular') barColor = '#d97706';
              if (e.estado === 'Malo') barColor = '#dc2626';
              if (e.estado === 'En reparación') barColor = '#7c3aed';
              if (e.estado === 'De baja') barColor = '#64748b';

              return (
                <div key={e.estado}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 5 }}>
                    <StatusBadge estado={e.estado} />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{e.cantidad} ({porcentaje}%)</span>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${porcentaje}%`, 
                        background: barColor,
                        borderRadius: 4,
                        transition: 'width 0.4s ease'
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Distribución por Unidad Municipal */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <span>Distribución de Activos por Unidad Municipal</span>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onViewAllActivos}>
            Ver Todo el Inventario
            <ArrowUpRight size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {por_unidad.map((u) => (
            <div 
              key={u.unidad} 
              style={{ 
                padding: '12px 16px', 
                background: '#f8fafc', 
                border: '1px solid var(--border)', 
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>{u.unidad}</span>
              <span className="badge badge-secondary" style={{ fontSize: '0.8rem' }}>{u.cantidad}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
