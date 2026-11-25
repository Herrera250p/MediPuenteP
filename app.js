// La aplicación de MediPuente. server.js la arranca; las pruebas la arrancan con otras configuraciones.
// Sigue la estructura de la demo de sesiones: crearApp(config, pool), sesión con cookie en MySQL,
// modelos/ para las consultas y middlewares requiereSesion (401) y requiereRol (403).
const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const NOMBRE_COOKIE = 'connect.sid';

function crearApp(config, pool) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  // Aquí vive lo que el servidor recuerda de cada sesión:
  //  - 'mysql':   en la tabla sessions. Sobrevive a un reinicio.
  //  - 'memoria': en la memoria del proceso. Si el servidor se reinicia, se pierde todo.
  const almacen = config.almacen === 'memoria'
    ? new session.MemoryStore()
    : new MySQLStore({ createDatabaseTable: false, clearExpired: true, checkExpirationInterval: 15 * 60 * 1000 }, pool);
  app.locals.almacen = almacen;

  const maxAgeMs = config.maxAgeMs || 1000 * 60 * 60 * 8;
  const httpOnly = config.httpOnly ?? true;
  const sameSite = config.sameSite || 'lax';
  const secure = config.secure || false;

  app.locals.config = { ...config, maxAgeMs, rolling: config.rolling ?? false };
  app.locals.borrarCookie = (res) => res.clearCookie(NOMBRE_COOKIE, { httpOnly, sameSite, secure });

  if (secure) app.set('trust proxy', 1); // detrás de un proxy HTTPS (Render, etc.)

  app.use(session({
    name: NOMBRE_COOKIE,
    store: almacen,
    secret: process.env.SESSION_SECRET || 'secreto-solo-para-desarrollo',
    resave: false,
    saveUninitialized: false, // no se crea sesión (ni cookie) hasta que haya algo que guardar
    rolling: config.rolling ?? false,
    cookie: { maxAge: maxAgeMs, httpOnly, sameSite, secure }
  }));

  app.get('/api/health', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ estado: 'ok', baseDeDatos: 'conectada' });
    } catch {
      res.status(500).json({ estado: 'error', baseDeDatos: 'sin conexión' });
    }
  });

  app.use('/api/auth', require('./rutas/auth').crearRutas(pool));
  app.use('/api/plantillas', require('./rutas/plantillas').crearRutas(pool));
  app.use('/api/usuario', require('./rutas/usuario').crearRutas(pool));
  app.use('/api/clinica', require('./rutas/clinica').crearRutas(pool));
  app.use('/api/admin', require('./rutas/admin').crearRutas(pool));

  // Página web (carpeta /public)
  app.use(express.static(path.join(__dirname, 'public')));

  app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

  // Manejo de errores
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}

module.exports = { crearApp, NOMBRE_COOKIE };
