const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');
const path = require('path');

const prisma = new PrismaClient();

const importarTrabajadores = async () => {
  try {
    const archivoCalama = path.join(__dirname, '../../datos/Nomina de Traslado Transp. Transvan Spa V región Subida 07-04-2025.xlsx');
    const archivoBajada = path.join(__dirname, '../../datos/Nomina de Traslado Transp. Transvan Spa V región Bajada 08-04-2025.xlsx');

    const sheets = [
      { archivo: archivoCalama, hoja: 'V REGION SUBIDA CALAMA 07-04-25', subida: 1 },
      { archivo: archivoCalama, hoja: 'V REGION SUBIDA ANTO. 07-04-25', subida: 1 },
      { archivo: archivoBajada, hoja: 'V REGION BAJADA 08-04-25', subida: 0 },
    ];

    let totalInsertados = 0;

    for (const { archivo, hoja, subida } of sheets) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(archivo);
      const worksheet = workbook.getWorksheet(hoja);

      worksheet.eachRow(async (row, rowNumber) => {
        if (rowNumber === 1) return; // Encabezado

        const rowData = {};
        worksheet.getRow(1).eachCell((cell, colNumber) => {
          rowData[cell.value] = row.getCell(colNumber).value;
        });

        const rut = rowData["RUT "];
        if (!rut) return;

        const nombreCompleto = rowData["NOMBRE COMPLETO"];
        const telefono = rowData["TELÉFONO"]?.toString();
        const region = rowData["REGIÓN"];
        const comuna = rowData["COMUNA / RESIDENCIA"];
        const acercamiento = rowData["ACERCAMIENTO"]?.toUpperCase().trim();
        const [origenAvion, destinoAvion] = rowData["ORIGEN / DESTINO"]?.split("/")?.map(s => s.trim().toUpperCase()) || [];

        await prisma.trabajadorTurno.create({
          data: {
            trabajadorId: rut,
            turnoId,
            origen: origenAvion,
            destino: destinoAvion,
          },
        });

        const existe = await prisma.worker.findUnique({ where: { rut } });
        if (!existe) {
          await prisma.worker.create({
            data: {
              rut,
              nombreCompleto,
              subida: subida === 1,
              telefono,
              email: null,
              region,
              comuna,
              acercamiento,
              origenAvion,
              destinoAvion,
            }
          });
          totalInsertados++;
        }
      });
    }

    return `✔ Se importaron ${totalInsertados} trabajadores`;
  } catch (error) {
    throw new Error("❌ Error al importar trabajadores: " + error.message);
  } finally {
    await prisma.$disconnect();
  }
};

module.exports = importarTrabajadores;