const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

const importarTrabajadores = async () => {
  try {
    // 1. Cargar planillas desde archivos
    const archivoCalama = xlsx.readFile(path.join(__dirname, '../datos/Nomina de Traslado Transp. Transvan Spa V región Subida 07-04-2025.xlsx'));
    const archivoBajada = xlsx.readFile(path.join(__dirname, '../datos/Nomina de Traslado Transp. Transvan Spa V región Bajada 08-04-2025.xlsx'));


    const sheets = [
      { libro: archivoCalama, hoja: 'V REGION SUBIDA CALAMA 07-04-25', subida: 1 },
      { libro: archivoCalama, hoja: 'V REGION SUBIDA ANTO. 07-04-25', subida: 1 },
      { libro: archivoBajada, hoja: 'V REGION BAJADA 08-04-25', subida: 0 },
    ];

    let totalInsertados = 0;

    for (const { libro, hoja, subida } of sheets) {
      const data = xlsx.utils.sheet_to_json(libro.Sheets[hoja]);
      for (const row of data) {
        const rut = row["RUT "];
        if (!rut) continue;

        const nombreCompleto = row["NOMBRE COMPLETO"];
        const telefono = row["TELÉFONO"]?.toString();
        const region = row["REGIÓN"];
        const comuna = row["COMUNA / RESIDENCIA"];
        const acercamiento = row["ACERCAMIENTO"]?.toUpperCase().trim();
        const [origenAvion, destinoAvion] = row["ORIGEN / DESTINO"]?.split("/")?.map(s => s.trim().toUpperCase()) || [];

        // Evita duplicados por rut
        const existe = await prisma.worker.findUnique({ where: { rut } });
        if (existe) continue;

        await prisma.worker.create({
          data: {
            rut,
            nombreCompleto,
            subida: subida === 1,
            telefono,
            email: null, // no viene en la planilla
            region,
            comuna,
            acercamiento,
            origenAvion,
            destinoAvion,
          }
        });
        totalInsertados++;
      }
    }

    console.log(`✔ Se importaron ${totalInsertados} trabajadores`);
  } catch (error) {
    console.error("❌ Error al importar trabajadores:", error.message);
  } finally {
    await prisma.$disconnect();
  }
};

importarTrabajadores();
