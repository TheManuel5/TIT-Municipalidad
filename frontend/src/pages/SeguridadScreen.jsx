import React, { useEffect, useState, useCallback } from 'react';
import { KeyRound, Users, ScrollText, RefreshCw, UserPlus, ShieldCheck, ShieldOff } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext';
import { CATALOGOS } from '../api.mock.js';

/**
 * SeguridadScreen - Seguridad y Accesos
 * Responsable: Alfredo
 *  - Mi cuenta: cambio de la propia contraseña (todos los roles).
 *  - Usuarios: alta, cambio de rol/unidad, revocación y restablecimiento de contraseña (admin_ti). RF-6
 *  - Auditoría: registro inmutable de accesos y operaciones (admin_ti y lectura). RNF-6
 */

const ROLES = [
  { id: 'admin_ti', label: 'Administrador TI' },
  { id: 'jefatura', label: 'Jefatura de Unidad' },
  { id: 'lectura', label: 'Lectura / Control' }
];

const fechaLegible = (f) =>
  f ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(f)) : '—';

const mensajeError = (err) => {
  const detalle = Array.isArray(err?.details) && err.details.length
    ? ` (${err.details.map((d) => d.mensaje ? `${d.campo}: ${d.mensaje}` : d.campo).filter(Boolean).join('; ')})`
    : '';
  return (err?.message || 'Error inesperado.') + detalle;
};

function Aviso({ tipo, texto }) {
  if (!texto) return null;
  return (
    <div className={`alert ${tipo === 'ok' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: 16 }}>
      <span>{texto}</span>
    </div>
  );
}

function MiCuenta() {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [aviso, setAviso] = useState(null);
  const [loading, setLoading] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setAviso(null);
    if (nueva !== confirmacion) {
      setAviso({ tipo: 'error', texto: 'La confirmación no coincide con la nueva contraseña.' });
      return;
    }
    setLoading(true);
    try {
      await api.cambiarPassword({ password_actual: actual, password_nueva: nueva });
      setActual(''); setNueva(''); setConfirmacion('');
      setAviso({ tipo: 'ok', texto: 'Contraseña actualizada correctamente.' });
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeError(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <div className="card-header">
        <h3 className="card-title">Cambiar mi contraseña</h3>
      </div>
      <form onSubmit={enviar} style={{ padding: 20 }}>
        <Aviso {...(aviso || {})} />
        <div className="form-group">
          <label className="form-label">Contraseña actual</label>
          <input type="password" className="form-input" value={actual} onChange={(e) => setActual(e.target.value)} autoComplete="current-password" required />
        </div>
        <div className="form-group">
          <label className="form-label">Nueva contraseña</label>
          <input type="password" className="form-input" value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" required />
          <span className="form-helper">Mínimo 8 caracteres, con al menos una letra y un número.</span>
        </div>
        <div className="form-group">
          <label className="form-label">Confirmar nueva contraseña</label>
          <input type="password" className="form-input" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} autoComplete="new-password" required />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          <KeyRound size={16} /> {loading ? 'Guardando...' : 'Actualizar contraseña'}
        </button>
      </form>
    </div>
  );
}

function GestionUsuarios({ usuarioActual }) {
  const [usuarios, setUsuarios] = useState([]);
  const [aviso, setAviso] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ username: '', nombre: '', rol: 'lectura', unidad: CATALOGOS.unidades[0], password: '' });

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getUsuarios();
      setUsuarios(res.data || []);
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeError(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const ejecutar = async (fn, textoOk) => {
    setAviso(null);
    try {
      await fn();
      setAviso({ tipo: 'ok', texto: textoOk });
      cargar();
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeError(err) });
    }
  };

  const crear = (e) => {
    e.preventDefault();
    ejecutar(async () => {
      await api.crearUsuario(form);
      setForm({ username: '', nombre: '', rol: 'lectura', unidad: CATALOGOS.unidades[0], password: '' });
    }, `Usuario '${form.username}' creado.`);
  };

  const restablecer = (u) => {
    const nueva = window.prompt(`Nueva contraseña temporal para ${u.username} (mín. 8 caracteres, letras y números):`);
    if (!nueva) return;
    ejecutar(() => api.restablecerPassword(u.id, nueva), `Contraseña de '${u.username}' restablecida.`);
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <Aviso {...(aviso || {})} />

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Aprobar nuevo acceso</h3>
        </div>
        <form onSubmit={crear} style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Usuario</label>
            <input className="form-input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} placeholder="ej: jefe_dom" required />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nombre completo</label>
            <input className="form-input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Rol</label>
            <select className="form-select" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
              {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Unidad</label>
            <select className="form-select" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })}>
              {CATALOGOS.unidades.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Contraseña inicial</label>
            <input type="password" className="form-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" required />
          </div>
          <button type="submit" className="btn btn-primary"><UserPlus size={16} /> Crear cuenta</button>
        </form>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title">Cuentas del sistema</h3>
          <button type="button" className="btn btn-outline btn-sm" onClick={cargar}><RefreshCw size={14} /> Actualizar</button>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Usuario</th><th>Nombre</th><th>Rol</th><th>Unidad</th><th>Estado</th><th>Último acceso</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7}>Cargando...</td></tr>}
              {!loading && usuarios.map((u) => {
                const esYo = u.id === usuarioActual?.id;
                return (
                  <tr key={u.id}>
                    <td><strong>{u.username}</strong>{esYo && <span className="badge badge-secondary" style={{ marginLeft: 6 }}>Tú</span>}</td>
                    <td>{u.nombre}</td>
                    <td>
                      <select className="form-select" value={u.rol} disabled={esYo}
                        onChange={(e) => ejecutar(() => api.actualizarUsuario(u.id, { rol: e.target.value }), `Rol de '${u.username}' actualizado.`)}>
                        {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="form-select" value={u.unidad}
                        onChange={(e) => ejecutar(() => api.actualizarUsuario(u.id, { unidad: e.target.value }), `Unidad de '${u.username}' actualizada.`)}>
                        {CATALOGOS.unidades.map((un) => <option key={un} value={un}>{un}</option>)}
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${u.activo ? 'badge-success' : 'badge-danger'}`}>{u.activo ? 'Activo' : 'Revocado'}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{fechaLegible(u.ultimo_acceso)}</td>
                    <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {!esYo && (u.activo ? (
                        <button type="button" className="btn btn-danger btn-sm"
                          onClick={() => window.confirm(`¿Revocar el acceso de ${u.username}? Sus sesiones abiertas dejarán de funcionar de inmediato.`) &&
                            ejecutar(() => api.actualizarUsuario(u.id, { activo: false }), `Acceso de '${u.username}' revocado.`)}>
                          <ShieldOff size={14} /> Revocar
                        </button>
                      ) : (
                        <button type="button" className="btn btn-secondary btn-sm"
                          onClick={() => ejecutar(() => api.actualizarUsuario(u.id, { activo: true }), `Acceso de '${u.username}' reactivado.`)}>
                          <ShieldCheck size={14} /> Reactivar
                        </button>
                      ))}
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => restablecer(u)}>
                        <KeyRound size={14} /> Contraseña
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RegistroAuditoria() {
  const [filtros, setFiltros] = useState({ usuario: '', accion: '', resultado: '' });
  const [page, setPage] = useState(1);
  const [datos, setDatos] = useState({ data: [], meta: { total: 0, totalPages: 0 } });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAuditoria({ ...filtros, page, limit: 25 });
      setDatos({ data: res.data || [], meta: res.meta || { total: 0, totalPages: 0 } });
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setLoading(false);
    }
  }, [filtros, page]);

  useEffect(() => { cargar(); }, [cargar]);

  const colorResultado = (r) => (r === 'OK' ? 'badge-success' : r === 'RECHAZADO' ? 'badge-warning' : 'badge-danger');

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h3 className="card-title">Registro de auditoría (inmutable)</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="form-input" style={{ width: 150 }} placeholder="Usuario" value={filtros.usuario}
            onChange={(e) => { setPage(1); setFiltros({ ...filtros, usuario: e.target.value.trim() }); }} />
          <select className="form-select" style={{ width: 190 }} value={filtros.accion}
            onChange={(e) => { setPage(1); setFiltros({ ...filtros, accion: e.target.value }); }}>
            <option value="">Todas las acciones</option>
            <option value="LOGIN">Inicios de sesión</option>
            <option value="ESCRITURA">Escrituras</option>
            <option value="EXPORTACION">Exportaciones</option>
            <option value="USUARIO">Gestión de usuarios</option>
            <option value="RESPALDO">Respaldos</option>
          </select>
          <select className="form-select" style={{ width: 150 }} value={filtros.resultado}
            onChange={(e) => { setPage(1); setFiltros({ ...filtros, resultado: e.target.value }); }}>
            <option value="">Todo resultado</option>
            <option value="OK">OK</option>
            <option value="RECHAZADO">Rechazado</option>
            <option value="ERROR">Error</option>
          </select>
          <button type="button" className="btn btn-outline btn-sm" onClick={cargar}><RefreshCw size={14} /></button>
        </div>
      </div>
      {error && <div className="alert alert-danger" style={{ margin: 16 }}>{error}</div>}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Ruta</th><th>Resultado</th><th>IP</th><th>Detalle</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7}>Cargando...</td></tr>}
            {!loading && datos.data.length === 0 && <tr><td colSpan={7}>Sin registros para los filtros seleccionados.</td></tr>}
            {!loading && datos.data.map((e) => (
              <tr key={e.id}>
                <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{fechaLegible(e.fecha)}</td>
                <td>{e.usuario || '—'}{e.rol && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{e.rol}</div>}</td>
                <td><code>{e.accion}</code></td>
                <td style={{ fontSize: '0.8rem' }}>{e.metodo ? `${e.metodo} ${e.ruta}` : '—'}</td>
                <td><span className={`badge ${colorResultado(e.resultado)}`}>{e.resultado}{e.estado_http ? ` ${e.estado_http}` : ''}</span></td>
                <td style={{ fontSize: '0.8rem' }}>{e.ip || '—'}</td>
                <td style={{ fontSize: '0.8rem', maxWidth: 280 }}>{e.detalle || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{datos.meta.total} registros</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
          <span style={{ fontSize: '0.85rem', alignSelf: 'center' }}>Página {page} de {Math.max(1, datos.meta.totalPages)}</span>
          <button type="button" className="btn btn-outline btn-sm" disabled={page >= datos.meta.totalPages} onClick={() => setPage(page + 1)}>Siguiente</button>
        </div>
      </div>
    </div>
  );
}

export function SeguridadScreen() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin_ti';
  const puedeAuditar = isAdmin || user?.rol === 'lectura';

  const pestañas = [
    { id: 'cuenta', label: 'Mi cuenta', icon: KeyRound, visible: true },
    { id: 'usuarios', label: 'Usuarios y privilegios', icon: Users, visible: isAdmin },
    { id: 'auditoria', label: 'Auditoría', icon: ScrollText, visible: puedeAuditar }
  ].filter((p) => p.visible);

  const [pestaña, setPestaña] = useState(isAdmin ? 'usuarios' : (puedeAuditar ? 'auditoria' : 'cuenta'));

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)' }}>Seguridad y Accesos</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
          Gestión de cuentas y privilegios (RF-6) y registro de auditoría inalterable (RNF-6, Ley N.º 21.663).
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {pestañas.map(({ id, label, icon: Icono }) => (
          <button key={id} type="button"
            className={`btn btn-sm ${pestaña === id ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setPestaña(id)}>
            <Icono size={15} /> {label}
          </button>
        ))}
      </div>

      {pestaña === 'cuenta' && <MiCuenta />}
      {pestaña === 'usuarios' && isAdmin && <GestionUsuarios usuarioActual={user} />}
      {pestaña === 'auditoria' && puedeAuditar && <RegistroAuditoria />}
    </div>
  );
}
