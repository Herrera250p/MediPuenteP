// Consultas a la tabla usuario. Siempre con ? (consulta parametrizada), nunca pegando texto en el SQL.
const bcrypt = require('bcryptjs');

function crearModeloUsuarios(pool) {
  // Regresa { id, rol, nombre } si la contraseña es correcta, o null si no.
  async function verificar(nombreUsuario, contrasena) {
    if (typeof nombreUsuario !== 'string' || typeof contrasena !== 'string') return null;
    const [filas] = await pool.execute(
      'SELECT id_usuario, nombre_usuario, contrasena FROM usuario WHERE nombre_usuario = ? LIMIT 1',
      [nombreUsuario]
    );
    const fila = filas[0];
    if (!fila || !(await bcrypt.compare(contrasena, fila.contrasena))) return null;
    return { id: fila.id_usuario, rol: 'usuario', nombre: fila.nombre_usuario };
  }

  // Regresa 'creado' o 'existe' (el nombre de usuario ya está en uso).
  async function registrar({ nombre, contacto, contrasena }) {
    const [existe] = await pool.query('SELECT 1 FROM usuario WHERE nombre_usuario = ?', [nombre]);
    if (existe.length) return 'existe';
    const hash = await bcrypt.hash(contrasena, 10);
    await pool.query(
      'INSERT INTO usuario (nombre_usuario, contrasena, contacto) VALUES (?, ?, ?)',
      [nombre, hash, contacto]
    );
    return 'creado';
  }

  return { verificar, registrar };
}

module.exports = { crearModeloUsuarios };
