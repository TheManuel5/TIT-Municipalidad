import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api.js';
import { USUARIOS_PRUEBA } from '../api.mock.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('san_pablo_auth_user_v1');
      return stored ? JSON.parse(stored) : USUARIOS_PRUEBA[0]; // Admin TI por defecto para comodidad inicial
    } catch (e) {
      return USUARIOS_PRUEBA[0];
    }
  });

  const [loading, setLoading] = useState(false);

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

  // Selector rápido de rol para facilitar pruebas al profesor y compañeros
  const switchUser = (username) => {
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
