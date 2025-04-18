const express = require('express');
const router = express.Router();
const {
  getAssignmentPlanes,
  createAssignmentPlane,
  updateAssignmentPlane,
  deleteAssignmentPlane,
  deleteAllAssignmentPlanes,
} = require('../../../controllers/opt-model/plane/assignmentPlane.controller');

/**
 * @swagger
 * /assignmentPlanes/:
 *   get:
 *     summary: Obtiene todos las asignaciones de aviones
 *     tags:
 *      - Asignaciones de Aviones
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al obtener las asignaciones
 */
router.get('/', getAssignmentPlanes);

/**
 * @swagger
 * /assignmentPlanes/:
 *   post:
 *     summary: Crea una nueva asignación de avión
 *     tags:
 *      - Asignaciones de Aviones
 *     responses:
 *       201:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al crear la asignación
 */
router.post('/', createAssignmentPlane);

/**
 * @swagger
 * /assignmentPlanes/:id:
 *   put:
 *     summary: Actualiza una asignación de avión existente
 *     tags:
 *      - Asignaciones de Aviones
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al actualizar la asignación
 */
router.put('/:id', updateAssignmentPlane);

/**
 * @swagger
 * /assignmentPlanes/:id:
 *   delete:
 *     summary: Elimina una asignación de avión existente
 *     tags:
 *      - Asignaciones de Aviones
 *     responses:
 *       204:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al eliminar la asignación
 */
router.delete('/:id', deleteAssignmentPlane);

/**
 * @swagger
 * /assignmentPlanes/:
 *   delete:
 *     summary: Elimina todas las asignaciones de aviones
 *     tags:
 *      - Asignaciones de Aviones
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al eliminar las asignaciones
 */
router.delete('/', deleteAllAssignmentPlanes);


module.exports = router;
