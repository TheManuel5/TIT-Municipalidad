import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
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

export function App() {
  const { isAuthenticated } = useAuth();

  // Gestión de navegación por pestañas y vistas
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedActivoId, setSelectedActivoId] = useState(null);
  const [editingActivo, setEditingActivo] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Si no está autenticado, mostrar pantalla de Login
  if (!isAuthenticated) {
    return <LoginScreen />;
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

  const handleSaveSuccess = (id) => {
    setSelectedActivoId(id);
    setCurrentTab('activo_detail');
  };

  return (
    <div className="app-container">
      {/* Sidebar fijo a la izquierda */}
      <Sidebar
        currentTab={currentTab}
        setTab={(tab) => {
          setCurrentTab(tab);
          setSelectedActivoId(null);
          setEditingActivo(null);
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Contenido principal a la derecha */}
      <div className="main-content">
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <main style={{ flex: 1 }}>
          {currentTab === 'dashboard' && (
            <DashboardScreen
              onSelectActivo={handleSelectActivo}
              onViewAllActivos={() => setCurrentTab('activos')}
            />
          )}

          {currentTab === 'activos' && (
            <ActivosListScreen
              onSelectActivo={handleSelectActivo}
              onNewActivo={handleNewActivo}
              onEditActivo={handleEditActivo}
            />
          )}

          {currentTab === 'activo_detail' && (
            <ActivoDetailScreen
              idActivo={selectedActivoId}
              onBack={() => setCurrentTab('activos')}
              onEdit={handleEditActivo}
            />
          )}

          {currentTab === 'activo_create' && (
            <ActivoFormScreen
              isEdit={false}
              onSaveSuccess={handleSaveSuccess}
              onCancel={() => setCurrentTab('activos')}
            />
          )}

          {currentTab === 'activo_edit' && (
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

          {currentTab === 'reportes' && (
            <ReportesScreen onSelectActivo={handleSelectActivo} />
          )}

          {currentTab === 'conciliacion' && (
            <ConciliacionScreen />
          )}

          {currentTab === 'importar' && (
            <ImportarScreen onActivosImportados={() => setCurrentTab('activos')} />
          )}

          {currentTab === 'contrato' && <ContratoApiScreen />}
        </main>
      </div>
    </div>
  );
}

export default App;
