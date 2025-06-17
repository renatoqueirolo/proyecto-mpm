const prisma = require('../../prisma/client');

const getTrabajador = async (req, res) => {
  const { trabajadorId } = req.params;
  
  // Log the trabajadorId to check its value
  console.log("Received trabajadorId:", trabajadorId);
  
  if (!trabajadorId) {
    return res.status(400).json({ error: 'ID de trabajador no proporcionado' });
  }

  try {
    const trabajador = await prisma.trabajador.findUnique({
      where: { 
        id: trabajadorId  // Make sure we're passing the string directly
      },
      include: {
        trabajadorTurnos: {
          include: {
            turno: true,
          },
        }
      },
    });

    if (!trabajador) {
      return res.status(404).json({ error: 'Trabajador no encontrado' });
    }

    const turnos = trabajador.trabajadorTurnos.map(tt => ({
      ...tt.turno,
      acercamiento: tt.acercamiento,
      origen: tt.origen,
      destino: tt.destino,
      region: tt.region,
      subida: tt.subida
    }));

    // Return in the format expected by the frontend
    return res.json({
      trabajador: {
        id: trabajador.id,
        rut: trabajador.rut,
        nombreCompleto: trabajador.nombreCompleto
      },
      turnos
    });
  } catch (error) {
    console.error("Error al obtener el trabajador:", error);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}

const editTrabajador = async (req, res) => {
  const { id } = req.params;
  const { nombreCompleto, rut } = req.body;

  try {
    const trabajadorExistente = await prisma.trabajador.findUnique({
      where: { id },
    });

    if (!trabajadorExistente) {
      return res.status(404).json({ error: 'Trabajador no encontrado' });
    }

    const updatedTrabajador = await prisma.trabajador.update({
      where: { id },
      data: {
        nombreCompleto,
        rut,
      },
    });

    return res.json(updatedTrabajador);
  } catch (error) {
    console.error("Error al editar el trabajador:", error);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}

const getTrabajadores = async (req, res) => {
  try {
    const trabajadores = await prisma.trabajador.findMany({
      include: {
        trabajadorTurnos: {
          include: {
            turno: true,
          },
        }
      },
    });
    return res.json(trabajadores);
  } catch (error) {
    console.error("Error al obtener los trabajadores:", error);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}

module.exports = {
  getTrabajador,
  editTrabajador,
  getTrabajadores
};