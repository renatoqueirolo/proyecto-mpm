const express = require('express');
const router = express.Router();

const authRoutes = require('./routes/auth/auth.routes');
router.use(authRoutes);

const uploadExcelRoutes = require('./routes/upload-excel/excel.routes');
router.use(uploadExcelRoutes);

const optModelRoutes = require('./routes/opt-model/opt-model.routes');
router.use(optModelRoutes);

module.exports = router;
