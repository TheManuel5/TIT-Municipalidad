# Prototipo Sistema de Gestión de Inventario Tecnológico (Proyecto A)
## Plan Informático Municipal 2027–2031 — Ilustre Municipalidad de San Pablo

Prototipo funcional desarrollado para el Taller de Integración Tecnológica (TIT).  
Implementa el **Proyecto A** (*Inventario y ciclo de vida de activos tecnológicos*), resolviendo la problemática **PR-1** y **A-01** (inexistencia de un inventario único y validado).

---

## 👥 Reparto del Equipo y Responsabilidades

| Integrante | Responsabilidad Principal | Entregables / Carpetas |
| :--- | :--- | :--- |
| **Manuel** | Contrato de API y Frontend integrado con el backend | `docs/contrato-api.md`, `frontend/` |
| **Alfredo** | Base de datos SQLite, seed (106 activos), endpoints de lectura, pruebas y manual | `db/schema.sql`, `db/database.js`, `db/seed.js`, `backend/routes/consultas.js`, `docs/` |
| **Ivan** | Servidor Express, autenticación JWT, middleware de roles y endpoints de escritura | `backend/server.js`, `backend/routes/activos.js`, `backend/middlewares/` |
| **Gaby** | Endpoints de reportes, importación/exportación CSV y conexión con la API real | `backend/routes/reportes.js`, `backend/routes/importar.js`, `frontend/src/api.real.js` |

---

## 📋 Regla Única: Contrato de la API

El documento canónico para todo el equipo es:
👉 **[`docs/contrato-api.md`](docs/contrato-api.md)**

Contiene:
1. **Los 19 Endpoints oficiales:** especificaciones HTTP, parámetros query, payload y códigos de estado.
2. **Nombres canónicos de los campos de la base de datos:** correspondientes a la **Tabla 7** (*Estructura del modelo de inventario tecnológico y criterios de reserva*) del Informe del Plan Informático.
3. **JSON de ejemplo** para cada respuesta de la API.
4. **Matriz de Seguridad y Roles:**
   - `admin_ti`: visualización total (incluyendo IP/VLAN/versión y criticidad), altas, traslados, bajas e importación CSV.
   - `jefatura`: filtrado automático por su unidad (ej: `DIDECO`), campos reservados enmascarados como `[RESERVADO]`.
   - `lectura`: solo lectura institucional sin botones de modificación y con campos reservados protegidos.

---

## 🚀 Puesta en Marcha

### 1. Requisitos
- Node.js 18+ o 20+
- npm o pnpm

### 2. Iniciar el backend
Desde `backend/`, instala dependencias, inicializa la base de datos de desarrollo sin borrar registros existentes e inicia la API:

```bash
cd backend
npm install
npm run seed
npm start
```

La API debe responder en `http://localhost:3000`. El comando `seed:reset` borra la base; úsalo solo si quieres reinicializarla y ya respaldaste los datos.

### 3. Iniciar el frontend
```bash
# Entrar a la carpeta frontend
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo Vite
npm run dev
```

El frontend estará disponible en: **`http://localhost:5173`**. El puerto es estricto: si está ocupado, el servidor avisa y no cambia a otro puerto automáticamente.

### 4. Conexión con la API municipal
El frontend usa exclusivamente el backend Express y SQLite; no hay cambio automático a datos simulados. Configura `frontend/.env` con:

```env
VITE_API_URL=http://localhost:3000/api
```

Inicia también el backend antes de usar el sistema. Si la API no está disponible, la pantalla muestra el error de conexión y no guarda datos localmente.

### 5. Cuentas de acceso de desarrollo (3 roles)
El backend de desarrollo crea estas cuentas para verificar permisos. En el frontend se ingresa usuario y contraseña; no hay acceso rápido ni selector para cambiar de rol:
1. **Administrador TI:** `admin` / `password123` (Rol: `admin_ti`, Unidad: `Informática`)
2. **Jefatura de Unidad:** `jefe_dideco` / `password123` (Rol: `jefatura`, Unidad: `DIDECO`)
3. **Auditoría / Control:** `auditor` / `password123` (Rol: `lectura`, Unidad: `Control`)

### 5. Preparar la base de datos después de actualizar el esquema

Después de hacer `git pull` cuando cambie el esquema de SQLite, desde `backend/` ejecuta:

```bash
npm run seed:reset
```

Este comando elimina y vuelve a crear `db/inventario.db` con el esquema y datos iniciales. Exporta o respalda primero cualquier dato local que quieras conservar.

---

## 🖥️ Pantallas del Frontend

1. **Login:** inicio de sesión con validación de credenciales y botones de 1-click para roles de prueba.
2. **Dashboard:** KPI cards (total, operativos, bajas, garantías por vencer, TCO), alertas con contador de días y gráficos visuales de distribución por categoría, estado y unidad.
3. **Listado de Activos:** búsqueda libre en tiempo real, filtros combinados (categoría, condición, unidad), paginación y acciones por fila.
4. **Ficha Técnica Detallada:** expediente completo del activo (Tabla 7), protección visual de campos reservados (`criticidad` e `IP/VLAN/firmware`) y **bitácora inmutable de historial / trazabilidad** con línea de tiempo.
5. **Formulario de Alta y Edición:** validación de campos obligatorios, catálogos desplegables y sección de seguridad exclusiva para `admin_ti`.
6. **Modales de Gestión:**
   - **Modal de Traslado:** reasignación de unidad, ubicación y custodio con motivo obligatorio.
   - **Modal de Baja:** justificación legal y técnica **estrictamente obligatoria** (Ley N.º 18.695).
7. **Reportes y Métricas:** pestañas de Resumen General, Análisis Financiero de Costos y TCO a 5 años, y Auditoría de Vigencia de Garantías.
8. **Importación Masiva (CSV):** arrastre de archivo CSV, descarga de plantilla estándar, carga de lote de prueba rápido, análisis fila por fila con discriminación entre filas válidas y erróneas, y procesamiento masivo con registro automático en bitácora.
9. **Conciliación Física:** muestra aleatoria del 10% de activos vigentes, captura de diferencias y aceptación con un máximo de 5% de discrepancias.
10. **Control de recepción:** las altas e importaciones exigen confirmar la recepción física/documental y registrar la orden de compra o contrato.
11. **Visor del Contrato API:** pantalla integrada con la especificación de los 19 endpoints para referencia en vivo.
