const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');
const prisma = new PrismaClient();

const getWorkers = async (_req, res) => {
  try {
    const workers = await prisma.worker.findMany();
    return res.json(workers);
  } catch (error) {
    console.error("Error al obtener trabajadores ->", error.message);
    return res.status(500).json({ message: error.message });
  } finally {
    await prisma.$disconnect();
  }
};

const getWorkerById = async (req, res) => {
  try {
    const { rut } = req.params;
    const worker = await prisma.worker.findUnique({ where: { rut } });
    if (!worker) {
      return res.status(404).json({ message: "Trabajador no encontrado" });
    }
    return res.json(worker);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  } finally {
    await prisma.$disconnect();
  }
};

const createWorker = async (req, res) => {
  try {
    const {
      rut, nombreCompleto, subida, telefono,
      email, region, comuna, acercamiento,
      origenAvion, destinoAvion
    } = req.body;

    const existing = await prisma.worker.findUnique({ where: { rut } });
    if (existing) {
      throw new Error("El trabajador con este RUT ya existe.");
    }

    const newWorker = await prisma.worker.create({
      data: {
        rut,
        nombreCompleto,
        subida,
        telefono,
        email,
        region,
        comuna,
        acercamiento,
        origenAvion,
        destinoAvion
      }
    });

    return res.status(201).json(newWorker);
  } catch (error) {
    console.error("Error al crear trabajador ->", error.message);
    return res.status(500).json({ message: error.message });
  } finally {
    await prisma.$disconnect();
  }
};

const updateWorker = async (req, res) => {
  try {
    const { rut } = req.params;
    const updated = await prisma.worker.update({
      where: { rut },
      data: req.body
    });
    return res.status(200).json(updated);
  } catch (error) {
    console.error("Error al actualizar trabajador ->", error.message);
    return res.status(500).json({ message: error.message });
  } finally {
    await prisma.$disconnect();
  }
};

const deleteWorker = async (req, res) => {
  try {
    const { rut } = req.params;
    await prisma.worker.delete({ where: { rut } });
    return res.status(204).send();
  } catch (error) {
    console.error("Error al eliminar trabajador ->", error.message);
    return res.status(500).json({ message: error.message });
  } finally {
    await prisma.$disconnect();
  }
};

const deleteAllWorkers = async (_req, res) => {
  try {
    await prisma.assignmentPlane.deleteMany({});
    await prisma.assignmentBus.deleteMany({});
    await prisma.worker.deleteMany({});
    return res.status(200).json({ message: "Todos los trabajadores y sus asignaciones fueron eliminados." });
  } catch (error) {
    console.error("Error al eliminar todos los trabajadores ->", error.message);
    return res.status(500).json({ message: error.message });
  } finally {
    await prisma.$disconnect();
  }
};

const importarDesdeExcel = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo' });
    }

    const file = req.files.file;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.data);
    const sheetName = req.body.sheetName || workbook.worksheets[0].name;
    const sheet = workbook.getWorksheet(sheetName);

    if (!sheet) {
      return res.status(400).json({ error: `No se encontró la hoja ${sheetName}` });
    }

    const isSubida = sheetName.toUpperCase().includes('SUBIDA');
    const isBajada = sheetName.toUpperCase().includes('BAJADA');

    if (!isSubida && !isBajada) {
      return res.status(400).json({ 
        error: `El nombre de la hoja debe contener 'SUBIDA' o 'BAJADA' para determinar el tipo de trabajadores` 
      });
    }

    const rows = [];
    const headersRow = sheet.getRow(1);
    const headers = headersRow.values.slice(1).map(val => (val ? String(val).trim().toUpperCase() : ''));

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const rowData = {};
      row.values.slice(1).forEach((cell, idx) => {
        const key = headers[idx];
        rowData[key] = cell;
      });
      rows.push(rowData);
    });

    let totalInsertados = 0;
    for (const row of rows) {
      const rut = row['RUT'];
      if (!rut) continue;

      const nombreCompleto = row['NOMBRE COMPLETO'];
      const telefono = row['TELÉFONO']?.toString();
      const region = row['REGIÓN']?.toUpperCase().trim();
      const comuna = row['COMUNA / RESIDENCIA'];
      const acercamiento = row['ACERCAMIENTO']?.toUpperCase().trim();
      const [origenAvion, destinoAvion] = row['ORIGEN / DESTINO']?.split('/')?.map(s => s.trim()) || [null, null];

      const existe = await prisma.worker.findUnique({ where: { rut } });
      if (existe) continue;

      await prisma.worker.create({
        data: {
          rut,
          nombreCompleto,
          subida: isSubida,
          telefono,
          email: null,
          region,
          comuna,
          acercamiento,
          origenAvion: origenAvion?.toUpperCase() || null,
          destinoAvion: destinoAvion?.toUpperCase() || null,
        }
      });
      totalInsertados++;
    }

    return res.status(200).json({ 
      message: totalInsertados === 0 
        ? "No se encontraron nuevos trabajadores para importar" 
        : `Se importaron ${totalInsertados} trabajadores ${isSubida ? 'de subida' : 'de bajada'} exitosamente`,
      data: rows,
      columns: headers
    });
  } catch (error) {
    console.error("Error al importar trabajadores:", error);
    return res.status(500).json({ error: error.message });
  } finally {
    await prisma.$disconnect();
  }
};

module.exports = {
  getWorkers,
  getWorkerById,
  createWorker,
  updateWorker,
  deleteWorker,
  deleteAllWorkers,
  importarDesdeExcel
};