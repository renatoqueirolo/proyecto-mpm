const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create AssignmentPlane
const createAssignmentPlane = async (req, res) => {
  try {
    const newAssignment = await prisma.assignmentPlane.create({
      data: req.body,
    });
    res.status(201).json(newAssignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Read all AssignmentPlanes
const getAssignmentPlanes = async (req, res) => {
  try {
    const assignments = await prisma.assignmentPlane.findMany({
      include: {
        plane: true,
        worker: true,
      },
    });
    res.status(200).json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update AssignmentPlane
const updateAssignmentPlane = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await prisma.assignmentPlane.update({
      where: { id_assignment_plane: id },
      data: req.body,
    });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete AssignmentPlane
const deleteAssignmentPlane = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.assignmentPlane.delete({
      where: { id_assignment_plane: id },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteAllAssignmentPlanes = async (_req, res) => {
  try {
    await prisma.assignmentPlane.deleteMany({});
    res.status(200).json({ message: "Todas las asignaciones de vuelos fueron eliminadas correctamente." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAssignmentPlanes,
  createAssignmentPlane,
  updateAssignmentPlane,
  deleteAssignmentPlane,
  deleteAllAssignmentPlanes,
};
