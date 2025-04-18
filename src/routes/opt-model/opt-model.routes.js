const express = require('express');
const router = express.Router({ mergeParams: true });

// Bus Routes
const busRoutes = require('./bus/bus.routes');
router.use('/buses', busRoutes);
// Assignment Bus Routes
const assignmentBusRoutes = require('./bus/assignmentBus.routes');
router.use('/assignmentBuses', assignmentBusRoutes);

// Plane Routes
const planeRoutes = require('./plane/plane.routes');
router.use('/planes', planeRoutes);
// Assignment Plane Routes
const assignmentPlaneRoutes = require('./plane/assignmentPlane.routes');
router.use('/assignmentPlanes', assignmentPlaneRoutes);

// Worker Routes
const workerRoutes = require('./worker/worker.routes');
router.use('/workers', workerRoutes);

// Optimization Routes
const optimizacionRoutes = require('./optimizacion/optimizacion.routes');
router.use('/asignar-itinerarios', optimizacionRoutes);


module.exports = router;