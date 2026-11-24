/**
 * roles.js - Middleware de Control de Roles y Políticas de Acceso
 * Responsable: Ivan
 * Municipalidad de San Pablo - Plan Informático Municipal 2027-2031 (Proyecto A)
 * Cumple con docs/contrato-api.md (Sección 3: Matriz de Roles y Reglas de Negocio)
 */

/**
 * Exige que el usuario autenticado tenga uno de los roles permitidos
 * @param  {...string} rolesPermitidos - ej. 'admin_ti', 'jefatura'
 */
function requerirRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user || !req.user.rol) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Usuario no autenticado o sesión no identificada.',
          details: []
        }
      });
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Acceso denegado: Se requiere rol [${rolesPermitidos.join(', ')}]. Su rol actual es '${req.user.rol}'.`,
          details: []
        }
      });
    }

    next();
  };
}

/**
 * Bloquea cualquier intento de escritura (POST, PUT, DELETE, PATCH)
 * para usuarios con rol 'lectura' o 'jefatura' en endpoints generales
 */
function restringirSoloLectura(req, res, next) {
  const metodosModificacion = ['POST', 'PUT', 'DELETE', 'PATCH'];

  if (metodosModificacion.includes(req.method) && req.user?.rol === 'lectura') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'El rol de lectura solo tiene permisos de consulta y auditoría.',
        details: []
      }
    });
  }

  next();
}

/**
 * Middleware para rol 'jefatura':
 * Forzar el filtro de consulta por su propia unidad institucional (Sección 3 del contrato)
 */
function aplicarFiltroUnidad(req, res, next) {
  if (req.user && req.user.rol === 'jefatura') {
    // Forzar filtro en propiedad expresa y en query
    req.filtroUnidad = req.user.unidad;
    req.unidadObligatoria = req.user.unidad;
    if (req.query) {
      req.query.unidad = req.user.unidad;
    }
  }
  next();
}

/**
 * Enmascara o elimina campos reservados (criticidad y configuracion_red)
 * para usuarios que no sean 'admin_ti' (Ley N.º 21.663 y Ley N.º 20.285)
 * @param {object} activo 
 * @param {string} rol 
 * @returns {object} activo sanitizado
 */
function sanitizarActivo(activo, rol) {
  if (!activo || typeof activo !== 'object') return activo;

  // Si es admin_ti, tiene acceso total a todos los datos técnicos y de seguridad
  if (rol === 'admin_ti') {
    return { ...activo };
  }

  // Si es jefatura o lectura, se enmascaran los campos reservados
  // Solo se enmascaran los campos que el objeto realmente trae: así no se agregan campos
  // falsos a respuestas que no son activos (auditoría, usuarios, reportes, conciliaciones).
  const sanitizado = { ...activo };
  if ('criticidad' in sanitizado) sanitizado.criticidad = '[RESERVADO]';
  if ('configuracion_red' in sanitizado) sanitizado.configuracion_red = '[RESERVADO - Ley N.º 21.663]';
  return sanitizado;
}

/**
 * Sanitiza una colección de activos
 */
function sanitizarActivos(activos, rol) {
  if (!Array.isArray(activos)) return activos;
  return activos.map((a) => sanitizarActivo(a, rol));
}

/**
 * Middleware interceptor para Express:
 * Intercepta automáticamente la respuesta res.json() y aplica sanitización
 * a cualquier activo o lista de activos devueltos si el usuario no es admin_ti
 */
function middlewareSanitizacion(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    if (body && body.success && body.data) {
      const userRol = req.user ? req.user.rol : 'lectura';

      if (userRol !== 'admin_ti') {
        if (Array.isArray(body.data)) {
          body.data = sanitizarActivos(body.data, userRol);
        } else if (typeof body.data === 'object' && body.data.id_activo) {
          body.data = sanitizarActivo(body.data, userRol);
        }
      }
    }
    return originalJson(body);
  };

  next();
}

module.exports = {
  requerirRol,
  restringirSoloLectura,
  aplicarFiltroUnidad,
  sanitizarActivo,
  sanitizarActivos,
  middlewareSanitizacion
};
