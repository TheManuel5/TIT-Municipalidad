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
    const fechaEmision = new Date().toLocaleDateString('es-CL', {
      day: '2-digit', month: 'long', year: 'numeric',
      timeZone: 'America/Santiago'
    });
    const horaEmision = new Date().toLocaleTimeString('es-CL', {
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Santiago'
    });
    const nroInforme = `INF-TI-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Datos para el informe
    const tot = resumen?.totales || {};
    const pctOperativos = tot.total_activos ? Math.round((tot.operativos / tot.total_activos) * 100) : 0;
    const pctValidados = tot.porcentaje_activos_validados || 0;

    const categoriasRows = (resumen?.por_categoria || []).map(c => {
      const pct = tot.total_activos ? Math.round((c.cantidad / tot.total_activos) * 100) : 0;
      return `<tr><td>${c.categoria}</td><td style="text-align:center">${c.cantidad}</td><td style="text-align:center">${pct}%</td></tr>`;
    }).join('');

    const unidadesRows = (resumen?.por_unidad || []).map(u => {
      const pct = tot.total_activos ? Math.round((u.cantidad / tot.total_activos) * 100) : 0;
      return `<tr><td>${u.unidad}</td><td style="text-align:center">${u.cantidad}</td><td style="text-align:center">${pct}%</td></tr>`;
    }).join('');

    const costosData = costos || {};
    const invInicial = (costosData.inversion_total_inicial || 0).toLocaleString('es-CL');
    const costoAnual = (costosData.costo_anual_recurrente_total || 0).toLocaleString('es-CL');
    const tco5 = (costosData.tco_estimado_5_anos || 0).toLocaleString('es-CL');

    const costosRows = (costosData.desglose_por_categoria || []).map(item => {
      const tcoCat = item.inversion_inicial + item.costo_anual * 5;
      return `<tr>
        <td>${item.categoria}</td>
        <td style="text-align:center">${item.cantidad}</td>
        <td style="text-align:right">$${item.inversion_inicial.toLocaleString('es-CL')}</td>
        <td style="text-align:right">$${item.costo_anual.toLocaleString('es-CL')}</td>
        <td style="text-align:right;font-weight:600">$${tcoCat.toLocaleString('es-CL')}</td>
      </tr>`;
    }).join('');

    const garantiasRows = (alertas?.garantias_por_vencer || []).slice(0, 15).map(g =>
      `<tr>
        <td style="font-family:monospace;font-weight:700">${g.id_activo}</td>
        <td>${g.marca_modelo}</td>
        <td>${g.categoria}</td>
        <td>${g.unidad}</td>
        <td style="text-align:center">${g.fecha_garantia}</td>
        <td style="text-align:center;font-weight:700;color:${g.dias_restantes <= 30 ? '#dc2626' : '#92400e'}">${g.dias_restantes > 0 ? g.dias_restantes + ' días' : 'EXPIRADA'}</td>
      </tr>`
    ).join('');

    printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe Oficial - Inventario Tecnológico Municipal - ${nroInforme}</title>
<style>
  @page { size: letter; margin: 20mm 18mm 25mm 18mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', 'Georgia', serif; font-size: 11pt; color: #1a1a1a; line-height: 1.5; }

  .header-oficial { text-align: center; border-bottom: 3px double #1e3a5f; padding-bottom: 14px; margin-bottom: 20px; }
  .escudo { font-size: 36pt; margin-bottom: 4px; }
  .header-oficial h1 { font-size: 14pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #1e3a5f; margin: 2px 0; }
  .header-oficial h2 { font-size: 11pt; font-weight: 400; color: #333; margin: 2px 0; }
  .header-oficial .subtitulo { font-size: 9pt; color: #666; font-style: italic; }

  .info-doc { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; padding: 10px 14px; background: #f5f7fa; border: 1px solid #d0d5dd; border-radius: 4px; font-size: 9.5pt; }
  .info-doc div { line-height: 1.6; }

  .titulo-seccion { font-size: 12pt; font-weight: 700; color: #1e3a5f; border-bottom: 1.5px solid #1e3a5f; padding-bottom: 4px; margin: 22px 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px; page-break-after: avoid; }
  .titulo-seccion span { font-size: 9pt; font-weight: 400; color: #666; text-transform: none; letter-spacing: 0; float: right; margin-top: 3px; }

  table { width: 100%; border-collapse: collapse; margin: 10px 0 16px 0; font-size: 9.5pt; }
  th { background: #1e3a5f; color: white; padding: 7px 10px; text-align: left; font-weight: 600; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.3px; }
  td { padding: 6px 10px; border-bottom: 1px solid #e0e0e0; }
  tr:nth-child(even) td { background: #f8f9fb; }
  tr:hover td { background: #eef2f7; }

  .resumen-cards { display: flex; gap: 12px; margin: 10px 0 16px 0; }
  .resumen-card { flex: 1; text-align: center; padding: 12px 10px; border: 1.5px solid #d0d5dd; border-radius: 6px; }
  .resumen-card .valor { font-size: 20pt; font-weight: 800; color: #1e3a5f; }
  .resumen-card .label { font-size: 8.5pt; color: #555; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.3px; }

  .total-row td { font-weight: 700; border-top: 2px solid #1e3a5f; background: #eef2f7 !important; }

  .observaciones { margin: 16px 0; padding: 12px 14px; border-left: 3px solid #1e3a5f; background: #f5f7fa; font-size: 9.5pt; }
  .observaciones strong { display: block; margin-bottom: 4px; color: #1e3a5f; }

  .firmas { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 10px; }
  .firma-bloque { text-align: center; width: 40%; }
  .firma-linea { border-top: 1.5px solid #333; margin-top: 50px; padding-top: 6px; }
  .firma-nombre { font-weight: 700; font-size: 10pt; }
  .firma-cargo { font-size: 8.5pt; color: #555; }

  .pie-pagina { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ccc; text-align: center; font-size: 8pt; color: #888; }

  .marca-agua { position: fixed; top: 45%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 60pt; color: rgba(30, 58, 95, 0.04); font-weight: 900; text-transform: uppercase; letter-spacing: 8px; pointer-events: none; z-index: 0; white-space: nowrap; }

  .confidencial { text-align: center; margin: 8px 0; padding: 4px 12px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 3px; font-size: 8.5pt; font-weight: 600; color: #856404; display: inline-block; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>

<div class="marca-agua">MUNICIPALIDAD DE SAN PABLO</div>

<!-- MEMBRETE OFICIAL -->
<div class="header-oficial">
  <div class="escudo">🏛️</div>
  <h1>Ilustre Municipalidad de San Pablo</h1>
  <h2>Departamento de Informática y Tecnología</h2>
  <p class="subtitulo">Provincia de Osorno · Región de Los Lagos · Chile</p>
</div>

<!-- TÍTULO DEL DOCUMENTO -->
<div style="text-align:center; margin-bottom: 16px;">
  <h2 style="font-size:14pt; color:#1e3a5f; font-weight:800; margin-bottom:4px;">
    INFORME OFICIAL DE ESTADO DEL INVENTARIO<br>TECNOLÓGICO MUNICIPAL
  </h2>
  <p style="font-size:9pt; color:#666;">
    Plan Informático Municipal 2027–2031 · Proyecto A: Inventario y Ciclo de Vida de Activos TI
  </p>
  <div style="margin-top:8px;">
    <span class="confidencial">📋 DOCUMENTO DE USO INTERNO — COMITÉ DE TECNOLOGÍA</span>
  </div>
</div>

<!-- DATOS DEL DOCUMENTO -->
<div class="info-doc">
  <div>
    <strong>N° de Informe:</strong> ${nroInforme}<br>
    <strong>Fecha de Emisión:</strong> ${fechaEmision}<br>
    <strong>Hora:</strong> ${horaEmision} hrs.
  </div>
  <div style="text-align:right">
    <strong>Emitido por:</strong> ${user?.nombre || 'Sistema TI'}<br>
    <strong>Cargo/Rol:</strong> ${user?.rol === 'admin_ti' ? 'Administrador TI' : user?.rol === 'jefatura' ? 'Jefatura de Unidad' : 'Auditoría / Control'}<br>
    <strong>Unidad:</strong> ${user?.unidad || 'Informática'}
  </div>
</div>

<!-- SECCIÓN 1: RESUMEN EJECUTIVO -->
<div class="titulo-seccion">1. Resumen Ejecutivo del Inventario <span>Tabla 7 del Informe</span></div>

<div class="resumen-cards">
  <div class="resumen-card">
    <div class="valor">${tot.total_activos || 0}</div>
    <div class="label">Total Bienes Registrados</div>
  </div>
  <div class="resumen-card">
    <div class="valor" style="color:#059669">${pctOperativos}%</div>
    <div class="label">Disponibilidad Operativa</div>
  </div>
  <div class="resumen-card">
    <div class="valor" style="color:#dc2626">${tot.de_baja || 0}</div>
    <div class="label">Bajas Tramitadas</div>
  </div>
  <div class="resumen-card">
    <div class="valor" style="color:${pctValidados >= 95 ? '#059669' : '#d97706'}">${pctValidados}%</div>
    <div class="label">Activos Validados (Meta ≥95%)</div>
  </div>
</div>

<!-- SECCIÓN 2: DISTRIBUCIÓN POR CATEGORÍA -->
<div class="titulo-seccion">2. Distribución por Categoría de Activo</div>
<table>
  <thead><tr><th>Categoría</th><th style="text-align:center">Cantidad</th><th style="text-align:center">Participación</th></tr></thead>
  <tbody>
    ${categoriasRows}
    <tr class="total-row"><td>TOTAL GENERAL</td><td style="text-align:center">${tot.total_activos || 0}</td><td style="text-align:center">100%</td></tr>
  </tbody>
</table>

<!-- SECCIÓN 3: DISTRIBUCIÓN POR UNIDAD MUNICIPAL -->
<div class="titulo-seccion">3. Asignación por Dirección / Unidad Municipal</div>
<table>
  <thead><tr><th>Unidad Municipal</th><th style="text-align:center">Activos Asignados</th><th style="text-align:center">Participación</th></tr></thead>
  <tbody>
    ${unidadesRows}
  </tbody>
</table>

<!-- SECCIÓN 4: ANÁLISIS FINANCIERO TCO -->
<div class="titulo-seccion">4. Análisis Financiero — Costo Total de Propiedad (TCO) <span>Ley N° 19.886</span></div>

<div class="resumen-cards">
  <div class="resumen-card" style="border-color:#059669">
    <div class="valor" style="color:#059669;font-size:14pt">$${invInicial}</div>
    <div class="label">Inversión Inicial Capitalizada</div>
  </div>
  <div class="resumen-card" style="border-color:#0284c7">
    <div class="valor" style="color:#0284c7;font-size:14pt">$${costoAnual}</div>
    <div class="label">Gasto Recurrente Anual</div>
  </div>
  <div class="resumen-card" style="border-color:#7c3aed">
    <div class="valor" style="color:#7c3aed;font-size:14pt">$${tco5}</div>
    <div class="label">TCO Proyectado 5 Años (2027–2031)</div>
  </div>
</div>

<table>
  <thead><tr><th>Categoría</th><th style="text-align:center">Unidades</th><th style="text-align:right">Inversión Inicial</th><th style="text-align:right">Costo Anual</th><th style="text-align:right">TCO 5 Años</th></tr></thead>
  <tbody>
    ${costosRows}
    <tr class="total-row">
      <td>TOTAL INSTITUCIONAL</td>
      <td style="text-align:center">${tot.total_activos || 0}</td>
      <td style="text-align:right">$${invInicial}</td>
      <td style="text-align:right">$${costoAnual}</td>
      <td style="text-align:right">$${tco5}</td>
    </tr>
  </tbody>
</table>

<!-- SECCIÓN 5: ALERTAS DE GARANTÍA -->
<div class="titulo-seccion">5. Auditoría de Vigencia de Garantías <span>Próximos 90 días</span></div>
${(alertas?.garantias_por_vencer || []).length > 0 ? `
<table>
  <thead><tr><th>Código</th><th>Bien / Modelo</th><th>Categoría</th><th>Unidad</th><th style="text-align:center">Vencimiento</th><th style="text-align:center">Plazo</th></tr></thead>
  <tbody>${garantiasRows}</tbody>
</table>
` : '<p style="color:#059669;font-weight:600;margin:10px 0">✓ No se detectaron garantías próximas a vencer en los próximos 90 días.</p>'}

<!-- OBSERVACIONES -->
<div class="observaciones">
  <strong>Observaciones del Emisor:</strong>
  El presente informe fue generado de manera automática por el Sistema de Inventario Tecnológico Municipal (Proyecto A) conforme a los datos registrados a la fecha y hora de emisión. Los valores reflejan el estado actual de la base de datos institucional y están sujetos a las actualizaciones que el Departamento de Informática realice en el sistema.
</div>

<!-- FIRMAS -->
<div class="firmas">
  <div class="firma-bloque">
    <div class="firma-linea">
      <div class="firma-nombre">${user?.nombre || 'Encargado TI'}</div>
      <div class="firma-cargo">${user?.rol === 'admin_ti' ? 'Administrador de TI' : user?.rol === 'jefatura' ? 'Jefatura de Unidad' : 'Auditoría / Control'}<br>Departamento de Informática</div>
    </div>
  </div>
  <div class="firma-bloque">
    <div class="firma-linea">
      <div class="firma-nombre">Jefe(a) Departamento de Informática</div>
      <div class="firma-cargo">Visación Técnica<br>Municipalidad de San Pablo</div>
    </div>
  </div>
</div>

<!-- PIE DE PÁGINA -->
<div class="pie-pagina">
  Ilustre Municipalidad de San Pablo · Provincia de Osorno · Región de Los Lagos · Chile<br>
  Documento generado el ${fechaEmision} a las ${horaEmision} hrs. · ${nroInforme} · Sistema de Inventario TI — Plan Informático 2027–2031<br>
  <em>Este documento es de carácter interno y confidencial. Su reproducción o distribución no autorizada está prohibida.</em>
</div>

</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
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
