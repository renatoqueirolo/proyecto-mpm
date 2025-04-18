const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create Plane
const createPlane = async (req, res) => {
  try {
    const newPlane = await prisma.plane.create({
      data: req.body,
    });
    res.status(201).json(newPlane);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Read all Planes
const getPlanes = async (req, res) => {
  try {
    const planes = await prisma.plane.findMany();
    res.status(200).json(planes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Plane
const updatePlane = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedPlane = await prisma.plane.update({
      where: { id_plane: id },
      data: req.body,
    });
    res.status(200).json(updatedPlane);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete Plane
const deletePlane = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.plane.delete({
      where: { id_plane: id },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteAllPlanes = async (_req, res) => {
  try {
    await prisma.plane.deleteMany({});
    res.status(200).json({ message: "Todos los vuelos fueron eliminados correctamente." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const importarPlanes = require('../../../scripts/importPlanes');

const importarDesdeExcel = async (req, res) => {
  try {
    const mensaje = await importarPlanes();
    res.status(200).json({ message: mensaje });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getPlanes,
  createPlane,
  updatePlane,
  deletePlane,
  deleteAllPlanes,
  importarDesdeExcel,
};
