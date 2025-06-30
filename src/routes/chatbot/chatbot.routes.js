const express = require('express');
const { consultaOpenAI } = require('../../controllers/chatbot/chatbot.controller.js');
const { recibirMensaje, borrarHistorial } = require('../../controllers/chatbot/whatsapp.controller.js');
const router = express.Router();

/**
 * @swagger
 * /upload:
 *   post:
 *     summary: Subir un archivo Excel
 *     tags:
 *      - Carga de Archivos Excel
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       400:
 *         description: No se envió ningún archivo o la hoja no existe
 *       500:
 *         description: Error al procesar el archivo
 */
router.post('/ia', consultaOpenAI);

/**
 * @swagger
 * /upload:
 *   post:
 *     summary: Subir un archivo Excel
 *     tags:
 *      - Carga de Archivos Excel
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       400:
 *         description: No se envió ningún archivo o la hoja no existe
 *       500:
 *         description: Error al procesar el archivo
 */
router.post('/whatsapp', recibirMensaje);

/**
 * @swagger
 * /upload:
 *   post:
 *     summary: Subir un archivo Excel
 *     tags:
 *      - Carga de Archivos Excel
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       400:
 *         description: No se envió ningún archivo o la hoja no existe
 *       500:
 *         description: Error al procesar el archivo
 */
router.delete('/whatsapp', borrarHistorial);

module.exports = router;
