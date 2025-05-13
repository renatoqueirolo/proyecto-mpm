const express = require('express');
const router = express.Router();
const {
  getBusTurnos,
  createBusTurno,
  updateBusTurno,
  deleteBusTurno,
  deleteAllBusTurnos,
} = require('../../../controllers/opt-model/bus/busTurno.controller');


/**
 * @swagger
 * /buses/:
 *   get:
 *     summary: Obtener todos los buses
 *     tags:
 *      - Gestión de Buses
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al obtener los buses
 */
router.get('/', getBusTurnos);

/**
 * @swagger
 * /buses/:
 *   post:
 *     summary: Crear un nuevo bus
 *     tags:
 *      - Gestión de Buses
 *     responses:
 *       201:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al crear el bus
 */
router.post('/', createBusTurno);

/**
 * @swagger
 * /buses/:id:
 *   put:
 *     summary: Actualizar un bus existente
 *     tags:
 *      - Gestión de Buses
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al actualizar el bus
 */
router.put('/:id', updateBusTurno);

/**
 * @swagger
 * /buses/:id:
 *   delete:
 *     summary: Eliminar un bus existente
 *     tags:
 *      - Gestión de Buses
 *     responses:
 *       204:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al eliminar el bus
 */
router.delete('/:id', deleteBusTurno);

/**
 * @swagger
 * /buses/:
 *   delete:
 *     summary: Eliminar todos los buses
 *     tags:
 *      - Gestión de Buses
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al eliminar los buses
 */
router.delete('/', deleteAllBusTurnos);


module.exports = router;
