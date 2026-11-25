function parseLoginDto(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { data: null, errors: [{ campo: 'body', mensaje: 'El cuerpo de la solicitud debe ser un objeto.' }] };
  }

  const username = typeof input.username === 'string' ? input.username.trim() : '';
  const password = input.password;

  if (!username || username.length > 100) {
    errors.push({ campo: 'username', mensaje: 'Ingrese un usuario válido (máximo 100 caracteres).' });
  }
  if (typeof password !== 'string' || password.length === 0 || password.length > 200) {
    errors.push({ campo: 'password', mensaje: 'Ingrese una contraseña válida (máximo 200 caracteres).' });
  }

  return {
    data: errors.length ? null : { username, password },
    errors
  };
}

module.exports = { parseLoginDto };
