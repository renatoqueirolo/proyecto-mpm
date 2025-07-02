const proyectoController = require('../../controllers/proyecto/proyecto.controller');
const express = require('express');
const router = express.Router();

// Rutas para manejar proyectos
router.get('/', proyectoController.getAllProjects); // Obtener todos los proyectos
router.post('/', proyectoController.createProject); // Crear un nuevo proyecto
router.put('/:id', proyectoController.updateProject); // Actualizar un proyecto existente
router.delete('/:id', proyectoController.deleteProject); // Eliminar un proyecto

module.exports = router;