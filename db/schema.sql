-- Esquema de Base de Datos SQLite - Sistema de Inventario Tecnológico (Proyecto A)
-- Ilustre Municipalidad de San Pablo - Plan Informático Municipal 2027-2031
-- Cumple estrictamente con docs/contrato-api.md y Tabla 7 del informe

PRAGMA foreign_keys = ON;

-- Tabla de Unidades Municipales
CREATE TABLE IF NOT EXISTS unidades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT UNIQUE NOT NULL
);

-- Tabla de Usuarios y Roles
-- password guarda SOLO el hash bcrypt (bcryptjs, costo 10). Nunca texto plano.
-- activo = 0 revoca el acceso de inmediato (el middleware de autenticación lo verifica
-- en cada petición, aunque el token JWT siga vigente).
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin_ti', 'jefatura', 'lectura')),
    unidad TEXT NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    creado_en TEXT,
    actualizado_en TEXT,
    ultimo_acceso TEXT
);

-- Tabla de Proveedores (Ley 19.886)
CREATE TABLE IF NOT EXISTS proveedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    razon_social TEXT UNIQUE NOT NULL,
    rut TEXT,
    contacto TEXT
);

-- Tabla Principal de Activos Tecnológicos (Tabla 7 del Informe)
CREATE TABLE IF NOT EXISTS activos (
    id_activo TEXT PRIMARY KEY,
    categoria TEXT NOT NULL CHECK (categoria IN ('PC', 'Portátil', 'Servidor', 'Red', 'Impresora', 'Software', 'Nube')),
    marca_modelo TEXT NOT NULL,
    descripcion TEXT,
    ubicacion TEXT NOT NULL,
    unidad TEXT NOT NULL,
    custodio TEXT NOT NULL,
    estado_operativo TEXT NOT NULL CHECK (estado_operativo IN ('Bueno', 'Regular', 'Malo', 'En reparación', 'De baja')),
    ultimo_mantenimiento TEXT,
    tipo_mantenimiento TEXT CHECK (tipo_mantenimiento IN ('Preventiva', 'Correctiva', 'Sin mantención', NULL)),
    criticidad TEXT NOT NULL CHECK (criticidad IN ('Alta', 'Media', 'Baja')),
    proceso_asociado TEXT,
    fecha_adquisicion TEXT NOT NULL,
    fecha_garantia TEXT NOT NULL,
    licencias_asociadas TEXT,
    proveedor TEXT NOT NULL,
    contrato_oc TEXT NOT NULL,
    costo_inicial REAL NOT NULL DEFAULT 0,
    costo_anual REAL NOT NULL DEFAULT 0,
    configuracion_red TEXT,
    fecha_revision TEXT,
    responsable_revision TEXT,
    motivo_baja TEXT
);

-- Tabla de Licencias de Software Asociadas
CREATE TABLE IF NOT EXISTS licencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_activo TEXT,
    nombre_software TEXT NOT NULL,
    unidad TEXT NOT NULL,
    fecha_vencimiento TEXT NOT NULL,
    costo_renovacion REAL DEFAULT 0,
    FOREIGN KEY (id_activo) REFERENCES activos(id_activo) ON DELETE SET NULL
);

-- Tabla de Historial y Auditoría de Trazabilidad (Inmutable)
CREATE TABLE IF NOT EXISTS historial (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_activo TEXT NOT NULL,
    fecha TEXT NOT NULL,
    tipo_evento TEXT NOT NULL CHECK (tipo_evento IN ('ALTA', 'EDICION', 'TRASLADO', 'BAJA', 'IMPORTACION', 'MANTENIMIENTO')),
    usuario TEXT NOT NULL,
    unidad_origen TEXT,
    unidad_destino TEXT,
    custodio_anterior TEXT,
    custodio_nuevo TEXT,
    motivo TEXT,
    detalles TEXT,
    -- RESTRICT: un activo con historial no se puede eliminar físicamente (la baja es lógica,
    -- vía estado_operativo = 'De baja'). Con CASCADE, borrar o reemplazar un activo
    -- eliminaba en silencio toda su bitácora.
    FOREIGN KEY (id_activo) REFERENCES activos(id_activo) ON DELETE RESTRICT
);

-- Conciliación física del inventario: muestra persistida del 10% y resultados por activo.
CREATE TABLE IF NOT EXISTS conciliaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha_inicio TEXT NOT NULL,
    fecha_cierre TEXT,
    usuario TEXT NOT NULL,
    total_activos INTEGER NOT NULL CHECK (total_activos >= 0),
    tamano_muestra INTEGER NOT NULL CHECK (tamano_muestra >= 0),
    inspeccionados INTEGER NOT NULL DEFAULT 0 CHECK (inspeccionados >= 0),
    discrepancias INTEGER NOT NULL DEFAULT 0 CHECK (discrepancias >= 0),
    porcentaje_discrepancias REAL,
    resultado TEXT NOT NULL DEFAULT 'En curso' CHECK (resultado IN ('En curso', 'Cumple', 'No cumple'))
);

CREATE TABLE IF NOT EXISTS conciliacion_activos (
    id_conciliacion INTEGER NOT NULL,
    id_activo TEXT NOT NULL,
    datos_registrados TEXT NOT NULL,
    datos_observados TEXT,
    encontrado INTEGER CHECK (encontrado IN (0, 1)),
    resultado TEXT NOT NULL DEFAULT 'Pendiente' CHECK (resultado IN ('Pendiente', 'Coincide', 'Discrepancia')),
    detalle TEXT,
    fecha_verificacion TEXT,
    usuario_verificacion TEXT,
    PRIMARY KEY (id_conciliacion, id_activo),
    FOREIGN KEY (id_conciliacion) REFERENCES conciliaciones(id) ON DELETE RESTRICT,
    FOREIGN KEY (id_activo) REFERENCES activos(id_activo) ON DELETE RESTRICT
);

CREATE TRIGGER IF NOT EXISTS trg_conciliacion_activo_no_rewrite
BEFORE UPDATE ON conciliacion_activos
WHEN OLD.resultado <> 'Pendiente'
BEGIN
    SELECT RAISE(ABORT, 'Una inspección física registrada no se puede modificar.');
END;

-- Bitácora inmutable (Ley N.º 21.459 / Ley N.º 20.285): solo se permite INSERT.
-- Cualquier intento de modificar o borrar un evento se rechaza a nivel de base de datos,
-- independiente de lo que haga la capa de aplicación.
CREATE TRIGGER IF NOT EXISTS trg_historial_no_update
BEFORE UPDATE ON historial
BEGIN
    SELECT RAISE(ABORT, 'La bitácora de historial es inmutable: no se permite modificar eventos.');
END;

CREATE TRIGGER IF NOT EXISTS trg_historial_no_delete
BEFORE DELETE ON historial
BEGIN
    SELECT RAISE(ABORT, 'La bitácora de historial es inmutable: no se permite eliminar eventos.');
END;

-- Registro de auditoría de seguridad (RNF-6, Ley N.º 21.663 Marco de Ciberseguridad,
-- Ley N.º 20.285 Transparencia): inicios de sesión, operaciones de escritura,
-- exportaciones, gestión de usuarios y respaldos. Inmutable: solo INSERT.
-- Nunca se registran contraseñas ni el cuerpo completo de las peticiones.
CREATE TABLE IF NOT EXISTS auditoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    usuario TEXT,
    rol TEXT,
    ip TEXT,
    accion TEXT NOT NULL,
    metodo TEXT,
    ruta TEXT,
    estado_http INTEGER,
    resultado TEXT NOT NULL CHECK (resultado IN ('OK', 'RECHAZADO', 'ERROR')),
    detalle TEXT
);

CREATE TRIGGER IF NOT EXISTS trg_auditoria_no_update
BEFORE UPDATE ON auditoria
BEGIN
    SELECT RAISE(ABORT, 'El registro de auditoría es inmutable: no se permite modificar entradas.');
END;

CREATE TRIGGER IF NOT EXISTS trg_auditoria_no_delete
BEFORE DELETE ON auditoria
BEGIN
    SELECT RAISE(ABORT, 'El registro de auditoría es inmutable: no se permite eliminar entradas.');
END;

-- Índices de Rendimiento para Búsquedas y Filtros
CREATE INDEX IF NOT EXISTS idx_activos_categoria ON activos(categoria);
CREATE INDEX IF NOT EXISTS idx_activos_estado ON activos(estado_operativo);
CREATE INDEX IF NOT EXISTS idx_activos_unidad ON activos(unidad);
CREATE INDEX IF NOT EXISTS idx_activos_garantia ON activos(fecha_garantia);
CREATE INDEX IF NOT EXISTS idx_historial_activo ON historial(id_activo);
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(fecha);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario);
CREATE INDEX IF NOT EXISTS idx_conciliaciones_fecha ON conciliaciones(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_conciliacion_activos_activo ON conciliacion_activos(id_activo);
