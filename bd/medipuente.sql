
CREATE DATABASE IF NOT EXISTS medipuente
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE medipuente;


CREATE TABLE IF NOT EXISTS usuario (
  id_usuario      INT AUTO_INCREMENT PRIMARY KEY,
  nombre_usuario  VARCHAR(45)  NOT NULL,
  contrasena      VARCHAR(255) NOT NULL,            
  contacto        VARCHAR(45)  NULL,
  fecha_registro  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuario_nombre (nombre_usuario)
) ENGINE=InnoDB;

-- ---------- CLINICA ----------
CREATE TABLE IF NOT EXISTS clinica (
  id_clinica      INT AUTO_INCREMENT PRIMARY KEY,
  nombre_clinica  VARCHAR(100) NOT NULL,
  direccion       VARCHAR(255) NOT NULL,
  clues           VARCHAR(11)  NOT NULL,            
  contrasena      VARCHAR(255) NOT NULL,          
  fecha_registro  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_clinica_nombre (nombre_clinica),
  UNIQUE KEY uq_clinica_clues (clues)
) ENGINE=InnoDB;

-- ---------- ADMINISTRADOR ----------
CREATE TABLE IF NOT EXISTS administrador (
  id_admin        INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL,            
  contrasena      VARCHAR(255) NOT NULL,            
  identificador   VARCHAR(20)  NOT NULL,            
  fecha_registro  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_admin_identificador (identificador)
) ENGINE=InnoDB;

--  SESIONES 

CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
  expires    INT UNSIGNED NOT NULL,
  data       MEDIUMTEXT COLLATE utf8mb4_bin,
  PRIMARY KEY (session_id)
) ENGINE=InnoDB;

--  PLANTILLA DE FORMULARIO 

CREATE TABLE IF NOT EXISTS plantilla_formulario (
  id_plantilla        INT AUTO_INCREMENT PRIMARY KEY,
  tipo                ENUM('solicitud','donacion') NOT NULL,
  campos              JSON NOT NULL,
  administrador_id    INT NULL,
  fecha_creacion      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_plantilla_tipo (tipo),
  CONSTRAINT fk_plantilla_admin FOREIGN KEY (administrador_id)
    REFERENCES administrador (id_admin) ON DELETE SET NULL
) ENGINE=InnoDB;

-- CATALOGO DE PADECIMIENTOS
CREATE TABLE IF NOT EXISTS catalogo_padecimiento (
  id_padecimiento INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_padecimiento_nombre (nombre)
) ENGINE=InnoDB;

INSERT INTO catalogo_padecimiento (nombre) VALUES
('diabetes'),
('azúcar alta'),
('presión alta'),
('hipertensión'),
('resfriado'),
('catarro'),
('gripa'),
('gripe'),
('infección de garganta'),
('anginas'),
('dolor de garganta'),
('asma'),
('falta de aire'),
('alergia'),
('alergia nasal'),
('pulmonía'),
('gastritis'),
('dolor de estómago'),
('reflujo'),
('agruras'),
('acidez'),
('diarrea'),
('infección estomacal'),
('dolor de cabeza'),
('migraña'),
('jaqueca'),
('infección urinaria'),
('cistitis'),
('colesterol alto'),
('triglicéridos altos'),
('tiroides'),
('ansiedad'),
('nervios'),
('depresión'),
('dolor de espalda'),
('lumbalgia'),
('anemia'),
('hierro bajo');


--  SOLICITUD DE MEDICAMENTO 
CREATE TABLE IF NOT EXISTS solicitud_medicamento (
  id_solicitud        INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id          INT NOT NULL,
  clinica_id          INT NULL,                    
  administrador_id    INT NULL,                     
  medicamento         VARCHAR(120) NOT NULL,
  padecimiento        VARCHAR(255) NULL,
  datos_extra         JSON NULL,                    
  estado              ENUM('pendiente','aceptada','rechazada') NOT NULL DEFAULT 'pendiente',
  fecha_solicitud     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_sol_usuario (usuario_id),
  KEY idx_sol_estado (estado),
  CONSTRAINT fk_sol_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuario (id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_sol_clinica FOREIGN KEY (clinica_id)
    REFERENCES clinica (id_clinica) ON DELETE SET NULL,
  CONSTRAINT fk_sol_admin FOREIGN KEY (administrador_id)
    REFERENCES administrador (id_admin) ON DELETE SET NULL
) ENGINE=InnoDB;

--  DONACION DE MEDICAMENTO ----------
CREATE TABLE IF NOT EXISTS donacion_medicamento (
  id_donacion         INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id          INT NOT NULL,
  administrador_id    INT NULL,
  medicamento_id      INT NULL,
  fecha_caducidad     DATE NOT NULL,
  cantidad            INT NOT NULL DEFAULT 1,
  datos_extra         JSON NULL,
  estado              ENUM('pendiente','aceptada','rechazada') NOT NULL DEFAULT 'pendiente',
  fecha_donacion      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_don_usuario (usuario_id),
  KEY idx_don_estado (estado),
  CONSTRAINT fk_don_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuario (id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_don_admin FOREIGN KEY (administrador_id)
    REFERENCES administrador (id_admin) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------- DATOS INICIALES: plantillas por defecto ----------
INSERT INTO plantilla_formulario (tipo, campos) VALUES
('solicitud', JSON_ARRAY(
  JSON_OBJECT('nombre','medicamento',  'etiqueta','¿Qué medicamento necesita?', 'tipo','texto', 'requerido', TRUE),
  JSON_OBJECT('nombre','padecimiento', 'etiqueta','Padecimiento',               'tipo','texto', 'requerido', FALSE)
)),
('donacion', JSON_ARRAY(
  JSON_OBJECT('nombre','medicamento',     'etiqueta','¿Qué medicamento?',    'tipo','texto',  'requerido', TRUE),
  JSON_OBJECT('nombre','fecha_caducidad', 'etiqueta','Fecha de caducidad',   'tipo','fecha',  'requerido', TRUE),
  JSON_OBJECT('nombre','cantidad',        'etiqueta','Cantidad',             'tipo','numero', 'requerido', FALSE)
))
ON DUPLICATE KEY UPDATE tipo = tipo;

-- ---------- ADMINISTRADOR INICIAL ----------
-- Nombre: Daniel Gomez · Identificador: EKGF123 · Contraseña: admin12345 
-
INSERT INTO administrador (nombre, contrasena, identificador)
VALUES ('Daniel Gomez', '$2a$10$hSLGzrYKOjwBKVO1DDCI4.XMMGaOQlgxB6AjSpuCdKRJA8F3pA51e', 'EKGF123')
ON DUPLICATE KEY UPDATE identificador = identificador;
