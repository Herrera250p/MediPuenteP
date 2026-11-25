const express = require('express');
const { requiereSesion, requiereRol, ah } = require('../middleware/sesion');
const { crearRutasRevision } = require('./revision');
const { formatear } = require('../utils/formularios');

function crearRutas(pool) {
  const router = express.Router();
  router.use(requiereSesion, requiereRol('clinica'));

  // Consultar solicitudes / estado / aceptar o rechazar
  router.use(crearRutasRevision(pool, {
    recurso: 'solicitudes',
    tabla: 'solicitud_medicamento',
    idCol: 'id_solicitud',
    fechaCol: 'fecha_solicitud',
    revisorCol: 'clinica_id'
  }));

  // Buscar usuarios (opcional: ?q=texto)
  router.get('/usuarios', ah(async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const [rows] = await pool.query(
      `SELECT id_usuario, nombre_usuario
         FROM usuario
        WHERE nombre_usuario LIKE ?
        ORDER BY nombre_usuario
        LIMIT 50`,
      [`%${q}%`]
    );
    res.json(rows);
  }));

  // Información de un usuario, con sus solicitudes y donaciones
  router.get('/usuarios/:id', ah(async (req, res) => {
    const [usuarios] = await pool.query(
      'SELECT id_usuario, nombre_usuario FROM usuario WHERE id_usuario = ?',
      [req.params.id]
    );
    if (!usuarios.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    const [solicitudes] = await pool.query(
      `SELECT id_solicitud, medicamento, padecimiento, datos_extra, estado, fecha_solicitud
         FROM solicitud_medicamento WHERE usuario_id = ? ORDER BY fecha_solicitud DESC`,
      [req.params.id]
    );
    const [donaciones] = await pool.query(
      `SELECT id_donacion, medicamento, fecha_caducidad, cantidad, datos_extra, estado, fecha_donacion
         FROM donacion_medicamento WHERE usuario_id = ? ORDER BY fecha_donacion DESC`,
      [req.params.id]
    );
    res.json({
      ...usuarios[0],
      solicitudes: solicitudes.map(formatear),
      donaciones: donaciones.map(formatear)
    });
  }));

  return router;
}

module.exports = { crearRutas };

