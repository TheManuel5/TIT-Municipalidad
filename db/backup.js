/**
 * backup.js - Copias de seguridad verificables de la base SQLite (RNF-5)
 * Responsable: Alfredo
 * Municipalidad de San Pablo - Plan Informático Municipal 2027-2031 (Proyecto A)
 *
 * Uso (desde backend/):
 *   npm run backup                      -> crea un respaldo ahora
 *   npm run backup:listar               -> lista los respaldos y su estado
 *   npm run backup:verificar -- <archivo>
 *   npm run backup:restaurar -- <archivo>   (DETENER el servidor antes)
 *
 * Garantías:
 *  - Copia consistente en caliente con la API de respaldo nativa de SQLite (no copia el archivo
 *    "a mano" mientras se escribe).
 *  - Cada respaldo se verifica al crearlo: PRAGMA integrity_check + conteo de tablas clave.
 *  - Se guarda su huella SHA-256 (<archivo>.sha256) para detectar alteraciones posteriores.
 *  - Cifrado opcional AES-256-GCM (si se define BACKUP_CLAVE), útil si el respaldo sale del
 *    servidor (disco externo, nube). Sin la clave el respaldo no se puede leer.
 *  - Rotación: se conservan los últimos BACKUP_RETENCION respaldos (14 por defecto).
 *  - Cada respaldo y restauración queda en el registro de auditoría.
 *  - Respaldo automático cada BACKUP_INTERVALO_HORAS (24 por defecto) mientras la API corre.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

function cargarBetterSqlite() {
  try {
    return require('better-sqlite3');
  } catch (e) {
    return require(path.join(__dirname, '../backend/node_modules/better-sqlite3'));
  }
}

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'inventario.db');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(path.dirname(DB_PATH), 'backups');
const RETENCION = Math.max(1, Number(process.env.BACKUP_RETENCION) || 14);
const PREFIJO = 'inventario_';
const EXT_PLANA = '.db';
const EXT_CIFRADA = '.db.enc';
const CABECERA_CIFRADO = Buffer.from('TITBKP1'); // marca de formato

const claveCifrado = () => process.env.BACKUP_CLAVE || null;

function marcaDeTiempo(fecha = new Date()) {
  return fecha.toISOString().replace(/[:]/g, '-').replace(/\..+/, '');
}

function sha256Archivo(archivo) {
  return crypto.createHash('sha256').update(fs.readFileSync(archivo)).digest('hex');
}

// ---------- Cifrado AES-256-GCM (clave derivada con scrypt) ----------

function cifrar(bufferPlano, clave) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(clave, salt, 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const cifrado = Buffer.concat([cipher.update(bufferPlano), cipher.final()]);
  return Buffer.concat([CABECERA_CIFRADO, salt, iv, cipher.getAuthTag(), cifrado]);
}

function descifrar(bufferCifrado, clave) {
  if (!clave) throw new Error('El respaldo está cifrado: defina BACKUP_CLAVE para leerlo.');
  const h = CABECERA_CIFRADO.length;
  if (!bufferCifrado.subarray(0, h).equals(CABECERA_CIFRADO)) throw new Error('Formato de respaldo cifrado no reconocido.');
  const salt = bufferCifrado.subarray(h, h + 16);
  const iv = bufferCifrado.subarray(h + 16, h + 28);
  const tag = bufferCifrado.subarray(h + 28, h + 44);
  const datos = bufferCifrado.subarray(h + 44);
  const key = crypto.scryptSync(clave, salt, 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(datos), decipher.final()]);
  } catch (e) {
    throw new Error('No se pudo descifrar el respaldo: clave incorrecta o archivo alterado.');
  }
}

// ---------- Verificación ----------

function revisarIntegridadSqlite(archivoPlano) {
  const Database = cargarBetterSqlite();
  const db = new Database(archivoPlano, { readonly: true, fileMustExist: true });
  try {
    const integridad = db.pragma('integrity_check', { simple: true });
    const contar = (tabla) => {
      try { return db.prepare(`SELECT COUNT(*) AS n FROM ${tabla}`).get().n; } catch (e) { return null; }
    };
    return {
      integridad,
      activos: contar('activos'),
      historial: contar('historial'),
      usuarios: contar('usuarios')
    };
  } finally {
    db.close();
  }
}

/**
 * Verifica un respaldo: huella SHA-256, descifrado (si aplica) e integridad de SQLite.
 * Devuelve { ok, archivo, sha256_ok, integridad, activos, historial, usuarios, error? }
 */
function verificarRespaldo(archivo) {
  const resultado = { ok: false, archivo: path.basename(archivo) };
  let temporal = null;
  try {
    if (!fs.existsSync(archivo)) throw new Error('El archivo de respaldo no existe.');

    const archivoHuella = `${archivo}.sha256`;
    if (fs.existsSync(archivoHuella)) {
      const esperada = fs.readFileSync(archivoHuella, 'utf8').trim().split(/\s+/)[0];
      resultado.sha256_ok = esperada === sha256Archivo(archivo);
      if (!resultado.sha256_ok) throw new Error('La huella SHA-256 no coincide: el respaldo fue alterado o está dañado.');
    } else {
      resultado.sha256_ok = null;
    }

    let archivoPlano = archivo;
    if (archivo.endsWith(EXT_CIFRADA)) {
      temporal = path.join(os.tmpdir(), `tit-verificacion-${process.pid}-${Date.now()}.db`);
      fs.writeFileSync(temporal, descifrar(fs.readFileSync(archivo), claveCifrado()));
      archivoPlano = temporal;
    }

    Object.assign(resultado, revisarIntegridadSqlite(archivoPlano));
    if (resultado.integridad !== 'ok') throw new Error(`integrity_check devolvió: ${resultado.integridad}`);
    if (!resultado.activos && resultado.activos !== 0) throw new Error('El respaldo no contiene la tabla de activos.');
    resultado.ok = true;
  } catch (err) {
    resultado.error = err.message;
  } finally {
    if (temporal && fs.existsSync(temporal)) fs.unlinkSync(temporal);
  }
  return resultado;
}

// ---------- Auditoría (directo a la tabla, sin depender del backend) ----------

function auditar(db, accion, resultado, detalle) {
  try {
    db.prepare(`
      INSERT INTO auditoria (fecha, usuario, rol, ip, accion, metodo, ruta, estado_http, resultado, detalle)
      VALUES (?, 'sistema', NULL, NULL, ?, NULL, NULL, NULL, ?, ?)
    `).run(new Date().toISOString(), accion, resultado, String(detalle).slice(0, 500));
  } catch (e) {
    console.error('[RESPALDO] No se pudo auditar:', e.message);
  }
}

// ---------- Crear / listar / rotar ----------

function listarRespaldos() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith(PREFIJO) && (f.endsWith(EXT_CIFRADA) || f.endsWith(EXT_PLANA)))
    .map((f) => {
      const ruta = path.join(BACKUP_DIR, f);
      const st = fs.statSync(ruta);
      return { archivo: f, ruta, bytes: st.size, fecha: st.mtime.toISOString(), ms: st.mtimeMs, cifrado: f.endsWith(EXT_CIFRADA) };
    })
    // del más antiguo al más reciente (por fecha real de creación, no por nombre)
    .sort((a, b) => a.ms - b.ms || a.archivo.localeCompare(b.archivo))
    .map(({ ms, ...r }) => r);
}

function rotarRespaldos() {
  const lista = listarRespaldos();
  const sobrantes = lista.slice(0, Math.max(0, lista.length - RETENCION));
  for (const r of sobrantes) {
    fs.unlinkSync(r.ruta);
    if (fs.existsSync(`${r.ruta}.sha256`)) fs.unlinkSync(`${r.ruta}.sha256`);
  }
  return sobrantes.length;
}

/**
 * Crea un respaldo consistente, lo verifica, guarda su SHA-256 y aplica la rotación.
 * @param {object} [opciones]
 * @param {object} [opciones.db]     Conexión a usar (por defecto la de database.js)
 * @param {string} [opciones.motivo] Texto para la auditoría (manual, automático, pre-restauración)
 */
async function crearRespaldo({ db, motivo = 'manual' } = {}) {
  const conexion = db || require('./database');
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const base = `${PREFIJO}${marcaDeTiempo()}_${crypto.randomBytes(2).toString('hex')}`;
  const destinoPlano = path.join(BACKUP_DIR, `${base}${EXT_PLANA}`);
  const clave = claveCifrado();

  try {
    await conexion.backup(destinoPlano);

    let destino = destinoPlano;
    if (clave) {
      destino = path.join(BACKUP_DIR, `${base}${EXT_CIFRADA}`);
      fs.writeFileSync(destino, cifrar(fs.readFileSync(destinoPlano), clave));
      fs.unlinkSync(destinoPlano);
    }

    fs.writeFileSync(`${destino}.sha256`, `${sha256Archivo(destino)}  ${path.basename(destino)}\n`);

    const verificacion = verificarRespaldo(destino);
    if (!verificacion.ok) throw new Error(`El respaldo recién creado no pasó la verificación: ${verificacion.error}`);

    const eliminados = rotarRespaldos();
    auditar(conexion, 'RESPALDO_CREADO', 'OK',
      `${path.basename(destino)}; motivo=${motivo}; activos=${verificacion.activos}; cifrado=${!!clave}; rotados=${eliminados}`);

    return { ...verificacion, ruta: destino, cifrado: !!clave, rotados: eliminados };
  } catch (err) {
    auditar(conexion, 'RESPALDO_ERROR', 'ERROR', `motivo=${motivo}; ${err.message}`);
    throw err;
  }
}

// ---------- Restaurar ----------

/**
 * Restaura un respaldo sobre DB_PATH. EL SERVIDOR DEBE ESTAR DETENIDO.
 * Antes de sobrescribir, guarda un respaldo de seguridad del estado actual.
 */
async function restaurarRespaldo(archivo) {
  const ruta = path.isAbsolute(archivo) ? archivo : (fs.existsSync(archivo) ? path.resolve(archivo) : path.join(BACKUP_DIR, archivo));
  const verificacion = verificarRespaldo(ruta);
  if (!verificacion.ok) throw new Error(`Respaldo inválido, no se restaura: ${verificacion.error}`);

  const Database = cargarBetterSqlite();

  // 1. Respaldo de seguridad del estado actual (si existe una base)
  let respaldoPrevio = null;
  if (fs.existsSync(DB_PATH)) {
    const actual = new Database(DB_PATH);
    try {
      respaldoPrevio = await crearRespaldo({ db: actual, motivo: 'pre-restauración' });
      actual.pragma('wal_checkpoint(TRUNCATE)');
    } finally {
      actual.close();
    }
  }

  // 2. Reemplazar la base
  const contenido = ruta.endsWith(EXT_CIFRADA)
    ? descifrar(fs.readFileSync(ruta), claveCifrado())
    : fs.readFileSync(ruta);
  for (const f of [`${DB_PATH}-wal`, `${DB_PATH}-shm`]) if (fs.existsSync(f)) fs.unlinkSync(f);
  fs.writeFileSync(DB_PATH, contenido);

  // 3. Dejar constancia en la base restaurada
  const restaurada = new Database(DB_PATH);
  try {
    auditar(restaurada, 'RESPALDO_RESTAURADO', 'OK',
      `${path.basename(ruta)}; respaldo previo=${respaldoPrevio ? path.basename(respaldoPrevio.ruta) : 'ninguno'}`);
  } finally {
    restaurada.close();
  }

  return { restaurado: path.basename(ruta), respaldo_previo: respaldoPrevio ? respaldoPrevio.ruta : null, ...verificacion };
}

// ---------- Respaldo automático ----------

let temporizador = null;

/**
 * Programa respaldos periódicos mientras la API está corriendo.
 * BACKUP_AUTO=false lo desactiva. Si el último respaldo es más antiguo que el intervalo,
 * respalda de inmediato al iniciar.
 */
function iniciarRespaldoAutomatico() {
  if (process.env.BACKUP_AUTO === 'false' || process.env.NODE_ENV === 'test') return null;
  const horas = Number(process.env.BACKUP_INTERVALO_HORAS) || 24;
  const intervaloMs = horas * 60 * 60 * 1000;

  const ejecutar = () => crearRespaldo({ motivo: 'automático' })
    .then((r) => console.log(`[RESPALDO] Respaldo automático creado y verificado: ${path.basename(r.ruta)}`))
    .catch((e) => console.error('[RESPALDO] Falló el respaldo automático:', e.message));

  const ultimo = listarRespaldos().pop();
  if (!ultimo || Date.now() - new Date(ultimo.fecha).getTime() >= intervaloMs) ejecutar();

  temporizador = setInterval(ejecutar, intervaloMs);
  temporizador.unref();
  console.log(`[RESPALDO] Respaldo automático cada ${horas} h en ${BACKUP_DIR} (se conservan ${RETENCION}).`);
  return temporizador;
}

module.exports = {
  crearRespaldo,
  verificarRespaldo,
  restaurarRespaldo,
  listarRespaldos,
  iniciarRespaldoAutomatico,
  BACKUP_DIR
};

// ---------- Línea de comandos ----------

if (require.main === module) {
  const [comando = 'crear', archivo] = process.argv.slice(2);
  const salir = (codigo) => process.exit(codigo);

  (async () => {
    try {
      if (comando === 'crear') {
        const r = await crearRespaldo({ motivo: 'manual (npm run backup)' });
        console.log(`✔ Respaldo creado y verificado: ${r.ruta}`);
        console.log(`  integridad=${r.integridad}  activos=${r.activos}  historial=${r.historial}  cifrado=${r.cifrado ? 'sí' : 'no'}`);
      } else if (comando === 'listar') {
        const lista = listarRespaldos();
        if (!lista.length) console.log(`No hay respaldos en ${BACKUP_DIR}`);
        for (const r of lista) {
          const v = verificarRespaldo(r.ruta);
          console.log(`${v.ok ? '✔' : '✘'} ${r.archivo}  ${(r.bytes / 1024).toFixed(0)} KB  ${v.ok ? `activos=${v.activos}` : v.error}`);
        }
      } else if (comando === 'verificar') {
        if (!archivo) throw new Error('Indique el archivo: npm run backup:verificar -- <archivo>');
        const ruta = fs.existsSync(archivo) ? archivo : path.join(BACKUP_DIR, archivo);
        const v = verificarRespaldo(ruta);
        console.log(v.ok ? `✔ Respaldo válido (${JSON.stringify(v)})` : `✘ Respaldo inválido: ${v.error}`);
        salir(v.ok ? 0 : 1);
      } else if (comando === 'restaurar') {
        if (!archivo) throw new Error('Indique el archivo: npm run backup:restaurar -- <archivo>');
        const r = await restaurarRespaldo(archivo);
        console.log(`✔ Base restaurada desde ${r.restaurado} (activos=${r.activos}).`);
        if (r.respaldo_previo) console.log(`  El estado anterior se guardó en: ${r.respaldo_previo}`);
      } else {
        throw new Error(`Comando desconocido '${comando}'. Use: crear | listar | verificar <archivo> | restaurar <archivo>`);
      }
      salir(0);
    } catch (err) {
      console.error(`✘ ${err.message}`);
      salir(1);
    }
  })();
}
