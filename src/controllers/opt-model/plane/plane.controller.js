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
    // First delete all related assignments
    await prisma.assignmentPlane.deleteMany({});
    
    // Then delete all planes
    await prisma.plane.deleteMany({});
    
    return res.status(200).json({ message: "Todos los aviones y sus asignaciones fueron eliminados." });
  } catch (error) {
    console.error("Error al eliminar todos los aviones ->", error.message);
    return res.status(500).json({ message: error.message });
  } finally {
    await prisma.$disconnect();
  }
};

const importarPlanes = require('../../../scripts/importPlanes');

const importarDesdeExcel = async (req, res) => {
  try {
    // Llamamos a la función que importa los planes
    const avionesImportados = await importarPlanes();

    // Si los aviones se importan correctamente, los enviamos en la respuesta
    if (Array.isArray(avionesImportados) && avionesImportados.length > 0) {
      res.status(200).json(avionesImportados);
    } else {
      // En caso de que no se haya importado ningún avión
      res.status(200).json({ message: 'No se importaron aviones nuevos.' });
    }
  } catch (error) {
    // Si ocurre un error, lo manejamos y enviamos un mensaje adecuado
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
