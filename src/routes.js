const express = require('express');
const router = express.Router();

const authRoutes = require('./routes/auth/auth.routes');
router.use(authRoutes);    

module.exports = router;
