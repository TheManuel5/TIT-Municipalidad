# Prototipo Sistema de Gestión de Inventario Tecnológico (Proyecto A)
## Plan Informático Municipal 2027–2031 — Ilustre Municipalidad de San Pablo

Prototipo funcional desarrollado para el Taller de Integración Tecnológica (TIT).  
Implementa el **Proyecto A** (*Inventario y ciclo de vida de activos tecnológicos*), resolviendo la problemática **PR-1** y **A-01** (inexistencia de un inventario único y validado).

---

## 👥 Reparto del Equipo y Responsabilidades

| Integrante | Responsabilidad Principal | Entregables / Carpetas |
| :--- | :--- | :--- |
| **Manuel** | Contrato de API y Frontend integrado con el backend | `docs/contrato-api.md`, `frontend/` |
| **Alfredo** | Base de datos SQLite, endpoints de lectura, seguridad, auditoría, usuarios, respaldos, pruebas y manual | `db/schema.sql`, `db/database.js`, `db/seed.js`, `backend/routes/`, `docs/` |
| **Ivan** | Servidor Express, autenticación JWT, middleware de roles y endpoints de escritura | `backend/server.js`, `backend/routes/activos.js`, `backend/middlewares/` |
| **Gaby** | Endpoints de reportes, importación/exportación CSV y conexión con la API real | `backend/routes/reportes.js`, `backend/routes/importar.js`, `frontend/src/api.real.js` |

---

## 📋 Regla Única: Contrato de la API

El documento canónico para todo el equipo es:
👉 **[`docs/contrato-api.md`](docs/contrato-api.md)**

Contiene:
1. **Los 26 Endpoints oficiales:** especificaciones HTTP, parámetros query, payload y códigos de estado.
2. **Nombres canónicos de los campos de la base de datos:** correspondientes a la **Tabla 7** (*Estructura del modelo de inventario tecnológico y criterios de reserva*) del Informe del Plan Informático.
3. **JSON de ejemplo** para cada respuesta de la API.
4. **Matriz de Seguridad y Roles:**
   - `admin_ti`: visualización total (incluyendo IP/VLAN/versión y criticidad), altas, traslados, bajas e importación CSV.
   - `jefatura`: filtrado automático por su unidad (ej: `DIDECO`), campos reservados enmascarados como `[RESERVADO]`.
   - `lectura`: solo lectura institucional sin botones de modificación y con campos reservados protegidos.

---

## 📚 Documentación

| Documento | Para quién | Contenido |
| :--- | :--- | :--- |
| [`docs/manual-usuario.md`](docs/manual-usuario.md) · [PDF](docs/entregables/Manual%20de%20Usuario.pdf) | Funcionarios, jefaturas y Control | Uso de cada pantalla paso a paso, con capturas, por perfil. |
| [`docs/manual-base-datos-y-consultas.md`](docs/manual-base-datos-y-consultas.md) | Equipo técnico | Base de datos, seed, endpoints de lectura, pruebas y solución de problemas. |
| [`docs/seguridad.md`](docs/seguridad.md) | Equipo técnico y Control | Contraseñas, usuarios y privilegios, auditoría, respaldos y checklist de producción. |
| [`docs/contrato-api.md`](docs/contrato-api.md) | Equipo técnico | Los 26 endpoints de la API. |
| [Requerimientos y propuesta tecnológica (PDF)](docs/entregables/TIT%20Grupo%204%20-%20PyP%20v2.pdf) | Entrega del ramo | RF/RNF, stack real, justificación de cambios y cobertura de cada requerimiento. |

Pruebas automáticas del backend: `cd backend && npm test` (148 pruebas).

---

## 🚀 Puesta en Marcha

### 1. Requisitos
- Node.js 22 o superior
- npm o pnpm

### Opción recomendada: iniciar la API con Docker
Desde la raíz del proyecto:

```bash
docker compose up -d --build
docker compose ps
```

La API queda en `http://localhost:3000`, reinicia automáticamente si Docker vuelve a iniciar y conserva SQLite en `db/`. Para ver los registros: `docker compose logs -f api`. Para detenerla: `docker compose down` (no elimina la base de datos).

Si existe `backend/.env`, Compose lo carga. Define allí un `JWT_SECRET` aleatorio para conservar sesiones entre recreaciones del contenedor; ese archivo está excluido de Git.

### 2. Iniciar el backend
Desde `backend/`, instala dependencias, inicializa la base de datos de desarrollo sin borrar registros existentes e inicia la API:

```bash
cd backend
npm install
npm run seed
npm start
```

La API debe responder en `http://localhost:3000`. El comando `seed:reset` borra y vuelve a crear la base; respalda o exporta los datos antes de ejecutarlo.

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

Puedes copiar `frontend/.env.example` como plantilla; `frontend/.env` es local y no se sube al repositorio.
Inicia también el backend antes de usar el sistema. Si la API no está disponible, la pantalla muestra el error de conexión y no guarda datos localmente.

### 5. Cuentas de acceso de desarrollo (3 roles)
El backend de desarrollo crea estas cuentas para verificar permisos. En el frontend se ingresa usuario y contraseña; no hay acceso rápido ni selector para cambiar de rol:
1. **Administrador TI:** `admin` / `password123` (Rol: `admin_ti`, Unidad: `Informática`)
2. **Jefatura de Unidad:** `jefe_dideco` / `password123` (Rol: `jefatura`, Unidad: `DIDECO`)
3. **Auditoría / Control:** `auditor` / `password123` (Rol: `lectura`, Unidad: `Control`)

### 6. Actualizar el esquema de la base de datos

En esta actualización, el cambio de la clave foránea de `historial` solo se aplica al recrear la base. Si necesitas aplicarlo a una base existente, respáldala primero y luego, desde `backend/`, ejecuta:

```bash
npm run seed:reset
```

**Este comando elimina y vuelve a crear `db/inventario.db` con datos iniciales.** No lo ejecutes sobre datos que deban conservarse sin respaldo y confirmación de que puedes restaurarlos.

---

## 🖥️ Pantallas del Frontend

1. **Login:** inicio de sesión con validación de credenciales y selección de usuario inicial; el servidor valida la contraseña.
2. **Dashboard:** KPI cards (total, operativos, bajas, garantías por vencer, TCO), alertas con contador de días y gráficos visuales de distribución por categoría, estado y unidad.
3. **Listado de Activos:** búsqueda libre en tiempo real, filtros combinados (categoría, condición, unidad), paginación y acciones por fila.
4. **Ficha Técnica Detallada:** expediente completo del activo (Tabla 7), protección visual de campos reservados (`criticidad` e `IP/VLAN/firmware`) y **bitácora inmutable de historial / trazabilidad** con línea de tiempo.
5. **Formulario de Alta y Edición:** validación de campos obligatorios, catálogos desplegables y sección de seguridad exclusiva para `admin_ti`.
6. **Modales de Gestión:**
   - **Modal de Traslado:** reasignación de unidad, ubicación y custodio con motivo obligatorio.
   - **Modal de Baja:** justificación legal y técnica **estrictamente obligatoria** (Ley N.º 18.695).
7. **Reportes y Métricas:** pestañas de Resumen General, Análisis Financiero de Costos y TCO a 5 años, y Auditoría de Vigencia de Garantías.
8. **Importación Masiva (CSV):** arrastre de archivo CSV, descarga de plantilla estándar, análisis fila por fila con discriminación entre filas válidas y erróneas, y procesamiento masivo con registro automático en bitácora.
9. **Conciliación Física:** muestra aleatoria del 10% de activos vigentes, captura de diferencias y aceptación con un máximo de 5% de discrepancias.
10. **Control de recepción:** las altas e importaciones exigen confirmar la recepción física/documental y registrar la orden de compra o contrato.
11. **Visor del Contrato API:** pantalla integrada con la especificación de los 26 endpoints para referencia en vivo.
12. **Seguridad y Accesos:** cambio de contraseña, administración de usuarios y consulta de auditoría según el rol.
13. **Mantenciones:** registro de mantenciones preventivas y correctivas desde la ficha del activo.
