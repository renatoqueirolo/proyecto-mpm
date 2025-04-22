const express = require('express');
const {
  login,
  register
} = require('../../../controllers/auth/user/auth.controller');

const router = express.Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Realiza el login de un usuario
 *     description: Este endpoint permite a un usuario iniciar sesión en la aplicación.
 *     tags:
 *      - Autenticación
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *       500:
 *         description: Error del cliente
 */
router.post('/login', login);

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Impider el registro de un usuario externo
 *     description: Este endpoint impide el registro de un usuario externo en la aplicación, al ser una aplicación solamente para ejecutivos de la empresa.
 *     tags:
 *      - Autenticación
 *     responses:
 *       403:
 *         description: El registro de usuarios no está disponible públicamente       
 */
router.post('/signup', register);

module.exports = router;
