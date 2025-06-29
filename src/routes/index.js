const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('¡Bienvenido a la API del proyecto MPM!');
});

module.exports = router;
