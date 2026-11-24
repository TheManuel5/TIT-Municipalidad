# Prototipo Sistema de Gestión de Inventario Tecnológico (Proyecto A)
## Plan Informático Municipal 2027–2031 — Ilustre Municipalidad de San Pablo

Prototipo funcional desarrollado para el Taller de Integración Tecnológica (TIT).  
Implementa el **Proyecto A** (*Inventario y ciclo de vida de activos tecnológicos*), resolviendo la problemática **PR-1** y **A-01** (inexistencia de un inventario único y validado).

---

## 👥 Reparto del Equipo y Responsabilidades

| Integrante | Responsabilidad Principal | Entregables / Carpetas |
| :--- | :--- | :--- |
| **Manuel** | Contrato de API y Frontend completo con datos simulados | `docs/contrato-api.md`, `frontend/` |
| **Alfredo** | Base de datos SQLite, seed (106 activos), endpoints de lectura, pruebas y manual | `db/schema.sql`, `db/database.js`, `db/seed.js`, `backend/routes/consultas.js`, `docs/` |
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

## 🧰 Stack Tecnológico

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| Frontend | React 18 + Vite 6 + CSS propio + `lucide-react` | Interfaz web responsiva para funcionarios y administradores. |
| Backend | Node.js + Express 5 + JWT (`jsonwebtoken`) | API REST de 26 endpoints con control de acceso por rol. |
| Base de datos | SQLite (`better-sqlite3`) | Base embebida, sin servidor adicional; migrable a PostgreSQL. |
| Seguridad | `bcryptjs`, `helmet`, `express-rate-limit`, `cors` | Hash de contraseñas, cabeceras seguras, límite de intentos y CORS restringido. |
| Auditoría y respaldos | Triggers SQLite + `crypto` de Node | Registro inmutable; respaldos verificados (SHA-256) y cifrables (AES-256-GCM). |
| Pruebas | `node:test` (incluido en Node) | 136 pruebas automáticas del backend. |

📘 **Manual de usuario:** [`docs/manual-usuario.md`](docs/manual-usuario.md) (versión PDF en [`docs/entregables/`](docs/entregables/))  
📄 Documentación técnica: [`docs/manual-base-datos-y-consultas.md`](docs/manual-base-datos-y-consultas.md) · [`docs/seguridad.md`](docs/seguridad.md)

---

## ⚙️ Puesta en Marcha del Backend

```bash
cd backend
npm install
cp .env.example .env      # en Windows: copy .env.example .env  (y completar JWT_SECRET)
npm run seed              # crea db/inventario.db con los 106 activos
npm start                 # API en http://localhost:3000/api
npm test                  # 136 pruebas automáticas
```

Comandos útiles: `npm run seed:reset` (volver al estado inicial), `npm run backup` (respaldo verificado), `npm run backup:listar`, `npm run backup:restaurar -- <archivo>`.

---

## 🚀 Puesta en Marcha del Frontend (Manuel)

### 1. Requisitos
- Node.js 18+ o 20+
- npm o pnpm

### 2. Instalación y Ejecución
```bash
# Entrar a la carpeta frontend
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo Vite
npm run dev
```

El frontend estará disponible en: **`http://localhost:5173`**

### 3. Modos de Ejecución (`VITE_USE_MOCK`)
El archivo `frontend/.env` controla la fuente de datos. **No se sube al repositorio:** créelo copiando `frontend/.env.example`.
- **`VITE_USE_MOCK=true` (Modo Simulado por defecto):** utiliza `api.mock.js` con almacenamiento persistente en `localStorage`. Incluye los 106 activos del informe (64 PC, 18 impresoras, 14 equipos de red, 2 servidores y 8 aplicaciones), alertas de vencimiento dentro de 60 días y trazabilidad completa. Permite probar y evaluar el frontend al 100% de forma autónoma.
- **`VITE_USE_MOCK=false` (Modo Real):** activa `api.real.js` para consumir el backend Express (`http://localhost:3000/api`) desarrollado por Ivan, Alfredo y Gaby.

- **`VITE_MODO_DEMO=false`:** oculta el selector "Simular rol", el acceso rápido y las credenciales precargadas (usar en un despliegue real).

### 4. Credenciales de Prueba (3 Roles)
En la pantalla de Login y en la barra superior se incluye un selector rápido de usuarios de prueba:
1. **Administrador TI:** `admin` / `password123` (Rol: `admin_ti`, Unidad: `Informática`)
2. **Jefatura de Unidad:** `jefe_dideco` / `password123` (Rol: `jefatura`, Unidad: `DIDECO`)
3. **Auditoría / Control:** `auditor` / `password123` (Rol: `lectura`, Unidad: `Control`)

> Las contraseñas se guardan solo como hash bcrypt. En un despliegue real, cambie estas contraseñas o desactive estas cuentas desde **Seguridad y Accesos**.

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
11. **Registro de Mantenciones:** botón en la ficha del activo para registrar mantenciones preventivas o correctivas, con su evento en la bitácora (RF-2).
12. **Seguridad y Accesos:** cambio de la propia contraseña; gestión de cuentas, roles, unidades y revocación inmediata de accesos (admin TI, RF-6); y registro de auditoría inmutable (admin TI y Control, RNF-6).
13. **Visor del Contrato API:** pantalla integrada con la especificación de los 26 endpoints para referencia en vivo.

---

## 🔐 Seguridad (resumen)

- Contraseñas con hash **bcrypt**; sin contraseñas escritas en el código.
- `JWT_SECRET` obligatorio en producción; revocación de cuentas con efecto inmediato.
- Límite de intentos de login, cabeceras `helmet` y CORS restringido.
- Campos reservados (criticidad, IP/VLAN) enmascarados también en la exportación CSV; protección contra inyección de fórmulas.
- Bitácora de activos y registro de auditoría **inmutables** a nivel de base de datos.
- Respaldos automáticos verificados (integridad + SHA-256), con rotación y cifrado opcional.

Detalle y checklist de producción en [`docs/seguridad.md`](docs/seguridad.md).
