const { PrismaClient } = require('@prisma/client');
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

    return res.json(newWorker);
  } catch (error) {
    console.error("Error al crear trabajador ->", error.message);
    return res.status(500).json({ message: error.message });
  } finally {
    await prisma.$disconnect();
  }
};

module.exports = {
  getWorkers,
  createWorker,
};
