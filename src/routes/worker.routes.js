const express = require('express');
const router = express.Router();
const { getWorkers, createWorker } = require('../controllers/worker/worker.controller');

router.get('/workers', getWorkers);
router.post('/workers', createWorker);

module.exports = router;
