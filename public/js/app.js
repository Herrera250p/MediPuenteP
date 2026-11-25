/* MediPuente — interfaz web (sin librerías). Se comunica con la API en /api */
(() => {
  'use strict';

  const app = document.getElementById('app');
  const ROLES = { usuario: 'Usuario', clinica: 'Clínica', administrador: 'Administrador' };
  const ESTADOS = { pendiente: 'Pendiente', aceptada: 'Aceptada', rechazada: 'Rechazada' };

  /* ---------- Sesión ---------- */
  let sesion = null;
  try { sesion = JSON.parse(sessionStorage.getItem('mp_sesion')); } catch { /* sin almacenamiento */ }
  function guardarSesion(s) {
    sesion = s;
    try {
      if (s) sessionStorage.setItem('mp_sesion', JSON.stringify(s));
      else sessionStorage.removeItem('mp_sesion');
    } catch { /* sin almacenamiento */ }
  }

  /* ---------- Utilidades ---------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function fmtFecha(s) {
    if (!s) return '—';
    const [y, m, d] = String(s).slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }

  function manana() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  class ApiError extends Error {
    constructor(mensaje, detalles = []) { super(mensaje); this.detalles = detalles; }
  }

  async function api(ruta, { method = 'GET', body } = {}) {
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    let res;
    try {
      res = await fetch('/api' + ruta, { method, headers, body: body ? JSON.stringify(body) : undefined });
    } catch {
      throw new ApiError('No se pudo conectar con el servidor. Revisa que esté encendido.');
    }
    let data = null;
    try { data = await res.json(); } catch { /* sin cuerpo */ }
    if (!res.ok) {
      if (res.status === 401 && sesion && !ruta.startsWith('/auth/')) {
        guardarSesion(null);
        location.hash = '#/login/usuario';
        toast('Tu sesión terminó. Inicia sesión de nuevo.', 'error');
      }
      throw new ApiError((data && data.error) || 'Ocurrió un error inesperado', (data && data.detalles) || []);
    }
    return data;
  }

  function toast(mensaje, tipo = 'ok') {
    const caja = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast' + (tipo === 'error' ? ' toast-error' : '');
    el.textContent = mensaje;
    caja.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  function confirmar({ titulo, texto, boton, clase = 'btn-primary' }) {
    return new Promise((resolve) => {
      const dlg = document.createElement('dialog');
      if (typeof dlg.showModal !== 'function') { resolve(window.confirm(`${titulo}\n${texto}`)); return; }
      dlg.innerHTML = `
        <h2>${esc(titulo)}</h2><p>${esc(texto)}</p>
        <div class="actions">
          <button class="btn btn-quiet" value="no">Cancelar</button>
          <button class="btn ${clase}" value="si">${esc(boton)}</button>
        </div>`;
      dlg.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (b) dlg.close(b.value);
      });
      dlg.addEventListener('close', () => { resolve(dlg.returnValue === 'si'); dlg.remove(); });
      document.body.appendChild(dlg);
      dlg.showModal();
    });
  }

  /* ---------- Íconos y marca ---------- */
  const ICONS = {
    pill: '<path d="M10.5 20.5a5 5 0 0 1-7-7l10-10a5 5 0 0 1 7 7z"/><path d="m8.5 8.5 7 7"/>',
    heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    form: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M8 13h8M8 17h8M8 9h2"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    clinic: '<path d="M3 21h18M5 21V7l7-4 7 4v14M12 9v6M9 12h6"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>'
  };
  const icon = (n) => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

  // Logotipo de MediPuente (ya incluye el nombre y el lema)
  const logoImg = (clase) => `<img class="${clase}" src="/img/logo.png" alt="MediPuente">`;

  // Ilustración: un puente con cápsulas cruzando de una orilla a otra
  function ilustracion() {
    const capsula = (x, y, rot, a, b) => `
      <g transform="translate(${x} ${y}) rotate(${rot})">
        <path d="M0 -13H-18a13 13 0 0 0 0 26H0Z" fill="${a}"/>
        <path d="M0 -13H18a13 13 0 0 1 0 26H0Z" fill="${b}"/>
      </g>`;
    return `
    <svg viewBox="0 0 560 420" role="img" aria-label="Un puente que une dos orillas mientras cruzan cápsulas de medicamento">
      <defs>
        <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#bfe6ee"/><stop offset="1" stop-color="#f2f8fb"/>
        </linearGradient>
      </defs>
      <rect width="560" height="420" fill="url(#cielo)"/>
      <circle cx="430" cy="92" r="46" fill="#FFC857"/>
      <path d="M0 330 Q90 290 190 322 L190 420 H0Z" fill="#0B6E70"/>
      <path d="M560 330 Q470 290 370 322 L370 420 H560Z" fill="#0E2A47"/>
      <rect x="190" y="360" width="180" height="60" fill="#5fb8b8"/>
      <path d="M190 372 q22 -9 45 0 t45 0 t45 0 t45 0" fill="none" stroke="#d6f0ee" stroke-width="4" stroke-linecap="round"/>
      <path d="M165 316 Q280 118 395 316" fill="none" stroke="#0E2A47" stroke-width="11" stroke-linecap="round"/>
      <g stroke="#0E2A47" stroke-width="4" stroke-linecap="round">
        <path d="M205 281V318M240 237V318M280 217V318M320 237V318M355 281V318"/>
      </g>
      <rect x="150" y="316" width="260" height="16" rx="8" fill="#F0612F"/>
      ${capsula(235, 290, -20, '#ffffff', '#FFC857')}
      ${capsula(330, 188, 25, '#ffffff', '#F0612F')}
      ${capsula(110, 232, 20, '#ffffff', '#0B6E70')}
      ${capsula(470, 238, -30, '#ffffff', '#F0612F')}
      ${capsula(300, 120, -15, '#ffffff', '#0B6E70')}
    </svg>`;
  }

  /* ---------- Estructuras de página ---------- */
  function shell(contenido) {
    app.innerHTML = `
      <header class="topbar">
        <a class="brand" href="#/app" aria-label="MediPuente, ir al inicio">${logoImg('logo-top')}</a>
        <div class="topbar-user">
          <span class="rol-badge rol-${sesion.rol}">${ROLES[sesion.rol]}</span>
          <span class="who">${esc(sesion.nombre)}</span>
          <button class="btn btn-quiet" id="salir" type="button">${icon('logout')}Salir</button>
        </div>
      </header>
      <main class="page">${contenido}</main>`;
    document.getElementById('salir').onclick = async () => {
      try { await api('/auth/logout', { method: 'POST' }); } catch { /* la sesión local se limpia de todos modos */ }
      guardarSesion(null);
      location.hash = '#/';
      toast('Cerraste sesión');
    };
  }

  function publico(contenido) {
    app.innerHTML = `
      <div class="auth">
        <aside class="auth-side">
          <div>
            <a class="brand brand-card" href="#/" aria-label="MediPuente, ir al inicio">${logoImg('logo-side')}</a>
            <h2>Un puente entre quien tiene y quien necesita</h2>
            <p>Dona los medicamentos que ya no usas o solicita el que te hace falta.</p>
          </div>
          <div class="side-art">${ilustracion()}</div>
        </aside>
        <main class="auth-main"><div class="auth-card">${contenido}</div></main>
      </div>`;
  }

  const cabecera = (titulo, sub, atras) => `
    <div class="page-head">
      ${atras ? `<a class="back" href="${atras}">${icon('back')}Regresar</a>` : ''}
      <h1>${esc(titulo)}</h1>
      ${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
    </div>`;

  const chip = (estado) => `<span class="chip chip-${esc(estado)}">${ESTADOS[estado] || esc(estado)}</span>`;
  const cargando = () => '<p class="loading">Cargando…</p>';

  function campo({ id, etiqueta, tipo = 'text', auto, requerido = true, ayuda, max, clase = '' }) {
    return `
      <div class="field">
        <label for="${id}">${esc(etiqueta)}${requerido ? '' : '<span class="opt"> (opcional)</span>'}</label>
        <input id="${id}" name="${id}" type="${tipo}" ${auto ? `autocomplete="${auto}"` : ''}
          ${requerido ? 'required' : ''} ${max ? `maxlength="${max}"` : ''} class="${clase}">
        ${ayuda ? `<span class="hint">${esc(ayuda)}</span>` : ''}
      </div>`;
  }

  const alertaHtml = '<div class="alert alert-error" role="alert" tabindex="-1" hidden></div>';

  function mostrarAlerta(el, err) {
    const det = err.detalles && err.detalles.length
      ? `<ul>${err.detalles.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : '';
    el.innerHTML = `<strong>${esc(err.message)}</strong>${det}`;
    el.hidden = false;
    el.focus();
  }

  // Conecta un formulario con su acción: bloquea el botón y muestra los errores
  function manejarForm(form, accion) {
    const alerta = form.querySelector('.alert');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('[type=submit]');
      const texto = btn.textContent;
      alerta.hidden = true;
      btn.disabled = true;
      btn.textContent = 'Enviando…';
      try {
        await accion(Object.fromEntries(new FormData(form)));
      } catch (err) {
        mostrarAlerta(alerta, err instanceof ApiError ? err : new ApiError('Ocurrió un error inesperado'));
      } finally {
        btn.disabled = false;
        btn.textContent = texto;
      }
    });
  }

  /* ---------- Vistas públicas ---------- */
  function vInicio() {
    app.innerHTML = `
      <div class="landing">
        <header class="land-top"><span class="brand">${logoImg('logo-land')}</span></header>
        <section class="hero">
          <div class="hero-copy">
            <h1>Los medicamentos que te sobran pueden ser el tratamiento de alguien más</h1>
            <p>MediPuente conecta a personas y clínicas para donar y solicitar medicamentos, cumpliendo la normativa sanitaria de México.</p>
            <div class="hero-actions">
              <a class="btn btn-primary btn-lg" href="#/login/usuario">Entrar</a>
              <a class="btn btn-outline btn-lg" href="#/registro">Crear cuenta</a>
            </div>
          </div>
          <div class="hero-art">${ilustracion()}</div>
        </section>
        <section class="how">
          <div class="how-item">${icon('gift')}<h3>Dona lo que no usas</h3><p>Registra el medicamento, su cantidad y su fecha de caducidad.</p></div>
          <div class="how-item">${icon('shield')}<h3>Una clínica lo revisa</h3><p>Las clínicas y el equipo de MediPuente aceptan o rechazan cada solicitud.</p></div>
          <div class="how-item">${icon('heart')}<h3>Llega a quien lo necesita</h3><p>Pide el medicamento que te falta y consulta el estado en cualquier momento.</p></div>
        </section>
      </div>`;
  }

  function vLogin(rol) {
    const campos = {
      usuario: campo({ id: 'nombre_usuario', etiqueta: 'Nombre de usuario', auto: 'username', max: 45 }),
      clinica: campo({ id: 'nombre_clinica', etiqueta: 'Nombre de la clínica', auto: 'username', max: 100 }),
      administrador:
        campo({ id: 'nombre', etiqueta: 'Nombre completo', auto: 'name', max: 100 }) +
        campo({ id: 'identificador', etiqueta: 'Identificador', max: 20, ayuda: 'Te lo da la empresa' })
    }[rol];
    publico(`
      <h1>Iniciar sesión</h1>
      <p class="sub">Elige cómo vas a entrar.</p>
      <nav class="tabs" aria-label="Tipo de cuenta">
        ${Object.keys(ROLES).map((r) =>
          `<a class="tab" href="#/login/${r}" ${r === rol ? 'aria-current="page"' : ''}>${ROLES[r]}</a>`).join('')}
      </nav>
      <form>
        ${alertaHtml}
        ${campos}
        ${campo({ id: 'contrasena', etiqueta: 'Contraseña', tipo: 'password', auto: 'current-password', max: 72 })}
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">Entrar</button>
          <button class="btn btn-quiet" type="reset">Limpiar</button>
        </div>
      </form>
      <p class="auth-foot">${rol === 'administrador'
        ? 'Las cuentas de administrador las crea la empresa.'
        : '¿Aún no tienes cuenta? <a href="#/registro">Crear cuenta</a>'}</p>`);
    manejarForm(app.querySelector('form'), async (datos) => {
      const r = await api('/auth/login/' + rol, { method: 'POST', body: datos });
      guardarSesion({ rol: r.rol, nombre: r.nombre }); // la sesión real es la cookie del servidor
      toast('Inicio de sesión exitoso');
      location.hash = '#/app';
    });
  }

  function vRegistro() {
    publico(`
      <a class="back" href="#/">${icon('back')}Regresar</a>
      <h1>Crear cuenta</h1>
      <p class="sub">¿Quién va a usar MediPuente?</p>
      <div class="choice">
        <a href="#/registro/usuario">${icon('heart')}<div><strong>Usuario</strong><span>Dono o solicito medicamentos</span></div></a>
        <a href="#/registro/clinica">${icon('clinic')}<div><strong>Clínica</strong><span>Reviso solicitudes de medicamento</span></div></a>
      </div>
      <p class="auth-foot">¿Ya tienes cuenta? <a href="#/login/usuario">Entrar</a></p>`);
  }

  function vRegistroUsuario() {
    publico(`
      <a class="back" href="#/registro">${icon('back')}Regresar</a>
      <h1>Cuenta de usuario</h1>
      <p class="sub">Elige un nombre y una contraseña.</p>
      <form>
        ${alertaHtml}
        ${campo({ id: 'nombre_usuario', etiqueta: 'Nombre de usuario', auto: 'username', max: 45 })}
        ${campo({ id: 'contacto', etiqueta: 'Teléfono o correo de contacto', auto: 'tel', requerido: false, max: 45 })}
        ${campo({ id: 'contrasena', etiqueta: 'Contraseña', tipo: 'password', auto: 'new-password', max: 72, ayuda: 'Mínimo 6 caracteres' })}
        ${campo({ id: 'confirmar', etiqueta: 'Repite la contraseña', tipo: 'password', auto: 'new-password', max: 72 })}
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">Crear cuenta</button>
          <a class="btn btn-quiet" href="#/registro">Cancelar</a>
        </div>
      </form>`);
    manejarForm(app.querySelector('form'), async (d) => {
      if (d.contrasena !== d.confirmar) throw new ApiError('Las contraseñas no coinciden');
      await api('/auth/registro/usuario', { method: 'POST', body: {
        nombre_usuario: d.nombre_usuario, contacto: d.contacto, contrasena: d.contrasena } });
      toast('Cuenta creada. Ya puedes iniciar sesión.');
      location.hash = '#/login/usuario';
    });
  }

  function vRegistroClinica() {
    publico(`
      <a class="back" href="#/registro">${icon('back')}Regresar</a>
      <h1>Cuenta de clínica</h1>
      <p class="sub">Registra los datos oficiales de tu clínica.</p>
      <form>
        ${alertaHtml}
        ${campo({ id: 'nombre_clinica', etiqueta: 'Nombre de la clínica', auto: 'organization', max: 100 })}
        ${campo({ id: 'clues', etiqueta: 'CLUES', max: 11, clase: 'upper', ayuda: '11 caracteres. Es la Clave Única de Establecimientos de Salud.' })}
        ${campo({ id: 'direccion', etiqueta: 'Dirección', auto: 'street-address', max: 255 })}
        ${campo({ id: 'contrasena', etiqueta: 'Contraseña', tipo: 'password', auto: 'new-password', max: 72, ayuda: 'Mínimo 6 caracteres' })}
        ${campo({ id: 'confirmar', etiqueta: 'Repite la contraseña', tipo: 'password', auto: 'new-password', max: 72 })}
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">Registrar clínica</button>
          <a class="btn btn-quiet" href="#/registro">Cancelar</a>
        </div>
      </form>`);
    manejarForm(app.querySelector('form'), async (d) => {
      if (/\p{N}/u.test(d.nombre_clinica)) {
        throw new ApiError('El nombre de la clínica no puede contener números');
      }
      if (d.contrasena !== d.confirmar) throw new ApiError('Las contraseñas no coinciden');
      await api('/auth/registro/clinica', { method: 'POST', body: {
        nombre_clinica: d.nombre_clinica, clues: d.clues, direccion: d.direccion, contrasena: d.contrasena } });
      toast('Cuenta registrada. Ya puedes iniciar sesión.');
      location.hash = '#/login/clinica';
    });
  }

  /* ---------- Menú principal por rol ---------- */
  async function vMenu(obsoleto) {
    const pend = {};
    if (sesion.rol === 'clinica') {
      shell(cargando());
      try { pend.solicitudes = (await api('/clinica/solicitudes?estado=pendiente')).length; } catch { /* sin contador */ }
    } else if (sesion.rol === 'administrador') {
      shell(cargando());
      try { pend.solicitudes = (await api('/admin/solicitudes?estado=pendiente')).length; } catch { /* sin contador */ }
      try { pend.donaciones = (await api('/admin/donaciones?estado=pendiente')).length; } catch { /* sin contador */ }
    }
    if (obsoleto()) return;

    const menus = {
      usuario: {
        sub: 'Pide un medicamento o dona el que ya no uses.',
        items: [
          ['#/solicitar', 'tile-teal', 'pill', 'Solicitar medicamento', 'Pide el medicamento que necesitas'],
          ['#/donar', 'tile-orange', 'gift', 'Donar medicamento', 'Registra uno que ya no uses'],
          ['#/mis/solicitudes', 'tile-navy', 'list', 'Mis solicitudes', 'Consulta el estado de cada una'],
          ['#/mis/donaciones', 'tile-sun', 'heart', 'Mis donaciones', 'Revisa lo que has donado']
        ]
      },
      clinica: {
        sub: 'Revisa las solicitudes de medicamento y consulta a los usuarios.',
        items: [
          ['#/revisar/solicitudes', 'tile-teal', 'list', 'Solicitudes de medicamento', 'Acepta o rechaza cada solicitud', pend.solicitudes],
          ['#/usuarios', 'tile-orange', 'users', 'Usuarios', 'Busca a un usuario y ve su información']
        ]
      },
      administrador: {
        sub: 'Define los formularios y da seguimiento a solicitudes y donaciones.',
        items: [
          ['#/revisar/solicitudes', 'tile-teal', 'list', 'Solicitudes de medicamento', 'Da seguimiento y responde', pend.solicitudes],
          ['#/revisar/donaciones', 'tile-orange', 'gift', 'Solicitudes de donación', 'Revisa los medicamentos ofrecidos', pend.donaciones],
          ['#/formulario/solicitud', 'tile-navy', 'form', 'Formulario de solicitud', 'Define qué datos se piden'],
          ['#/formulario/donacion', 'tile-sun', 'form', 'Formulario de donación', 'Define qué datos se piden']
        ]
      }
    }[sesion.rol];

    shell(`
      ${cabecera('Hola, ' + sesion.nombre, menus.sub)}
      <nav class="menu" aria-label="Menú principal">
        ${menus.items.map(([href, clase, ico, titulo, texto, n]) => `
          <a class="tile ${clase}" href="${href}">
            ${icon(ico)}
            <span class="tile-title">${esc(titulo)}</span>
            <span class="tile-text">${esc(texto)}</span>
            ${n ? `<span class="badge" title="Pendientes">${n}</span>` : ''}
          </a>`).join('')}
      </nav>`);
  }

  /* ---------- Usuario: formularios de solicitud y donación ---------- */
  function inputCampo(c, soloVista = false, conCatalogo = false) {
    const id = soloVista ? '' : `f_${c.nombre}`;
    const attrs = `${soloVista ? 'disabled' : `id="${id}" name="${esc(c.nombre)}"`} ${c.requerido && !soloVista ? 'required' : ''}${conCatalogo && c.nombre === 'padecimiento' ? ' list="catalogo-padecimientos"' : ''}`;
    let ctrl;
    if (c.tipo === 'textarea') ctrl = `<textarea rows="3" maxlength="500" ${attrs}></textarea>`;
    else if (c.tipo === 'numero') {
      ctrl = c.nombre === 'cantidad'
        ? `<input type="number" inputmode="numeric" step="1" min="1" value="1" ${attrs}>`
        : `<input type="number" step="any" ${attrs}>`;
    } else if (c.tipo === 'fecha') {
      ctrl = `<input type="date" ${c.nombre === 'fecha_caducidad' ? `min="${manana()}"` : ''} ${attrs}>`;
    } else {
      const max = c.nombre === 'medicamento' ? 120 : c.nombre === 'padecimiento' ? 255 : 500;
      ctrl = `<input type="text" maxlength="${max}" ${attrs}>`;
    }
    return `
      <div class="field">
        <label ${id ? `for="${id}"` : ''}>${esc(c.etiqueta)}${c.requerido ? '' : '<span class="opt"> (opcional)</span>'}</label>
        ${ctrl}
      </div>`;
  }

  async function vFormulario(tipo, obsoleto) {
    shell(cargando());
    const [{ campos }, padecimientos] = await Promise.all([
      api('/plantillas/' + tipo),
      tipo === 'solicitud' ? api('/usuario/padecimientos') : Promise.resolve([])
    ]);
    if (obsoleto()) return;
    const esSol = tipo === 'solicitud';
    const sugerenciasPadecimientos = esSol
      ? `<datalist id="catalogo-padecimientos">${padecimientos.map((nombre) => `<option value="${esc(nombre)}">`).join('')}</datalist>`
      : '';
    shell(`
      ${cabecera(esSol ? 'Solicitar medicamento' : 'Donar medicamento',
        esSol ? 'Cuéntanos qué medicamento necesitas.' : 'Registra el medicamento que quieres donar. No se aceptan medicamentos caducados.', '#/app')}
      <form class="card form">
        ${alertaHtml}
        ${campos.map((c) => inputCampo(c, false, esSol)).join('')}
        ${sugerenciasPadecimientos}
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">${esSol ? 'Enviar solicitud' : 'Enviar donación'}</button>
          <button class="btn btn-quiet" type="reset">Limpiar</button>
        </div>
      </form>`);
    manejarForm(app.querySelector('form'), async (d) => {
      const body = {};
      for (const [k, v] of Object.entries(d)) if (String(v).trim() !== '') body[k] = v;
      await api(esSol ? '/usuario/solicitudes' : '/usuario/donaciones', { method: 'POST', body });
      shell(`
        <div class="card success">
          <div class="big-check">${icon('check')}</div>
          <h1>${esSol ? 'Solicitud enviada' : 'Donación enviada'}</h1>
          <p>Una clínica o el equipo de MediPuente la va a revisar. Puedes ver su estado cuando quieras.</p>
          <div class="actions">
            <a class="btn btn-primary" href="#/mis/${esSol ? 'solicitudes' : 'donaciones'}">${esSol ? 'Ver mis solicitudes' : 'Ver mis donaciones'}</a>
            <a class="btn btn-outline" href="#/app">Ir al menú</a>
          </div>
        </div>`);
    });
  }

  /* ---------- Usuario: consultar ---------- */
  const CLAVES = {
    solicitudes: { id: 'id_solicitud', fecha: 'fecha_solicitud', singular: 'solicitud' },
    donaciones: { id: 'id_donacion', fecha: 'fecha_donacion', singular: 'donacion' }
  };

  async function vMisLista(tipo, obsoleto) {
    shell(cargando());
    const filas = await api('/usuario/' + tipo);
    if (obsoleto()) return;
    const k = CLAVES[tipo];
    const esSol = tipo === 'solicitudes';
    shell(`
      ${cabecera(esSol ? 'Mis solicitudes' : 'Mis donaciones', 'Toca una para ver su estado y sus datos.', '#/app')}
      <nav class="tabs tabs-inline" aria-label="Ver">
        <a class="tab" href="#/mis/solicitudes" ${esSol ? 'aria-current="page"' : ''}>Solicitudes</a>
        <a class="tab" href="#/mis/donaciones" ${!esSol ? 'aria-current="page"' : ''}>Donaciones</a>
      </nav>
      ${filas.length ? `<div class="list">${filas.map((f) => `
        <a class="row" href="#/mis/${tipo}/${f[k.id]}">
          <div class="row-main">
            <span class="row-title">${esc(f.medicamento)}</span>
            <span class="row-meta"><span>Enviada el ${fmtFecha(f[k.fecha])}</span>${!esSol ? `<span>Caduca el ${fmtFecha(f.fecha_caducidad)}</span>` : ''}</span>
          </div>
          ${chip(f.estado)}
        </a>`).join('')}</div>`
      : `<div class="empty"><p>${esSol ? 'Todavía no has pedido ningún medicamento.' : 'Todavía no has donado ningún medicamento.'}</p>
         <a class="btn btn-primary" href="#/${esSol ? 'solicitar' : 'donar'}">${esSol ? 'Solicitar medicamento' : 'Donar medicamento'}</a></div>`}`);
  }

  async function etiquetasPlantilla(tipoSingular) {
    try {
      const { campos } = await api('/plantillas/' + tipoSingular);
      return Object.fromEntries(campos.map((c) => [c.nombre, c.etiqueta]));
    } catch { return {}; }
  }

  function detalleHtml(tipo, d, etq, extra = []) {
    const k = CLAVES[tipo];
    const filas = [...extra, ['Medicamento', d.medicamento]];
    if (tipo === 'solicitudes') {
      if (d.padecimiento) filas.push(['Padecimiento', d.padecimiento]);
    } else {
      filas.push(['Fecha de caducidad', fmtFecha(d.fecha_caducidad)], ['Cantidad', d.cantidad]);
    }
    if (d.datos_extra) for (const [n, v] of Object.entries(d.datos_extra)) filas.push([etq[n] || n, v]);
    filas.push([tipo === 'solicitudes' ? 'Fecha de la solicitud' : 'Fecha de la donación', fmtFecha(d[k.fecha])]);
    return `<dl class="facts">${filas.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl>`;
  }

  async function vDetalleUsuario(tipo, id, obsoleto) {
    shell(cargando());
    const [d, etq] = await Promise.all([
      api(`/usuario/${tipo}/${id}`), etiquetasPlantilla(CLAVES[tipo].singular)]);
    if (obsoleto()) return;
    shell(`
      <a class="back" href="#/mis/${tipo}">${icon('back')}Regresar</a>
      <div class="card">
        <div class="detail-top"><h1>${esc(d.medicamento)}</h1>${chip(d.estado)}</div>
        ${detalleHtml(tipo, d, etq)}
        ${d.estado === 'pendiente'
          ? '<p class="note">Todavía no la revisan. Cuando haya una respuesta, aquí verás el nuevo estado.</p>' : ''}
      </div>`);
  }

  /* ---------- Clínica y administrador: revisar ---------- */
  const rutaRol = () => (sesion.rol === 'clinica' ? 'clinica' : 'admin');

  async function vRevisarLista(tipo, obsoleto) {
    if (sesion.rol === 'clinica' && tipo === 'donaciones') { location.replace('#/app'); return; }
    const k = CLAVES[tipo];
    const esSol = tipo === 'solicitudes';
    let filtro = 'pendiente';
    shell(`
      <div id="contenido"></div>`);
    const caja = document.getElementById('contenido');

    async function pintar() {
      caja.innerHTML = cargando();
      const filas = await api(`/${rutaRol()}/${tipo}${filtro ? '?estado=' + filtro : ''}`);
      if (obsoleto()) return;
      caja.innerHTML = `
        ${cabecera(esSol ? 'Solicitudes de medicamento' : 'Solicitudes de donación', 'Elige una para ver sus datos y responder.', '#/app')}
        <div class="filters" role="group" aria-label="Filtrar por estado">
          ${[['pendiente', 'Pendientes'], ['aceptada', 'Aceptadas'], ['rechazada', 'Rechazadas'], ['', 'Todas']].map(([v, t]) =>
            `<button class="tab" type="button" data-f="${v}" aria-pressed="${v === filtro}">${t}</button>`).join('')}
        </div>
        ${filas.length ? `<div class="list">${filas.map((f) => `
          <a class="row" href="#/revisar/${tipo}/${f[k.id]}">
            <div class="row-main">
              <span class="row-title">${esc(f.medicamento)}</span>
              <span class="row-meta"><span>Usuario: ${esc(f.nombre_usuario)}</span><span>${fmtFecha(f[k.fecha])}</span></span>
            </div>
            ${chip(f.estado)}
          </a>`).join('')}</div>`
        : `<div class="empty"><p>${filtro ? `No hay solicitudes ${{ pendiente: 'pendientes', aceptada: 'aceptadas', rechazada: 'rechazadas' }[filtro]}.` : 'Aún no hay solicitudes.'}</p></div>`}`;
      caja.querySelectorAll('[data-f]').forEach((b) => {
        b.onclick = () => { filtro = b.dataset.f; pintar().catch(vError); };
      });
    }
    await pintar();
  }

  async function vRevisarDetalle(tipo, id, obsoleto) {
    if (sesion.rol === 'clinica' && tipo === 'donaciones') { location.replace('#/app'); return; }
    shell(cargando());
    const [d, etq] = await Promise.all([
      api(`/${rutaRol()}/${tipo}/${id}`), etiquetasPlantilla(CLAVES[tipo].singular)]);
    if (obsoleto()) return;
    const pendiente = d.estado === 'pendiente';
    const extra = [['Enviada por', d.nombre_usuario]];
    if (d.contacto) extra.push(['Contacto', d.contacto]);
    shell(`
      <a class="back" href="#/revisar/${tipo}">${icon('back')}Regresar</a>
      <div class="card">
        <div class="detail-top"><h1>${esc(d.medicamento)}</h1>${chip(d.estado)}</div>
        ${detalleHtml(tipo, d, etq, extra)}
        <div class="actions">
          ${pendiente ? `
            <button class="btn btn-ok" data-e="aceptada" type="button">${icon('check')}Aceptar</button>
            <button class="btn btn-danger" data-e="rechazada" type="button">Rechazar</button>` : ''}
          ${sesion.rol === 'clinica' ? `<a class="btn btn-outline" href="#/usuarios/${d.usuario_id}">Ver perfil del usuario</a>` : ''}
        </div>
        ${pendiente ? '' : `<p class="note">Esta solicitud ya fue ${d.estado === 'aceptada' ? 'aceptada' : 'rechazada'}, por eso no se puede cambiar.</p>`}
      </div>`);
    app.querySelectorAll('[data-e]').forEach((b) => {
      b.onclick = async () => {
        const acepta = b.dataset.e === 'aceptada';
        const si = await confirmar({
          titulo: acepta ? '¿Aceptar esta solicitud?' : '¿Rechazar esta solicitud?',
          texto: 'Después de responder ya no se puede cambiar.',
          boton: acepta ? 'Aceptar' : 'Rechazar',
          clase: acepta ? 'btn-ok' : 'btn-danger'
        });
        if (!si) return;
        try {
          const r = await api(`/${rutaRol()}/${tipo}/${id}/estado`, { method: 'PATCH', body: { estado: b.dataset.e } });
          toast(r.mensaje);
          route();
        } catch (err) { toast(err.message, 'error'); }
      };
    });
  }

  /* ---------- Clínica: usuarios ---------- */
  async function vBuscarUsuarios(obsoleto) {
    shell(`
      ${cabecera('Usuarios', 'Busca por nombre de usuario.', '#/app')}
      <div class="search">${icon('search')}<input type="text" id="q" placeholder="Nombre de usuario" aria-label="Buscar usuario" autocomplete="off"></div>
      <div id="resultado"></div>`);
    const caja = document.getElementById('resultado');
    async function buscar(q) {
      const filas = await api('/clinica/usuarios?q=' + encodeURIComponent(q));
      if (obsoleto()) return;
      caja.innerHTML = filas.length
        ? `<div class="list">${filas.map((u) => `
            <a class="row" href="#/usuarios/${u.id_usuario}">
              <div class="row-main"><span class="row-title">${esc(u.nombre_usuario)}</span></div>
            </a>`).join('')}</div>`
        : '<div class="empty"><p>No encontramos usuarios con ese nombre.</p></div>';
    }
    let t;
    document.getElementById('q').addEventListener('input', (e) => {
      clearTimeout(t);
      t = setTimeout(() => buscar(e.target.value.trim()).catch((err) => toast(err.message, 'error')), 250);
    });
    await buscar('');
  }

  async function vPerfilUsuario(id, obsoleto) {
    shell(cargando());
    const u = await api('/clinica/usuarios/' + id);
    if (obsoleto()) return;
    shell(`
      <a class="back" href="#/usuarios">${icon('back')}Regresar</a>
      <div class="profile-head">
        <div class="avatar" aria-hidden="true">${esc(u.nombre_usuario.charAt(0).toUpperCase())}</div>
        <div><h1>${esc(u.nombre_usuario)}</h1></div>
      </div>
      <h2 class="section-title">Solicitudes de medicamento</h2>
      ${u.solicitudes.length ? `<div class="list">${u.solicitudes.map((s) => `
        <a class="row" href="#/revisar/solicitudes/${s.id_solicitud}">
          <div class="row-main"><span class="row-title">${esc(s.medicamento)}</span>
          <span class="row-meta">${s.padecimiento ? `<span>${esc(s.padecimiento)}</span>` : ''}<span>${fmtFecha(s.fecha_solicitud)}</span></span></div>
          ${chip(s.estado)}
        </a>`).join('')}</div>` : '<div class="empty"><p>Este usuario no ha hecho solicitudes.</p></div>'}
      <h2 class="section-title">Donaciones</h2>
      ${u.donaciones.length ? `<div class="list">${u.donaciones.map((s) => `
        <div class="row">
          <div class="row-main"><span class="row-title">${esc(s.medicamento)}</span>
          <span class="row-meta"><span>Caduca el ${fmtFecha(s.fecha_caducidad)}</span><span>Cantidad: ${esc(s.cantidad)}</span></span></div>
          ${chip(s.estado)}
        </div>`).join('')}</div>` : '<div class="empty"><p>Este usuario no ha hecho donaciones.</p></div>'}`);
  }

  /* ---------- Administrador: definir formularios ---------- */
  const BLOQUEADOS = { solicitud: ['medicamento'], donacion: ['medicamento', 'fecha_caducidad'] };
  const TIPO_FIJO = { fecha_caducidad: 'fecha', cantidad: 'numero' };
  const TIPOS_CAMPO = { texto: 'Texto corto', textarea: 'Texto largo', numero: 'Número', fecha: 'Fecha' };

  function slug(texto, usados) {
    let base = texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 36);
    if (!/^[a-z]/.test(base)) base = 'campo_' + base;
    let nombre = base, n = 2;
    while (usados.has(nombre)) nombre = `${base}_${n++}`;
    return nombre;
  }

  async function vDefinirFormulario(tipo, obsoleto) {
    shell(cargando());
    const { campos } = await api('/plantillas/' + tipo);
    if (obsoleto()) return;
    let lista = campos.map((c) => ({ ...c }));
    const bloq = BLOQUEADOS[tipo];
    const esSol = tipo === 'solicitud';

    shell(`
      ${cabecera(esSol ? 'Formulario de solicitud' : 'Formulario de donación',
        'Define qué datos va a llenar el usuario. Lo que cambies aquí aparece en el formulario al instante.', '#/app')}
      <div class="builder">
        <form class="card" id="editor">
          ${alertaHtml}
          <div class="fields-edit" id="filas"></div>
          <div class="form-actions">
            <button class="btn btn-outline" type="button" id="agregar">${icon('plus')}Agregar campo</button>
            <button class="btn btn-primary" type="submit">Guardar formulario</button>
          </div>
        </form>
        <aside class="preview"><h2>Así lo verá el usuario</h2><div id="vista"></div></aside>
      </div>`);

    const filasEl = document.getElementById('filas');
    const vistaEl = document.getElementById('vista');
    const pintarVista = () => {
      vistaEl.innerHTML = lista.map((c) => inputCampo({ ...c, etiqueta: c.etiqueta || 'Campo sin nombre' }, true)).join('');
    };

    function pintarFilas() {
      filasEl.innerHTML = lista.map((c, i) => {
        const fijo = bloq.includes(c.nombre);
        const tipoFijo = TIPO_FIJO[c.nombre];
        return `
          <div class="fedit" data-i="${i}">
            <div class="field"><label for="e${i}">Pregunta</label>
              <input type="text" id="e${i}" data-k="etiqueta" maxlength="100" value="${esc(c.etiqueta)}" required></div>
            <div class="field"><label for="t${i}">Tipo</label>
              <select id="t${i}" data-k="tipo" ${tipoFijo ? 'disabled' : ''}>
                ${Object.entries(TIPOS_CAMPO).map(([v, t]) =>
                  `<option value="${v}" ${(tipoFijo || c.tipo) === v ? 'selected' : ''}>${t}</option>`).join('')}
              </select></div>
            <label class="check"><input type="checkbox" data-k="requerido" ${c.requerido || fijo ? 'checked' : ''} ${fijo ? 'disabled' : ''}>Obligatorio</label>
            <button class="icon-btn" type="button" data-borrar="${i}" aria-label="Quitar campo" ${fijo ? 'disabled' : ''}>${icon('trash')}</button>
          </div>`;
      }).join('');
      pintarVista();
    }

    filasEl.addEventListener('input', (e) => {
      const fila = e.target.closest('.fedit');
      if (!fila) return;
      const c = lista[Number(fila.dataset.i)];
      const k = e.target.dataset.k;
      c[k] = k === 'requerido' ? e.target.checked : e.target.value;
      pintarVista();
    });
    filasEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-borrar]');
      if (!b) return;
      lista.splice(Number(b.dataset.borrar), 1);
      pintarFilas();
    });
    document.getElementById('agregar').onclick = () => {
      if (lista.length >= 30) { toast('El máximo es de 30 campos', 'error'); return; }
      lista.push({ nombre: null, etiqueta: '', tipo: 'texto', requerido: false });
      pintarFilas();
      filasEl.querySelector('.fedit:last-child input').focus();
    };

    manejarForm(document.getElementById('editor'), async () => {
      if (lista.some((c) => !c.etiqueta.trim())) throw new ApiError('Escribe la pregunta de cada campo o quita los que sobren');
      const usados = new Set(lista.filter((c) => c.nombre).map((c) => c.nombre));
      const campos = lista.map((c) => {
        const nombre = c.nombre || slug(c.etiqueta, usados);
        usados.add(nombre);
        return {
          nombre, etiqueta: c.etiqueta.trim(),
          tipo: TIPO_FIJO[nombre] || c.tipo,
          requerido: bloq.includes(nombre) ? true : !!c.requerido
        };
      });
      const r = await api('/plantillas/' + tipo, { method: 'PUT', body: { campos } });
      lista = r.campos.map((c) => ({ ...c }));
      pintarFilas();
      toast(r.mensaje);
    });
    pintarFilas();
  }

  /* ---------- Error general ---------- */
  function vError(err) {
    const mensaje = err instanceof ApiError ? err.message : 'Ocurrió un error inesperado';
    const html = `
      <div class="card success">
        <h1>No pudimos cargar esta página</h1>
        <p>${esc(mensaje)}</p>
        <div class="actions">
          <button class="btn btn-primary" id="reintentar" type="button">Intentar de nuevo</button>
          <a class="btn btn-outline" href="${sesion ? '#/app' : '#/'}">Ir al inicio</a>
        </div>
      </div>`;
    if (sesion) shell(html); else publico(html);
    document.getElementById('reintentar').onclick = () => route();
  }

  /* ---------- Rutas ---------- */
  const rutas = [
    { re: /^\/$/, publica: true, vista: () => vInicio() },
    { re: /^\/login\/(usuario|clinica|administrador)$/, publica: true, vista: (r) => vLogin(r) },
    { re: /^\/registro$/, publica: true, vista: () => vRegistro() },
    { re: /^\/registro\/usuario$/, publica: true, vista: () => vRegistroUsuario() },
    { re: /^\/registro\/clinica$/, publica: true, vista: () => vRegistroClinica() },
    { re: /^\/app$/, vista: (o) => vMenu(o) },
    { re: /^\/solicitar$/, roles: ['usuario'], vista: (o) => vFormulario('solicitud', o) },
    { re: /^\/donar$/, roles: ['usuario'], vista: (o) => vFormulario('donacion', o) },
    { re: /^\/mis\/(solicitudes|donaciones)$/, roles: ['usuario'], vista: (t, o) => vMisLista(t, o) },
    { re: /^\/mis\/(solicitudes|donaciones)\/(\d+)$/, roles: ['usuario'], vista: (t, i, o) => vDetalleUsuario(t, i, o) },
    { re: /^\/revisar\/(solicitudes|donaciones)$/, roles: ['clinica', 'administrador'], vista: (t, o) => vRevisarLista(t, o) },
    { re: /^\/revisar\/(solicitudes|donaciones)\/(\d+)$/, roles: ['clinica', 'administrador'], vista: (t, i, o) => vRevisarDetalle(t, i, o) },
    { re: /^\/usuarios$/, roles: ['clinica'], vista: (o) => vBuscarUsuarios(o) },
    { re: /^\/usuarios\/(\d+)$/, roles: ['clinica'], vista: (i, o) => vPerfilUsuario(i, o) },
    { re: /^\/formulario\/(solicitud|donacion)$/, roles: ['administrador'], vista: (t, o) => vDefinirFormulario(t, o) }
  ];

  let numRender = 0;
  async function route() {
    const ruta = (location.hash.slice(1) || '/').split('?')[0];
    const mio = ++numRender;
    const obsoleto = () => mio !== numRender;
    for (const r of rutas) {
      const m = ruta.match(r.re);
      if (!m) continue;
      if (r.publica && sesion) { location.replace('#/app'); return; }
      if (!r.publica && !sesion) { location.replace('#/login/usuario'); return; }
      if (r.roles && !r.roles.includes(sesion.rol)) { location.replace('#/app'); return; }
      window.scrollTo(0, 0);
      try {
        await r.vista(...m.slice(1), obsoleto);
      } catch (err) {
        if (!obsoleto()) vError(err);
      }
      return;
    }
    location.replace(sesion ? '#/app' : '#/');
  }

  window.addEventListener('hashchange', route);
  route();
})();
