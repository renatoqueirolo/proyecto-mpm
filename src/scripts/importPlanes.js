const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');

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
        id_plane,
        capacidad,
        subida,
        horario_salida,
        horario_llegada,
        ciudad_origen,
        ciudad_destino
      } = row;

      if (!id_plane || !horario_salida || !horario_llegada) continue;

      const yaExiste = await prisma.plane.findUnique({ where: { id_plane } });
      if (yaExiste) continue;

      const nuevoAvion = await prisma.plane.create({
        data: {
          id_plane: id_plane.toString(),
          capacidad: parseInt(capacidad),
          subida: subida === 1 || subida === true,
          horario_salida: convertirHoraStringAHoy(horario_salida),
          horario_llegada: convertirHoraStringAHoy(horario_llegada),
          ciudad_origen: ciudad_origen.toUpperCase().trim(),
          ciudad_destino: ciudad_destino.toUpperCase().trim(),
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
