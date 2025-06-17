const express = require('express');
const router = express.Router();

const authRoutes = require('./routes/auth/auth.routes');
router.use(authRoutes);

const uploadExcelRoutes = require('./routes/upload-excel/excel.routes');
router.use(uploadExcelRoutes);

const optModelRoutes = require('./routes/opt-model/opt-model.routes');
router.use(optModelRoutes);

const dashboardRoutes = require('./routes/dashboard/dashboard.routes');
router.use('/dashboard', dashboardRoutes);

const turnosRoutes = require('./routes/turno/turno.routes')
router.use('/turnos', turnosRoutes);

const trabajadorRoutes = require('./routes/trabajador/trabajador.routes');
router.use('/trabajadores', trabajadorRoutes);


module.exports = router;
