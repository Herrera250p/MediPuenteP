// Consultas a la tabla clinica.
const bcrypt = require('bcryptjs');

function crearModeloClinicas(pool) {
  async function verificar(nombreClinica, contrasena) {
    if (typeof nombreClinica !== 'string' || typeof contrasena !== 'string') return null;
    const [filas] = await pool.execute(
      'SELECT id_clinica, nombre_clinica, contrasena FROM clinica WHERE nombre_clinica = ? LIMIT 1',
      [nombreClinica]
    );
    const fila = filas[0];
    if (!fila || !(await bcrypt.compare(contrasena, fila.contrasena))) return null;
    return { id: fila.id_clinica, rol: 'clinica', nombre: fila.nombre_clinica };
  }

  // Regresa 'creada' ya hay una clínica con ese nombre o CLUES
  async function registrar({ nombre, direccion, clues, contrasena }) {
    const [existe] = await pool.query(
      'SELECT 1 FROM clinica WHERE nombre_clinica = ? OR clues = ?', [nombre, clues]
    );
    if (existe.length) return 'existe';
    const hash = await bcrypt.hash(contrasena, 10);
    await pool.query(
      'INSERT INTO clinica (nombre_clinica, direccion, clues, contrasena) VALUES (?, ?, ?, ?)',
      [nombre, direccion, clues, hash]
    );
    return 'creada';
  }

  return { verificar, registrar };
}

module.exports = { crearModeloClinicas };
