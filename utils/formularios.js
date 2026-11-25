
const TIPOS = ['solicitud', 'donacion'];
const TIPOS_CAMPO = ['texto', 'textarea', 'numero', 'fecha'];

// Campos que tienen columna propia en la tabla; el resto va a "datos_extra"
const COLUMNAS = {
  solicitud: ['medicamento', 'padecimiento'],
  donacion: ['medicamento', 'fecha_caducidad', 'cantidad']
};
// Campos que la plantilla siempre debe incluir y marcar como requeridos
const OBLIGATORIOS = {
  solicitud: ['medicamento'],
  donacion: ['medicamento', 'fecha_caducidad']
};

function parseJSON(valor, porDefecto = null) {
  if (valor === null || valor === undefined) return porDefecto;
  if (typeof valor === 'string') {
    try { return JSON.parse(valor); } catch { return porDefecto; }
  }
  return valor;
}

function esFecha(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const d = new Date(texto + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
}

async function obtenerFechaActual(pool) {
  const [rows] = await pool.query(
    "SELECT DATE_FORMAT(CURRENT_DATE(), '%Y-%m-%d') AS fecha_actual"
  );
  return rows[0].fecha_actual;
}

async function obtenerPlantilla(pool, tipo) {
  const [rows] = await pool.query('SELECT campos FROM plantilla_formulario WHERE tipo = ?', [tipo]);
  return rows.length ? parseJSON(rows[0].campos, []) : [];
}

// Valida la definición de campos que manda el administrador
function validarDefinicionCampos(tipo, campos) {
  const errores = [];
  if (!Array.isArray(campos) || campos.length === 0) {
    return ['"campos" debe ser una lista con al menos un campo'];
  }
  if (campos.length > 30) errores.push('Máximo 30 campos por formulario');

  const nombres = new Set();
  campos.forEach((c, i) => {
    const pos = `Campo #${i + 1}`;
    if (!c || typeof c !== 'object') { errores.push(`${pos}: formato inválido`); return; }
    if (typeof c.nombre !== 'string' || !/^[a-z][a-z0-9_]{0,39}$/.test(c.nombre)) {
      errores.push(`${pos}: "nombre" debe usar minúsculas, números y guion bajo (ej. fecha_caducidad)`);
    } else if (nombres.has(c.nombre)) {
      errores.push(`${pos}: el nombre "${c.nombre}" está repetido`);
    } else nombres.add(c.nombre);
    if (typeof c.etiqueta !== 'string' || !c.etiqueta.trim() || c.etiqueta.length > 100) {
      errores.push(`${pos}: "etiqueta" es obligatoria (máx. 100 caracteres)`);
    }
    if (!TIPOS_CAMPO.includes(c.tipo)) {
      errores.push(`${pos}: "tipo" debe ser uno de ${TIPOS_CAMPO.join(', ')}`);
    }
    if (c.requerido !== undefined && typeof c.requerido !== 'boolean') {
      errores.push(`${pos}: "requerido" debe ser true o false`);
    }
  });

  for (const nombre of OBLIGATORIOS[tipo]) {
    const c = campos.find((x) => x && x.nombre === nombre);
    if (!c) errores.push(`El formulario de ${tipo} debe incluir el campo "${nombre}"`);
    else if (!c.requerido) errores.push(`El campo "${nombre}" debe ser requerido`);
  }
  if (tipo === 'donacion') {
    const f = campos.find((x) => x && x.nombre === 'fecha_caducidad');
    if (f && f.tipo !== 'fecha') errores.push('"fecha_caducidad" debe ser de tipo fecha');
    const q = campos.find((x) => x && x.nombre === 'cantidad');
    if (q && q.tipo !== 'numero') errores.push('"cantidad" debe ser de tipo numero');
  }
  return errores;
}

// Valida lo que envía el usuario contra la plantilla vigente.
// Regresa { errores, columnas, extra }
async function procesarFormulario(pool, tipo, body) {
  const campos = await obtenerPlantilla(pool, tipo);
  const errores = [];
  const columnas = {};
  const extra = {};

  if (campos.length === 0) {
    return { errores: ['Aún no hay un formulario definido por el administrador'], columnas, extra };
  }

  for (const c of campos) {
    let v = body ? body[c.nombre] : undefined;
    if (typeof v === 'string') v = v.trim();
    const vacio = v === undefined || v === null || v === '';
    if (vacio) {
      if (c.requerido) errores.push(`El campo "${c.etiqueta}" es obligatorio`);
      continue;
    }

    if (c.tipo === 'numero') {
      const n = Number(v);
      if (!Number.isFinite(n)) { errores.push(`El campo "${c.etiqueta}" debe ser un número`); continue; }
      v = n;
    } else if (c.tipo === 'fecha') {
      if (!esFecha(String(v))) { errores.push(`El campo "${c.etiqueta}" debe tener formato AAAA-MM-DD`); continue; }
      v = String(v);
    } else {
      v = String(v);
      if (v.length > 500) { errores.push(`El campo "${c.etiqueta}" es demasiado largo`); continue; }
    }

    if (COLUMNAS[tipo].includes(c.nombre)) columnas[c.nombre] = v;
    else extra[c.nombre] = v;
  }

  // Reglas propias de cada columna
  if (columnas.medicamento && columnas.medicamento.length > 120) {
    errores.push('El nombre del medicamento es demasiado largo (máx. 120 caracteres)');
  }
  if (columnas.padecimiento && columnas.padecimiento.length > 255) {
    errores.push('El padecimiento es demasiado largo (máx. 255 caracteres)');
  }
  if (tipo === 'solicitud' && columnas.padecimiento) {
    const [padecimientos] = await pool.query(
      'SELECT nombre FROM catalogo_padecimiento WHERE nombre = ?',
      [columnas.padecimiento]
    );
    if (padecimientos.length) {
      columnas.padecimiento = padecimientos[0].nombre;
    } else {
      errores.push('Selecciona un padecimiento del catálogo');
    }
  }
  if (tipo === 'donacion') {
    const fechaActual = columnas.fecha_caducidad ? await obtenerFechaActual(pool) : null;
    if (fechaActual && columnas.fecha_caducidad <= fechaActual) {
      errores.push('No se aceptan medicamentos caducados o que caducan hoy');
    }
    if (columnas.cantidad !== undefined && (!Number.isInteger(columnas.cantidad) || columnas.cantidad < 1)) {
      errores.push('La cantidad debe ser un número entero mayor a 0');
    }
  }

  return { errores, columnas, extra };
}

// Convierte "datos_extra" de texto a objeto antes de responder
function formatear(fila) {
  if (!fila) return fila;
  return { ...fila, datos_extra: parseJSON(fila.datos_extra, null) };
}

module.exports = {
  TIPOS,
  parseJSON,
  obtenerPlantilla,
  validarDefinicionCampos,
  procesarFormulario,
  formatear
};
