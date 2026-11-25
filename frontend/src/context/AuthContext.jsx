import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('san_pablo_auth_user_v1');
      const token = localStorage.getItem('san_pablo_jwt_token');
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout
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
