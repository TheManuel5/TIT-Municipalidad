/**
 * api.js - Comunicación del frontend exclusivamente con la API municipal.
 */

import { apiReal } from './api.real.js';

console.info('%c[API] USANDO API MUNICIPAL', 'background: #059669; color: white; padding: 2px 8px; border-radius: 4px;');

export const api = apiReal;
export default api;
