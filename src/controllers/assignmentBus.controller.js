const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create AssignmentBus
const createAssignmentBus = async (req, res) => {
  try {
    const newAssignment = await prisma.assignmentBus.create({
      data: req.body,
    });
    res.status(201).json(newAssignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Read all AssignmentBuses
const getAssignmentBuses = async (req, res) => {
  try {
    const assignments = await prisma.assignmentBus.findMany({
      include: {
        bus: true,
        worker: true,
      },
    });
    res.status(200).json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update AssignmentBus by ID
const updateAssignmentBus = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await prisma.assignmentBus.update({
      where: { id_assignment_bus: id },
      data: req.body,
    });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete AssignmentBus by ID
const deleteAssignmentBus = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.assignmentBus.delete({
      where: { id_assignment_bus: id },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAssignmentBuses,
  createAssignmentBus,
  updateAssignmentBus,
  deleteAssignmentBus,
};
