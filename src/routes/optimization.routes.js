const express = require('express');
const router = express.Router();
const { ejecutarResolverModelo, ejecutarCrearBuses } = require('../controllers/optimization.controller');

router.post('/resolver-modelo', ejecutarResolverModelo);
router.post('/crear-buses', ejecutarCrearBuses);

module.exports = router;
