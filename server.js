const { crearApp } = require('./app');
const { crearPool } = require('./db');
const { crearModeloAdministradores } = require('./modelos/administradores.modelo');
const config = require('./config');

const PUERTO = Number(process.env.PORT || 3000);
const pool = crearPool();

function escuchar(app, puerto, intentos, alIniciar) {
  const servidor = app.listen(puerto, () => {
    alIniciar(servidor.address().port);
  });

  servidor.once('error', (error) => {
    if (error.code === 'EADDRINUSE' && intentos > 0) {
      console.warn(`El puerto ${puerto} está ocupado; intentando el ${puerto + 1}.`);
      escuchar(app, puerto + 1, intentos - 1, alIniciar);
      return;
    }

    if (error.code === 'EADDRINUSE') {
      console.error(`No se pudo iniciar: los puertos desde ${PUERTO} están ocupados.`);
      console.error('Cierra el proceso que los usa o configura otro puerto en .env (PORT=3001).');
    } else {
      console.error('No se pudo iniciar el servidor:', error);
    }
    process.exit(1);
  });
}

// Antes de arrancar: comprueba que MySQL responde y deja creado al administrador inicial.
(async () => {
  try {
    await pool.query('SELECT 1');
    const r = await crearModeloAdministradores(pool).asegurarInicial(config.adminInicial);
    escuchar(crearApp(config, pool), PUERTO, 10, (puerto) => {
      console.log(`MediPuente en http://localhost:${puerto}`);
      console.log('Base de datos conectada');
      if (r === 'creado') console.log(`Administrador inicial creado: ${config.adminInicial.nombre} (${config.adminInicial.identificador})`);
      console.log(`Las sesiones se guardan en: ${config.almacen === 'memoria' ? 'la MEMORIA del servidor' : 'MySQL (tabla sessions)'}`);
    });
  } catch (error) {
    console.error('No me pude conectar a MySQL:', error.message);
    console.error('Revisa que MySQL esté encendido, tu archivo .env y que cargaste la base (bd/medipuente.sql o npm run bd).');
    process.exit(1);
  }
})();
