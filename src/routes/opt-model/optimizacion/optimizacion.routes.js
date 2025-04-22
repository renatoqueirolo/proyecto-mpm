const express = require('express');
const router = express.Router();
const { ejecutarResolverModelo, ejecutarCrearBuses, runFullOptimizacion } = require('../../../controllers/opt-model/optimizacion/optimizacion.controller');

/**
 * @swagger
 * /asignar-itinerarios/run-opt:
 *   post:
 *     summary: Ejecuta el modelo de optimización completo
 *     tags:
 *      - Optimización de Itinerarios
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       400:
 *         description: No hay trabajadores o vuelos importados
 *       500:
 *         description: Error al ejecutar el modelo
 */
router.post('/run-opt', runFullOptimizacion);


/**
 * @swagger
 * /asignar-itinerarios/resolver-modelo:
 *   post:
 *     summary: Ejecuta el modelo de asignación de trabajadores
 *     tags:
 *      - Optimización de Itinerarios
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al ejecutar el modelo
 */
router.post('/resolver-modelo', ejecutarResolverModelo);

/**
 * @swagger
 * /asignar-itinerarios/crear-buses:
 *   post:
 *     summary: Crea los buses necesarios para satisfacer la demanda de trabajadores
 *     tags:
 *      - Optimización de Itinerarios
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al crear los buses
 */
router.post('/crear-buses', ejecutarCrearBuses);

module.exports = router;