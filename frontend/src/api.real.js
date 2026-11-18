/**
 * api.real.js - Conexión con la API Real (Express + SQLite)
 * Municipalidad de San Pablo - Plan Informático Municipal 2027-2031 (Proyecto A)
 * Responsabilidad compartida con Gaby (Paso 4: apagar VITE_USE_MOCK=false)
 * Implementa las mismas funciones que api.mock.js con llamadas HTTP fetch reales y manejo de token Bearer.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const TOKEN_KEY = 'san_pablo_jwt_token';
const AUTH_KEY = 'san_pablo_auth_user_v1';

// Obtener token almacenado
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Helper genérico para peticiones con token y manejo de 401
async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${endpoint}`;
  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (netErr) {
    throw new Error(`Error de conexión con el servidor (${BASE_URL}): Verifique que el backend esté corriendo.`);
  }

  // Manejo de expiración o token inválido (401)
  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(AUTH_KEY);
    window.location.href = '/login?expired=1';
    throw new Error('Sesión expirada o no autorizada. Redirigiendo al login...');
  }

  let data;
  try {
    data = await response.json();
  } catch (parseErr) {
    throw new Error(`Respuesta no válida del servidor (Status: ${response.status})`);
  }

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.message || `Error ${response.status}: Solicitud fallida`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.details = data?.error?.details;
    throw err;
  }

  return data;
}

export const apiReal = {
  // 1. POST /api/auth/login
  async login(username, password) {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    if (res.data?.token) {
      localStorage.setItem(TOKEN_KEY, res.data.token);
      localStorage.setItem(AUTH_KEY, JSON.stringify(res.data.user));
    }
    return res;
  },

  getCurrentUser() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  // 2. GET /api/activos
  async getActivos({ q = '', categoria = '', estado = '', unidad = '', page = 1, limit = 10 } = {}) {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (categoria) params.append('categoria', categoria);
    if (estado) params.append('estado', estado);
    if (unidad) params.append('unidad', unidad);
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);

    return await request(`/activos?${params.toString()}`);
  },

  // 3. GET /api/activos/:id
  async getActivoById(id) {
    return await request(`/activos/${encodeURIComponent(id)}`);
  },

  // 4. GET /api/activos/:id/historial
  async getHistorial(id) {
    return await request(`/activos/${encodeURIComponent(id)}/historial`);
  },

  // 5. GET /api/alertas?dias=60
  async getAlertas(dias = 60) {
    return await request(`/alertas?dias=${encodeURIComponent(dias)}`);
  },

  // 6. GET /api/catalogos
  async getCatalogos() {
    return await request('/catalogos');
  },

  // 7. POST /api/activos
  async createActivo(payload) {
    return await request('/activos', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // 8. PUT /api/activos/:id
  async updateActivo(id, payload) {
    return await request(`/activos/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  // 9. POST /api/activos/:id/traslado
  async trasladarActivo(id, datosTraslado) {
    return await request(`/activos/${encodeURIComponent(id)}/traslado`, {
      method: 'POST',
      body: JSON.stringify(datosTraslado)
    });
  },

  // 10. POST /api/activos/:id/baja
  async bajaActivo(id, { motivo, detalles }) {
    return await request(`/activos/${encodeURIComponent(id)}/baja`, {
      method: 'POST',
      body: JSON.stringify({ motivo, detalles })
    });
  },

  // 11. GET /api/reportes/resumen
  async getReporteResumen() {
    return await request('/reportes/resumen');
  },

  // 12. GET /api/reportes/costos
  async getReporteCostos() {
    return await request('/reportes/costos');
  },

  // 13. POST /api/importar
  async importarCSV(filas) {
    return await request('/importar', {
      method: 'POST',
      body: JSON.stringify({ filas })
    });
  },

  // Exportar inventario
  async exportarActivos(formato = 'csv') {
    const token = getToken();
    const url = `${BASE_URL}/exportar?formato=${formato}`;
    const res = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    if (formato === 'json') {
      return await res.json();
    }
    return await res.text();
  }
};
