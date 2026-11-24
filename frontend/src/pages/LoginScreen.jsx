import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { FieldError } from '../components/FieldError';

const USERNAME_STORAGE_KEY = 'san_pablo_remembered_username';

function readRememberedLogin() {
  try {
    return { username: localStorage.getItem(USERNAME_STORAGE_KEY) || '', error: '' };
  } catch {
    return {
      username: '',
      error: 'El navegador no permite guardar el usuario en este dispositivo.'
    };
  }
}

const cuentasIniciales = [
  { username: 'admin', nombre: 'Administrador TI', unidad: 'Informática' },
  { username: 'jefe_dideco', nombre: 'Jefatura', unidad: 'DIDECO' },
  { username: 'auditor', nombre: 'Auditoría / Control', unidad: 'Control' }
];

export function LoginScreen() {
  const { login, loading } = useAuth();
  const [rememberedLogin] = useState(readRememberedLogin);
  const [username, setUsername] = useState(rememberedLogin.username);
  const [password, setPassword] = useState('');
  const [rememberUsername, setRememberUsername] = useState(() => Boolean(rememberedLogin.username));
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [rememberError, setRememberError] = useState(rememberedLogin.error);
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
    const errors = {};
    if (!username.trim()) errors.username = 'Escribe tu usuario institucional.';
    if (!password) errors.password = 'Escribe tu contraseña.';
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError('Revisa los campos marcados.');
      return;
    }

    try {
      await login(username.trim(), password);
      // Guardar usuario en localStorage al iniciar sesión exitosamente
      if (rememberUsername && username.trim()) {
        try {
          localStorage.setItem(USERNAME_STORAGE_KEY, username.trim());
        } catch {
          // Si no se puede guardar, no bloquear el login
        }
      }
    } catch (err) {
      if (err.status === 401) {
        setFieldErrors({ password: 'El usuario o la contraseña no son correctos.' });
      } else {
        setError(err.message || 'Error al iniciar sesión.');
      }
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

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Usuario Institucional</label>
            <input
              type="text"
              className="form-input"
              name="username"
              value={username}
              onChange={(e) => {
                const nextUsername = e.target.value;
                setUsername(nextUsername);
                setFieldErrors((previous) => ({ ...previous, username: '' }));
                if (rememberUsername) {
                  try {
                    if (nextUsername.trim()) localStorage.setItem(USERNAME_STORAGE_KEY, nextUsername.trim());
                    else localStorage.removeItem(USERNAME_STORAGE_KEY);
                    setRememberError('');
                  } catch {
                    setRememberError('No se pudo guardar el usuario; puedes seguir iniciando sesión.');
                  }
                }
              }}
              placeholder="Escribe tu usuario institucional"
              autoComplete="username"
              aria-invalid={Boolean(fieldErrors.username)}
              aria-describedby={fieldErrors.username ? 'login-username-error' : undefined}
              maxLength={100}
            />
            <FieldError id="login-username-error" message={fieldErrors.username} />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <div className="password-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                name="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((previous) => ({ ...previous, password: '' }));
                }}
                placeholder="Escribe tu contraseña"
                autoComplete="current-password"
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                maxLength={200}
              />
              <button
                type="button"
                className="password-visibility-button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <FieldError id="login-password-error" message={fieldErrors.password} />
          </div>

          <label className="remember-option">
            <input
              type="checkbox"
              checked={rememberUsername}
              aria-describedby={rememberError ? 'remember-username-error' : undefined}
              onChange={(e) => {
                const checked = e.target.checked;
                setRememberUsername(checked);
                try {
                  if (checked && username.trim()) localStorage.setItem(USERNAME_STORAGE_KEY, username.trim());
                  else if (!checked) localStorage.removeItem(USERNAME_STORAGE_KEY);
                  setRememberError('');
                } catch {
                  setRememberError('No se pudo guardar el usuario; puedes seguir iniciando sesión.');
                }
              }}
            />
            <span>Recordar usuario en este dispositivo.</span>
          </label>
          <FieldError id="remember-username-error" message={rememberError} />

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
                  setFieldErrors({});
                  if (rememberUsername) {
                    try {
                      localStorage.setItem(USERNAME_STORAGE_KEY, cuenta.username);
                      setRememberError('');
                    } catch {
                      setRememberError('No se pudo guardar el usuario; puedes seguir iniciando sesión.');
                    }
                  }
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
