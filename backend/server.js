/**
 * server.js - Servidor Principal API REST Express
 * Responsable: Ivan
 * Municipalidad de San Pablo - Plan Informático Municipal 2027-2031 (Proyecto A)
 * Cumple con docs/contrato-api.md
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const authRoutes = require('./routes/auth');
const activosRoutes = require('./routes/activos');
const conciliacionesRoutes = require('./routes/conciliaciones');
const usuariosRoutes = require('./routes/usuarios');
const auditoriaRoutes = require('./routes/auditoria');
const { middlewareSanitizacion } = require('./middlewares/roles');
const { middlewareAuditoria } = require('./utils/auditoria');
const { iniciarRespaldoAutomatico } = require('../db/backup');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Middlewares Globales
// Seguridad (Alfredo):
//  - helmet: cabeceras HTTP de seguridad (nosniff, frameguard, HSTS, sin X-Powered-By, etc.).
//  - CORS restringido a los orígenes del frontend (CORS_ORIGIN, separados por coma). Las
//    herramientas sin cabecera Origin (curl, Postman, pruebas) siguen funcionando.
//  - Límite de tamaño del cuerpo JSON para evitar peticiones abusivas.
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use(helmet());

const ORIGENES_PERMITIDOS = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173,http://127.0.0.1:4173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ORIGENES_PERMITIDOS.includes('*') || ORIGENES_PERMITIDOS.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use('/api/importar', express.json({ limit: '24mb' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Registro de auditoría automático de escrituras y exportaciones (RNF-6)
app.use(middlewareAuditoria);

// Sanitización automática de campos reservados para usuarios no-admin
app.use(middlewareSanitizacion);

// Logger simple para desarrollo local
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 2. Ruta Raíz informativa
app.get('/', (req, res) => {
  res.json({
    sistema: 'API REST Inventario Tecnológico Municipal (Proyecto A)',
    municipalidad: 'Ilustre Municipalidad de San Pablo',
    version: '1.0.0',
    estado: 'OPERATIVO',
    documentacion: '/docs/contrato-api.md'
  });
});

// 3. Montaje de Rutas Oficiales
// Endpoint 1: POST /api/auth/login
app.use('/api/auth', authRoutes);

// Alfredo: Endpoints de lectura (consultas.js - GET /api/activos, GET /api/activos/:id, historial, alertas, catalogos)
try {
  const consultasRoutes = require('./routes/consultas');
  app.use('/api', consultasRoutes);
  console.log('[RUTAS] Endpoints de lectura (Alfredo) montados exitosamente.');
} catch (err) {
  if (err.code !== 'MODULE_NOT_FOUND') {
    console.warn('[RUTAS] Error cargando consultas.js:', err.message);
  } else {
    console.info('[RUTAS] routes/consultas.js aún no disponible (esperando a Alfredo).');
  }
}

// Ivan: Endpoints 7, 8, 9 y 10: Escritura de Activos (POST /api/activos, PUT /api/activos/:id, traslado, baja)
app.use('/api/activos', activosRoutes);
app.use('/api/conciliaciones', conciliacionesRoutes);

// Alfredo: Gestión de usuarios (RF-6) y registro de auditoría (RNF-6)
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/auditoria', auditoriaRoutes);

// Gaby: Endpoints de reportes e importación/exportación (reportes.js e importar.js)
try {
  const reportesRoutes = require('./routes/reportes');
  app.use('/api', reportesRoutes);
  console.log('[RUTAS] Endpoints de reportes y exportación (Gaby) montados exitosamente.');
} catch (err) {
  if (err.code !== 'MODULE_NOT_FOUND') {
    console.warn('[RUTAS] Error cargando reportes.js:', err.message);
  }
}

try {
  const importarRoutes = require('./routes/importar');
  app.use('/api', importarRoutes);
  console.log('[RUTAS] Endpoints de importación CSV (Gaby) montados exitosamente.');
} catch (err) {
  if (err.code !== 'MODULE_NOT_FOUND') {
    console.warn('[RUTAS] Error cargando importar.js:', err.message);
  }
}

// 5. Manejo Centralizado de Rutas No Encontradas (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `El endpoint '${req.method} ${req.originalUrl}' no existe en la API.`,
      details: []
    }
  });
});

// 6. Manejo Centralizado de Errores No Controlados (500)
app.use((err, req, res, next) => {
  console.error('[ERROR NO CONTROLADO]:', err);
  const status = err.status || err.statusCode || 500;
  // En errores 5xx no se exponen detalles internos (SQL, rutas, stack) salvo en desarrollo
  const ocultar = status >= 500 && process.env.NODE_ENV !== 'development';
  res.status(status).json({
    success: false,
    error: {
      code: status >= 500 ? 'INTERNAL_SERVER_ERROR' : (status === 400 ? 'BAD_REQUEST' : (err.code || 'ERROR')),
      message: ocultar ? 'Error interno del servidor.' : (err.message || 'Error interno del servidor.'),
      details: process.env.NODE_ENV === 'development' ? [err.stack] : []
    }
  });
});

// 7. Inicio del Servidor
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` Servidor Express corriendo en http://localhost:${PORT}`);
    console.log(` Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(` Base de Datos SQLite: db/inventario.db`);
    console.log(`=======================================================`);
    iniciarRespaldoAutomatico();
  });
}

module.exports = app;
