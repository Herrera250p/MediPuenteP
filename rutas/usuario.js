const express = require('express');
const { requiereSesion, requiereRol, ah } = require('../middleware/sesion');
const { procesarFormulario, formatear } = require('../utils/formularios');

function crearRutas(pool) {
  const router = express.Router();
  router.use(requiereSesion, requiereRol('usuario'));

  const jsonOExtra = (extra) => (Object.keys(extra).length ? JSON.stringify(extra) : null);

  router.get('/padecimientos', ah(async (req, res) => {
    const [rows] = await pool.query(
      'SELECT nombre FROM catalogo_padecimiento ORDER BY nombre'
    );
    res.json(rows.map((fila) => fila.nombre));
  }));

  // ---------- SOLICITAR MEDICAMENTO ----------
  router.post('/solicitudes', ah(async (req, res) => {
    const { errores, columnas, extra } = await procesarFormulario(pool, 'solicitud', req.body);
    if (errores.length) return res.status(400).json({ error: 'Solicitud no válida', detalles: errores });

    const [r] = await pool.query(
      `INSERT INTO solicitud_medicamento (usuario_id, medicamento, padecimiento, datos_extra)
       VALUES (?, ?, ?, ?)`,
      [req.session.usuario.id, columnas.medicamento, columnas.padecimiento ?? null, jsonOExtra(extra)]
    );
    res.status(201).json({ mensaje: 'Solicitud exitosa', id_solicitud: r.insertId });
  }));

  // ---------- CONSULTAR MIS SOLICITUDES ----------
  router.get('/solicitudes', ah(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT id_solicitud, medicamento, estado, fecha_solicitud
         FROM solicitud_medicamento
        WHERE usuario_id = ?
        ORDER BY fecha_solicitud DESC, id_solicitud DESC`,
      [req.session.usuario.id]
    );
    res.json(rows);
  }));

  // ---------- CONSULTAR ESTADO DE UNA SOLICITUD ----------
  router.get('/solicitudes/:id', ah(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT id_solicitud, medicamento, padecimiento, datos_extra, estado,
              fecha_solicitud, fecha_actualizacion
         FROM solicitud_medicamento
        WHERE id_solicitud = ? AND usuario_id = ?`,
      [req.params.id, req.session.usuario.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json(formatear(rows[0]));
  }));

  // ---------- DONAR MEDICAMENTO ----------
  router.post('/donaciones', ah(async (req, res) => {
    const { errores, columnas, extra } = await procesarFormulario(pool, 'donacion', req.body);
    if (errores.length) return res.status(400).json({ error: 'Donación no válida', detalles: errores });

    const [r] = await pool.query(
      `INSERT INTO donacion_medicamento
         (usuario_id, medicamento, fecha_caducidad, cantidad, datos_extra)
       VALUES (?, ?, ?, ?, ?)`,
      [req.session.usuario.id, columnas.medicamento, columnas.fecha_caducidad, columnas.cantidad ?? 1, jsonOExtra(extra)]
    );
    res.status(201).json({ mensaje: 'Solicitud de donación exitosa', id_donacion: r.insertId });
  }));

  router.get('/donaciones', ah(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT id_donacion, medicamento, fecha_caducidad, cantidad, estado, fecha_donacion
         FROM donacion_medicamento
        WHERE usuario_id = ?
        ORDER BY fecha_donacion DESC, id_donacion DESC`,
      [req.session.usuario.id]
    );
    res.json(rows);
  }));

  router.get('/donaciones/:id', ah(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT id_donacion, medicamento, fecha_caducidad, cantidad, datos_extra, estado,
              fecha_donacion, fecha_actualizacion
         FROM donacion_medicamento
        WHERE id_donacion = ? AND usuario_id = ?`,
      [req.params.id, req.session.usuario.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Donación no encontrada' });
    res.json(formatear(rows[0]));
  }));

  return router;
}

module.exports = { crearRutas };

