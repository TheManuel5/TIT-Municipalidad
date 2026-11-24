import React from 'react';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from './Badge';
import { LogOut, Menu } from 'lucide-react';

export function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button 
          type="button" 
          className="btn btn-outline btn-sm mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Abrir menú de navegación"
        >
          <Menu size={18} />
        </button>

        <div className="top-header-title">
          <span className="top-header-subtitle">
            Plan Informático Municipal 2027–2031
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Info del usuario logueado */}
        {user && (
          <div className="top-header-user">
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
