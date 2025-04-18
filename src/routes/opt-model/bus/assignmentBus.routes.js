const express = require('express');
const router = express.Router();
const {
  getAssignmentBuses,
  createAssignmentBus,
  updateAssignmentBus,
  deleteAssignmentBus,
  deleteAllAssignmentBus,
} = require('../../../controllers/opt-model/bus/assignmentBus.controller');

/**
 * @swagger
 * /assignmentBuses/:
 *   get:
 *     summary: Obtener todas las asignaciones de buses
 *     tags:
 *      - Asignaciones de Buses
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al obtener las asignaciones
 */
router.get('/', getAssignmentBuses);

/**
 * @swagger
 * /assignmentBuses/:
 *   post:
 *     summary: Crear una nueva asignación de bus
 *     tags:
 *      - Asignaciones de Buses
 *     responses:
 *       201:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al crear la asignación
 */
router.post('/', createAssignmentBus);

/**
 * @swagger
 * /assignmentBuses/:id:
 *   put:
 *     summary: Actualizar una asignación de bus
 *     tags:
 *      - Asignaciones de Buses
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al actualizar la asignación
 */
router.put('/:id', updateAssignmentBus);

/**
 * @swagger
 * /assignmentBuses/:id:
 *   delete:
 *     summary: Eliminar una asignación de bus
 *     tags:
 *      - Asignaciones de Buses
 *     responses:
 *       204:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al eliminar la asignación
 */
router.delete('/:id', deleteAssignmentBus);

/**
 * @swagger
 * /assignmentBuses/:
 *   delete:
 *     summary: Eliminar todas las asignaciones de buses
 *     tags:
 *      - Asignaciones de Buses
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al eliminar las asignaciones
 */
router.delete('/', deleteAllAssignmentBus);


module.exports = router;
