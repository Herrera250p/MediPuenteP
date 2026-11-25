// Configuración de la sesión y del administrador inicial.
// Después de cambiar algo: detén el servidor (Ctrl+C) y vuelve a correr  npm start
module.exports = {
  // Dónde guarda el servidor las sesiones:
  //  'mysql'   → en la tabla sessions de la base de datos (sobreviven a un reinicio).
  //  'memoria' → en la memoria del servidor (se pierden al reiniciar).
  almacen: 'mysql',

  // Cuánto dura la sesión, en milisegundos. 8 horas = 8 * 60 * 60 * 1000
  maxAgeMs: 8 * 60 * 60 * 1000,

  // true: cada petición reinicia el reloj (la sesión vence por inactividad).
  // false: vence a la hora fija, aunque la persona siga usando la página.
  rolling: false,

  // true: el JavaScript de la página NO puede leer la cookie (protege contra XSS).
  httpOnly: true,

  // 'lax': la cookie no viaja en peticiones POST que vienen de otros sitios (protege contra CSRF).
  sameSite: 'lax',

  // En localhost se usa HTTP; en un servidor real (HTTPS) pon NODE_ENV=production y la cookie viajará solo por HTTPS.
  secure: process.env.NODE_ENV === 'production',

  // true: al iniciar sesión el servidor cambia el id de la sesión (protege contra la fijación de sesión).
  regenerarAlEntrar: true,

  // Administrador que ya existe desde el primer arranque (la contraseña se guarda cifrada con bcrypt).
  adminInicial: {
    nombre: 'Daniel Gomez',
    identificador: 'EKGF123',
    contrasena: 'admin12345'
  }
};
