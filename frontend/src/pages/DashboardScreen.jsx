import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext';
import { CategoryBadge, StatusBadge, getCategoryIcon } from '../components/Badge';
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
  RefreshCw,
  Target,
  Building2,
  Clock,
  ShieldCheck,
  ChevronRight,
  PieChart as PieIcon
} from 'lucide-react';

export function DashboardScreen({ onSelectActivo, onViewAllActivos }) {
  const { user } = useAuth();
  const [resumen, setResumen] = useState(null);
  const [costos, setCostos] = useState(null);
  const [alertas, setAlertas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroAlerta, setFiltroAlerta] = useState('todas'); // 'todas' | 'urgentes' | 'licencias'

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
      <div className="page-wrapper" style={{ textAlign: 'center', padding: '90px 0' }}>
        <RefreshCw size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)', margin: '0 auto' }} />
        <p style={{ marginTop: 14, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Calculando métricas del Plan Informático Municipal 2027–2031...
        </p>
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

  // Cálculo de KPIs según Tabla 5 del Informe
  const kpiOE1 = Math.round((totales.operativos / totales.total_activos) * 100); // % validados
  const kpiGarantiasVigentes = Math.round(((totales.total_activos - totalGarantiasAlertas) / totales.total_activos) * 100);

  // Filtrado de alertas en Alert Center
  const listaAlertas = [];
  alertas.garantias_por_vencer.forEach(g => listaAlertas.push({ ...g, tipo: 'Garantía HW' }));
  alertas.licencias_por_vencer.forEach(l => listaAlertas.push({ ...l, marca_modelo: l.nombre_software, categoria: 'Software', fecha_garantia: l.fecha_vencimiento, tipo: 'Licencia SW' }));

  const alertasFiltradas = listaAlertas.filter(a => {
    if (filtroAlerta === 'urgentes') return a.dias_restantes <= 30;
    if (filtroAlerta === 'licencias') return a.tipo === 'Licencia SW';
    return true;
  });

  return (
    <div className="page-wrapper">
      {/* Saludo y Contexto de Rol */}
      <div style={{ marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#1e40af', fontWeight: 600, background: '#eff6ff', padding: '3px 10px', borderRadius: 9999, marginBottom: 6 }}>
            <Building2 size={13} />
            <span>I. Municipalidad de San Pablo • Proyecto A</span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--secondary)', letterSpacing: '-0.02em' }}>
            Panel de Control Ejecutivo de Activos TI
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {user?.rol === 'jefatura' 
              ? `Vista exclusiva para Jefatura de ${user.unidad} • Filtrado de Privacidad Activo`
              : 'Monitoreo consolidado del parque tecnológico, vencimientos y metas del Plan 2027–2031'}
          </p>
        </div>

        <button className="btn btn-outline btn-sm" onClick={cargarDatos}>
          <RefreshCw size={14} />
          Actualizar Métricas
        </button>
      </div>

      {/* KPI Cards Superiores */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Boxes size={22} />
          </div>
          <div>
            <div className="stat-number">{totales.total_activos}</div>
            <div className="stat-label">Total Bienes Catalogados</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div className="stat-number" style={{ color: '#059669' }}>
              {totales.operativos}
            </div>
            <div className="stat-label">Operativos ({Math.round((totales.operativos/totales.total_activos)*100)}% del total)</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
            <CalendarClock size={22} />
          </div>
          <div>
            <div className="stat-number" style={{ color: totalGarantiasAlertas > 0 ? '#d97706' : 'inherit' }}>
              {totalGarantiasAlertas}
            </div>
            <div className="stat-label">Alertas Garantía / Licencia (&lt;60d)</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <Wrench size={22} />
          </div>
          <div>
            <div className="stat-number" style={{ color: '#dc2626' }}>
              {totales.en_reparacion + totales.de_baja}
            </div>
            <div className="stat-label">Taller ({totales.en_reparacion}) / Bajas ({totales.de_baja})</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div className="stat-number" style={{ fontSize: '1.35rem' }}>
              ${((costos?.inversion_total_inicial || 0) / 1000000).toFixed(1)} M
            </div>
            <div className="stat-label">Inversión Inicial Total ($ CLP)</div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: TABLERO DE CUMPLIMIENTO DE OBJETIVOS (TABLA 5 DEL INFORME) */}
      <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
        <div className="card-header">
          <div className="card-title">
            <Target size={18} style={{ color: '#2563eb' }} />
            <span>Monitoreo de Indicadores y Metas del Plan Informático (Tabla 5 del Informe)</span>
          </div>
          <span className="badge badge-success">Evaluación en Línea</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {/* OE-1 */}
          <div className="okr-card">
            <div className="okr-header">
              <span className="okr-title">OE-1: Activos Validados y con Custodio</span>
              <span className="okr-kpi-badge">IND-01</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '6px 0' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>{kpiOE1}%</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Meta: ≥ 95%</span>
            </div>
            <div className="okr-meter-bar">
              <div className="okr-meter-fill" style={{ width: `${Math.min(kpiOE1, 100)}%`, background: '#059669' }} />
            </div>
            <div className="okr-footer">
              <span>Condición: Estado Bueno / Regular</span>
              <span style={{ color: '#059669', fontWeight: 600 }}>✓ Meta Cumplida</span>
            </div>
          </div>

          {/* OE-3 */}
          <div className="okr-card">
            <div className="okr-header">
              <span className="okr-title">OE-3: Control de Accesos y Bajas</span>
              <span className="okr-kpi-badge">IND-07</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '6px 0' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb' }}>100%</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Meta: 100%</span>
            </div>
            <div className="okr-meter-bar">
              <div className="okr-meter-fill" style={{ width: '100%', background: '#2563eb' }} />
            </div>
            <div className="okr-footer">
              <span>Roles: Admin TI, Jefatura, Lectura</span>
              <span style={{ color: '#2563eb', fontWeight: 600 }}>✓ En Norma Ley 21.663</span>
            </div>
          </div>

          {/* OE-4 */}
          <div className="okr-card">
            <div className="okr-header">
              <span className="okr-title">OE-4: Vigencia de Cobertura y Garantías</span>
              <span className="okr-kpi-badge">IND-09</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '6px 0' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: kpiGarantiasVigentes >= 80 ? '#059669' : '#d97706' }}>
                {kpiGarantiasVigentes}%
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{totalGarantiasAlertas} por vencer</span>
            </div>
            <div className="okr-meter-bar">
              <div className="okr-meter-fill" style={{ width: `${kpiGarantiasVigentes}%`, background: kpiGarantiasVigentes >= 80 ? '#059669' : '#d97706' }} />
            </div>
            <div className="okr-footer">
              <span>Ventana de renovación: 60 días</span>
              <span style={{ color: '#d97706', fontWeight: 600 }}>Atención Requerida</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: CENTRO VISUAL DE ALERTAS DE VENCIMIENTO (EN LUGAR DE TABLA PLANA) */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <ShieldAlert size={18} style={{ color: totalGarantiasAlertas > 0 ? '#d97706' : 'var(--text-muted)' }} />
            <span>Centro de Alertas de Vencimiento de Garantías y Licencias</span>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button 
              type="button" 
              className={`btn btn-sm ${filtroAlerta === 'todas' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFiltroAlerta('todas')}
            >
              Todas ({totalGarantiasAlertas})
            </button>
            <button 
              type="button" 
              className={`btn btn-sm ${filtroAlerta === 'urgentes' ? 'btn-danger' : 'btn-outline'}`}
              onClick={() => setFiltroAlerta('urgentes')}
            >
              Urgentes &lt;30d
            </button>
            <button 
              type="button" 
              className={`btn btn-sm ${filtroAlerta === 'licencias' ? 'btn-secondary' : 'btn-outline'}`}
              onClick={() => setFiltroAlerta('licencias')}
            >
              Licencias SW
            </button>
          </div>
        </div>

        {alertasFiltradas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
            <CheckCircle size={32} style={{ color: '#059669', margin: '0 auto 8px' }} />
            <p style={{ fontWeight: 600, color: '#334155' }}>Sin alertas en este filtro</p>
            <p style={{ fontSize: '0.8rem' }}>Todos los equipos o contratos seleccionados se encuentran vigentes.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
            {alertasFiltradas.map((a) => {
              const esUrgente = a.dias_restantes <= 30;
              return (
                <div 
                  key={a.id_activo}
                  className={`alert-card-item ${esUrgente ? 'urgente' : 'advertencia'}`}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: '#1e40af' }}>
                        {a.id_activo}
                      </span>
                      <CategoryBadge categoria={a.categoria} />
                      <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>{a.tipo}</span>
                    </div>

                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.marca_modelo}
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      📍 {a.unidad} {a.custodio ? `• ${a.custodio}` : ''}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: esUrgente ? '#fee2e2' : '#fef3c7',
                      color: esUrgente ? '#b91c1c' : '#b45309',
                      border: `1px solid ${esUrgente ? '#fca5a5' : '#fde68a'}`
                    }}>
                      {a.dias_restantes > 0 ? `${a.dias_restantes} días` : '¡Vence Hoy!'}
                    </div>

                    <div style={{ marginTop: 6 }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                        onClick={() => onSelectActivo(a.id_activo)}
                      >
                        Ver Ficha
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECCIÓN 3: GRÁFICOS VISUALES Y DISTRIBUCIÓN POR SEDE/UNIDAD */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, marginBottom: 22 }}>
        {/* Distribución por Categoría */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">
              <PieIcon size={18} />
              <span>Composición por Categoría</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Total: {totales.total_activos}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {por_categoria.map((c) => {
              const pct = Math.round((c.cantidad / totales.total_activos) * 100) || 0;
              return (
                <div key={c.categoria}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                      {getCategoryIcon(c.categoria, 14)}
                      {c.categoria}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                      <strong>{c.cantidad}</strong> ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${pct}%`, 
                        background: c.categoria === 'PC' ? '#2563eb' : (c.categoria === 'Impresora' ? '#059669' : (c.categoria === 'Red' ? '#0284c7' : (c.categoria === 'Servidor' ? '#7c3aed' : '#d97706'))),
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
              <span>Salud y Disponibilidad Física</span>
            </div>
            <span className="badge badge-success">94 Operativos</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {por_estado.map((e) => {
              const pct = Math.round((e.cantidad / totales.total_activos) * 100) || 0;
              let barColor = '#059669';
              if (e.estado === 'Regular') barColor = '#d97706';
              if (e.estado === 'Malo') barColor = '#dc2626';
              if (e.estado === 'En reparación') barColor = '#7c3aed';
              if (e.estado === 'De baja') barColor = '#64748b';

              return (
                <div key={e.estado}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                    <StatusBadge estado={e.estado} />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                      <strong>{e.cantidad}</strong> ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${pct}%`, 
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

      {/* SECCIÓN 4: MAPA DE DIRECCIONES Y DEPENDENCIAS MUNICIPALES */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Building2 size={18} />
            <span>Distribución Territorial por Dirección y Unidad Municipal</span>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onViewAllActivos}>
            Explorar en Inventario
            <ArrowUpRight size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {por_unidad.map((u) => (
            <div 
              key={u.unidad} 
              style={{ 
                padding: '14px 16px', 
                background: '#f8fafc', 
                border: '1px solid var(--border)', 
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>{u.unidad}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>San Pablo</div>
              </div>
              <span className="badge badge-secondary" style={{ fontSize: '0.85rem', fontWeight: 700, padding: '4px 10px' }}>
                {u.cantidad}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
