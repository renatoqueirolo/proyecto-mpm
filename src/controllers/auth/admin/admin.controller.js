const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

const ALL_PROJECTS = ["ESCONDIDA", "SPENCE", "EL_TENIENTE"];

const getUsers = async (_req, res) => {
  try {
    const users = await prisma.user.findMany();
    return res.json(users);
  } catch (error) {
    console.error("Error al obtener usuarios ->", error.message);
    return res.status(500).json({ message: error.message });
  } finally {
    await prisma.$disconnect();
  }
};

const createUser = async (req, res) => {
  try {
    const { email, password, name, role, proyectos } = req.body;
    if (!email || !password || !name || !role) {
      throw new Error("Todos los campos son obligatorios.");
    }
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error("El email ya está en uso.");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    // Si el rol es VISUALIZADOR, asignar todos los proyectos automáticamente
    const proyectosToSave = role === "VISUALIZADOR" ? ALL_PROJECTS : proyectos;
    const newUser = await prisma.user.create({
      data: { email, password: hashedPassword, name, role, proyectos: proyectosToSave },
    });
    return res.json(newUser);
  } catch (error) {
    console.error("Error al crear usuario ->", error.message);
    return res.status(500).json({ message: error.message });
  } finally {
    await prisma.$disconnect();
  }
};

const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id: id } });
    if (!user) throw new Error("El usuario con el ID señalado no existe.");
    return res.json(user);
  } catch (error) {
    console.error("Error al obtener usuario ->", error.message);
    return res.status(500).json({ message: error.message });
  } finally {
    await prisma.$disconnect();
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, proyectos, role } = req.body;
    // Si el rol es VISUALIZADOR, asignar todos los proyectos automáticamente
    const proyectosToSave = role === "VISUALIZADOR" ? ALL_PROJECTS : proyectos;
    const updatedUser = await prisma.user.update({
      where: { id: id },
      data: { name, email, proyectos: proyectosToSave, role },
    });
    return res.status(200).json({ message: "Usuario actualizado correctamente.", updatedUser });
  } catch (error) {
    console.error("Error al actualizar usuario ->", error.message);
    return res.status(500).json({ message: error.message });
  } finally {
    await prisma.$disconnect();
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await prisma.user.delete({ where: { id: id } });
    return res.status(200).json({ message: "Usuario eliminado correctamente.", deletedUser });
  } catch (error) {
    console.error("Error al eliminar usuario ->", error.message);
    return res.status(500).json({ message: error.message });
  } finally {
    await prisma.$disconnect();
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

// Delete Plane
const deletePlane = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.plane.delete({
      where: { id: id },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Plane
const updatePlane = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedPlane = await prisma.plane.update({
      where: { id: id },
      data: req.body,
    });
    res.status(200).json(updatedPlane);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const importarPlanes = require('../../../scripts/importPlanes');

const importarDesdeExcel = async (req, res) => {
  try {
    // Llamamos a la función que importa los planes
    const avionesImportados = await importarPlanes();
    console.log(avionesImportados);
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
  getUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
  getPlanes,
  createPlane,
  deletePlane,
  updatePlane,
  importarDesdeExcel,
};
