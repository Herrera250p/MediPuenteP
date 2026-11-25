const express = require('express');
const { ah } = require('../middleware/sesion');
const { formatear } = require('../utils/formularios');

const ESTADOS = ['pendiente', 'aceptada', 'rechazada'];

// Fábrica de rutas para revisar (listar, ver, aceptar/rechazar) solicitudes o donaciones.
// La usan la clínica (solo solicitudes) y el administrador (solicitudes y donaciones).
//
//   recurso:    nombre en la URL ('solicitudes' | 'donaciones')
//   tabla:      tabla de MySQL
//   idCol:      columna llave primaria
//   fechaCol:   columna de fecha de creación
//   revisorCol: columna donde se guarda quién revisó ('clinica_id' | 'administrador_id')
function crearRutasRevision(pool, { recurso, tabla, idCol, fechaCol, revisorCol }) {
  const router = express.Router();

  // Consultar solicitudes (opcional: ?estado=pendiente|aceptada|rechazada)
  router.get(`/${recurso}`, ah(async (req, res) => {
    const { estado } = req.query;
    if (estado !== undefined && !ESTADOS.includes(estado)) {
      return res.status(400).json({ error: `El estado debe ser: ${ESTADOS.join(', ')}` });
    }
    const filtro = estado ? 'WHERE t.estado = ?' : '';
    const [rows] = await pool.query(
      `SELECT t.*, u.nombre_usuario
         FROM ${tabla} t
         JOIN usuario u ON u.id_usuario = t.usuario_id
         ${filtro}
        ORDER BY t.${fechaCol} DESC, t.${idCol} DESC
        LIMIT 200`,
      estado ? [estado] : []
    );
    res.json(rows.map(formatear));
  }));

  // Ver el detalle y el estado de una
  router.get(`/${recurso}/:id`, ah(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT t.*, u.nombre_usuario, u.contacto
         FROM ${tabla} t
         JOIN usuario u ON u.id_usuario = t.usuario_id
        WHERE t.${idCol} = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrada' });
    res.json(formatear(rows[0]));
  }));

  // Aceptar o rechazar (solo si sigue pendiente)
  router.patch(`/${recurso}/:id/estado`, ah(async (req, res) => {
    const { estado } = req.body;
    if (!['aceptada', 'rechazada'].includes(estado)) {
      return res.status(400).json({ error: 'El estado debe ser "aceptada" o "rechazada"' });
    }
    const [r] = await pool.query(
      `UPDATE ${tabla} SET estado = ?, ${revisorCol} = ?
        WHERE ${idCol} = ? AND estado = 'pendiente'`,
      [estado, req.session.usuario.id, req.params.id]
    );
    if (r.affectedRows === 0) {
      const [existe] = await pool.query(`SELECT estado FROM ${tabla} WHERE ${idCol} = ?`, [req.params.id]);
      if (!existe.length) return res.status(404).json({ error: 'No encontrada' });
      return res.status(409).json({ error: `Ya fue ${existe[0].estado}; solo se pueden revisar las pendientes` });
    }
    res.json({ mensaje: estado === 'aceptada' ? 'Solicitud aprobada' : 'Solicitud rechazada', estado });
  }));

  return router;
}

module.exports = { crearRutasRevision };
