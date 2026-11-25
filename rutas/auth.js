const express = require('express');
const { ah, requiereSesion } = require('../middleware/sesion');
const { crearModeloUsuarios } = require('../modelos/usuarios.modelo');
const { crearModeloClinicas } = require('../modelos/clinicas.modelo');
const { crearModeloAdministradores } = require('../modelos/administradores.modelo');

const CLUES_REGEX = /^[A-Za-z0-9]{11}$/; // la CLUES oficial tiene 11 caracteres
const ERROR_LOGIN = { error: 'Datos incorrectos' };

const texto = (v) => (typeof v === 'string' ? v.trim() : '');
const validarContrasena = (c) => typeof c === 'string' && c.length >= 6 && c.length <= 72; // 72 = límite de bcrypt

function crearRutas(pool) {
  const router = express.Router();
  const usuarios = crearModeloUsuarios(pool);
  const clinicas = crearModeloClinicas(pool);
  const administradores = crearModeloAdministradores(pool);

  // Guarda en la sesión quién es la persona. Con regenerarAlEntrar se cambia antes el id de la
  // sesión, así una sesión "plantada" por otra persona (fijación de sesión) no sirve.
  function iniciarSesion(req, res, next, datos) {
    const guardar = () => {
      const ahora = Date.now();
      req.session.usuario = datos; // { id, rol, nombre }
      req.session.creada = ahora;
      req.session.ultimoUso = ahora;
      req.session.save((error) => {
        if (error) return next(error);
        return res.json({ mensaje: 'Inicio de sesión exitoso', rol: datos.rol, nombre: datos.nombre });
      });
    };
    if (req.app.locals.config.regenerarAlEntrar ?? true) {
      return req.session.regenerate((error) => (error ? next(error) : guardar()));
    }
    return guardar();
  }

  // ---------- REGISTRO ----------

  router.post('/registro/usuario', ah(async (req, res) => {
    const nombre = texto(req.body.nombre_usuario);
    const contacto = texto(req.body.contacto) || null;
    const { contrasena } = req.body;

    if (!nombre || nombre.length > 45) {
      return res.status(400).json({ error: 'El nombre de usuario es obligatorio (máx. 45 caracteres)' });
    }
    if (contacto && contacto.length > 45) {
      return res.status(400).json({ error: 'El contacto es demasiado largo (máx. 45 caracteres)' });
    }
    if (!validarContrasena(contrasena)) {
      return res.status(400).json({ error: 'La contraseña debe tener entre 6 y 72 caracteres' });
    }
    const r = await usuarios.registrar({ nombre, contacto, contrasena });
    if (r === 'existe') return res.status(409).json({ error: 'Ese nombre de usuario ya está en uso' });
    res.status(201).json({ mensaje: 'Cuenta creada correctamente' });
  }));

  router.post('/registro/clinica', ah(async (req, res) => {
    const nombre = texto(req.body.nombre_clinica);
    const direccion = texto(req.body.direccion);
    const clues = texto(req.body.clues).toUpperCase();
    const { contrasena } = req.body;

    if (!nombre || nombre.length > 100) {
      return res.status(400).json({ error: 'El nombre de la clínica es obligatorio (máx. 100 caracteres)' });
    }
    if (/\p{N}/u.test(nombre)) {
      return res.status(400).json({ error: 'El nombre de la clínica no puede contener números' });
    }
    if (!direccion || direccion.length > 255) {
      return res.status(400).json({ error: 'La dirección es obligatoria (máx. 255 caracteres)' });
    }
    if (!CLUES_REGEX.test(clues)) {
      return res.status(400).json({ error: 'La CLUES debe tener 11 caracteres alfanuméricos' });
    }
    if (!validarContrasena(contrasena)) {
      return res.status(400).json({ error: 'La contraseña debe tener entre 6 y 72 caracteres' });
    }
    const r = await clinicas.registrar({ nombre, direccion, clues, contrasena });
    if (r === 'existe') return res.status(409).json({ error: 'Ya existe una clínica con ese nombre o CLUES' });
    res.status(201).json({ mensaje: 'Cuenta registrada correctamente' });
  }));

  // ---------- INICIO DE SESIÓN ----------

  // Usuario: nombre_usuario + contrasena
  router.post('/login/usuario', ah(async (req, res, next) => {
    const datos = await usuarios.verificar(texto(req.body.nombre_usuario), req.body.contrasena);
    if (!datos) return res.status(401).json(ERROR_LOGIN);
    iniciarSesion(req, res, next, datos);
  }));

  // Clínica: nombre_clinica + contrasena
  router.post('/login/clinica', ah(async (req, res, next) => {
    const datos = await clinicas.verificar(texto(req.body.nombre_clinica), req.body.contrasena);
    if (!datos) return res.status(401).json(ERROR_LOGIN);
    iniciarSesion(req, res, next, datos);
  }));

  // Administrador: nombre completo + identificador + contrasena
  router.post('/login/administrador', ah(async (req, res, next) => {
    const datos = await administradores.verificar(
      texto(req.body.nombre), texto(req.body.identificador), req.body.contrasena
    );
    if (!datos) return res.status(401).json(ERROR_LOGIN);
    iniciarSesion(req, res, next, datos);
  }));

  // Quién tiene la sesión abierta (la página lo usa para saber si la cookie sigue vigente)
  router.get('/sesion', (req, res) => {
    requiereSesion(req, res, () => res.json(req.session.usuario));
  });

  // Cerrar sesión: destruye la sesión en el servidor, así una cookie copiada deja de servir
  router.post('/logout', (req, res, next) => {
    req.session.destroy((error) => {
      if (error) return next(error);
      req.app.locals.borrarCookie(res);
      return res.json({ mensaje: 'Sesión cerrada' });
    });
  });

  return router;
}

module.exports = { crearRutas };
