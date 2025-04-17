const express = require('express');
const router = express.Router();
const {
  getBuses,
  createBus,
  updateBus,
  deleteBus,
} = require('../controllers/bus.controller');

router.get('/buses', getBuses);
router.post('/buses', createBus);
router.put('/buses/:id', updateBus);
router.delete('/buses/:id', deleteBus);

module.exports = router;
