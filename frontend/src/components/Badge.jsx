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
  Archive,
  Layers
} from 'lucide-react';

export function getCategoryIcon(categoria, size = 16) {
  switch (categoria) {
    case 'PC': return <Monitor size={size} />;
    case 'Portátil': return <Laptop size={size} />;
    case 'Servidor': return <Server size={size} />;
    case 'Red': return <Network size={size} />;
    case 'Impresora': return <Printer size={size} />;
    case 'Software': return <Code size={size} />;
    case 'Nube': return <Cloud size={size} />;
    default: return <Layers size={size} />;
  }
}

export function CategoryBadge({ categoria }) {
  const getStyleClass = () => {
    switch (categoria) {
      case 'Servidor': return 'badge-purple';
      case 'Red': return 'badge-info';
      case 'Software': return 'badge-warning';
      case 'Nube': return 'badge-info';
      case 'Portátil': return 'badge-primary';
      default: return 'badge-secondary';
    }
  };

  return (
    <span className={`badge ${getStyleClass()}`}>
      {getCategoryIcon(categoria, 13)}
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
