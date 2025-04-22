const express = require('express');
const {
  getDashboardWorkers,
  getDashboardBuses,
  getDashboardPlanes,
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

module.exports = router;
