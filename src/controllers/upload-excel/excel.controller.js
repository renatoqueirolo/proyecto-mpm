const XLSX = require('xlsx');
const fs = require('fs');

const MANDATORY_COLUMNS = ['RUT', 'ACERCAMIENTO', 'DESTINO'];

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

const filterRequiredColumns = (data) => {
  return data.map(row => {
    const filteredRow = {};
    MANDATORY_COLUMNS.forEach(column => {
      filteredRow[column] = row[column];
    });
    return filteredRow;
  });
};

const handleUpload = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se envió ningún archivo' });
  }

  const filePath = req.file.path;
  const selectedSheet = req.body.sheetName;

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;

    if (!selectedSheet) {
      fs.unlinkSync(filePath);
      return res.json({
        message: 'Archivo cargado exitosamente',
        sheets: sheetNames
      });
    }

    if (!sheetNames.includes(selectedSheet)) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: `La hoja "${selectedSheet}" no existe en el archivo` });
    }

    const sheet = workbook.Sheets[selectedSheet];
    const data = XLSX.utils.sheet_to_json(sheet);

    const validation = validateExcelColumns(data);
    if (!validation.isValid) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: validation.error });
    }

    const filteredData = filterRequiredColumns(data);
    fs.unlinkSync(filePath);

    return res.json({
      message: 'Archivo procesado exitosamente',
      data: filteredData,
      columns: MANDATORY_COLUMNS
    });
  } catch (error) {
    fs.unlinkSync(filePath);
    return res.status(500).json({
      error: 'Error al procesar el archivo',
      detail: error.message,
      stack: error.stack
    });
  }
};

module.exports = { handleUpload };
