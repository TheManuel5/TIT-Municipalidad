import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginScreen } from './pages/LoginScreen';
import { DashboardScreen } from './pages/DashboardScreen';
import { ActivosListScreen } from './pages/ActivosListScreen';
import { ActivoDetailScreen } from './pages/ActivoDetailScreen';
import { ActivoFormScreen } from './pages/ActivoFormScreen';
import { ReportesScreen } from './pages/ReportesScreen';
import { ConciliacionScreen } from './pages/ConciliacionScreen';
import { ImportarScreen } from './pages/ImportarScreen';
import { ContratoApiScreen } from './pages/ContratoApiScreen';
import { SeguridadScreen } from './pages/SeguridadScreen';

export function App() {
  const { isAuthenticated, user, logout } = useAuth();
  const [toastMessage, setToastMessage] = useState(null);
  const wasAuthenticated = useRef(isAuthenticated);

  const showToast = useCallback((msg, type = 'success') => {
    setToastMessage({ msg, type });
  }, []);

  const handleLogout = useCallback(() => {
    const nombre = user?.nombre || user?.username || '';
    logout();
    showToast(`Sesión cerrada correctamente. Hasta pronto, ${nombre}.`, 'info');
  }, [user, logout, showToast]);

  useEffect(() => {
    if (!wasAuthenticated.current && isAuthenticated) {
      setCurrentTab('dashboard');
      setSelectedActivoId(null);
      setEditingActivo(null);
      setSidebarOpen(false);
      showToast(`Sesión iniciada correctamente. Bienvenido/a, ${user?.nombre || user?.username || ''}.`);
    }
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, user, showToast]);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timeout = window.setTimeout(() => setToastMessage(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  // Gestión de navegación por pestañas y vistas
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedActivoId, setSelectedActivoId] = useState(null);
  const [editingActivo, setEditingActivo] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const puedeAccederATab = (tab) => {
    if (tab === 'importar') return user?.rol === 'admin_ti';
    if (tab === 'conciliacion') return user?.rol === 'admin_ti' || user?.rol === 'lectura';
    return true;
  };
  const tabActiva = puedeAccederATab(currentTab) ? currentTab : 'dashboard';

  // Si no está autenticado, mostrar pantalla de Login (mantener toast visible durante logout)
  if (!isAuthenticated) {
    return (
      <>
        {toastMessage && (
          <div
            className={`alert ${toastMessage.type === 'danger' ? 'alert-danger' : toastMessage.type === 'info' ? 'alert-info' : 'alert-success'} toast-slide-in`}
            role="status"
            aria-live="polite"
            style={{ position: 'fixed', top: 20, right: 24, zIndex: 100, boxShadow: 'var(--shadow-lg)' }}
          >
            {toastMessage.type === 'danger' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{toastMessage.msg}</span>
          </div>
        )}
        <LoginScreen />
      </>
    );
  }

  // Handlers de navegación
  const handleSelectActivo = (id) => {
    setSelectedActivoId(id);
    setCurrentTab('activo_detail');
  };

  const handleEditActivo = (activo) => {
    setEditingActivo(activo);
    setCurrentTab('activo_edit');
  };

  const handleNewActivo = () => {
    setEditingActivo(null);
    setCurrentTab('activo_create');
  };

  const handleSaveSuccess = (id, action) => {
    setSelectedActivoId(id);
    setCurrentTab('activo_detail');
    setToastMessage({
      msg: action === 'created'
        ? `El activo ${id} se creó correctamente.`
        : `Los cambios del activo ${id} se guardaron correctamente.`,
      type: 'success'
    });
  };

  return (
    <div className="app-container">
      {/* Sidebar fijo a la izquierda */}
      <Sidebar
        currentTab={tabActiva}
        setTab={(tab) => {
          if (!puedeAccederATab(tab)) return;
          setCurrentTab(tab);
          setSelectedActivoId(null);
          setEditingActivo(null);
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Cerrar menú de navegación"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {toastMessage && (
        <div
          className={`alert ${toastMessage.type === 'danger' ? 'alert-danger' : 'alert-success'} toast-slide-in`}
          role="status"
          aria-live="polite"
          style={{ position: 'fixed', top: 76, right: 24, zIndex: 100, boxShadow: 'var(--shadow-lg)' }}
        >
          {toastMessage.type === 'danger' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* Contenido principal a la derecha */}
      <div className="main-content">
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} onLogout={handleLogout} />

        <main style={{ flex: 1 }}>
          {tabActiva === 'dashboard' && (
            <DashboardScreen
              onSelectActivo={handleSelectActivo}
              onViewAllActivos={() => setCurrentTab('activos')}
            />
          )}

          {tabActiva === 'activos' && (
            <ActivosListScreen
              onSelectActivo={handleSelectActivo}
              onNewActivo={handleNewActivo}
              onEditActivo={handleEditActivo}
            />
          )}

          {tabActiva === 'activo_detail' && (
            <ActivoDetailScreen
              idActivo={selectedActivoId}
              onBack={() => setCurrentTab('activos')}
              onEdit={handleEditActivo}
            />
          )}

          {tabActiva === 'activo_create' && (
            <ActivoFormScreen
              isEdit={false}
              onSaveSuccess={handleSaveSuccess}
              onCancel={() => setCurrentTab('activos')}
            />
          )}

          {tabActiva === 'activo_edit' && (
            <ActivoFormScreen
              isEdit={true}
              initialData={editingActivo}
              onSaveSuccess={handleSaveSuccess}
              onCancel={() => {
                if (editingActivo) {
                  setSelectedActivoId(editingActivo.id_activo);
                  setCurrentTab('activo_detail');
                } else {
                  setCurrentTab('activos');
                }
              }}
            />
          )}

          {tabActiva === 'reportes' && (
            <ReportesScreen onSelectActivo={handleSelectActivo} />
          )}

          {tabActiva === 'conciliacion' && (
            <ConciliacionScreen />
          )}

          {tabActiva === 'importar' && (
            <ImportarScreen onActivosImportados={() => setCurrentTab('activos')} />
          )}

          {tabActiva === 'seguridad' && <SeguridadScreen />}
          {tabActiva === 'contrato' && <ContratoApiScreen />}
        </main>
      </div>
    </div>
  );
}

export default App;
