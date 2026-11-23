import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api.js';
import { USUARIOS_PRUEBA } from '../api.mock.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const isMock = import.meta.env.VITE_USE_MOCK !== 'false';

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('san_pablo_auth_user_v1');
      const token = localStorage.getItem('san_pablo_jwt_token');

      // En Modo Simulado (Mock): default al primer usuario de prueba para agilidad
      if (isMock) {
        return stored ? JSON.parse(stored) : USUARIOS_PRUEBA[0];
      }

      // En Modo Real (Backend Express): Solo estamos autenticados si existe un JWT válido guardado
      if (token && stored) {
        return JSON.parse(stored);
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  // Escuchar evento global de expiración de sesión para volver a Login sin loops
  useEffect(() => {
    const handleExpired = () => {
      setUser(null);
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await api.login(username, password);
      setUser(res.data.user);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('san_pablo_jwt_token');
    localStorage.removeItem('san_pablo_auth_user_v1');
    setUser(null);
  };

  // Selector rápido de rol para pruebas
  const switchUser = async (username) => {
    setLoading(true);
    try {
      if (!isMock) {
        // En modo real: obtener JWT real del backend para el nuevo rol
        const res = await api.login(username, 'password123');
        setUser(res.data.user);
      } else {
        const found = USUARIOS_PRUEBA.find((u) => u.username === username);
        if (found) {
          const userData = {
            id: found.id,
            username: found.username,
            nombre: found.nombre,
            rol: found.rol,
            unidad: found.unidad
          };
          localStorage.setItem('san_pablo_auth_user_v1', JSON.stringify(userData));
          setUser(userData);
        }
      }
    } catch (err) {
      console.error('Error al cambiar de usuario:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        switchUser,
        testUsers: USUARIOS_PRUEBA
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
