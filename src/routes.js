const express = require('express');
const router = express.Router();

const authRoutes = require('./routes/auth/auth.routes');
router.use(authRoutes);

const workerRoutes = require('./routes/worker.routes');
router.use(workerRoutes);

const busRoutes = require('./routes/bus.routes');
router.use(busRoutes);

const assignmentBusRoutes = require('./routes/assignmentBus.routes');
router.use(assignmentBusRoutes);

const planeRoutes = require('./routes/plane.routes');
router.use(planeRoutes);

const assignmentPlaneRoutes = require('./routes/assignmentPlane.routes');
router.use(assignmentPlaneRoutes);

const optimizeRoutes = require('./routes/optimization.routes');
router.use(optimizeRoutes);


module.exports = router;
