/**
 * password.js - Política y hash de contraseñas (bcryptjs)
 * Responsable: Alfredo
 */

const { bcrypt, BCRYPT_COSTO } = require('../../db/database');

const LARGO_MINIMO = 8;
const LARGO_MAXIMO = 72; // bcrypt solo considera los primeros 72 bytes

// Hash de referencia para comparar cuando el usuario no existe: así la respuesta tarda lo
// mismo y no se puede averiguar qué nombres de usuario existen midiendo tiempos.
const HASH_FICTICIO = bcrypt.hashSync('usuario-inexistente', BCRYPT_COSTO);

/**
 * Devuelve null si la contraseña cumple la política; si no, el mensaje de error.
 * Política: 8 a 72 caracteres, al menos una letra y un número.
 */
function validarPassword(password) {
  if (typeof password !== 'string') return 'La contraseña es obligatoria.';
  if (password.length < LARGO_MINIMO) return `La contraseña debe tener al menos ${LARGO_MINIMO} caracteres.`;
  if (Buffer.byteLength(password, 'utf8') > LARGO_MAXIMO) return `La contraseña no puede superar ${LARGO_MAXIMO} bytes.`;
  if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(password) || !/\d/.test(password)) {
    return 'La contraseña debe contener al menos una letra y un número.';
  }
  return null;
}

const hashPassword = (password) => bcrypt.hashSync(password, BCRYPT_COSTO);

function compararPassword(password, hash) {
  if (typeof password !== 'string') return false;
  return bcrypt.compareSync(password, hash || HASH_FICTICIO);
}

module.exports = { validarPassword, hashPassword, compararPassword, LARGO_MINIMO };
