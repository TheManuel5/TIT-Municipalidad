/**
 * api.js - Fachada unificada de comunicación para el Frontend
 * Por defecto opera en MODO SIMULADO (api.mock.js) para permitir desarrollo autónomo.
 * Para conectar con el backend real de Ivan y Alfredo, configurar en .env:
 * VITE_USE_MOCK=false
 */

import { apiMock } from './api.mock.js';
import { apiReal } from './api.real.js';

const useMock = import.meta.env.VITE_USE_MOCK !== 'false';

if (useMock) {
  console.info('%c[API] MODO SIMULADO ACTIVO (api.mock.js)', 'background: #0284c7; color: white; padding: 2px 8px; border-radius: 4px;');
} else {
  console.info('%c[API] CONECTADO A BACKEND REAL (api.real.js)', 'background: #059669; color: white; padding: 2px 8px; border-radius: 4px;');
}

export const api = useMock ? apiMock : apiReal;
export const isMockMode = useMock;
export default api;
