const express = require('express');
const {
  createUser,
  deleteUser,
  getUser,
  getUsers,
  updateUser,
  getPlanes,
  createPlane,
  deletePlane,
  updatePlane,
  importarDesdeExcel,
  getRegions,
  createRegion,
  updateRegion,
  deleteRegion,
} = require('../../../controllers/auth/admin/admin.controller');
const { crearTurno } = require('../../../controllers/turno/turno.controller');
const {
  userMustBeAdmin,
  userMustBeLogged,
  userCannotBeVisualizador,
} = require('../../../middlewares/auth.middleware');

const router = express.Router();

router.use(userMustBeLogged);
router.use(userMustBeAdmin);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Obtiene todos los usuarios de la aplicación
 *     description: Obtiene una lista de todos los usuarios registrados en la aplicación. Se requiere un rol de administrador para acceder a esta ruta.
 *     tags:
 *       - Administración de Usuarios
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al obtener usuarios
 */
router.get('/users', getUsers);

/**
 * @swagger
 * /admin/users:
 *   post:
 *     summary: Crea un usuario en la aplicación
 *     description: Crea un nuevo usuario en la aplicación. Se requiere un rol de administrador para acceder a esta ruta.
 *     tags:
 *       - Administración de Usuarios
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al crear usuario
 */
router.post('/users', createUser);

/**
 * @swagger
 * /admin/users/:id:
 *   get:
 *     summary: Obtiene un usuario específico de la aplicación
 *     description: Obtiene los detalles de un usuario específico en la aplicación. Se requiere un rol de administrador para acceder a esta ruta.
 *     tags:
 *       - Administración de Usuarios
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al obtener usuario
 */
router.get('/users/:id', getUser);

/**
 * @swagger
 * /admin/users/:id:
 *   put:
 *     summary: Actualiza un usuario en la aplicación
 *     description: Actualiza la información de un usuario específico en la aplicación. Se requiere un rol de administrador para acceder a esta ruta.
 *     tags:
 *       - Administración de Usuarios
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al actualizar usuario
 */
router.put('/users/:id', updateUser);

/**
 * @swagger
 * /admin/users/:id:
 *   delete:
 *     summary: Elimina un usuario de la aplicación
 *     description: Elimina un usuario específico de la aplicación. Se requiere un rol de administrador para acceder a esta ruta.
 *     tags:
 *       - Administración de Usuarios
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al eliminar usuario
 */
router.delete('/users/:id', deleteUser);

/**
 * @swagger
 * /admin/planes/:
 *   get:
 *     summary: Obtiene todos los aviones de la aplicación
 *     tags:
 *      - Gestión de Aviones
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       400:
 *         description: Error al obtener los aviones
 */
router.get('/planes', getPlanes);

/**
 * @swagger
 * /admin/planes/:
 *   post:
 *     summary: Crea un nuevo avión
 *     tags:
 *      - Gestión de Aviones
 *     responses:
 *       201:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al crear el avión
 */
router.post('/planes', createPlane);

/**
 * @swagger
 * /admin/planes/:id:
 *   put:
 *     summary: Actualiza un avión existente
 *     tags:
 *      - Gestión de Aviones
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al actualizar el avión
 */
router.put('/planes/:id', updatePlane);

/**
 * @swagger
 * /admin/planes/:id:
 *   delete:
 *     summary: Elimina un avión existente
 *     tags:
 *      - Gestión de Aviones
 *     responses:
 *       204:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al eliminar el avión
 */
router.delete('/planes/:id', deletePlane);

/**
 * @swagger
 * /planes/import:
 *   post:
 *     summary: Importa aviones desde un archivo Excel
 *     tags:
 *      - Gestión de Aviones
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al importar los aviones
 */
router.post('/planes/import', importarDesdeExcel);

/**
 * @swagger
 * /admin/regions:
 *   get:
 *     summary: Obtiene todas las regiones de la aplicación
 *     tags:
 *      - Gestión de Regiones
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al obtener las regiones
 */
router.get('/regions', getRegions);

/**
 * @swagger
 * /admin/regions:
 *   post:
 *     summary: Crea una nueva región
 *     tags:
 *      - Gestión de Regiones
 *     responses:
 *       201:
 *         description: Región creada exitosamente
 *       400:
 *         description: Datos inválidos
 *       500:
 *         description: Error al crear la región
 */
router.post('/regions', createRegion);

/**
 * @swagger
 * /admin/regions/:id:
 *   put:
 *     summary: Actualiza una región existente
 *     tags:
 *      - Gestión de Regiones
 *     responses:
 *       200:
 *         description: Región actualizada exitosamente
 *       400:
 *         description: Datos inválidos
 *       500:
 *         description: Error al actualizar la región
 */
router.put('/regions/:id', updateRegion);

/**
 * @swagger
 * /admin/regions/:id:
 *   delete:
 *     summary: Elimina una región existente
 *     tags:
 *      - Gestión de Regiones
 *     responses:
 *       204:
 *         description: Región eliminada exitosamente
 *       500:
 *         description: Error al eliminar la región
 */
router.delete('/regions/:id', deleteRegion);

router.post('/turnos', userMustBeLogged, userCannotBeVisualizador, crearTurno);

module.exports = router;
