const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getAllShiftTypes(req, res) {
  try {
    const shiftTypes = await prisma.shiftType.findMany();
    res.json(shiftTypes);
  } catch (error) {
    console.error("Error fetching shift types:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

async function createShiftType(req, res) {
  try {
    const { name } = req.body;
    
    if (!name ) {
      return res.status(400).json({ error: "El nombre es requerido" });
    }
    
    const shiftType = await prisma.shiftType.create({
      data: { name }
    });
    
    res.status(201).json(shiftType);
  } catch (error) {
    console.error("Error creating shift type:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

async function updateShiftType(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "El nombre es requerido" });
    }
    
    const shiftType = await prisma.shiftType.update({
      where: { id },
      data: { name }
    });
    
    res.json(shiftType);
  } catch (error) {
    console.error("Error updating shift type:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

async function deleteShiftType(req, res) {
  try {
    const { id } = req.params;
    
    await prisma.shiftType.delete({
      where: { id }
    });
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting shift type:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

module.exports = {
  getAllShiftTypes,
  createShiftType,
  updateShiftType,
  deleteShiftType
};