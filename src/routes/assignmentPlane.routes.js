const express = require('express');
const router = express.Router();
const {
  getAssignmentPlanes,
  createAssignmentPlane,
  updateAssignmentPlane,
  deleteAssignmentPlane,
} = require('../controllers/assignmentPlane.controller');

router.get('/plane-assignments', getAssignmentPlanes);
router.post('/plane-assignments', createAssignmentPlane);
router.put('/plane-assignments/:id', updateAssignmentPlane);
router.delete('/plane-assignments/:id', deleteAssignmentPlane);

module.exports = router;
