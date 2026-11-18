import React, { useState } from 'react';
import { FileCode, Shield, Check, Copy, ExternalLink, Database, Server, UserCheck } from 'lucide-react';

export function ContratoApiScreen() {
  const [copiedEndpoint, setCopiedEndpoint] = useState(null);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(key);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const endpoints = [
    { num: 1, method: 'POST', path: '/api/auth/login', desc: 'Inicio de sesión y entrega de Bearer Token JWT.', resp: '{ "success": true, "data": { "token": "...", "user": { "id": 1, "rol": "admin_ti" } } }' },
    { num: 2, method: 'GET', path: '/api/activos', desc: 'Listado de activos con filtros (?categoria=&estado=&unidad=&q=) y paginación.', resp: '{ "success": true, "data": [...], "meta": { "total": 106, "page": 1, "totalPages": 11 } }' },
    { num: 3, method: 'GET', path: '/api/activos/:id', desc: 'Ficha técnica detallada del activo. Enmascara campos reservados según rol.', resp: '{ "success": true, "data": { "id_activo": "SP-HW-0042", "marca_modelo": "Lenovo ThinkPad..." } }' },
    { num: 4, method: 'GET', path: '/api/activos/:id/historial', desc: 'Bitácora inmutable de eventos (ALTA, TRASLADO, EDICION, BAJA).', resp: '{ "success": true, "data": [{ "id": 1, "tipo_evento": "ALTA", "motivo": "Recepción..." }] }' },
    { num: 5, method: 'GET', path: '/api/alertas?dias=60', desc: 'Alertas de vencimiento de garantías y licencias en los próximos X días.', resp: '{ "success": true, "data": { "garantias_por_vencer": [...], "licencias_por_vencer": [...] } }' },
    { num: 6, method: 'GET', path: '/api/catalogos', desc: 'Listas maestras para categorías, estados operativos, unidades y criticidad.', resp: '{ "success": true, "data": { "categorias": [...], "unidades": [...] } }' },
    { num: 7, method: 'POST', path: '/api/activos', desc: 'Alta de un nuevo activo. Exclusivo admin_ti. Registra automáticamente evento ALTA.', resp: '{ "success": true, "message": "Activo registrado", "data": { "id_activo": "SP-HW-0099" } }' },
    { num: 8, method: 'PUT', path: '/api/activos/:id', desc: 'Modificación de especificaciones de un activo. Exclusivo admin_ti. Registra EDICION.', resp: '{ "success": true, "message": "Activo actualizado" }' },
    { num: 9, method: 'POST', path: '/api/activos/:id/traslado', desc: 'Traslado de unidad, ubicación y custodio. Exclusivo admin_ti. Registra TRASLADO.', resp: '{ "success": true, "message": "Traslado registrado", "data": { ... } }' },
    { num: 10, method: 'POST', path: '/api/activos/:id/baja', desc: 'Baja del activo. Motivo estrictamente obligatorio. Registra evento BAJA.', resp: '{ "success": true, "message": "Activo dado de baja", "data": { "estado_operativo": "De baja" } }' },
    { num: 11, method: 'GET', path: '/api/reportes/resumen', desc: 'Consolidados de inventario por categoría, estado operativo y unidad municipal.', resp: '{ "success": true, "data": { "totales": { ... }, "por_categoria": [...], "por_unidad": [...] } }' },
    { num: 12, method: 'GET', path: '/api/reportes/costos', desc: 'Métricas de inversión inicial y gasto recurrente TCO proyectado a 5 años.', resp: '{ "success": true, "data": { "inversion_total_inicial": 68450000, "tco_estimado_5_anos": ... } }' },
    { num: 13, method: 'POST', path: '/api/importar', desc: 'Carga masiva por CSV con reporte de filas válidas y erróneas.', resp: '{ "success": true, "data": { "resumen": { "total_procesadas": 15, "validas": 13, "con_error": 2 } } }' }
  ];

  return (
    <div className="page-wrapper" style={{ maxWidth: '1100px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)' }}>
          Contrato de API REST - Sistema de Inventario
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Referencia canónica oficial para Manuel, Alfredo, Ivan y Gaby (Archivo fuente: <code>docs/contrato-api.md</code>)
        </p>
      </div>

      {/* Regla Única */}
      <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e40af', marginBottom: 6 }}>
          Regla de Oro del Proyecto TIT (Proyecto A)
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#334155' }}>
          El archivo <code>docs/contrato-api.md</code> es la referencia única y definitiva de todo el equipo de trabajo. Define los 13 endpoints exactos, los nombres de campo de la base de datos (Tabla 7 del Informe), las reglas de seguridad de roles y los JSON de respuesta.
        </p>
      </div>

      {/* Roles y Privilegios */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <UserCheck size={18} />
            <span>Matriz de Roles y Visibilidad de Datos</span>
          </div>
        </div>

        <div className="table-container" style={{ border: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Rol</th>
                <th>Usuario Demo</th>
                <th>Alcance de Datos</th>
                <th>Campos Reservados (IP / VLAN / Criticidad)</th>
                <th>Permisos de Escritura</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="badge badge-purple">admin_ti</span></td>
                <td><code>admin</code></td>
                <td>Todos los activos municipales</td>
                <td><span className="badge badge-success">Visibles 100%</span></td>
                <td>Altas, Edición, Traslados, Bajas e Importar CSV</td>
              </tr>
              <tr>
                <td><span className="badge badge-info">jefatura</span></td>
                <td><code>jefe_dideco</code></td>
                <td>Solo activos de su propia unidad (ej: DIDECO)</td>
                <td><span className="badge badge-danger">Ocultos / [RESERVADO]</span></td>
                <td>Solo lectura y exportación de su unidad</td>
              </tr>
              <tr>
                <td><span className="badge badge-secondary">lectura</span></td>
                <td><code>auditor</code></td>
                <td>Todos los activos municipales</td>
                <td><span className="badge badge-danger">Ocultos / [RESERVADO]</span></td>
                <td>Solo lectura y exportación global</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Lista de los 13 Endpoints */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Server size={18} />
            <span>Los 13 Endpoints Oficiales de la API</span>
          </div>
          <span className="badge badge-secondary">Host: http://localhost:3000/api</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {endpoints.map((ep) => (
            <div 
              key={ep.num}
              style={{
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '14px 16px',
                background: '#f8fafc'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                    #{ep.num}
                  </span>
                  <span className={`badge ${ep.method === 'GET' ? 'badge-info' : (ep.method === 'POST' ? 'badge-success' : 'badge-warning')}`}>
                    {ep.method}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                    {ep.path}
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                  onClick={() => copyToClipboard(ep.path, ep.num)}
                >
                  {copiedEndpoint === ep.num ? <Check size={12} /> : <Copy size={12} />}
                  {copiedEndpoint === ep.num ? 'Copiado' : 'Copiar Path'}
                </button>
              </div>

              <div style={{ fontSize: '0.825rem', color: '#334155', marginBottom: 8 }}>
                {ep.desc}
              </div>

              <div style={{ background: '#0f172a', padding: '8px 12px', borderRadius: '6px', color: '#38bdf8', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                {ep.resp}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
