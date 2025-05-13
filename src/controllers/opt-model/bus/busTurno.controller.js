const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Crear un nuevo BusTurno
const createBusTurno = async (req, res) => {
  try {
    const newBusTurno = await prisma.busTurno.create({
      data: req.body,
    });
    res.status(201).json(newBusTurno);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener todos los registros de BusTurno
const getBusTurnos = async (_req, res) => {
  try {
    const busTurnos = await prisma.busTurno.findMany({
      include: {
        turno: true,
      },
    });
    res.status(200).json(busTurnos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Actualizar un BusTurno por ID
const updateBusTurno = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await prisma.busTurno.update({
      where: { id },
      data: req.body,
    });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Eliminar un BusTurno por ID
const deleteBusTurno = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.busTurno.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Eliminar todos los BusTurnos
const deleteAllBusTurnos = async (_req, res) => {
  try {
    await prisma.busTurno.deleteMany({});
    res.status(200).json({ message: "Todos los buses del turno fueron eliminados correctamente." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getBusTurnos,
  createBusTurno,
  updateBusTurno,
  deleteBusTurno,
  deleteAllBusTurnos,
};
