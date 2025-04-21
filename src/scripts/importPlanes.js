const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');
const turnoId = process.argv[2]; 


const prisma = new PrismaClient();

// Función para convertir "HH:mm" a un Date válido con la fecha de hoy
const convertirHoraStringAHoy = (horaStr) => {
  const [horas, minutos] = horaStr.split(":").map(Number);
  const ahora = new Date();
  ahora.setHours(horas, minutos, 0, 0); 
  return ahora;
};

const importarPlanes = async () => {
  try {
    const archivo = xlsx.readFile(path.resolve(__dirname, '../../datos/vuelos_charter.xlsx'));
    const hoja = archivo.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(archivo.Sheets[hoja]);

    let avionesInsertados = [];

    for (const row of data) {
      const {
        id,
        capacidad,
        horario_salida,
        horario_llegada,
        ciudad_origen,
        ciudad_destino
      } = row;
      console.log(row);
      if (!id || !horario_salida || !horario_llegada) continue;

      const yaExiste = await prisma.plane.findUnique({ where: { id} });
      if (yaExiste) continue;

      const nuevoAvion = await prisma.plane.create({
        data: {
          id,
          capacidad,
          horario_salida,
          horario_llegada,
          ciudad_origen,
          ciudad_destino,
        }
      });
      

      avionesInsertados.push(nuevoAvion);
    }

    // Devolvemos los aviones importados como respuesta
    return avionesInsertados;
  } catch (error) {
    throw new Error("❌ Error al importar vuelos: " + error.message);
  } finally {
    await prisma.$disconnect();
  }
};

module.exports = importarPlanes;
