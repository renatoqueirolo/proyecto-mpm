const express = require('express');
const router = express.Router();
const {
  getAssignmentBuses,
  createAssignmentBus,
  updateAssignmentBus,
  deleteAssignmentBus,
  deleteAllAssignmentBus,
} = require('../../../controllers/opt-model/bus/assignmentBus.controller');

router.get('/bus-assignments', getAssignmentBuses);
router.post('/bus-assignments', createAssignmentBus);
router.put('/bus-assignments/:id', updateAssignmentBus);
router.delete('/bus-assignments/:id', deleteAssignmentBus);
router.delete('/bus-assignments', deleteAllAssignmentBus);

module.exports = router;
