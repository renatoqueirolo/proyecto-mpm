const express = require('express');
const router = express.Router();
const {
  getBuses,
  createBus,
  updateBus,
  deleteBus,
  deleteAllBuses,
} = require('../../../controllers/opt-model/bus/bus.controller');

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
router.get('/', getBuses);

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
router.post('/', createBus);

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
router.put('/:id', updateBus);

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
router.delete('/:id', deleteBus);

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
router.delete('/', deleteAllBuses);

module.exports = router;
