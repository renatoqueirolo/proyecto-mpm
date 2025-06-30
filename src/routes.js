const express = require('express');
const router = express.Router();

const authRoutes = require('./routes/auth/auth.routes');
router.use(authRoutes);

const uploadExcelRoutes = require('./routes/upload-excel/excel.routes');
router.use(uploadExcelRoutes);

const chatbotRoutes = require('./routes/chatbot/chatbot.routes');
router.use(chatbotRoutes);

const optModelRoutes = require('./routes/opt-model/opt-model.routes');
router.use(optModelRoutes);

const dashboardRoutes = require('./routes/dashboard/dashboard.routes');
router.use('/dashboard', dashboardRoutes);

const turnosRoutes = require('./routes/turno/turno.routes')
router.use('/turnos', turnosRoutes);


module.exports = router;
