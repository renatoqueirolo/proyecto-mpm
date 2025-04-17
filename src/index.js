require('dotenv').config();

const app = require('./app');
const { PrismaClient } = require('@prisma/client');
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log("Conectado a la base de datos");
    app.listen(PORT, () => {
      console.log(`Servidor escuchando en http://localhost:${PORT}`);
    });
  }
  catch (error) {
    console.error("Error al conectar a la base de datos:", error);
  }
}

main()
