const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Configurar multer
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se envió ningún archivo' });
  }

  const filePath = req.file.path;

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Tomamos la primera hoja
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet); // Convierte a array de objetos

    fs.unlinkSync(filePath); // borrar archivo temporal
    res.json({ message: 'Archivo procesado exitosamente', data });
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar el archivo', detail: error.message });
  }
});

module.exports = router;
