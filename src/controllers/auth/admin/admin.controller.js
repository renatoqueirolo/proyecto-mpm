const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

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
    const { email, password, name, role } = req.body;
    if (!email || !password || !name || !role) {
      throw new Error("Todos los campos son obligatorios.");
    }
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error("El email ya está en uso.");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: { email, password: hashedPassword, name, role },
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
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
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
    const { name, email, password, role } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { name, email, password, role },
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
    const deletedUser = await prisma.user.delete({ where: { id: parseInt(id) } });
    return res.status(200).json({ message: "Usuario eliminado correctamente.", deletedUser });
  } catch (error) {
    console.error("Error al eliminar usuario ->", error.message);
    return res.status(500).json({ message: error.message });
  } finally {
    await prisma.$disconnect();
  }
};

module.exports = {
  getUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
};
