const express = require('express');
const router = express.Router();
const {
  getWorkers,
  getWorkerById,
  createWorker,
  updateWorker,
  deleteWorker,
  deleteAllWorkers
} = require('../controllers/worker.controller');

router.get('/workers', getWorkers);
router.get('/workers/:rut', getWorkerById);
router.post('/workers', createWorker);
router.put('/workers/:rut', updateWorker);
router.delete('/workers/:rut', deleteWorker);
router.delete('/workers', deleteAllWorkers);

module.exports = router;
