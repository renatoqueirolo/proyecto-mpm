const prisma = require('../../../prisma/client');
const bcrypt = require('bcrypt');
const { body } = require('express-validator');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || "secret";

const register = async (req, res) => {
  console.log(`Intento de registro externo bloqueado: ${req-body.email}`);
  return res.status(403).json({ error: 'El registro de usuarios no está disponible públicamente.' });
};


const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new Error("El email y la contraseña son obligatorios.");
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("El usuario con las credenciales señaladas no existe.");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("El usuario con las credenciales señaladas no existe.");

    const payloadSanitizedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      updatedAt: user.updatedAt,
      createdAt: user.createdAt,
      proyectos: user.proyectos
    };

    const token = jwt.sign({ user: payloadSanitizedUser }, JWT_SECRET, { expiresIn: "12h" });

    return res.json({ user: payloadSanitizedUser, token });
  } catch (error) {
    console.error("Error al intentar iniciar sesión ->", error.message);
    return res.status(500).json({ message: error.message });
  } finally {
    await prisma.$disconnect();
  }
};

const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const ok = await bcrypt.compare(oldPassword, user.password);
  if (!ok) return res.status(400).send("Contraseña actual incorrecta");

  const newHashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { password: newHashed } });
  res.status(200).send("Contraseña actualizada");
}


module.exports = { register, login, changePassword };
