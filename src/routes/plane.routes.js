const express = require('express');
const router = express.Router();
const {
  getPlanes,
  createPlane,
  updatePlane,
  deletePlane,
  deleteAllPlanes,
  importarDesdeExcel,
} = require('../controllers/plane.controller');

router.get('/planes', getPlanes);
router.post('/planes', createPlane);
router.put('/planes/:id', updatePlane);
router.delete('/planes/:id', deletePlane);
router.delete('/planes', deleteAllPlanes);
router.post('/planes-import', importarDesdeExcel);

module.exports = router;
