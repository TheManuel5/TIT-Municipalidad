import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext';
import { CategoryBadge, StatusBadge } from '../components/Badge';
import { 
  BarChart3, 
  DollarSign, 
  ShieldAlert, 
  Download, 
  Printer, 
  RefreshCw, 
  Layers, 
  PieChart, 
  Calendar,
  AlertCircle
} from 'lucide-react';

export function ReportesScreen({ onSelectActivo }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('resumen'); // 'resumen' | 'costos' | 'garantias'
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
        api.getAlertas(90) // Ventana amplia para reportes
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
      <div className="page-wrapper" style={{ textAlign: 'center', padding: '80px 0' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
        <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>Generando reportes consolidados...</p>
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

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)' }}>
            Informes y Reportes Estadísticos TI
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Métricas de control para la dirección y gestión presupuestaria (Plan 2027–2031)
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={handlePrint}>
            <Printer size={15} />
            Imprimir Informe
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={cargarReportes}>
            <RefreshCw size={14} />
            Recalcular
          </button>
        </div>
      </div>

      {/* Selector de Pestañas */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', marginBottom: 24, paddingBottom: 2 }}>
        <button
          type="button"
          onClick={() => setActiveTab('resumen')}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'resumen' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'resumen' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'resumen' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <PieChart size={16} />
          Resumen General
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('costos')}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'costos' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'costos' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'costos' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <DollarSign size={16} />
          Análisis de Costos y TCO (5 Años)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('garantias')}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'garantias' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'garantias' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'garantias' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <ShieldAlert size={16} />
          Estado de Cobertura y Garantías
        </button>
      </div>

      {/* TAB 1: RESUMEN GENERAL */}
      {activeTab === 'resumen' && resumen && (
        <div>
          {/* Tarjetas de Resumen Rápido */}
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div>
                <div className="stat-number">{resumen.totales.total_activos}</div>
                <div className="stat-label">Total de Bienes Catalogados</div>
              </div>
            </div>
            <div className="stat-card">
              <div>
                <div className="stat-number" style={{ color: '#059669' }}>
                  {Math.round((resumen.totales.operativos / resumen.totales.total_activos) * 100)}%
                </div>
                <div className="stat-label">Índice de Disponibilidad Operativa</div>
              </div>
            </div>
            <div className="stat-card">
              <div>
                <div className="stat-number" style={{ color: '#dc2626' }}>
                  {resumen.totales.de_baja}
                </div>
                <div className="stat-label">Activos Dados de Baja (Histórico)</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
            {/* Tabla por Categoría */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Inventario por Categoría Tecnológica</div>
              </div>
              <div className="table-container" style={{ border: 'none' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Categoría</th>
                      <th style={{ textAlign: 'right' }}>Cantidad</th>
                      <th style={{ textAlign: 'right' }}>% Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.por_categoria.map((c) => (
                      <tr key={c.categoria}>
                        <td><CategoryBadge categoria={c.categoria} /></td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{c.cantidad}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                          {Math.round((c.cantidad / resumen.totales.total_activos) * 100)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabla por Unidad */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Distribución por Dirección / Unidad</div>
              </div>
              <div className="table-container" style={{ border: 'none' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Unidad Municipal</th>
                      <th style={{ textAlign: 'right' }}>Activos</th>
                      <th style={{ textAlign: 'right' }}>% Parcial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.por_unidad.map((u) => (
                      <tr key={u.unidad}>
                        <td style={{ fontWeight: 600 }}>{u.unidad}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{u.cantidad}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                          {Math.round((u.cantidad / resumen.totales.total_activos) * 100)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COSTOS Y TCO */}
      {activeTab === 'costos' && costos && (
        <div>
          {/* Cajas de Costo Total */}
          <div className="stats-grid">
            <div className="stat-card">
              <div>
                <div className="stat-number" style={{ color: '#059669' }}>
                  ${(costos.inversion_total_inicial / 1000000).toFixed(2)} M
                </div>
                <div className="stat-label">Inversión Inicial Capitalizada (CLP)</div>
              </div>
            </div>

            <div className="stat-card">
              <div>
                <div className="stat-number" style={{ color: '#0284c7' }}>
                  ${(costos.costo_anual_recurrente_total / 1000000).toFixed(2)} M
                </div>
                <div className="stat-label">Gasto Recurrente Anual (Soporte/Suscripciones)</div>
              </div>
            </div>

            <div className="stat-card">
              <div>
                <div className="stat-number" style={{ color: '#7c3aed' }}>
                  ${(costos.tco_estimado_5_anos / 1000000).toFixed(2)} M
                </div>
                <div className="stat-label">TCO Proyectado a 5 Años (2027–2031)</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Desglose Presupuestario de Costos por Categoría</div>
              <span className="badge badge-secondary">Cifras en CLP con IVA incluido</span>
            </div>

            <div className="table-container" style={{ border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Categoría</th>
                    <th>Unidades</th>
                    <th style={{ textAlign: 'right' }}>Inversión Inicial</th>
                    <th style={{ textAlign: 'right' }}>Costo Recurrente Anual</th>
                    <th style={{ textAlign: 'right' }}>TCO a 5 Años</th>
                  </tr>
                </thead>
                <tbody>
                  {costos.desglose_por_categoria.map((item) => {
                    const tcoCat = item.inversion_inicial + item.costo_anual * 5;
                    return (
                      <tr key={item.categoria}>
                        <td><CategoryBadge categoria={item.categoria} /></td>
                        <td style={{ fontWeight: 600 }}>{item.cantidad}</td>
                        <td style={{ textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                          ${item.inversion_inicial.toLocaleString('es-CL')}
                        </td>
                        <td style={{ textAlign: 'right', color: '#0284c7' }}>
                          ${item.costo_anual.toLocaleString('es-CL')}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          ${tcoCat.toLocaleString('es-CL')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ESTADO DE COBERTURA Y GARANTÍAS */}
      {activeTab === 'garantias' && alertas && (
        <div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <ShieldAlert size={18} />
                <span>Auditoría de Vigencia de Garantías de Hardware</span>
              </div>
            </div>

            <div className="table-container" style={{ border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>ID Activo</th>
                    <th>Marca / Modelo</th>
                    <th>Categoría</th>
                    <th>Unidad</th>
                    <th>Custodio</th>
                    <th>Vencimiento Cobertura</th>
                    <th>Condición de Plazo</th>
                    <th>Ver</th>
                  </tr>
                </thead>
                <tbody>
                  {alertas.garantias_por_vencer.map((g) => (
                    <tr key={g.id_activo}>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{g.id_activo}</td>
                      <td>{g.marca_modelo}</td>
                      <td><CategoryBadge categoria={g.categoria} /></td>
                      <td>{g.unidad}</td>
                      <td>{g.custodio}</td>
                      <td>{g.fecha_garantia}</td>
                      <td>
                        <span className={`badge ${g.dias_restantes <= 30 ? 'badge-danger' : 'badge-warning'}`}>
                          {g.dias_restantes > 0 ? `Vence en ${g.dias_restantes} días` : 'Expirada'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => onSelectActivo(g.id_activo)}
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
