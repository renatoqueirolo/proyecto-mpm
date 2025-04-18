const express = require('express');
const router = express.Router();
const {
  getWorkers,
  getWorkerById,
  createWorker,
  updateWorker,
  deleteWorker,
  deleteAllWorkers,
  importarDesdeExcel,
} = require('../../../controllers/opt-model/worker/worker.controller');

/**
 * @swagger
 * /workers/:
 *   get:
 *     summary: Obtener todos los trabajadores
 *     tags:
 *      - Gestión de Trabajadores
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al obtener trabajadores
 */
router.get('/', getWorkers);

/**
 * @swagger
 * /workers/:rut:
 *   get:
 *     summary: Obtener trabajador por RUT
 *     tags:
 *      - Gestión de Trabajadores
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       404:
 *         description: Trabajador no encontrado
 *       500:
 *         description: Error al obtener trabajador
 */
router.get('/:rut', getWorkerById);

/**
 * @swagger
 * /workers/:
 *   post:
 *     summary: Crear nuevo trabajador
 *     tags:
 *      - Gestión de Trabajadores
 *     responses:
 *       201:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al crear trabajador
 */
router.post('/', createWorker);

/**
 * @swagger
 * /workers/:rut:
 *   put:
 *     summary: Actualizar trabajador por RUT
 *     tags:
 *      - Gestión de Trabajadores
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al actualizar trabajador
 */
router.put('/:rut', updateWorker);

/**
 * @swagger
 * /workers/:rut:
 *   delete:
 *     summary: Eliminar trabajador por RUT
 *     tags:
 *      - Gestión de Trabajadores
 *     responses:
 *       204:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al eliminar trabajador
 */
router.delete('/:rut', deleteWorker);

/**
 * @swagger
 * /workers/:
 *   delete:
 *     summary: Eliminar todos los trabajadores
 *     tags:
 *      - Gestión de Trabajadores
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al eliminar trabajadores
 */
router.delete('/', deleteAllWorkers);

/**
 * @swagger
 * /workers/import:
 *   post:
 *     summary: Importar trabajadores desde un archivo Excel
 *     tags:
 *      - Gestión de Trabajadores
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al importar trabajadores
 */
router.post('/import', importarDesdeExcel);


module.exports = router;
