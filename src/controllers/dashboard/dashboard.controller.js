const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getDashboardWorkers(req, res) {
  try {
    const workers = await prisma.worker.findMany({
      include: {
        assignmentBuses: { include: { bus: true } },
        assignmentPlanes: { include: { plane: true } },
      },
    });
    res.json(workers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los trabajadores' });
  }
}

async function getDashboardBuses(req, res) {
  try {
    const buses = await prisma.bus.findMany({
      include: {
        assignmentBuses: { include: { worker: true } },
      },
    });
    res.json(buses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los buses' });
  }
}

async function getDashboardPlanes(req, res) {
  try {
    const planes = await prisma.plane.findMany({
      include: {
        assignmentPlanes: { include: { worker: true } },
      },
    });
    res.json(planes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los aviones' });
  }
}

module.exports = {
  getDashboardWorkers,
  getDashboardBuses,
  getDashboardPlanes,
};