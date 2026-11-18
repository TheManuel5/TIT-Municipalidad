import React from 'react';
import { 
  Laptop, 
  Monitor, 
  Server, 
  Network, 
  Printer, 
  Code, 
  Cloud,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Wrench,
  Archive
} from 'lucide-react';

export function CategoryBadge({ categoria }) {
  const getIcon = () => {
    switch (categoria) {
      case 'PC': return <Monitor size={14} />;
      case 'Portátil': return <Laptop size={14} />;
      case 'Servidor': return <Server size={14} />;
      case 'Red': return <Network size={14} />;
      case 'Impresora': return <Printer size={14} />;
      case 'Software': return <Code size={14} />;
      case 'Nube': return <Cloud size={14} />;
      default: return null;
    }
  };

  const getStyleClass = () => {
    switch (categoria) {
      case 'Servidor': return 'badge-purple';
      case 'Red': return 'badge-info';
      case 'Software': return 'badge-warning';
      case 'Nube': return 'badge-info';
      default: return 'badge-secondary';
    }
  };

  return (
    <span className={`badge ${getStyleClass()}`}>
      {getIcon()}
      <span>{categoria}</span>
    </span>
  );
}

export function StatusBadge({ estado }) {
  const getIcon = () => {
    switch (estado) {
      case 'Bueno': return <CheckCircle2 size={13} />;
      case 'Regular': return <AlertCircle size={13} />;
      case 'Malo': return <XCircle size={13} />;
      case 'En reparación': return <Wrench size={13} />;
      case 'De baja': return <Archive size={13} />;
      default: return null;
    }
  };

  const getStyleClass = () => {
    switch (estado) {
      case 'Bueno': return 'badge-success';
      case 'Regular': return 'badge-warning';
      case 'Malo': return 'badge-danger';
      case 'En reparación': return 'badge-purple';
      case 'De baja': return 'badge-secondary';
      default: return 'badge-secondary';
    }
  };

  return (
    <span className={`badge ${getStyleClass()}`}>
      {getIcon()}
      <span>{estado}</span>
    </span>
  );
}

export function RoleBadge({ rol }) {
  let label = 'Lectura';
  let badgeClass = 'badge-secondary';

  if (rol === 'admin_ti') {
    label = 'Admin TI';
    badgeClass = 'badge-purple';
  } else if (rol === 'jefatura') {
    label = 'Jefatura Unidad';
    badgeClass = 'badge-info';
  }

  return (
    <span className={`badge ${badgeClass}`} style={{ fontWeight: 700, padding: '4px 10px' }}>
      {label}
    </span>
  );
}
