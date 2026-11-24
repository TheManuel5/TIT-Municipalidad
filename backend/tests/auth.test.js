const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { usarBaseTemporal, iniciarServidor } = require('./helpers');

usarBaseTemporal();
const db = require('../../db/database');
const app = require('../server');

let api;

before(async () => {
  api = await iniciarServidor(app);
});

after(async () => {
  if (api) await api.cerrar();
});

test('mantiene los tres usuarios predeterminados con contraseñas bcrypt', async () => {
  const usuarios = db.prepare('SELECT username, password FROM usuarios ORDER BY id').all();
  assert.deepEqual(usuarios.map((usuario) => usuario.username), ['admin', 'jefe_dideco', 'auditor']);
  for (const usuario of usuarios) {
    assert.match(usuario.password, /^\$2[aby]\$\d{2}\$/);
    assert.equal(await bcrypt.compare('password123', usuario.password), true);
  }

  const login = await api.request('POST', '/auth/login', {
    body: { username: 'admin', password: 'password123', rol: 'admin_ti' }
  });
  assert.equal(login.status, 200);
  assert.deepEqual(Object.keys(login.body.data.user).sort(), ['id', 'nombre', 'rol', 'unidad', 'username']);
});

test('migra una contraseña heredada a bcrypt tras un inicio válido', async () => {
  db.prepare("UPDATE usuarios SET password = 'legacy-password' WHERE username = 'admin'").run();

  const login = await api.request('POST', '/auth/login', {
    body: { username: 'admin', password: 'legacy-password' }
  });
  assert.equal(login.status, 200);

  const storedPassword = db.prepare('SELECT password FROM usuarios WHERE username = ?').get('admin').password;
  assert.match(storedPassword, /^\$2[aby]\$\d{2}\$/);
  assert.equal(await bcrypt.compare('legacy-password', storedPassword), true);
});

test('rechaza credenciales incorrectas y datos de login mal formados', async () => {
  const hashBefore = db.prepare('SELECT password FROM usuarios WHERE username = ?').get('admin').password;
  const invalidPassword = await api.request('POST', '/auth/login', {
    body: { username: 'admin', password: 'incorrecta' }
  });
  assert.equal(invalidPassword.status, 401);
  assert.equal(db.prepare('SELECT password FROM usuarios WHERE username = ?').get('admin').password, hashBefore);

  const invalidDto = await api.request('POST', '/auth/login', {
    body: { username: ['admin'], password: 'password123' }
  });
  assert.equal(invalidDto.status, 400);
});
