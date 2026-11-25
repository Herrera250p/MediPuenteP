const express = require('express');
const { requiereSesion, requiereRol, ah } = require('../middleware/sesion');
const { TIPOS, obtenerPlantilla, validarDefinicionCampos } = require('../utils/formularios');

function crearRutas(pool) {
  const router = express.Router();
  router.use(requiereSesion);

  function validarTipo(req, res, next) {
    if (!TIPOS.includes(req.params.tipo)) {
      return res.status(400).json({ error: `El tipo debe ser: ${TIPOS.join(' o ')}` });
    }
    next();
  }

  // Ver el formulario vigente (lo usan los usuarios para dibujar el formulario)
  router.get('/:tipo', validarTipo, ah(async (req, res) => {
    const campos = await obtenerPlantilla(pool, req.params.tipo);
    res.json({ tipo: req.params.tipo, campos });
  }));

  // Definir / actualizar el formulario (solo administrador)
  router.put('/:tipo', requiereRol('administrador'), validarTipo, ah(async (req, res) => {
    const { tipo } = req.params;
    const { campos } = req.body;

    const errores = validarDefinicionCampos(tipo, campos);
    if (errores.length) return res.status(400).json({ error: 'Formulario no válido', detalles: errores });

    // Guardamos solo las propiedades conocidas
    const limpios = campos.map((c) => ({
      nombre: c.nombre,
      etiqueta: c.etiqueta.trim(),
      tipo: c.tipo,
      requerido: c.requerido === true
    }));

    const [existe] = await pool.query('SELECT 1 FROM plantilla_formulario WHERE tipo = ?', [tipo]);
    if (existe.length) {
      await pool.query(
        'UPDATE plantilla_formulario SET campos = ?, administrador_id = ? WHERE tipo = ?',
        [JSON.stringify(limpios), req.session.usuario.id, tipo]
      );
    } else {
      await pool.query(
        'INSERT INTO plantilla_formulario (tipo, campos, administrador_id) VALUES (?, ?, ?)',
        [tipo, JSON.stringify(limpios), req.session.usuario.id]
      );
    }
    res.json({ mensaje: 'El formulario se guardó correctamente', tipo, campos: limpios });
  }));

  return router;
}

module.exports = { crearRutas };

