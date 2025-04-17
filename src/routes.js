const express = require('express');
const router = express.Router();

const authRoutes = require('./routes/auth/auth.routes');
router.use(authRoutes);

const uploadExcelRoutes = require('./routes/upload-excel/excel.routes');
router.use(uploadExcelRoutes);

const workerRoutes = require('./routes/opt-model/worker.routes');
router.use(workerRoutes);

const busRoutes = require('./routes/opt-model/bus/bus.routes');
router.use(busRoutes);

const assignmentBusRoutes = require('./routes/opt-model/bus/assignmentBus.routes');
router.use(assignmentBusRoutes);

const planeRoutes = require('./routes/opt-model/plane/plane.routes');
router.use(planeRoutes);

const assignmentPlaneRoutes = require('./routes/opt-model/plane/assignmentPlane.routes');
router.use(assignmentPlaneRoutes);

module.exports = router;
