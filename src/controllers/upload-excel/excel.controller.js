const ExcelJS = require('exceljs');
const fs = require('fs');

const MANDATORY_COLUMNS = ['RUT', 'ACERCAMIENTO', 'REGIÓN', 'DESTINO'];

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

const handleUpload = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se envió ningún archivo' });
  }

  const filePath = req.file.path;
  const selectedSheet = req.body.sheetName;

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheetNames = workbook.worksheets.map(sheet => sheet.name);

    if (!selectedSheet) {
      fs.unlinkSync(filePath);
      return res.json({
        message: 'Archivo cargado exitosamente',
        sheets: sheetNames
      });
    }

    const worksheet = workbook.getWorksheet(selectedSheet);
    if (!worksheet) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: `La hoja "${selectedSheet}" no existe en el archivo` });
    }

    const rows = [];
    const headers = [];
    worksheet.getRow(1).eachCell(cell => headers.push(cell.value));

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Saltar encabezados
      const rowData = {};
      row.eachCell((cell, colNumber) => {
        rowData[headers[colNumber - 1]] = cell.value;
      });
      rows.push(rowData);
    });

    const validation = validateExcelColumns(rows);
    if (!validation.isValid) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: validation.error });
    }

    const filteredData = filterRequiredColumns(rows);
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
