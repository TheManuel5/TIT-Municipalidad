# Seguridad, Auditoría y Respaldos

**Sistema de Gestión de Inventario Tecnológico (Proyecto A)**
Ilustre Municipalidad de San Pablo — Plan Informático Municipal 2027–2031
**Responsable:** Alfredo Flores Ibarra
**Relación con los requerimientos:** RF-2 (mantenciones), RF-6 (jerarquía y privilegios), RNF-3 (cifrado y seguridad), RNF-5 (respaldos), RNF-6 (auditoría).
**Marco normativo considerado:** Ley N.º 21.663 (Marco de Ciberseguridad), Ley N.º 21.719 (Protección de Datos Personales), Ley N.º 20.285 (Transparencia), Ley N.º 21.459 (Delitos Informáticos), Ley N.º 18.695 (Orgánica de Municipalidades).

---

## 1. Resumen de controles

Todas las tecnologías agregadas **complementan** el stack del proyecto (React + Vite, Node.js + Express, SQLite); no reemplazan ninguna.

| Riesgo | Control implementado | Tecnología | Dónde |
| :--- | :--- | :--- | :--- |
| Robo de la base de datos expone contraseñas | Contraseñas guardadas solo como hash bcrypt (costo 10); migración automática de bases antiguas | `bcryptjs` | `db/database.js`, `backend/utils/password.js` |
| Puerta trasera en el login | Se eliminaron las contraseñas alternativas escritas en el código (`admin123`, etc.) | — | `backend/routes/auth.js` |
| Falsificación de tokens | `JWT_SECRET` obligatorio en producción (antes había uno fijo publicado en el repositorio); solo `HS256` | `jsonwebtoken` | `backend/middlewares/auth.js` |
| Cuenta comprometida o funcionario desvinculado | Revocación inmediata: cada petición verifica que la cuenta siga activa; los cambios de rol o unidad aplican al instante | — | `backend/middlewares/auth.js`, `routes/usuarios.js` |
| Fuerza bruta de contraseñas | Máximo 10 intentos fallidos por IP cada 15 minutos (`429`) | `express-rate-limit` | `backend/routes/auth.js` |
| Enumeración de usuarios | Mismo mensaje y mismo tiempo de respuesta si el usuario no existe o la clave es incorrecta | `bcryptjs` | `backend/routes/auth.js` |
| Clickjacking, sniffing de MIME, fuga de versión | Cabeceras HTTP de seguridad; sin `X-Powered-By` | `helmet` | `backend/server.js` |
| Uso de la API desde sitios ajenos | CORS restringido a los orígenes del frontend (`CORS_ORIGIN`) | `cors` | `backend/server.js` |
| Fuga de IP/VLAN y criticidad (Ley 21.663) | Enmascarado de campos reservados también en la **exportación CSV** (antes solo en JSON) | — | `backend/routes/reportes.js` |
| Inyección de fórmulas en Excel | Celdas que empiezan con `=`, `+`, `-`, `@` se prefijan con `'` | — | `backend/routes/reportes.js` |
| Repudio / falta de trazabilidad | Registro de auditoría inmutable (triggers SQLite) de logins, escrituras, exportaciones, usuarios y respaldos | SQLite | `backend/utils/auditoria.js`, `db/schema.sql` |
| Alteración de la bitácora de activos | Triggers que rechazan `UPDATE`/`DELETE` en `historial`; FK `ON DELETE RESTRICT` | SQLite | `db/schema.sql` |
| Pérdida de datos / ransomware | Respaldos automáticos verificados (integridad + SHA-256), rotación y restauración | API de respaldo de SQLite, `crypto` | `db/backup.js` |
| Pérdida de un disco o respaldo fuera del servidor | Cifrado opcional AES-256-GCM de los respaldos | `crypto` (Node) | `db/backup.js` |
| Exposición de detalles internos | Los errores 5xx no muestran SQL ni stack fuera de desarrollo | — | `backend/server.js` |
| Herramientas de demostración en producción | `VITE_MODO_DEMO=false` oculta el selector de rol y las credenciales precargadas | Vite | `frontend/src/components/Navbar.jsx`, `pages/LoginScreen.jsx` |

---

## 2. Contraseñas

- **Almacenamiento:** solo el hash bcrypt (`$2b$10$…`). Nunca texto plano, ni en la base ni en la auditoría.
- **Política:** mínimo 8 caracteres, al menos una letra y un número (máximo 72 bytes, límite de bcrypt).
- **Migración:** si se abre una base creada con una versión anterior (contraseñas en texto plano), `db/database.js` las convierte a hash automáticamente al iniciar e informa por consola.
- **Cambio propio:** `PUT /api/auth/password` (pantalla *Seguridad y Accesos → Mi cuenta*).
- **Restablecimiento:** el Administrador TI asigna una contraseña temporal (`PUT /api/usuarios/:id/password`) y el usuario la cambia al entrar.
- **Usuarios de prueba:** `admin`, `jefe_dideco` y `auditor` con `password123`. **En un despliegue real deben cambiarse o desactivarse el primer día.**

---

## 3. Jerarquía de usuarios y privilegios (RF-6)

| Rol | Alcance |
| :--- | :--- |
| `admin_ti` | Administración completa del inventario, usuarios y auditoría. |
| `jefatura` | Solo los activos de su unidad; campos reservados ocultos. |
| `lectura` | Todo el municipio en modo consulta; campos reservados ocultos; acceso a la auditoría (Control). |

**Flujo de privilegios:**

1. **Solicitar:** la jefatura solicita el acceso al Administrador TI por memo o correo institucional (respaldo documental).
2. **Aprobar:** `admin_ti` crea la cuenta con el rol y la unidad aprobados.
3. **Modificar:** `admin_ti` cambia rol, unidad o nombre; aplica en la siguiente petición, aunque la sesión ya esté abierta.
4. **Revocar:** `admin_ti` desactiva la cuenta; sus sesiones abiertas dejan de funcionar de inmediato. Las cuentas no se eliminan, para conservar la trazabilidad.

Salvaguardas: un administrador no puede desactivarse ni quitarse el rol a sí mismo, y el sistema nunca queda sin administradores activos. Todas las operaciones quedan auditadas.

---

## 4. Registro de auditoría (RNF-6)

Tabla `auditoria`, protegida con triggers: **solo admite `INSERT`**. Consultable por `admin_ti` y `lectura` en *Seguridad y Accesos → Auditoría* o `GET /api/auditoria`.

| Acción | Cuándo |
| :--- | :--- |
| `LOGIN_OK` / `LOGIN_FALLIDO` / `LOGIN_BLOQUEADO` | Cada intento de inicio de sesión (con el motivo del fallo en `detalle`) |
| `ESCRITURA POST/PUT/DELETE` | Toda operación de escritura, con su código HTTP (incluye intentos rechazados por permisos) |
| `EXPORTACION` | Cada descarga del inventario |
| `USUARIO_CREADO` / `USUARIO_MODIFICADO` / `USUARIO_REVOCADO` / `USUARIO_REACTIVADO` / `USUARIO_PASSWORD_RESTABLECIDA` | Gestión de cuentas, con el antes → después |
| `AUDITORIA_CONSULTADA` | Quién revisa la auditoría también queda registrado |
| `RESPALDO_CREADO` / `RESPALDO_ERROR` / `RESPALDO_RESTAURADO` | Copias de seguridad |

Cada entrada guarda fecha (UTC), usuario, rol, IP, método, ruta, código HTTP, resultado y un detalle breve. **Nunca** guarda contraseñas, tokens ni el cuerpo de las peticiones.

---

## 5. Respaldos (RNF-5)

### 5.1 Automáticos

Mientras la API está corriendo, se crea un respaldo cada `BACKUP_INTERVALO_HORAS` (24 por defecto) en `db/backups/`, y se conservan los últimos `BACKUP_RETENCION` (14 por defecto, es decir, dos semanas). Si al iniciar el último respaldo es más antiguo que el intervalo, se respalda de inmediato.

### 5.2 Manuales (desde `backend/`)

```bash
npm run backup                                   # crear un respaldo ahora
npm run backup:listar                            # listar y verificar todos los respaldos
npm run backup:verificar -- <archivo>            # verificar uno
npm run backup:restaurar -- <archivo>            # restaurar (DETENER LA API ANTES)
```

### 5.3 Garantías

- **Consistencia:** se usa la API de respaldo nativa de SQLite (copia en caliente sin corromper el archivo).
- **Integridad verificable:** cada respaldo pasa `PRAGMA integrity_check` y un conteo de tablas al crearse, y se guarda su huella **SHA-256** en `<archivo>.sha256`. `backup:listar` y `backup:verificar` detectan cualquier alteración.
- **Restauración segura:** antes de sobrescribir, `backup:restaurar` verifica el respaldo y guarda una copia del estado actual (motivo `pre-restauración`). Un respaldo inválido no se restaura.
- **Cifrado opcional:** con `BACKUP_CLAVE` definido, los respaldos se guardan como `.db.enc` cifrados con **AES-256-GCM** (clave derivada con scrypt). Sin la clave no se pueden leer ni restaurar: guárdela fuera del servidor.
- **Restauración periódica auditable:** se recomienda una prueba mensual de restauración en un equipo de pruebas; queda registrada como `RESPALDO_RESTAURADO`.
- **Regla 3-2-1:** copiar periódicamente `db/backups/` a un segundo medio (disco externo o almacenamiento institucional), idealmente cifrado.

---

## 6. Configuración para producción (checklist)

En `backend/.env` (ver `backend/.env.example`):

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` aleatorio de 32+ caracteres: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Sin él, la API **no inicia** en producción.
- [ ] `CORS_ORIGIN` con la URL real del frontend.
- [ ] `TRUST_PROXY=true` solo si hay un proxy inverso (nginx), para registrar la IP real.
- [ ] `BACKUP_CLAVE` definido si los respaldos salen del servidor.
- [ ] Servir la API detrás de HTTPS (proxy inverso con certificado).

En `frontend/.env`:

- [ ] `VITE_USE_MOCK=false` y `VITE_API_URL` con la URL real.
- [ ] `VITE_MODO_DEMO=false` (oculta el selector de rol y las credenciales precargadas).

En la aplicación:

- [ ] Cambiar las contraseñas de `admin`, `jefe_dideco` y `auditor`, o crear las cuentas reales y desactivar las de prueba.

---

## 7. Pruebas de seguridad

`backend/tests/seguridad.test.js` (32 pruebas) y `backend/tests/respaldos.test.js` (7 pruebas) verifican, entre otras cosas:

- que no queden contraseñas en texto plano y que las bases antiguas se migren;
- que las contraseñas alternativas antiguas, los tokens firmados con la clave antigua y los tokens sin firma (`alg: none`) sean rechazados;
- las cabeceras de `helmet` y el CORS;
- el ciclo completo de usuarios: crear, cambiar unidad con la sesión abierta, revocar (el token deja de servir de inmediato), reactivar y restablecer o cambiar contraseña;
- que la auditoría registre logins y escrituras, no contenga contraseñas y sea inmutable;
- que el CSV no exponga campos reservados y neutralice fórmulas;
- el bloqueo tras 10 intentos fallidos;
- la creación, verificación, detección de alteraciones, cifrado, rotación y restauración de respaldos.
