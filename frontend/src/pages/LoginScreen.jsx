import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building, AlertCircle, ArrowRight } from 'lucide-react';

const cuentasIniciales = [
  { username: 'admin', nombre: 'Administrador TI', unidad: 'Informática' },
  { username: 'jefe_dideco', nombre: 'Jefatura', unidad: 'DIDECO' },
  { username: 'auditor', nombre: 'Auditoría / Control', unidad: 'Control' }
];

export function LoginScreen() {
  const { login, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      if (!username.trim() || !password) {
        setError('Escribe tu usuario y contraseña para continuar.');
        return;
      }
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión.');
    }
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
              placeholder="Escribe tu usuario institucional"
              autoComplete="username"
              maxLength={100}
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
              placeholder="Escribe tu contraseña"
              autoComplete="current-password"
              maxLength={200}
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

        <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>
            Usuarios iniciales del sistema
          </div>
          <p style={{ fontSize: '0.76rem', color: '#64748b', marginBottom: 10 }}>
            Selecciona tu usuario y escribe la contraseña de tu cuenta. El servidor comprueba el acceso.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {cuentasIniciales.map((cuenta) => (
              <button
                key={cuenta.username}
                type="button"
                className="btn btn-outline btn-sm"
                style={{ justifyContent: 'space-between' }}
                disabled={loading}
                onClick={() => {
                  setUsername(cuenta.username);
                  setPassword('');
                  setError('');
                }}
              >
                <span>{cuenta.nombre} · {cuenta.unidad}</span>
                <span style={{ fontFamily: 'monospace' }}>{cuenta.username}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
