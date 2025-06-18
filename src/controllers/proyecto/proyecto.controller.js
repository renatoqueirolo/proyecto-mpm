const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getAllProjects(req, res) {
  try {
    const projects = await prisma.project.findMany();
    res.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

async function createProject(req, res) {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "El nombre del proyecto es requerido" });
    }
    
    const project = await prisma.project.create({
      data: { name }
    });
    
    res.status(201).json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

async function updateProject(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "El nombre del proyecto es requerido" });
    }
    
    const project = await prisma.project.update({
      where: { id },
      data: { name }
    });
    
    res.json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

async function deleteProject(req, res) {
  try {
    const { id } = req.params;
    
    await prisma.project.delete({
      where: { id }
    });
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

module.exports = {
  getAllProjects,
  createProject,
  updateProject,
  deleteProject
};