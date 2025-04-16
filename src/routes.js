const express = require('express');
const router = express.Router();

const authRoutes = require('./routes/auth/auth.routes');
router.use(authRoutes);

const workerRoutes = require('./routes/worker.routes');
router.use(workerRoutes);


module.exports = router;
