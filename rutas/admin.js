const express = require('express');
const { requiereSesion, requiereRol, ah } = require('../middleware/sesion');
const { crearRutasRevision } = require('./revision');
const { crearModeloAdministradores } = require('../modelos/administradores.modelo');

function crearRutas(pool) {
  const router = express.Router();
  router.use(requiereSesion, requiereRol('administrador'));

  // Dar seguimiento a solicitudes de medicamento
  router.use(crearRutasRevision(pool, {
    recurso: 'solicitudes',
    tabla: 'solicitud_medicamento',
    idCol: 'id_solicitud',
    fechaCol: 'fecha_solicitud',
    revisorCol: 'administrador_id'
  }));

  // Dar seguimiento a solicitudes de donación
  router.use(crearRutasRevision(pool, {
    recurso: 'donaciones',
    tabla: 'donacion_medicamento',
    idCol: 'id_donacion',
    fechaCol: 'fecha_donacion',
    revisorCol: 'administrador_id'
  }));

  // Crear otra cuenta de administrador (la primera, Daniel Gomez, ya viene creada: ver config.js)
  const administradores = crearModeloAdministradores(pool);
  router.post('/administradores', ah(async (req, res) => {
    const nombre = typeof req.body.nombre === 'string' ? req.body.nombre.trim() : '';
    const identificador = typeof req.body.identificador === 'string' ? req.body.identificador.trim() : '';
    const { contrasena } = req.body;

    if (!nombre || nombre.length > 100) {
      return res.status(400).json({ error: 'El nombre completo es obligatorio (máx. 100 caracteres)' });
    }
    if (!identificador || identificador.length > 20) {
      return res.status(400).json({ error: 'El identificador es obligatorio (máx. 20 caracteres)' });
    }
    if (typeof contrasena !== 'string' || contrasena.length < 6 || contrasena.length > 72) {
      return res.status(400).json({ error: 'La contraseña debe tener entre 6 y 72 caracteres' });
    }
    const r = await administradores.crear({ nombre, identificador, contrasena });
    if (r === 'existe') return res.status(409).json({ error: 'Ese identificador ya está en uso' });
    res.status(201).json({ mensaje: 'Cuenta creada correctamente' });
  }));

  return router;
}

module.exports = { crearRutas };

