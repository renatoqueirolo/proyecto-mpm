const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

// Función para convertir "HH:mm" a un Date válido con la fecha de hoy
const convertirHoraStringAHoy = (horaStr) => {
  const [horas, minutos] = horaStr.split(":").map(Number);
  const ahora = new Date();
  ahora.setHours(horas, minutos, 0, 0); // hora, minuto, segundo, milisegundo
  return ahora;
};

const importarPlanes = async () => {
  try {
    const archivo = xlsx.readFile(path.join(__dirname, '../datos/vuelos_charter.xlsx'));
    const hoja = archivo.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(archivo.Sheets[hoja]);

    let totalInsertados = 0;

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

      await prisma.plane.create({
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

      totalInsertados++;
    }

    console.log(`✔ Se importaron ${totalInsertados} vuelos charter`);
  } catch (error) {
    console.error("❌ Error al importar vuelos:", error.message);
  } finally {
    await prisma.$disconnect();
  }
};

importarPlanes();

