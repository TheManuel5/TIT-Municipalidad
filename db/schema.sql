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
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin_ti', 'jefatura', 'lectura')),
    unidad TEXT NOT NULL
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

-- Índices de Rendimiento para Búsquedas y Filtros
CREATE INDEX IF NOT EXISTS idx_activos_categoria ON activos(categoria);
CREATE INDEX IF NOT EXISTS idx_activos_estado ON activos(estado_operativo);
CREATE INDEX IF NOT EXISTS idx_activos_unidad ON activos(unidad);
CREATE INDEX IF NOT EXISTS idx_activos_garantia ON activos(fecha_garantia);
CREATE INDEX IF NOT EXISTS idx_historial_activo ON historial(id_activo);
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);
