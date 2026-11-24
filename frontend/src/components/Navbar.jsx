import React from 'react';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from './Badge';
import { LogOut, User, Shield, RefreshCw, Menu } from 'lucide-react';
import { isMockMode } from '../api';

// Herramientas de demostración (selector de rol). En producción: VITE_MODO_DEMO=false
const MODO_DEMO = import.meta.env.VITE_MODO_DEMO !== 'false';

export function Navbar({ onToggleSidebar }) {
  const { user, logout, switchUser, testUsers } = useAuth();

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button 
          type="button" 
          className="btn btn-outline btn-sm mobile-menu-btn"
          style={{ display: 'none' }}
          onClick={onToggleSidebar}
        >
          <Menu size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span 
            className="badge" 
            style={{ 
              backgroundColor: isMockMode ? '#eff6ff' : '#ecfdf5', 
              color: isMockMode ? '#1d4ed8' : '#047857',
              border: `1px solid ${isMockMode ? '#bfdbfe' : '#a7f3d0'}`,
              fontWeight: 600,
              fontSize: '0.72rem'
            }}
          >
            {isMockMode ? '● Modo Simulado (Mock)' : '● API Real Conectada'}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Plan Informático Municipal 2027–2031
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Selector de Usuario para demostración en vivo (oculto si VITE_MODO_DEMO=false) */}
        {MODO_DEMO && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield size={15} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Simular rol:
            </span>
            <select 
              className="form-select" 
              style={{ padding: '4px 8px', fontSize: '0.78rem', width: 'auto' }}
              value={user?.username || ''}
              onChange={(e) => switchUser(e.target.value)}
            >
              {testUsers.map((u) => (
                <option key={u.username} value={u.username}>
                  {u.rol === 'admin_ti' ? '⚙️ Admin TI' : (u.rol === 'jefatura' ? '🏢 Jefatura DIDECO' : '👁️ Auditoria Control')} ({u.username})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Info del usuario logueado */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 12, borderLeft: '1px solid var(--border)' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--secondary)' }}>
                {user.nombre}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.unidad}</span>
                <RoleBadge rol={user.rol} />
              </div>
            </div>

            <button 
              type="button" 
              className="btn btn-outline btn-sm" 
              onClick={logout}
              title="Cerrar Sesión"
              style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
