const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getDashboardWorkers(req, res) {
  try {
    const workers = await prisma.worker.findMany({
      include: {
        assignmentBuses: {
          include: {
            busTurno: true,  // 👈 en lugar de bus
          },
        },
        assignmentPlanes: {
          include: {
            plane: true,
          },
        },
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
    const buses = await prisma.busTurno.findMany({
      include: {
        assignmentBuses: {
          include: {
            trabajador: true,  // 👈 nuevo nombre en tu modelo
          },
        },
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

async function editCommercialPlaneAssignment(req, res) {
  const { id } = req.params;
  const { estado } = req.body;

  try {
    const updatedAssignment = await prisma.assignmentCommercialPlane.update({
      where: { id },
      data: { estado },
    });
    res.json(updatedAssignment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar la asignación de vuelo comercial' });
  }
}

module.exports = {
  getDashboardWorkers,
  getDashboardBuses,
  getDashboardPlanes,
  editCommercialPlaneAssignment
};