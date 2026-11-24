import React from 'react';
import { 
  LayoutDashboard, 
  Boxes, 
  BarChart3, 
  FileUp, 
  FileCode2, 
  ShieldCheck, 
  Building2,
  Lock,
  ClipboardCheck,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Sidebar({ currentTab, setTab, isOpen, onClose }) {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin_ti';
  const puedeConsultarConciliaciones = isAdmin || user?.rol === 'lectura';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'activos', label: 'Inventario de Activos', icon: Boxes },
    { id: 'reportes', label: 'Reportes y Métricas', icon: BarChart3 },
    ...(puedeConsultarConciliaciones
      ? [{ id: 'conciliacion', label: 'Conciliación Física', icon: ClipboardCheck }]
      : []),
    { id: 'importar', label: 'Importar / Exportar', icon: FileUp, badge: !isAdmin ? 'Restringido' : null },
    { id: 'seguridad', label: 'Seguridad y Accesos', icon: KeyRound },
    { id: 'contrato', label: 'Contrato de API (Docs)', icon: FileCode2 }
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand Header */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ 
          width: 38, 
          height: 38, 
          borderRadius: 8, 
          backgroundColor: '#2563eb', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'white',
          fontWeight: 800,
          fontSize: '1.1rem'
        }}>
          SP
        </div>
        <div>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Muni San Pablo
          </h2>
          <p style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            Inventario TI • Proyecto A
          </p>
        </div>
      </div>

      {/* Role notice banner in sidebar */}
      <div style={{ 
        margin: '16px 14px', 
        padding: '10px 12px', 
        background: '#1e293b', 
        borderRadius: 8, 
        border: '1px solid #334155',
        fontSize: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8', fontWeight: 600, marginBottom: 4 }}>
          <ShieldCheck size={14} />
          <span>Nivel de Acceso: {user?.rol || 'lectura'}</span>
        </div>
        <p style={{ color: '#94a3b8', lineHeight: 1.3 }}>
          {isAdmin 
            ? 'Total (Lectura, Altas, Edición, Bajas, Importar y Red/IP)'
            : (user?.rol === 'jefatura' 
              ? `Unidad: ${user?.unidad} (Red y Criticidad ocultos)`
              : 'Solo lectura institucional (Sin acciones)')}
        </p>
      </div>

      {/* Nav Menu */}
      <nav style={{ flex: 1, padding: '8px 12px' }}>
        <ul style={{ listStyle: 'none' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <li key={item.id} style={{ marginBottom: 4 }}>
                <button
                  type="button"
                  onClick={() => {
                    setTab(item.id);
                    if (onClose) onClose();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: isActive ? '#2563eb' : 'transparent',
                    color: isActive ? '#ffffff' : '#cbd5e1',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 500,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = '#1e293b';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span style={{ 
                      fontSize: '0.65rem', 
                      background: '#334155', 
                      color: '#94a3b8', 
                      padding: '2px 6px', 
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      <Lock size={10} />
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer info */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #1e293b', fontSize: '0.72rem', color: '#64748b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <Building2 size={13} />
          <span>Provincia de Osorno, Los Lagos</span>
        </div>
        <div>Censo 2024: 10.883 hab. (51,5% rural)</div>
      </div>
    </aside>
  );
}
