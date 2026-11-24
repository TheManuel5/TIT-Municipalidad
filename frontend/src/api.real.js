/**
 * api.real.js - Conexión con la API Real (Express + SQLite)
 * Municipalidad de San Pablo - Plan Informático Municipal 2027-2031 (Proyecto A)
 * Implementa las funciones del contrato con llamadas HTTP fetch y manejo de token Bearer.
 */

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '');
const TOKEN_KEY = 'san_pablo_jwt_token';
const AUTH_KEY = 'san_pablo_auth_user_v1';

// Obtener token almacenado
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Helper genérico para peticiones con token y manejo de 401
async function request(endpoint, options = {}, responseType = 'json') {
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

  const responseText = await response.text();
  let data = null;
  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch (error) {
    if (response.ok && responseType === 'json') {
      throw new Error('El servidor devolvió una respuesta JSON inválida.');
    }
  }

  // Manejo de expiración o credenciales incorrectas (401)
  if (response.status === 401) {
    // Si falló el login, retornar el error sin redirigir ni recargar la página
    if (endpoint === '/auth/login') {
      const errorMsg = data?.error?.message || 'Credenciales inválidas. Verifique su usuario y contraseña.';
      const err = new Error(errorMsg);
      err.status = 401;
      throw err;
    }

    // Para cualquier otro endpoint: limpiar credenciales inválidas y notificar a la app
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(AUTH_KEY);
    window.dispatchEvent(new CustomEvent('auth:expired'));

    const errorMsg = data?.error?.message || 'Sesión expirada o no autorizada. Inicie sesión nuevamente.';
    const err = new Error(errorMsg);
    err.status = 401;
    throw err;
  }

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.message || `Error ${response.status}: Solicitud fallida`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.details = data?.error?.details;
    throw err;
  }

  return responseType === 'text' ? responseText : data;
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

  // GET /api/reportes/garantias?dias=90
  async getReporteGarantias(dias = 90) {
    return await request(`/reportes/garantias?dias=${encodeURIComponent(dias)}`);
  },

  async getConciliaciones() {
    return await request('/conciliaciones');
  },

  async getConciliacion(id) {
    return await request(`/conciliaciones/${encodeURIComponent(id)}`);
  },

  async crearConciliacion() {
    return await request('/conciliaciones', {
      method: 'POST',
      body: JSON.stringify({})
    });
  },

  async registrarInspeccion(conciliacionId, idActivo, datos) {
    return await request(`/conciliaciones/${encodeURIComponent(conciliacionId)}/activos/${encodeURIComponent(idActivo)}`, {
      method: 'PUT',
      body: JSON.stringify(datos)
    });
  },

  // 13. POST /api/importar
  async importarCSV(filas, recepcionVerificada = false) {
    return await request('/importar', {
      method: 'POST',
      body: JSON.stringify({ filas, recepcion_verificada: recepcionVerificada })
    });
  },

  // Exportar inventario
  async exportarActivos(formato = 'csv') {
    if (!['csv', 'json'].includes(formato)) {
      throw new Error("El formato de exportación debe ser 'csv' o 'json'.");
    }

    const res = await request(`/exportar?formato=${formato}`, {}, formato === 'csv' ? 'text' : 'json');
    return formato === 'json' ? res?.data : res;
  }
};
