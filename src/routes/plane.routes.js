const express = require('express');
const router = express.Router();
const {
  getPlanes,
  createPlane,
  updatePlane,
  deletePlane,
} = require('../controllers/plane.controller');

router.get('/planes', getPlanes);
router.post('/planes', createPlane);
router.put('/planes/:id', updatePlane);
router.delete('/planes/:id', deletePlane);

module.exports = router;
