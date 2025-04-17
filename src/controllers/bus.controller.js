const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create Bus
const createBus = async (req, res) => {
  try {
    const newBus = await prisma.bus.create({
      data: req.body,
    });
    res.status(201).json(newBus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Read all Buses
const getBuses = async (req, res) => {
  try {
    const buses = await prisma.bus.findMany();
    res.status(200).json(buses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Bus by ID
const updateBus = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBus = await prisma.bus.update({
      where: { id_bus: id },
      data: req.body,
    });
    res.status(200).json(updatedBus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete Bus by ID
const deleteBus = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.bus.delete({
      where: { id_bus: id },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getBuses,
  createBus,
  updateBus,
  deleteBus,
};
