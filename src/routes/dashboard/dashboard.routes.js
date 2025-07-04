const express = require('express');
const {
  getDashboardWorkers,
  getDashboardBuses,
  getDashboardPlanes,
  editCommercialPlaneAssignment
} = require('../../controllers/dashboard/dashboard.controller');

const router = express.Router();

/**
 * @swagger
 * /dashboard/workers:
 *   get:
 *     summary: Obtener todos los trabajadores con sus asignaciones de buses y aviones
 *     tags:
 *       - Dashboard
 *     responses:
 *       200:
 *         description: Lista de trabajadores
 *       500:
 *         description: Error al obtener los trabajadores
 */
router.get('/workers', getDashboardWorkers);

/**
 * @swagger
 * /dashboard/buses:
 *   get:
 *     summary: Obtener todos los buses con los trabajadores asignados
 *     tags:
 *       - Dashboard
 *     responses:
 *       200:
 *         description: Lista de buses
 *       500:
 *         description: Error al obtener los buses
 */
router.get('/buses', getDashboardBuses);

/**
 * @swagger
 * /dashboard/planes:
 *   get:
 *     summary: Obtener todos los aviones con los trabajadores asignados
 *     tags:
 *       - Dashboard
 *     responses:
 *       200:
 *         description: Lista de aviones
 *       500:
 *         description: Error al obtener los aviones
 */
router.get('/planes', getDashboardPlanes);

/**
 * @swagger
 * /dashboard/planes/{id}/asignacion-comercial:
 *   patch:
 *     summary: Editar la asignación de un avión comercial
 *     tags:
 *       - Dashboard
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del avión comercial
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estado:
 *                 type: string
 *     responses:
 *       200:
 *         description: Asignación actualizada correctamente
 *       500:
 *         description: Error al actualizar la asignación
 */
router.patch('/asignacion-comercial/:id', editCommercialPlaneAssignment);

module.exports = router;
