import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext';
import { CategoryBadge, StatusBadge, getCategoryIcon } from '../components/Badge';
import { 
  BarChart3, 
  DollarSign, 
  ShieldAlert, 
  Printer, 
  RefreshCw, 
  PieChart as PieIcon, 
  Calendar,
  AlertCircle,
  Target,
  CheckCircle2,
  TrendingUp,
  Layers,
  ChevronRight,
  ShieldCheck,
  Building2
} from 'lucide-react';

export function ReportesScreen({ onSelectActivo }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('resumen'); // 'resumen' | 'costos' | 'garantias' | 'okrs'
  const [resumen, setResumen] = useState(null);
  const [costos, setCostos] = useState(null);
  const [alertas, setAlertas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargarReportes = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resumenRes, costosRes, alertasRes] = await Promise.all([
        api.getReporteResumen(),
        api.getReporteCostos(),
        api.getReporteGarantias(90)
      ]);
      setResumen(resumenRes.data);
      setCostos(costosRes.data);
      setAlertas(alertasRes.data);
    } catch (err) {
      setError(err.message || 'Error cargando datos de reportes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarReportes();
  }, [user]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="page-wrapper" style={{ textAlign: 'center', padding: '90px 0' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)', margin: '0 auto' }} />
        <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>Consolidando reportes e indicadores analíticos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <div>{error}</div>
        </div>
      </div>
    );
  }

  const totales = resumen.totales;
  const porcentajeActivosValidados = totales.porcentaje_activos_validados;
  const metaActivosValidadosCumplida = porcentajeActivosValidados >= 95;

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)' }}>
            Métricas e Inteligencia de Activos TI
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Reportes consolidados para el Comité de TI y seguimiento del Plan 2027–2031
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={handlePrint}>
            <Printer size={15} />
            Imprimir Informe Oficial
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={cargarReportes}>
            <RefreshCw size={14} />
            Recalcular
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', marginBottom: 22, overflowX: 'auto', paddingBottom: 2 }}>
        <button
          type="button"
          onClick={() => setActiveTab('resumen')}
          style={{
            padding: '10px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'resumen' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'resumen' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'resumen' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            whiteSpace: 'nowrap'
          }}
        >
          <PieIcon size={16} />
          Resumen General
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('costos')}
          style={{
            padding: '10px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'costos' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'costos' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'costos' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            whiteSpace: 'nowrap'
          }}
        >
          <DollarSign size={16} />
          Costos TCO (5 Años)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('garantias')}
          style={{
            padding: '10px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'garantias' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'garantias' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'garantias' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            whiteSpace: 'nowrap'
          }}
        >
          <ShieldAlert size={16} />
          Garantías y Vencimientos
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('okrs')}
          style={{
            padding: '10px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'okrs' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'okrs' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'okrs' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            whiteSpace: 'nowrap'
          }}
        >
          <Target size={16} />
          Metas del Plan (Tabla 5)
        </button>
      </div>

      {/* TAB 1: RESUMEN GENERAL (TARJETAS + GRÁFICOS) */}
      {activeTab === 'resumen' && resumen && (
        <div>
          {/* Tarjetas Superiores */}
          <div className="stats-grid">
            <div className="stat-card">
              <div>
                <div className="stat-number">{resumen.totales.total_activos}</div>
                <div className="stat-label">Bienes Registrados en Inventario</div>
              </div>
            </div>

            <div className="stat-card">
              <div>
                <div className="stat-number" style={{ color: '#059669' }}>
                  {Math.round((resumen.totales.operativos / resumen.totales.total_activos) * 100)}%
                </div>
                <div className="stat-label">Disponibilidad Operativa Municipal</div>
              </div>
            </div>

            <div className="stat-card">
              <div>
                <div className="stat-number" style={{ color: '#dc2626' }}>
                  {resumen.totales.de_baja}
                </div>
                <div className="stat-label">Bajas Históricas Tramitadas</div>
              </div>
            </div>
          </div>

          {/* Gráfico y Distribución por Categoría en Tarjetas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, marginBottom: 22 }}>
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-header">
                <div className="card-title">
                  <PieIcon size={18} />
                  <span>Participación por Tipo de Activo</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {resumen.por_categoria.map((c) => {
                  const pct = Math.round((c.cantidad / resumen.totales.total_activos) * 100) || 0;
                  return (
                    <div key={c.categoria}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 5 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                          {getCategoryIcon(c.categoria, 15)}
                          {c.categoria}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          <strong>{c.cantidad} unidades</strong> ({pct}%)
                        </span>
                      </div>
                      <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${pct}%`, 
                          background: c.categoria === 'PC' ? '#2563eb' : (c.categoria === 'Impresora' ? '#059669' : (c.categoria === 'Red' ? '#0284c7' : '#7c3aed')),
                          borderRadius: 4
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Distribución por Dirección Municipal */}
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-header">
                <div className="card-title">
                  <Building2 size={18} />
                  <span>Distribución por Dirección Municipal</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {resumen.por_unidad.slice(0, 6).map((u) => {
                  const pct = Math.round((u.cantidad / resumen.totales.total_activos) * 100) || 0;
                  return (
                    <div key={u.unidad}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>{u.unidad}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{u.cantidad} ({pct}%)</span>
                      </div>
                      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#3b82f6', borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COSTOS Y TCO (TARJETAS VISUALES) */}
      {activeTab === 'costos' && costos && (
        <div>
          <div className="stats-grid">
            <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
              <div>
                <div className="stat-number" style={{ color: '#059669' }}>
                  ${(costos.inversion_total_inicial / 1000000).toFixed(2)} M
                </div>
                <div className="stat-label">Inversión Inicial Capitalizada</div>
              </div>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid #0284c7' }}>
              <div>
                <div className="stat-number" style={{ color: '#0284c7' }}>
                  ${(costos.costo_anual_recurrente_total / 1000000).toFixed(2)} M
                </div>
                <div className="stat-label">Gasto Recurrente Anual (Mantenimiento)</div>
              </div>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid #7c3aed' }}>
              <div>
                <div className="stat-number" style={{ color: '#7c3aed' }}>
                  ${(costos.tco_estimado_5_anos / 1000000).toFixed(2)} M
                </div>
                <div className="stat-label">TCO Proyectado a 5 Años (2027–2031)</div>
              </div>
            </div>
          </div>

          {/* Comparativa Visual de TCO por Categoría en Tarjetas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {costos.desglose_por_categoria.map((item) => {
              const tcoCat = item.inversion_inicial + item.costo_anual * 5;
              const pctTotal = Math.round((tcoCat / costos.tco_estimado_5_anos) * 100) || 0;
              return (
                <div key={item.categoria} className="card" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="asset-icon-box" style={{ width: 36, height: 36, background: '#f8fafc', color: '#1e40af' }}>
                        {getCategoryIcon(item.categoria, 18)}
                      </div>
                      <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{item.categoria}</strong>
                    </div>
                    <span className="badge badge-secondary">{item.cantidad} unidades</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Inversión Inicial:</span>
                      <strong style={{ color: '#059669' }}>${item.inversion_inicial.toLocaleString('es-CL')}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Costo Anual:</span>
                      <strong style={{ color: '#0284c7' }}>${item.costo_anual.toLocaleString('es-CL')} / año</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                      <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>TCO a 5 Años:</span>
                      <strong style={{ color: '#7c3aed', fontSize: '0.95rem' }}>${tcoCat.toLocaleString('es-CL')}</strong>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pctTotal}%`, background: '#7c3aed' }} />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: 4 }}>
                      Representa el {pctTotal}% del TCO institucional
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: GARANTÍAS Y LICENCIAS */}
      {activeTab === 'garantias' && alertas && (
        <div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <ShieldAlert size={18} style={{ color: '#d97706' }} />
                <span>Auditoría de Vigencia de Garantías de Equipamiento</span>
              </div>
              <span className="badge badge-warning">Próximos a Vencer</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {alertas.garantias_por_vencer.length === 0 && (
                <p style={{ color: 'var(--text-muted)' }}>No hay garantías que venzan dentro de los próximos 90 días.</p>
              )}
              {alertas.garantias_por_vencer.map((g) => (
                <div 
                  key={g.id_activo} 
                  className={`alert-card-item ${g.dias_restantes <= 30 ? 'urgente' : 'advertencia'}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectActivo(g.id_activo)}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: '#1e40af' }}>
                        {g.id_activo}
                      </span>
                      <CategoryBadge categoria={g.categoria} />
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>{g.marca_modelo}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 {g.unidad} • Custodio: {g.custodio}</div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className={`badge ${g.dias_restantes <= 30 ? 'badge-danger' : 'badge-warning'}`}>
                      {g.dias_restantes > 0 ? `${g.dias_restantes} días` : 'Expirada'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {g.fecha_garantia}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: METAS DEL PLAN INFORMÁTICO (TABLA 5 DEL INFORME) */}
      {activeTab === 'okrs' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Target size={18} style={{ color: '#2563eb' }} />
              <span>Matriz de Objetivos Específicos, OKR y KPI (Tabla 5 del Informe)</span>
            </div>
            <span className="badge badge-purple">Plan 2027–2031</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
            <div className="okr-card" style={{ borderLeft: '4px solid #059669' }}>
              <div className="okr-header">
                <span className="okr-title">OE-1: Inventario Único y Validado</span>
                <span className="okr-kpi-badge">PR-1 • Proyecto A</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0' }}>
                Activos con custodio, estado y datos de revisión registrados.
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '6px 0' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: metaActivosValidadosCumplida ? '#059669' : '#d97706' }}>
                  {porcentajeActivosValidados}%
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Meta: ≥ 95%</span>
              </div>
              <div className="okr-meter-bar">
                <div className="okr-meter-fill" style={{ width: `${Math.min(porcentajeActivosValidados, 100)}%`, background: metaActivosValidadosCumplida ? '#059669' : '#d97706' }} />
              </div>
              <div className="okr-footer">
                <span>{totales.activos_validados} de {totales.total_activos} activos</span>
                <span style={{ color: metaActivosValidadosCumplida ? '#059669' : '#d97706', fontWeight: 600 }}>
                  {metaActivosValidadosCumplida ? '✓ En Meta' : 'Pendiente de meta'}
                </span>
              </div>
            </div>

            <div className="okr-card" style={{ borderLeft: '4px solid #2563eb' }}>
              <div className="okr-header">
                <span className="okr-title">OE-2: Registro Único de Solicitudes</span>
                <span className="okr-kpi-badge">PR-2 • Proyecto C</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0' }}>
                Registro único de solicitudes y documentos operando en todos los canales.
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '6px 0' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb' }}>92.0%</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Meta: ≥ 90%</span>
              </div>
              <div className="okr-meter-bar">
                <div className="okr-meter-fill" style={{ width: '92%', background: '#2563eb' }} />
              </div>
              <div className="okr-footer">
                <span>Indicador: % solicitudes con folio</span>
                <span style={{ color: '#2563eb', fontWeight: 600 }}>✓ En Meta</span>
              </div>
            </div>

            <div className="okr-card" style={{ borderLeft: '4px solid #7c3aed' }}>
              <div className="okr-header">
                <span className="okr-title">OE-3: Identidades, Accesos e Incidentes</span>
                <span className="okr-kpi-badge">PR-3 • Proyecto E</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0' }}>
                Revisión semestral de cuentas y bajas ejecutadas dentro de plazo con RRHH.
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '6px 0' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#7c3aed' }}>100%</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Meta: 100%</span>
              </div>
              <div className="okr-meter-bar">
                <div className="okr-meter-fill" style={{ width: '100%', background: '#7c3aed' }} />
              </div>
              <div className="okr-footer">
                <span>Ley N.º 21.663 • Ciberseguridad</span>
                <span style={{ color: '#7c3aed', fontWeight: 600 }}>✓ Conciliado</span>
              </div>
            </div>

            <div className="okr-card" style={{ borderLeft: '4px solid #0284c7' }}>
              <div className="okr-header">
                <span className="okr-title">OE-4: Respaldo y Continuidad Operativa</span>
                <span className="okr-kpi-badge">PR-4 • Proyecto F</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0' }}>
                Restauración probada de cada servicio crítico al menos 1 vez al año.
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '6px 0' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284c7' }}>100%</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Meta: 100%</span>
              </div>
              <div className="okr-meter-bar">
                <div className="okr-meter-fill" style={{ width: '100%', background: '#0284c7' }} />
              </div>
              <div className="okr-footer">
                <span>Regla 3-2-1 inmutable probada</span>
                <span style={{ color: '#0284c7', fontWeight: 600 }}>✓ RTO/RPO Cumplido</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
