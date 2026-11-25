// Consultas a la tabla administrador.
const bcrypt = require('bcryptjs');

function crearModeloAdministradores(pool) {
  // El administrador entra con nombre completo + identificador + contraseña.
  async function verificar(nombre, identificador, contrasena) {
    if (typeof nombre !== 'string' || typeof identificador !== 'string' || typeof contrasena !== 'string') return null;
    const [filas] = await pool.execute(
      'SELECT id_admin, nombre, contrasena FROM administrador WHERE identificador = ? AND nombre = ? LIMIT 1',
      [identificador, nombre]
    );
    const fila = filas[0];
    if (!fila || !(await bcrypt.compare(contrasena, fila.contrasena))) return null;
    return { id: fila.id_admin, rol: 'administrador', nombre: fila.nombre };
  }

  // Regresa 'creado' o 'existe' (el identificador ya está en uso).
  async function crear({ nombre, identificador, contrasena }) {
    const [existe] = await pool.query('SELECT 1 FROM administrador WHERE identificador = ?', [identificador]);
    if (existe.length) return 'existe';
    const hash = await bcrypt.hash(contrasena, 10);
    await pool.query(
      'INSERT INTO administrador (nombre, contrasena, identificador) VALUES (?, ?, ?)',
      [nombre, hash, identificador]
    );
    return 'creado';
  }

  // Deja creado al administrador inicial (config.js > adminInicial) si todavía no existe.
  // Se llama al arrancar el servidor, así el primer inicio de sesión como admin ya funciona.
  async function asegurarInicial(adminInicial) {
    if (!adminInicial) return 'sin-configurar';
    return crear(adminInicial);
  }

  return { verificar, crear, asegurarInicial };
}

module.exports = { crearModeloAdministradores };
