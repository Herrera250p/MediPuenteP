// Protección de rutas con sesión (express-session). Las opciones salen de config.js
// (app.js las deja en app.locals.config y la función para borrar la cookie en app.locals.borrarCookie).

// Para no repetir try/catch en cada ruta async
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// El servidor decide cuándo vence una sesión, no solo el navegador:
// express-session alarga la cookie en cada petición, así que alguien con una cookie copiada la mantendría viva para siempre.
function vencida(sesion, config) {
  const desde = config.rolling ? sesion.ultimoUso : sesion.creada;
  return !desde || Date.now() - desde > config.maxAgeMs;
}

// 401: "no sé quién eres" (no hay sesión o ya venció).
function requiereSesion(req, res, next) {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ error: 'Debes iniciar sesión' });
  }
  const { config, borrarCookie } = req.app.locals;
  if (vencida(req.session, config)) {
    return req.session.destroy((error) => {
      if (error) return next(error);
      borrarCookie(res);
      return res.status(401).json({ error: 'Tu sesión expiró; vuelve a iniciar sesión' });
    });
  }
  req.session.ultimoUso = Date.now();
  return next();
}

// 403: "sé quién eres, pero no tienes permiso". Úsalo siempre DESPUÉS de requiereSesion.
// requiereRol('usuario'), requiereRol('clinica', 'administrador'), ...
function requiereRol(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.session.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para realizar esta acción' });
    }
    return next();
  };
}

module.exports = { ah, vencida, requiereSesion, requiereRol };
