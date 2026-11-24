# Manual Técnico — Base de Datos y Endpoints de Lectura

**Sistema de Gestión de Inventario Tecnológico (Proyecto A)**
Ilustre Municipalidad de San Pablo — Plan Informático Municipal 2027–2031
**Responsable:** Alfredo Flores Ibarra
**Alcance:** `db/schema.sql`, `db/database.js`, `db/seed.js`, `db/backup.js`, `backend/routes/consultas.js` y `backend/tests/`
**Ver también:** [`docs/seguridad.md`](seguridad.md) (contraseñas, usuarios, auditoría y respaldos)
**Documento de referencia:** [`docs/contrato-api.md`](contrato-api.md) (fuente única de verdad del equipo)

---

## Índice

1. [Requisitos](#1-requisitos)
2. [Puesta en marcha](#2-puesta-en-marcha)
3. [Base de datos](#3-base-de-datos)
4. [Carga inicial (seed) y reinicio](#4-carga-inicial-seed-y-reinicio)
5. [Bitácora inmutable](#5-bitácora-inmutable)
6. [Endpoints de lectura](#6-endpoints-de-lectura)
7. [Roles y visibilidad](#7-roles-y-visibilidad)
8. [Pruebas automáticas](#8-pruebas-automáticas)
9. [Variables de entorno](#9-variables-de-entorno)
10. [Solución de problemas](#10-solución-de-problemas)

---

## 1. Requisitos

| Requisito | Versión | Notas |
| :--- | :--- | :--- |
| Node.js | 20 LTS o 22 LTS | Se usa `node:test` y `fetch` nativos (incluidos en Node). |
| npm | el que trae Node | |
| Compilador C++ | solo si falla la instalación | `better-sqlite3` normalmente descarga un binario precompilado. Ver [§10](#10-solución-de-problemas). |

No se necesita instalar ningún motor de base de datos: SQLite queda embebido en el archivo `db/inventario.db`.

---

## 2. Puesta en marcha

```bash
# 1. Instalar dependencias del backend
cd backend
npm install

# 2. (Opcional) Crear el archivo de entorno a partir del ejemplo
cp .env.example .env          # en Windows: copy .env.example .env

# 3. Crear la base de datos y cargar los 106 activos
npm run seed

# 4. Levantar la API
npm start                     # o "npm run dev" para recarga automática
```

La API queda en **`http://localhost:3000/api`**. Al iniciar, la consola debe mostrar:

```
[RUTAS] Endpoints de lectura (Alfredo) montados exitosamente.
```

> **Importante si ya tenías una base anterior a la rama `feat/alfredo-db-consultas`:** ejecuta una vez
> `npm run seed:reset`. El cambio de la clave foránea de `historial` (ver [§5](#5-bitácora-inmutable)) solo
> aplica a bases creadas desde cero.

### Scripts disponibles (`backend/package.json`)

| Comando | Qué hace |
| :--- | :--- |
| `npm start` | Inicia la API en el puerto `PORT` (3000 por defecto). |
| `npm run dev` | Igual que `start`, pero se reinicia al guardar cambios. |
| `npm run seed` | Crea las tablas si no existen e inserta los activos que falten. **No borra ni modifica nada existente.** |
| `npm run seed:reset` | Elimina `db/inventario.db` y la recrea desde cero con los datos iniciales. |
| `npm test` | Ejecuta las 136 pruebas automáticas (ver [§8](#8-pruebas-automáticas)). |
| `npm run backup` | Crea un respaldo verificado de la base (ver [`seguridad.md`](seguridad.md#5-respaldos-rnf-5)). |
| `npm run backup:listar` | Lista los respaldos y verifica su integridad. |
| `npm run backup:verificar -- <archivo>` | Verifica un respaldo (integridad y SHA-256). |
| `npm run backup:restaurar -- <archivo>` | Restaura un respaldo. **Detener la API antes.** |

---

## 3. Base de datos

### 3.1 Archivos

| Archivo | Función |
| :--- | :--- |
| `db/schema.sql` | Definición de tablas, restricciones `CHECK`, índices y triggers. Es idempotente (`IF NOT EXISTS`). |
| `db/database.js` | Abre la conexión (`better-sqlite3`), activa `WAL` y `foreign_keys`, aplica el esquema, migra columnas nuevas en bases antiguas, crea los usuarios de prueba (contraseñas con hash **bcrypt**) y el catálogo de unidades si no existen, y convierte a hash cualquier contraseña antigua en texto plano. Lo usan todas las rutas mediante `require('../../db/database')`. |
| `db/backup.js` | Respaldos verificables (integridad + SHA-256), cifrado opcional AES-256-GCM, rotación, restauración y respaldo automático. |
| `db/seed.js` | Carga inicial de los 106 activos y su bitácora. |
| `db/inventario.db` | Archivo de datos generado. **Está en `.gitignore`: no se sube al repositorio.** |
| `db/backups/` | Respaldos generados. También en `.gitignore`. |

### 3.2 Tablas

| Tabla | Contenido |
| :--- | :--- |
| `activos` | Modelo canónico de la **Tabla 7** del informe (23 campos). Clave primaria `id_activo`. |
| `historial` | Bitácora de eventos del ciclo de vida: `ALTA`, `EDICION`, `TRASLADO`, `BAJA`, `IMPORTACION`, `MANTENIMIENTO`. **Inmutable.** |
| `usuarios` | Usuarios del sistema con su `rol` (`admin_ti`, `jefatura`, `lectura`), `unidad`, `activo` (0 = acceso revocado), fechas de creación/actualización y `ultimo_acceso`. La columna `password` guarda **solo el hash bcrypt**. |
| `auditoria` | Registro de seguridad de logins, escrituras, exportaciones, gestión de usuarios y respaldos. **Inmutable.** |
| `conciliaciones` y `conciliacion_activos` | Conciliación física por muestra del 10% (módulo de Gaby). |
| `unidades` | Catálogo de las 13 unidades municipales. |
| `licencias` | Licencias adicionales que no son un activo de categoría `Software` (opcional, ver §6.4). |
| `proveedores` | Reservada para el registro de proveedores (Ley 19.886). Actualmente sin uso. |

### 3.3 Restricciones del modelo (Tabla 7)

La base rechaza valores fuera de las listas cerradas del contrato, aunque la aplicación no los valide:

| Campo | Valores permitidos |
| :--- | :--- |
| `categoria` | `PC`, `Portátil`, `Servidor`, `Red`, `Impresora`, `Software`, `Nube` |
| `estado_operativo` | `Bueno`, `Regular`, `Malo`, `En reparación`, `De baja` |
| `criticidad` | `Alta`, `Media`, `Baja` |
| `tipo_mantenimiento` | `Preventiva`, `Correctiva`, `Sin mantención` (o vacío) |
| `historial.tipo_evento` | `ALTA`, `EDICION`, `TRASLADO`, `BAJA`, `IMPORTACION`, `MANTENIMIENTO` |

Campos obligatorios (`NOT NULL`): `id_activo`, `categoria`, `marca_modelo`, `ubicacion`, `unidad`, `custodio`,
`estado_operativo`, `criticidad`, `fecha_adquisicion`, `fecha_garantia`, `proveedor`, `contrato_oc`,
`costo_inicial`, `costo_anual`.

Las fechas se guardan como texto ISO `YYYY-MM-DD`; los eventos del historial, como `YYYY-MM-DDTHH:MM:SSZ`.

---

## 4. Carga inicial (seed) y reinicio

### 4.1 Qué carga

- **106 activos** según la distribución del informe: 64 PC y portátiles, 18 impresoras, 14 equipos de red,
  2 servidores y 8 aplicaciones de software, repartidos en las 13 unidades.
- **Bitácora inicial:** un evento `ALTA` por cada activo (fecha = `fecha_adquisicion`), un evento `BAJA` por cada
  activo dado de baja y los casos documentados del informe (por ejemplo, el traslado de `SP-HW-0003`).
- **3 usuarios de prueba** (los crea `database.js`):

| Usuario | Contraseña | Rol | Unidad |
| :--- | :--- | :--- | :--- |
| `admin` | `password123` | `admin_ti` | Informática |
| `jefe_dideco` | `password123` | `jefatura` | DIDECO |
| `auditor` | `password123` | `lectura` | Control |

> En la base solo se guarda el hash bcrypt de `password123`. Las contraseñas alternativas antiguas (`admin123`, `dideco123`, `control123`) **ya no funcionan**: estaban escritas en el código y eran una puerta trasera.

### 4.2 `npm run seed` es seguro de repetir

El seed usa `INSERT … ON CONFLICT DO NOTHING`:

- Solo inserta los activos que **no existen**.
- **Nunca** sobrescribe un activo que ya fue modificado desde la aplicación (traslados, ediciones, bajas).
- **Nunca** elimina eventos de la bitácora.
- No duplica eventos: solo agrega el `ALTA`/`BAJA` de los activos que no lo tengan.

Al terminar informa, por ejemplo:

```
Seed completado: 0 activos insertados, 106 ya existían (no se modificaron), 0 eventos nuevos en bitácora.
```

### 4.3 Volver al estado inicial (antes de una demo)

```bash
npm run seed:reset
```

Borra `db/inventario.db` (y sus archivos `-wal`/`-shm`) y lo recrea. **Detén el servidor antes de ejecutarlo**
(en Windows no se puede borrar un archivo abierto).

---

## 5. Bitácora inmutable

Para cumplir con la trazabilidad exigida (Ley N.º 21.459 y Ley N.º 20.285), la tabla `historial` está protegida
**a nivel de base de datos**, independiente de lo que haga el código de la aplicación:

| Operación | Resultado |
| :--- | :--- |
| `INSERT` de un evento nuevo | Permitido. |
| `UPDATE` de un evento | Rechazado por el trigger `trg_historial_no_update`: *"La bitácora de historial es inmutable…"* |
| `DELETE` de un evento | Rechazado por el trigger `trg_historial_no_delete`. |
| `DELETE` de un activo con historial | Rechazado por la clave foránea (`ON DELETE RESTRICT`). La baja de un activo es **lógica**: `POST /api/activos/:id/baja` cambia `estado_operativo` a `De baja`. |

**Para el equipo:** si una ruta necesita "corregir" un evento, la forma correcta es registrar un evento nuevo
(por ejemplo `EDICION` con el motivo de la corrección), nunca modificar el anterior.

---

## 6. Endpoints de lectura

Todos requieren el encabezado `Authorization: Bearer <token>`. El token se obtiene con el login (Endpoint 1, de Iván):

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```

> **Windows PowerShell:** usa `curl.exe` (no `curl`, que es un alias de otro comando) y escapa las comillas
> del JSON, o prueba los endpoints desde Postman / Thunder Client.

En los ejemplos siguientes, `$TOKEN` es el valor de `data.token` de esa respuesta.

### 6.1 `GET /api/activos` — Listado con filtros (Endpoint 2)

| Parámetro | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `q` | Búsqueda libre (sin distinguir mayúsculas) en `id_activo`, `marca_modelo`, `custodio`, `ubicacion` y `descripcion`. Los caracteres `%` y `_` se buscan literalmente. | `q=thinkpad` |
| `categoria` | Filtra por categoría exacta. | `categoria=Impresora` |
| `estado` | Filtra por `estado_operativo` exacto. | `estado=De%20baja` |
| `unidad` | Filtra por unidad. **Se ignora para `jefatura`**, que siempre ve solo la suya. | `unidad=DAF` |
| `page` | Página (por defecto 1; valores inválidos vuelven a 1). | `page=2` |
| `limit` | Resultados por página (por defecto 10, máximo 100). | `limit=50` |

Los filtros se combinan con **Y**. Resultados ordenados por `id_activo`.

```bash
curl "http://localhost:3000/api/activos?categoria=Servidor&limit=1" -H "Authorization: Bearer $TOKEN"
```

```json
{
  "success": true,
  "data": [
    {
      "id_activo": "SP-SRV-0001",
      "categoria": "Servidor",
      "marca_modelo": "Dell PowerEdge R440 Rack 1U",
      "unidad": "Informática",
      "estado_operativo": "Bueno",
      "criticidad": "Alta",
      "fecha_garantia": "2026-12-15",
      "configuracion_red": "IP 192.168.1.10 / VLAN 10 (Gestión) / BIOS v2.14 / WinServer 22H2",
      "…": "(23 campos de la Tabla 7)"
    }
  ],
  "meta": { "total": 2, "page": 1, "limit": 1, "totalPages": 2 }
}
```

### 6.2 `GET /api/activos/:id` — Ficha técnica (Endpoint 3)

```bash
curl http://localhost:3000/api/activos/SP-HW-0042 -H "Authorization: Bearer $TOKEN"
```

Devuelve `{ "success": true, "data": { …activo completo… } }`.

| Caso | Código |
| :--- | :--- |
| Activo encontrado | `200` |
| `id_activo` inexistente | `404 NOT_FOUND` |
| `jefatura` consulta un activo de otra unidad | `403 FORBIDDEN` |

### 6.3 `GET /api/activos/:id/historial` — Bitácora del activo (Endpoint 4)

Eventos ordenados **del más reciente al más antiguo**. Mismos códigos `404`/`403` que la ficha.

```bash
curl http://localhost:3000/api/activos/SP-HW-0003/historial -H "Authorization: Bearer $TOKEN"
```

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "id_activo": "SP-HW-0003",
      "fecha": "2026-04-12T15:30:00Z",
      "tipo_evento": "TRASLADO",
      "usuario": "Felipe Oyarzún Mansilla",
      "unidad_origen": "DIDECO - Equipo Territorial Quilacahuín",
      "unidad_destino": "DIDECO - Dirección San Pablo",
      "custodio_anterior": "Claudia Silva Méndez",
      "custodio_nuevo": "Marcela Huenchumán Soto",
      "motivo": "Reasignación a Dirección DIDECO tras término de operativo social en terreno sector rural",
      "detalles": "Entrega con acta de responsabilidad firmada conforme a Ley 18.695."
    },
    {
      "id": 1,
      "id_activo": "SP-HW-0003",
      "fecha": "2024-03-15T10:00:00Z",
      "tipo_evento": "ALTA",
      "usuario": "Felipe Oyarzún Mansilla",
      "unidad_origen": null,
      "unidad_destino": "DIDECO - Equipo Territorial Quilacahuín",
      "custodio_anterior": null,
      "custodio_nuevo": "Claudia Silva Méndez",
      "motivo": "Alta inicial de equipamiento Plan Informático",
      "detalles": "Ingreso al inventario general con verificación física y etiquetado con código de barra."
    }
  ]
}
```

### 6.4 `GET /api/alertas?dias=60` — Garantías y licencias por vencer (Endpoint 5)

| Parámetro | Descripción |
| :--- | :--- |
| `dias` | Ventana en días desde hoy (por defecto 60). Entero entre `0` y `3650`; `0` = solo lo que vence hoy. Un valor inválido devuelve `400 BAD_REQUEST`. |

Reglas de cálculo:

- **Hoy** es la fecha local de Chile (`America/Santiago`), no la fecha UTC del servidor.
- Se incluye lo que vence **entre hoy y hoy + `dias`** (ambos inclusive). Lo ya vencido no aparece.
- `dias_restantes` es la diferencia exacta en días calendario (`0` = vence hoy).
- Los activos **dados de baja no generan alertas**.
- `garantias_por_vencer`: activos de hardware (todas las categorías excepto `Software`), según `fecha_garantia`.
- `licencias_por_vencer`: activos de categoría `Software` (su `fecha_garantia` es el vencimiento de la suscripción y
  `costo_anual` el costo de renovación), más las filas de la tabla `licencias` que no correspondan a un activo de software.
- `jefatura` solo recibe alertas de su unidad.

```bash
curl "http://localhost:3000/api/alertas?dias=30" -H "Authorization: Bearer $TOKEN"
```

```json
{
  "success": true,
  "data": {
    "garantias_por_vencer": [
      {
        "id_activo": "SP-HW-0003",
        "marca_modelo": "Lenovo ThinkPad E14 Gen 4",
        "categoria": "Portátil",
        "unidad": "DIDECO",
        "custodio": "Marcela Huenchumán Soto",
        "fecha_garantia": "2026-12-10",
        "proveedor": "Proveedor TI Sur Ltda.",
        "dias_restantes": 16
      }
    ],
    "licencias_por_vencer": [
      {
        "id_activo": "SP-SW-0008",
        "nombre_software": "Consola Central Antivirus EDR Endpoint",
        "unidad": "Informática",
        "fecha_vencimiento": "2026-12-20",
        "costo_renovacion": 800000,
        "dias_restantes": 26
      }
    ]
  }
}
```

*(Ejemplo con fecha de consulta 2026-11-24; los valores cambian según el día.)*

> **Nota para la integración del frontend:** el mock (`api.mock.js`) también muestra garantías vencidas hasta
> hace 365 días. La API real, siguiendo el contrato, solo muestra las **por vencer**.

### 6.5 `GET /api/catalogos` — Listas maestras (Endpoint 6)

Devuelve `categorias`, `estados_operativos`, `unidades`, `criticidades` y `tipos_mantenimiento` para poblar
filtros y formularios. Igual para los tres roles.

### 6.6 Formato de errores

Todos los errores siguen el formato del contrato:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Acceso denegado: El activo pertenece a la unidad 'Informática'. Su rol solo permite consultar 'DIDECO'.",
    "details": []
  }
}
```

| Código | Cuándo |
| :--- | :--- |
| `400 BAD_REQUEST` | Parámetro inválido (por ejemplo `?dias=abc`). |
| `401 UNAUTHORIZED` | Sin token, token inválido o expirado (vigencia: 8 horas), o cuenta revocada. |
| `403 FORBIDDEN` | `jefatura` intentando ver un activo o historial de otra unidad. |
| `404 NOT_FOUND` | El `id_activo` no existe. |
| `409 CONFLICT` | Conflicto de estado (por ejemplo, trasladar o dar de baja un activo que ya está de baja). |
| `429 TOO_MANY_REQUESTS` | Más de 10 intentos fallidos de inicio de sesión en 15 minutos desde la misma IP. |

---

## 7. Roles y visibilidad

| Rol | Qué activos ve | `criticidad` y `configuracion_red` |
| :--- | :--- | :--- |
| `admin_ti` | Todos | Valores reales |
| `lectura` | Todos | `[RESERVADO]` / `[RESERVADO - Ley N.º 21.663]` |
| `jefatura` | Solo su unidad (listado, ficha, historial y alertas) | `[RESERVADO]` / `[RESERVADO - Ley N.º 21.663]` |

- El **filtro por unidad** de `jefatura` se aplica en las consultas SQL de `consultas.js` (y en el middleware
  `aplicarFiltroUnidad` de Iván); un parámetro `?unidad=` distinto se ignora.
- El **enmascarado** de campos reservados lo aplica el middleware global `middlewareSanitizacion`
  (`backend/middlewares/roles.js`, de Iván) sobre cualquier respuesta que contenga activos.

---

## 8. Pruebas automáticas

```bash
cd backend
npm test
```

Resultado esperado:

```
# tests 136
# pass 136
# fail 0
```

| Archivo | Pruebas | Qué verifica |
| :--- | :--- | :--- |
| `tests/db.test.js` | 22 | Los 106 activos y su distribución; coherencia de datos; eventos `ALTA`/`BAJA`; que repetir el seed no borre ni sobrescriba nada; inmutabilidad de la bitácora; restricciones `CHECK`. |
| `tests/consultas.test.js` | 44 | Endpoints 2 a 6 con los tres roles: `401`, paginación, filtros, búsqueda, enmascarado, aislamiento de `jefatura` (`403`), historial y alertas. |
| `tests/escrituras.test.js` | 16 | Endpoints 7 a 10 (Ivan) y 20 (mantenciones): permisos por rol, bitácora de cada operación, validaciones y conflictos `409` con activos dados de baja. |
| `tests/seguridad.test.js` | 32 | Contraseñas bcrypt y migración, tokens falsificados, `helmet`, CORS, gestión de usuarios y revocación inmediata, auditoría inmutable, CSV enmascarado e inyección de fórmulas, límite de intentos. |
| `tests/respaldos.test.js` | 7 | Crear, verificar, detectar alteraciones, cifrar, rotar y restaurar respaldos. |
| `tests/reportes-importar.test.js`, `tests/conciliaciones.test.js` | 15 | Reportes, importación y conciliación física (módulos de Gaby). |
| `tests/helpers.js` | — | Base temporal por archivo, servidor en puerto libre y utilidades de fechas. |

Características:

- **No tocan `db/inventario.db`:** cada archivo crea una base SQLite temporal y la elimina al terminar.
- **No dependen de la fecha:** las pruebas de alertas y mantenciones usan fechas relativas a hoy.
- **Sin dependencias extra:** usan `node:test`, `node:assert` y `fetch`, incluidos en Node.
- Para ejecutar un solo archivo: `node --test tests/seguridad.test.js`.

---

## 9. Variables de entorno

Plantilla completa en `backend/.env.example`. Las principales:

| Variable | Por defecto | Uso |
| :--- | :--- | :--- |
| `PORT` | `3000` | Puerto de la API. |
| `NODE_ENV` | `development` | En `production` la API exige `JWT_SECRET` y oculta detalles de errores internos. |
| `JWT_SECRET` | aleatorio por arranque (solo desarrollo) | Clave de firma de tokens, mínimo 32 caracteres. **Obligatoria en producción.** |
| `CORS_ORIGIN` | `http://localhost:5173,http://localhost:4173` | Orígenes del frontend autorizados. |
| `LOGIN_MAX_INTENTOS` / `LOGIN_VENTANA_MINUTOS` | `10` / `15` | Límite de intentos fallidos de login por IP. |
| `DB_PATH` | `db/inventario.db` | Ruta del archivo SQLite (las pruebas la redirigen a una carpeta temporal). |
| `APP_TZ` | `America/Santiago` | Zona horaria para "hoy" en alertas y mantenciones. |
| `BACKUP_AUTO` / `BACKUP_INTERVALO_HORAS` / `BACKUP_RETENCION` | `true` / `24` / `14` | Respaldo automático mientras la API corre. |
| `BACKUP_DIR` | `db/backups` | Carpeta de respaldos. |
| `BACKUP_CLAVE` | — | Si se define, los respaldos se cifran con AES-256-GCM. |

---

## 10. Solución de problemas

| Síntoma | Causa probable | Solución |
| :--- | :--- | :--- |
| `No se encontró el módulo better-sqlite3` | Falta `npm install` en `backend/`. | `cd backend && npm install`. |
| `npm install` falla con errores de `node-gyp` / `gyp ERR!` | No hay binario precompilado para tu versión de Node y no hay compilador C++. | Usar Node **20 LTS o 22 LTS**. En Windows, si persiste: instalar "Desktop development with C++" de Visual Studio Build Tools y repetir. |
| La ficha muestra historial vacío o faltan alertas de licencias | La base se creó con una versión anterior del seed. | `npm run seed:reset`. |
| Se pueden borrar activos con historial / la bitácora acepta `UPDATE` | Base creada antes de los triggers y del `RESTRICT`. | `npm run seed:reset`. |
| `EBUSY` o `EPERM` al hacer `seed:reset` (Windows) | El servidor tiene la base abierta. | Detener el servidor (`Ctrl + C`) y repetir. |
| `EADDRINUSE: address already in use :::3000` | Ya hay otra instancia de la API corriendo. | Cerrarla o usar otro puerto: `PORT=3001 npm start`. |
| `401` en todas las consultas | Falta el encabezado `Authorization: Bearer <token>`, el token expiró (8 h), la API se reinició sin `JWT_SECRET` fijo o la cuenta fue revocada. | Volver a hacer login; definir `JWT_SECRET` en `backend/.env`. |
| La API no inicia: `JWT_SECRET no está definido o es inseguro` | `NODE_ENV=production` sin `JWT_SECRET` de 32+ caracteres. | Generarlo con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` y ponerlo en `backend/.env`. |
| `429` al iniciar sesión | Más de 10 intentos fallidos en 15 minutos. | Esperar 15 minutos o reiniciar la API (en desarrollo). |
| El frontend dejó de conectarse al backend tras hacer pull | `frontend/.env` ya no está en el repositorio (no debe subirse). | Copiar `frontend/.env.example` como `frontend/.env` y poner `VITE_USE_MOCK=false`. |
| `[RESERVADO]` en `criticidad` | Comportamiento esperado para `jefatura` y `lectura`. | Iniciar sesión como `admin` para ver los valores reales. |
