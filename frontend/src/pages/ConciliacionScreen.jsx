import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ClipboardCheck, RefreshCw, ShieldAlert } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext';
import { CATALOGOS } from '../catalogos.js';

const CAMPOS_FISICOS = [
  { campo: 'id_activo', label: 'ID observado' },
  { campo: 'ubicacion', label: 'Ubicación observada' },
  { campo: 'unidad', label: 'Unidad observada' },
  { campo: 'custodio', label: 'Custodio observado' }
];

function normalizar(valor) {
  return String(valor ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-CL');
}

function fechaLegible(fecha) {
  if (!fecha) return '—';
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(fecha));
}

function colorResultado(resultado) {
  if (resultado === 'Cumple' || resultado === 'Coincide') return '#059669';
  if (resultado === 'No cumple' || resultado === 'Discrepancia') return '#dc2626';
  return '#d97706';
}

function valorInspeccion(draft, campo) {
  return draft[`${campo}_observado`] || '';
}

export function ConciliacionScreen() {
  const { user } = useAuth();
  const esAdmin = user?.rol === 'admin_ti';
  const puedeConsultar = esAdmin || user?.rol === 'lectura';
  const [conciliaciones, setConciliaciones] = useState([]);
  const [seleccionada, setSeleccionada] = useState(null);
  const [borradores, setBorradores] = useState({});
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(null);
  const [error, setError] = useState(null);

  const cargarConciliaciones = async () => {
    setLoading(true);
    setError(null);
    try {
      const respuesta = await api.getConciliaciones();
      setConciliaciones(respuesta.data);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las conciliaciones.');
    } finally {
      setLoading(false);
    }
  };

  const abrirConciliacion = async (id) => {
    setError(null);
    try {
      const respuesta = await api.getConciliacion(id);
      setSeleccionada(respuesta.data);
      setBorradores({});
    } catch (err) {
      setError(err.message || 'No se pudo abrir la conciliación.');
    }
  };

  useEffect(() => {
    cargarConciliaciones();
  }, [user]);

  const crearConciliacion = async () => {
    setCreando(true);
    setError(null);
    try {
      const respuesta = await api.crearConciliacion();
      setSeleccionada(respuesta.data);
      setBorradores({});
      await cargarConciliaciones();
    } catch (err) {
      setError(err.message || 'No se pudo iniciar la conciliación física.');
    } finally {
      setCreando(false);
    }
  };

  const actualizarBorrador = (idActivo, campo, valor) => {
    setBorradores((actuales) => ({
      ...actuales,
      [idActivo]: { ...actuales[idActivo], [campo]: valor }
    }));
  };

  const guardarInspeccion = async (activo) => {
    const borrador = borradores[activo.id_activo] || {};
    if (!['true', 'false'].includes(borrador.encontrado)) {
      setError(`Indica si ${activo.id_activo} fue encontrado físicamente.`);
      return;
    }

    const encontrado = borrador.encontrado === 'true';
    const datos = {
      encontrado,
      detalle: borrador.detalle || ''
    };

    if (encontrado) {
      const faltante = ['id_activo', 'ubicacion', 'unidad', 'custodio', 'estado_operativo']
        .find((campo) => !valorInspeccion(borrador, campo).trim());
      if (faltante) {
        setError(`Completa todos los datos observados de ${activo.id_activo}.`);
        return;
      }

      for (const campo of ['id_activo', 'ubicacion', 'unidad', 'custodio', 'estado_operativo']) {
        datos[`${campo}_observado`] = valorInspeccion(borrador, campo);
      }
      const discrepancia = Object.keys(activo.datos_registrados).some((campo) =>
        normalizar(activo.datos_registrados[campo]) !== normalizar(datos[`${campo}_observado`])
      );
      if (discrepancia && !datos.detalle.trim()) {
        setError(`Describe la diferencia encontrada en ${activo.id_activo}.`);
        return;
      }
    } else if (!datos.detalle.trim()) {
      setError(`Describe por qué no se encontró ${activo.id_activo}.`);
      return;
    }

    setGuardando(activo.id_activo);
    setError(null);
    try {
      const respuesta = await api.registrarInspeccion(seleccionada.id, activo.id_activo, datos);
      setSeleccionada(respuesta.data);
      await cargarConciliaciones();
    } catch (err) {
      setError(err.message || 'No se pudo guardar la inspección.');
    } finally {
      setGuardando(null);
    }
  };

  if (!puedeConsultar) {
    return (
      <div className="page-wrapper">
        <div className="alert alert-danger">
          <ShieldAlert size={18} />
          <span>La conciliación física está disponible para Admin TI y Auditoría.</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-wrapper" style={{ textAlign: 'center', padding: '80px 0' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)', margin: '0 auto' }} />
        <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>Cargando conciliaciones físicas...</p>
      </div>
    );
  }

  const progreso = seleccionada?.tamano_muestra
    ? Math.round((seleccionada.inspeccionados / seleccionada.tamano_muestra) * 100)
    : 0;

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)' }}>Conciliación Física del Inventario</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Muestra aleatoria del 10% de activos vigentes; el umbral de aceptación es ≤5% de discrepancias.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={cargarConciliaciones}>
            <RefreshCw size={14} /> Actualizar
          </button>
          {esAdmin && (
            <button type="button" className="btn btn-primary" onClick={crearConciliacion} disabled={creando}>
              <ClipboardCheck size={16} />
              {creando ? 'Preparando muestra...' : 'Iniciar muestra del 10%'}
            </button>
          )}
        </div>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 18 }}>
        <ClipboardCheck size={18} />
        <span>
          La muestra excluye los bienes dados de baja. Se guarda una sola inspección por activo y la conciliación se cierra
          automáticamente al completar todos los elementos. Una discrepancia en una muestra de 11 bienes supera el 5%.
        </span>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 18 }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.8fr) minmax(0, 1.6fr)', gap: 18, alignItems: 'start' }}>
        <section className="card">
          <div className="card-header">
            <div className="card-title">Historial de conciliaciones</div>
            <span className="badge badge-secondary">{conciliaciones.length}</span>
          </div>
          {conciliaciones.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Aún no hay conciliaciones. Inicia una muestra para registrar la inspección física.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {conciliaciones.map((sesion) => (
                <button
                  type="button"
                  key={sesion.id}
                  onClick={() => abrirConciliacion(sesion.id)}
                  className="btn btn-outline"
                  style={{
                    display: 'block',
                    textAlign: 'left',
                    borderColor: seleccionada?.id === sesion.id ? 'var(--primary)' : 'var(--border)',
                    background: seleccionada?.id === sesion.id ? '#eff6ff' : '#fff',
                    padding: 12
                  }}
                >
                  <strong>#{sesion.id} · {sesion.resultado}</strong>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {fechaLegible(sesion.fecha_inicio)} · {sesion.inspeccionados}/{sesion.tamano_muestra} inspeccionados
                  </span>
                  {sesion.resultado !== 'En curso' && (
                    <span style={{ display: 'block', fontSize: '0.75rem', color: colorResultado(sesion.resultado), marginTop: 4 }}>
                      {sesion.discrepancias} discrepancias · {sesion.porcentaje_discrepancias}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          {!seleccionada ? (
            <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)' }}>
              Selecciona una conciliación o inicia una muestra nueva.
            </div>
          ) : (
            <>
              <div className="card-header">
                <div>
                  <div className="card-title">Conciliación #{seleccionada.id}</div>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Iniciada por {seleccionada.usuario} · {fechaLegible(seleccionada.fecha_inicio)}
                  </span>
                </div>
                <span className="badge" style={{ color: colorResultado(seleccionada.resultado), background: `${colorResultado(seleccionada.resultado)}18` }}>
                  {seleccionada.resultado}
                </span>
              </div>

              <div className="stats-grid" style={{ marginBottom: 16 }}>
                <div className="stat-card"><div><div className="stat-number">{seleccionada.total_activos}</div><div className="stat-label">Activos vigentes</div></div></div>
                <div className="stat-card"><div><div className="stat-number">{seleccionada.tamano_muestra}</div><div className="stat-label">Tamaño de muestra</div></div></div>
                <div className="stat-card"><div><div className="stat-number">{seleccionada.inspeccionados}/{seleccionada.tamano_muestra}</div><div className="stat-label">Inspeccionados</div></div></div>
                <div className="stat-card"><div><div className="stat-number">{seleccionada.discrepancias}</div><div className="stat-label">Discrepancias</div></div></div>
              </div>

              <div className="okr-meter-bar" style={{ marginBottom: 8 }}>
                <div className="okr-meter-fill" style={{ width: `${progreso}%`, background: seleccionada.resultado === 'No cumple' ? '#dc2626' : '#2563eb' }} />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                Avance {progreso}%{seleccionada.inspeccionados > 0 ? ` · discrepancias observadas: ${seleccionada.porcentaje_discrepancias}%` : ''}
              </p>

              {seleccionada.resultado !== 'En curso' && (
                <div className={`alert ${seleccionada.resultado === 'Cumple' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: 16 }}>
                  {seleccionada.resultado === 'Cumple' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <span>
                    {seleccionada.resultado === 'Cumple'
                      ? 'La muestra cumple con el máximo permitido de 5% de discrepancias.'
                      : 'La muestra excede el máximo permitido de 5%; requiere revisión y corrección del inventario.'}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {seleccionada.activos.map((activo) => {
                  const borrador = borradores[activo.id_activo] || {};
                  const pendiente = activo.resultado === 'Pendiente';
                  return (
                    <article key={activo.id_activo} className="card" style={{ margin: 0, borderLeft: `4px solid ${colorResultado(activo.resultado)}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                        <div>
                          <strong>{activo.id_activo}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 3 }}>
                            Registrado: {activo.datos_registrados.ubicacion} · {activo.datos_registrados.unidad} · {activo.datos_registrados.custodio} · {activo.datos_registrados.estado_operativo}
                          </div>
                        </div>
                        <span className="badge" style={{ color: colorResultado(activo.resultado), background: `${colorResultado(activo.resultado)}18`, alignSelf: 'start' }}>
                          {activo.resultado}
                        </span>
                      </div>

                      {pendiente && esAdmin ? (
                        <>
                          <div className="form-group">
                            <label className="form-label">Resultado de inspección</label>
                            <select
                              className="form-select"
                              value={borrador.encontrado || ''}
                              onChange={(event) => actualizarBorrador(activo.id_activo, 'encontrado', event.target.value)}
                            >
                              <option value="">Selecciona una opción...</option>
                              <option value="true">Encontrado físicamente</option>
                              <option value="false">No encontrado</option>
                            </select>
                          </div>

                          {borrador.encontrado === 'true' && (
                            <div className="form-grid" style={{ marginTop: 10 }}>
                              {CAMPOS_FISICOS.map(({ campo, label }) => (
                                <div className="form-group" key={campo}>
                                  <label className="form-label">{label}</label>
                                  <input
                                    className="form-input"
                                    value={valorInspeccion(borrador, campo)}
                                    onChange={(event) => actualizarBorrador(activo.id_activo, `${campo}_observado`, event.target.value)}
                                    maxLength={200}
                                  />
                                </div>
                              ))}
                              <div className="form-group">
                                <label className="form-label">Estado observado</label>
                                <select
                                  className="form-select"
                                  value={valorInspeccion(borrador, 'estado_operativo')}
                                  onChange={(event) => actualizarBorrador(activo.id_activo, 'estado_operativo_observado', event.target.value)}
                                >
                                  <option value="">Selecciona el estado...</option>
                                  {CATALOGOS.estados_operativos.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
                                </select>
                              </div>
                            </div>
                          )}

                          {borrador.encontrado && (
                            <div className="form-group" style={{ marginTop: 10 }}>
                              <label className="form-label">Observación de discrepancia (obligatoria si hay diferencias)</label>
                              <textarea
                                className="form-textarea"
                                rows={2}
                                value={borrador.detalle || ''}
                                onChange={(event) => actualizarBorrador(activo.id_activo, 'detalle', event.target.value)}
                                maxLength={500}
                              />
                            </div>
                          )}

                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => guardarInspeccion(activo)}
                            disabled={guardando === activo.id_activo}
                          >
                            {guardando === activo.id_activo ? 'Guardando...' : 'Guardar inspección'}
                          </button>
                        </>
                      ) : (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {activo.fecha_verificacion
                            ? `Verificado por ${activo.usuario_verificacion} · ${fechaLegible(activo.fecha_verificacion)}${activo.detalle ? ` · ${activo.detalle}` : ''}`
                            : 'Pendiente de inspección física.'}
                          {activo.datos_observados && (
                            <div style={{ marginTop: 6 }}>
                              Observado: {activo.datos_observados.ubicacion} · {activo.datos_observados.unidad} · {activo.datos_observados.custodio} · {activo.datos_observados.estado_operativo}
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default ConciliacionScreen;
