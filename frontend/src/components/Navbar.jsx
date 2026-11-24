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
          style={{ display: 'none' }}
          onClick={onToggleSidebar}
        >
          <Menu size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            className="badge"
            style={{
              backgroundColor: '#ecfdf5',
              color: '#047857',
              border: '1px solid #a7f3d0',
              fontWeight: 600,
              fontSize: '0.72rem'
            }}
          >
            API real · sin datos simulados
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Plan Informático Municipal 2027–2031
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
