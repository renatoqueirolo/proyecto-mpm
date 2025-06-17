const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Verifica que el usuario esté autenticado y lo carga desde la base de datos
const userMustBeLogged = async (req, res, next) => {
  try {
    console.log("Ejecutando middleware: verificar usuario autenticado");

    const authHeader = req.headers.authorization;
    if (!authHeader) throw new Error("El token no fue enviado");

    const userToken = authHeader.split(" ")[1];
    const decoded = jwt.verify(userToken, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.user.id },
      select: { id: true, email: true, name: true, role: true, proyectos: true },
    });

    if (!user) throw new Error("El usuario del token no existe");

    req.user = user; // Guardamos el usuario en la request para los próximos middleware/controladores
    next();
  } catch (error) {
    console.error("Error en userMustBeLogged:", error.message);
    return res.status(401).json({ error: error.message });
  }
};

// Verifica que el usuario tenga rol 'admin'
const userMustBeAdmin = (req, res, next) => {
  try {
    console.log("Ejecutando middleware: verificar rol de administrador");

    const user = req.user;
    if (!user || user.role.toLowerCase() !== "admin") {
      throw new Error("Acceso restringido a administradores");
    }

    next();
  } catch (error) {
    console.error("Error en userMustBeAdmin:", error.message);
    return res.status(403).json({ error: error.message });
  }
};

// Verifica que el usuario no sea un VISUALIZADOR para crear turnos
const userCannotBeVisualizador = (req, res, next) => {
  try {
    console.log("Ejecutando middleware: verificar que el usuario no sea visualizador");

    const user = req.user;
    if (user && user.role.toLowerCase() === "visualizador") {
      throw new Error("Los visualizadores no pueden crear turnos");
    }

    next();
  } catch (error) {
    console.error("Error en userCannotBeVisualizador:", error.message);
    return res.status(403).json({ error: error.message });
  }
};

module.exports = {
  userMustBeLogged,
  userMustBeAdmin,
  userCannotBeVisualizador,
};
