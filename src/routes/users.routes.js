const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middlewares/auth.middleware');
const prisma = require('../prisma/client');

// Ruta protegida solo para admins: ver todos los usuarios
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios', detail: err.message });
  }
});

module.exports = router;
