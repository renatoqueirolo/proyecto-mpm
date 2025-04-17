const express = require('express');
const router = express.Router();
const {
  getAssignmentBuses,
  createAssignmentBus,
  updateAssignmentBus,
  deleteAssignmentBus,
} = require('../controllers/assignmentBus.controller');

router.get('/assignments', getAssignmentBuses);
router.post('/assignments', createAssignmentBus);
router.put('/assignments/:id', updateAssignmentBus);
router.delete('/assignments/:id', deleteAssignmentBus);

module.exports = router;
