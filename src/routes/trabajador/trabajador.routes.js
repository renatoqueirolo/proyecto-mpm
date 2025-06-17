const express = require('express');
const {
  editTrabajador,
  getTrabajador,
  getTrabajadores
} = require('../../controllers/trabajador/trabajador.controller');
const {
  userMustBeLogged,
} = require('../../middlewares/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * /trabajadores/{id}:
 *   get:
 *     summary: Obtiene los datos de un trabajador por su ID
 *     description: Este endpoint permite obtener los datos de un trabajador específico utilizando su ID.
 *     tags:
 *      - Trabajadores
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del trabajador a obtener
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Respuesta exitosa con los datos del trabajador
 *       404:
 *         description: Trabajador no encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/:trabajadorId', userMustBeLogged, getTrabajador);

/**
 * @swagger
 * /trabajadores/{id}:
 *   put:
 *     summary: Edita los datos de un trabajador por su ID
 *     description: Este endpoint permite editar los datos de un trabajador específico utilizando su ID.
 *     tags:
 *      - Trabajadores
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del trabajador a editar
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Respuesta exitosa con los datos actualizados del trabajador
 *       400:
 *         description: Error de validación de datos
 *       404:
 *         description: Trabajador no encontrado
 *       500:
 *         description: Error del servidor
 */
router.put('/:id', userMustBeLogged, editTrabajador);

/**
 * @swagger
 * /trabajadores:
 *   get:
 *     summary: Obtiene la lista de todos los trabajadores
 *     description: Este endpoint permite obtener la lista de todos los trabajadores registrados en el sistema.
 *     tags:
 *      - Trabajadores
 *     responses:
 *       200:
 *         description: Respuesta exitosa con la lista de trabajadores
 *       500:
 *         description: Error del servidor
 */
router.get('/', userMustBeLogged, getTrabajadores);

module.exports = router;