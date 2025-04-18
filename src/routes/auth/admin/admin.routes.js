const express = require('express');
const {
  createUser,
  deleteUser,
  getUser,
  getUsers,
  updateUser,
} = require('../../../controllers/auth/admin/admin.controller');
const {
  userMustBeAdmin,
  userMustBeLogged,
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

module.exports = router;
