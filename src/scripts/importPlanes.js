const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');
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
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.resolve(__dirname, '../../datos/vuelos_charter.xlsx'));
    const worksheet = workbook.worksheets[0];
    let avionesInsertados = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Omitir encabezado
      const [
        id,
        capacidad,
        horario_salida,
        horario_llegada,
        ciudad_origen,
        ciudad_destino
      ] = row.values.slice(1); // Ignora el índice 0 que es null

      if (!id || !horario_salida || !horario_llegada) return;

      avionesInsertados.push({
        id,
        capacidad,
        horario_salida,
        horario_llegada,
        ciudad_origen,
        ciudad_destino,
      });
    });

    for (const avion of avionesInsertados) {
      const yaExiste = await prisma.plane.findUnique({ where: { id: avion.id } });
      if (!yaExiste) {
        await prisma.plane.create({ data: avion });
      }
    }

    return avionesInsertados;
  } catch (error) {
    throw new Error("❌ Error al importar vuelos: " + error.message);
  } finally {
    await prisma.$disconnect();
  }
};

module.exports = importarPlanes;
