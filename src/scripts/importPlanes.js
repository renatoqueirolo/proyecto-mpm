const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');
const path = require('path');

const prisma = new PrismaClient();

const importarPlanes = async () => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.resolve(__dirname, '../../datos/vuelos_charter.xlsx'));
    const worksheet = workbook.worksheets[0];
    let avionesInsertados = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Omitir encabezado
      
      const rowValues = Array.isArray(row.values) ? row.values.slice(1) : [];
      const [
        id,
        capacidad,
        subida, // Ignorar, pero lo dejo si lo necesitas luego
        horario_salida,
        horario_llegada,
        ciudad_origen,
        ciudad_destino
      ] = rowValues;

      if (!id || !horario_salida || !horario_llegada) return;

      avionesInsertados.push({
        id: String(id).trim(),
        capacidad: Number(capacidad),
        horario_salida: String(horario_salida).trim(), // Ya está bien
        horario_llegada: String(horario_llegada).trim(),
        ciudad_origen: String(ciudad_origen).trim(),
        ciudad_destino: String(ciudad_destino).trim(),
        generico: true,
      });
    });

    for (const avion of avionesInsertados) {
      const yaExiste = await prisma.plane.findUnique({ where: { id: avion.id } });
      if (!yaExiste) {
        await prisma.plane.create({ data: avion });
      }
    }

    console.log("Aviones insertados:", avionesInsertados);
    return avionesInsertados;
  } catch (error) {
    throw new Error("❌ Error al importar vuelos: " + error.message);
  } finally {
    await prisma.$disconnect();
  }
};

module.exports = importarPlanes;
