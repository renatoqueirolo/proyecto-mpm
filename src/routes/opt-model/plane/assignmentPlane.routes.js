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
 *     tags:https://github.com/renatoqueirolo/proyecto-mpm/pull/39/conflict?name=src%252Froutes.js&ancestor_oid=2d051d77b214798636a1205d147696bdf128b773&base_oid=ccddb71163a83229c9921f3d024668e58e782dce&head_oid=5626bdd9ce62ef3f51ba1a5a07359fb6a3f3fad6
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
