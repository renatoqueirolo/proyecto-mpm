const express = require('express');
const router = express.Router({ mergeParams: true });

// Admin Routes
const adminAuthRoutes = require('./admin/admin.routes');
router.use('/admin/users', adminAuthRoutes);

// User Routes
const userAuthRoutes = require('./users/user.routes');
router.use('/auth', userAuthRoutes);

module.exports = router;
