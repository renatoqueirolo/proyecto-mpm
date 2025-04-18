const express = require('express');
const multer = require('multer');
const { handleUpload } = require('../../controllers/upload-excel/excel.controller');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

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
router.post('/upload', upload.single('file'), handleUpload);

module.exports = router;
