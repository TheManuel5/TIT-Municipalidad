import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, KeyRound, Building, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

// Herramientas de demostración (usuario/contraseña precargados y acceso rápido).
// En producción: VITE_MODO_DEMO=false
const MODO_DEMO = import.meta.env.VITE_MODO_DEMO !== 'false';

export function LoginScreen() {
  const { login, loading, testUsers } = useAuth();
  const [username, setUsername] = useState(MODO_DEMO ? 'admin' : '');
  const [password, setPassword] = useState(MODO_DEMO ? 'password123' : '');
  const [error, setError] = useState(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('expired=1')) {
      window.history.replaceState({}, '', window.location.pathname.replace(/\/login$/, '') || '/');
      return 'Su sesión anterior expiró o requiere autenticación.';
    }
    return '';
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión.');
    }
  };

  const handleQuickLogin = (testUser) => {
    setUsername(testUser.username);
    setPassword('password123');
    login(testUser.username, 'password123').catch((err) => {
      setError(err.message);
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'radial-gradient(circle at top right, #1e3a8a 0%, #0f172a 60%)'
    }}>
      <div style={{
        maxWidth: '460px',
        width: '100%',
        background: '#ffffff',
        borderRadius: '16px',
        padding: '36px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
      }}>
        {/* Encabezado */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            backgroundColor: '#1e40af',
            borderRadius: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            marginBottom: '12px',
            boxShadow: '0 4px 10px rgba(30, 64, 175, 0.3)'
          }}>
            <Building size={28} />
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
            Municipalidad de San Pablo
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
            Sistema de Inventario Tecnológico (Proyecto A)
          </p>
          <div style={{
            display: 'inline-block',
            marginTop: '8px',
            padding: '2px 10px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            color: '#1d4ed8',
            fontWeight: 600
          }}>
            Plan Informático Municipal 2027–2031
          </div>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Usuario Institucional</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ej: admin, jefe_dideco, auditor"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '0.95rem', marginTop: '10px' }}
            disabled={loading}
          >
            {loading ? 'Validando credenciales...' : 'Ingresar al Sistema'}
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Acceso Rápido para Demostración (oculto si VITE_MODO_DEMO=false) */}
        {MODO_DEMO && (
          <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              Acceso Rápido para Pruebas (3 Roles):
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {testUsers.map((u) => {
                const isAdmin = u.rol === 'admin_ti';
                const isJefe = u.rol === 'jefatura';
                return (
                  <button
                    key={u.username}
                    type="button"
                    onClick={() => handleQuickLogin(u)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#2563eb';
                      e.currentTarget.style.background = '#eff6ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#0f172a' }}>
                        {u.nombre}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {isAdmin ? '⚙️ Admin TI (Acceso total + IP/Red)' : (isJefe ? `🏢 Jefatura ${u.unidad}` : '👁️ Auditoria Control')}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: isAdmin ? '#f3e8ff' : (isJefe ? '#e0f2fe' : '#f1f5f9'),
                      color: isAdmin ? '#7e22ce' : (isJefe ? '#0369a1' : '#475569'),
                      fontWeight: 700
                    }}>
                      {u.rol}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
