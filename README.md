# MediPuente – Servidor (Node.js + Express + MySQL)

API REST y página web de **MediPuente – Enlace de medicamentos**. Tres roles: **usuario**, **clínica** y **administrador**.

Sigue la estructura de la demo de sesiones: `crearApp(config, pool)`, sesión con cookie guardada en MySQL
(`express-session` + `express-mysql-session`), `modelos/` para las consultas, `config.js` para las opciones de la sesión
y los middlewares `requiereSesion` (401) y `requiereRol` (403).

## 1. Requisitos
- Node.js 18 o superior
- MySQL 8 (o 5.7+ / MariaDB)

## 2. Puesta en marcha
1. Abre la carpeta `medipuente` en VS Code y, en la terminal:
   ```bash
   npm install
   ```
2. Copia `.env.example` como `.env` y escribe **tu** contraseña de MySQL en `DB_PASSWORD` (y un `SESSION_SECRET` propio).
3. Carga la base de datos. Elige **una** forma:
   - **Workbench:** *File → Open SQL Script…* → `bd/medipuente.sql` → rayo (*Execute*).
   - **Terminal:** `npm run bd` (OJO: borra y vuelve a crear la base `medipuente`).
4. Inicia el servidor:
   ```bash
   npm start          # o: npm run dev
   ```
   Si el puerto 3000 está ocupado, el servidor probará automáticamente los siguientes 10 puertos y mostrará la dirección que debes abrir.
   ```text
   MediPuente en http://localhost:3000
   Base de datos conectada
   Las sesiones se guardan en: MySQL (tabla sessions)
   ```
5. Abre http://localhost:3000

## 3. Administrador que ya viene creado
Al importar la base y al arrancar el servidor ya existe este administrador (la contraseña se guarda cifrada con bcrypt):

| Campo | Valor |
|---|---|
| Nombre | `Daniel Gomez` |
| Identificador | `EKGF123` |
| Contraseña | `admin12345` |

Entra en **Iniciar sesión → Administrador** y escribe esos tres datos (el nombre exactamente como aparece). Sus datos están en `config.js` (`adminInicial`); si cambias ahí algo y ese identificador no existe, se crea al arrancar. Para agregar más administradores: `POST /api/admin/administradores`.

## 4. Logotipo
El logotipo está en `public/img/logo.png` (se usa en la página de inicio, en el inicio de sesión y en la barra superior) y el ícono de la pestaña en `public/img/favicon.png`. Para cambiarlo, reemplaza esos archivos.

## 5. Cómo funciona la sesión
- Al iniciar sesión el servidor guarda quién eres (`id`, `rol`, `nombre`) en la tabla `sessions` y manda al navegador solo una cookie firmada `connect.sid` (`HttpOnly`, `SameSite=Lax`). **Ya no hay token en el navegador.**
- `requiereSesion` responde **401** si no hay sesión o ya venció; `requiereRol('clinica')` responde **403** si la persona no tiene ese rol.
- Al iniciar sesión se cambia el id de la sesión (`regenerarAlEntrar`), contra la fijación de sesión; al cerrar sesión (`POST /api/auth/logout`) se destruye en el servidor, así una cookie copiada deja de servir.
- Las opciones (duración, `rolling`, `httpOnly`, `sameSite`, `secure`, dónde se guarda) están en `config.js`. En un servidor con HTTPS usa `NODE_ENV=production` para que la cookie viaje solo por HTTPS.

## 6. Endpoints

### Autenticación (públicos)
| Método | Ruta | Body |
|---|---|---|
| POST | `/api/auth/registro/usuario` | `nombre_usuario`, `contrasena`, `contacto` (opcional) |
| POST | `/api/auth/registro/clinica` | `nombre_clinica`, `direccion`, `clues` (11 caracteres), `contrasena` |
| POST | `/api/auth/login/usuario` | `nombre_usuario`, `contrasena` |
| POST | `/api/auth/login/clinica` | `nombre_clinica`, `contrasena` |
| POST | `/api/auth/login/administrador` | `nombre`, `identificador`, `contrasena` |
| GET | `/api/auth/sesion` | quién tiene la sesión abierta (requiere sesión) |
| POST | `/api/auth/logout` | cierra la sesión |

Las demás rutas (plantillas, usuario, clínica y administrador) funcionan igual que antes, pero ahora se autentican con la cookie de sesión en lugar del encabezado `Authorization`.

| Quién | Rutas |
|---|---|
| Cualquiera con sesión | `GET /api/plantillas/solicitud` · `/donacion` |
| Administrador | `PUT /api/plantillas/:tipo`, `/api/admin/solicitudes`, `/api/admin/donaciones` (+ `/:id`, `PATCH /:id/estado`), `POST /api/admin/administradores` |
| Usuario | `GET /api/usuario/padecimientos`, `/api/usuario/solicitudes`, `/api/usuario/donaciones` |
| Clínica | `/api/clinica/solicitudes` (+ `PATCH /:id/estado`), `/api/clinica/usuarios` |

Estados: `pendiente` → `aceptada` / `rechazada`. Al registrar una donación, el servidor rechaza fechas de caducidad iguales o anteriores al día de registro.

## 7. Estructura
```
server.js                 Arranque: comprueba MySQL y crea al administrador inicial
app.js                    crearApp(config, pool): sesión, rutas y errores
config.js                 Opciones de la sesión y administrador inicial
db.js                     Conexión a MySQL (.env)
modelos/                  Consultas: usuarios, clinicas, administradores
middleware/sesion.js      requiereSesion (401) y requiereRol (403)
rutas/                    auth, usuario, clinica, admin, plantillas, revision
utils/formularios.js      Validación de formularios dinámicos
bd/medipuente.sql         Base de datos completa (tablas, plantillas, sessions y administrador)
bd/crear-bd.js            npm run bd
pruebas/probar.js         npm run probar (usa la base medipuente_pruebas)
public/                   La página web (HTML, CSS y JavaScript)
```

## 8. Seguridad incluida
- Contraseñas cifradas con bcrypt (nunca se guardan ni se devuelven en texto plano).
- Cookie de sesión `HttpOnly` + `SameSite`, expiración decidida por el servidor y regeneración del id al entrar.
- Control de acceso por rol (401/403): cada persona solo ve lo suyo y solo el administrador define formularios.
- Consultas con parámetros (protección contra inyección SQL).
