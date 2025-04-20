const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
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
    await prisma.worker.deleteMany({});
    return res.status(200).json({ message: "Todos los trabajadores fueron eliminados." });
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
    const workbook = xlsx.read(file.data, { type: 'buffer' });
    const sheetName = req.body.sheetName || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    if (!sheet) {
      return res.status(400).json({ error: `No se encontró la hoja ${sheetName}` });
    }

    const data = xlsx.utils.sheet_to_json(sheet);
    let totalInsertados = 0;

    for (const row of data) {
      const rut = row["RUT"];
      if (!rut) continue;

      const nombreCompleto = row["NOMBRE COMPLETO"];
      const telefono = row["TELEFONO"]?.toString();
      const region = row["REGION"];
      const comuna = row["COMUNA"];
      const acercamiento = row["ACERCAMIENTO"]?.toUpperCase().trim();
      const origenAvion = row["ORIGEN AVION"];
      const destinoAvion = row["DESTINO AVION"];

      const existe = await prisma.worker.findUnique({ where: { rut } });
      if (existe) continue;

      await prisma.worker.create({
        data: {
          rut,
          nombreCompleto,
          subida: true,
          telefono,
          email: null,
          region,
          comuna,
          acercamiento,
          origenAvion,
          destinoAvion,
        }
      });
      totalInsertados++;
    }

    return res.status(200).json({ 
      message: totalInsertados === 0 
        ? "Todos los trabajadores ya existían en la base de datos" 
        : `Se añadieron ${totalInsertados} trabajadores nuevos exitosamente, el resto ya existían en la base de datos`,
      data: data,
      columns: Object.keys(data[0] || {})
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
