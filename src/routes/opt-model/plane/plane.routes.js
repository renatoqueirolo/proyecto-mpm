const express = require('express');
const router = express.Router();
const {
  getPlanes,
  createPlane,
  updatePlane,
  deletePlane,
  deleteAllPlanes,
  importarDesdeExcel,
} = require('../../../controllers/opt-model/plane/plane.controller');

/**
 * @swagger
 * /planes/:
 *   get:
 *     summary: Obtiene todos los aviones de la aplicación
 *     tags:
 *      - Gestión de Aviones
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       400:
 *         description: Error al obtener los aviones
 */
router.get('/', getPlanes);

/**
 * @swagger
 * /planes/:
 *   post:
 *     summary: Crea un nuevo avión
 *     tags:
 *      - Gestión de Aviones
 *     responses:
 *       201:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al crear el avión
 */
router.post('/', createPlane);

/**
 * @swagger
 * /planes/:id:
 *   put:
 *     summary: Actualiza un avión existente
 *     tags:
 *      - Gestión de Aviones
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al actualizar el avión
 */
router.put('/:id', updatePlane);

/**
 * @swagger
 * /planes/:id:
 *   delete:
 *     summary: Elimina un avión existente
 *     tags:
 *      - Gestión de Aviones
 *     responses:
 *       204:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al eliminar el avión
 */
router.delete('/:id', deletePlane);

/**
 * @swagger
 * /planes/:
 *   delete:
 *     summary: Elimina todos los aviones
 *     tags:
 *      - Gestión de Aviones
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al eliminar los aviones
 */
router.delete('/', deleteAllPlanes);

/**
 * @swagger
 * /planes/import:
 *   post:
 *     summary: Importa aviones desde un archivo Excel
 *     tags:
 *      - Gestión de Aviones
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error al importar los aviones
 */
router.post('/import', importarDesdeExcel);



module.exports = router;
