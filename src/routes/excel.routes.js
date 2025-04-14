const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Configurar multer
const upload = multer({ dest: 'uploads/' });

// Columnas obligatorias que debe tener el Excel
const MANDATORY_COLUMNS = [
  'RUT',
  'ACERCAMIENTO',
  'DESTINO'
];

// Función para validar las columnas del Excel
const validateExcelColumns = (data) => {
  if (data.length === 0) {
    return { isValid: false, error: 'El archivo Excel está vacío' };
  }

  const headers = Object.keys(data[0]);
  const missingColumns = MANDATORY_COLUMNS.filter(column => !headers.includes(column));

  if (missingColumns.length > 0) {
    return {
      isValid: false,
      error: `Faltan las siguientes columnas obligatorias: ${missingColumns.join(', ')}`
    };
  }

  return { isValid: true };
};

// Función para filtrar solo las columnas requeridas
const filterRequiredColumns = (data) => {
  return data.map(row => {
    const filteredRow = {};
    MANDATORY_COLUMNS.forEach(column => {
      filteredRow[column] = row[column];
    });
    return filteredRow;
  });
};

router.post('/upload', upload.single('file'), (req, res) => {
  console.log('Received upload request:', {
    file: req.file,
    body: req.body,
    selectedSheet: req.body.sheetName
  });

  if (!req.file) {
    return res.status(400).json({ error: 'No se envió ningún archivo' });
  }

  const filePath = req.file.path;
  const selectedSheet = req.body.sheetName;

  try {
    console.log('Reading workbook from:', filePath);
    const workbook = XLSX.readFile(filePath);
    console.log('Available sheets:', workbook.SheetNames);
    
    // If no sheet is specified, return the list of available sheets
    if (!selectedSheet) {
      console.log('No sheet selected, returning sheet list');
      fs.unlinkSync(filePath);
      return res.json({
        message: 'Archivo cargado exitosamente',
        sheets: workbook.SheetNames
      });
    }

    // Validate that the selected sheet exists
    if (!workbook.SheetNames.includes(selectedSheet)) {
      console.log('Selected sheet not found:', selectedSheet);
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: `La hoja "${selectedSheet}" no existe en el archivo` });
    }

    console.log('Processing sheet:', selectedSheet);
    const sheet = workbook.Sheets[selectedSheet];
    const data = XLSX.utils.sheet_to_json(sheet);
    console.log('Data from sheet:', data);

    // Validar las columnas
    const validation = validateExcelColumns(data);
    if (!validation.isValid) {
      console.log('Validation failed:', validation.error);
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: validation.error });
    }

    // Filtrar solo las columnas requeridas
    const filteredData = filterRequiredColumns(data);
    console.log('Filtered data:', filteredData);

    fs.unlinkSync(filePath);
    res.json({ 
      message: 'Archivo procesado exitosamente', 
      data: filteredData,
      columns: MANDATORY_COLUMNS
    });
  } catch (error) {
    console.error('Error processing file:', error);
    fs.unlinkSync(filePath);
    res.status(500).json({ 
      error: 'Error al procesar el archivo', 
      detail: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;
