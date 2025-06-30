const tipo_turnoController = require('../../controllers/tipo-turno/tipo_turno.controller');
const express = require('express');
const router = express.Router();

// Rutas para manejar tipos de turno
router.get('/', tipo_turnoController.getAllShiftTypes); // Obtener todos los tipos de turno
router.post('/', tipo_turnoController.createShiftType); // Crear un nuevo tipo de turno
router.put('/:id', tipo_turnoController.updateShiftType); // Actualizar un tipo de turno existente
router.delete('/:id', tipo_turnoController.deleteShiftType); // Eliminar un

module.exports = router;