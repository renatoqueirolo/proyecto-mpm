const ExcelJS = require('exceljs');
const { execFile } = require('child_process');
const path = require('path');
const PdfPrinter = require('pdfmake');;

const { PrismaClient, ShiftType } = require('@prisma/client');
const prisma = new PrismaClient();

// Crear turno
async function crearTurno(req, res) {
  try {
    const { nombre, fecha, creadoPorId, proyecto, tipoTurno } = req.body;
    if (!fecha || !creadoPorId || !proyecto || !tipoTurno)
      return res.status(400).json({ error: 'Faltan campos requeridos' });

    let tipoTurnoType;
    if (tipoTurno == "14x14") tipoTurnoType = ShiftType.FOURTEEN_FOURTEEN
    else if (tipoTurno == "7x7") tipoTurnoType = ShiftType.SEVEN_SEVEN

    const creadoPorIdString = creadoPorId.toString();

    const capacidades_por_region = {
      V: [12, 20, 10],
      IV: [16, 8],
      RM: [20, 30],
    };

    // Ejecutar todo en una transacción
    const resultado = await prisma.$transaction(async (tx) => {
      const turno = await tx.turno.create({
        data: {
          nombre: nombre,
          fecha: new Date(fecha),
          creadoPorId: creadoPorIdString,
          proyecto: proyecto,
          tipoTurno: tipoTurnoType,
          modeloEjecutado: false,
        },
      });

      await tx.parametrosModeloTurno.create({
        data: {
          turnoId: turno.id,
        },
      });

      const insertsCapacidad = [];

      for (const region in capacidades_por_region) {
        const capacidades = capacidades_por_region[region];
        for (const capacidad of capacidades) {
          insertsCapacidad.push(
            tx.capacidadTurno.upsert({
              where: {
                turnoId_region_capacidad: {
                  turnoId: turno.id,
                  region,
                  capacidad,
                },
              },
              update: {}, // si ya existe no cambia nada
              create: {
                turnoId: turno.id,
                region,
                capacidad,
              },
            })
          );
        }
      }

      await Promise.all(insertsCapacidad);

      return turno;
    });

    console.log('📅 Turno creado con fecha:', resultado.fecha.toISOString());
    res.status(201).json(resultado);
  } catch (error) {
    console.error('Error al crear turno:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}


// Obtener todos los turnos
async function obtenerTurnos(req, res) {
  try {
    const { proyectos } = req.user;
    const turnos = await prisma.turno.findMany({
      where: {
        proyecto: {
          in: proyectos, // 👈 Filtra sólo los que puede ver este usuario
        },
      },
      orderBy: { fecha: 'desc' },
      include: { 
        trabajadoresTurno: true,
        busTurno: true,
        planeTurno: true,
        creadoPor: true
      },
    });
    res.json(turnos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener turnos' });
  }
}

// Obtener turno por ID
async function obtenerTurno(req, res) {
  try {
    const { id } = req.params;
    const turno = await prisma.turno.findUnique({
      where: { id },
      include: {
        creadoPor: true,
        trabajadoresTurno: {
          include: {
            trabajador: true,
          },
        },
        parametrosModelo: true,
        busTurno: true,
        planeTurno: {
          include: {
            plane: true, 
          },
        },
      },
    });
    if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });
    res.json(turno);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener turno' });
  }
}

async function obtenerTrabajadoresTurno(req, res) {
  try {
    const { id } = req.params;
    const trabajadoresTurno = await prisma.trabajadorTurno.findMany({
      where: { turnoId: id },
      include: {
        trabajador: true, // Incluye datos del trabajador
      },
    });

    res.json(trabajadoresTurno);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener trabajadores del turno' });
  }
}

async function obtenerAvionesTurno(req, res) {
  try {
    const { id } = req.params;
    const avionesTurno = await prisma.planeTurno.findMany({
      where: { turnoId: id },
      include: {
        plane: true, // Incluye datos del avión
      },
    });

    res.json(avionesTurno);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener aviones del turno' });
  }
}

async function obtenerBusesTurno(req, res) {
  try {
    const { id } = req.params;
    const busesTurno = await prisma.busTurno.findMany({
      where: { turnoId: id },
      // Puedes incluir más detalles si tu modelo lo permite
    });

    res.json(busesTurno);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener buses del turno' });
  }
}


// Editar fecha turno
async function editarTurno(req, res) {
  try {
    const { id } = req.params;
    const { nombre, fecha, proyecto, tipoTurno } = req.body;

    const nuevaFecha = new Date(fecha);
    if (isNaN(nuevaFecha)) {
      return res.status(400).json({ error: "Fecha inválida" });
    }

    const turnoExistente = await prisma.turno.findUnique({
      where: { id },
      select: { fecha: true, nombre: true, proyecto: true, tipoTurno: true },
    });

    if (!turnoExistente) {
      return res.status(404).json({ error: "Turno no encontrado" });
    }

    const fechaOriginal = new Date(turnoExistente.fecha);
    const diffMs = nuevaFecha.getTime() - fechaOriginal.getTime();
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24)); // diferencia en días

    // 1. Actualizar todos los parametros del turno
    await prisma.turno.update({
      where: { id },
      data: { fecha: nuevaFecha, nombre: nombre, proyecto: proyecto, tipoTurno: tipoTurno },
    });

    // Si no hay cambio en días, no es necesario actualizar planes
    if (diffDias !== 0) {

      // 2. Obtener planesTurno asociados
      const planes = await prisma.planeTurno.findMany({
        where: { turnoId: id },
        select: {
          id: true,
          horario_salida: true,
          horario_llegada: true,
        }
      });

      const actualizaciones = planes.map(p =>
        prisma.planeTurno.update({
          where: { id: p.id },
          data: {
            horario_salida: new Date(new Date(p.horario_salida).getTime() + diffDias * 24 * 60 * 60 * 1000),
            horario_llegada: new Date(new Date(p.horario_llegada).getTime() + diffDias * 24 * 60 * 60 * 1000),
          },
        })
      );

      await Promise.all(actualizaciones);
    }

    

    res.status(200).json({ message: `Turno actualizado` });
  } catch (error) {
    console.error("Error al editar turno:", error);
    res.status(500).json({ error: "Error al editar turno" });
  }
}


async function obtenerCapacidadTurno(req, res) {
  try {
    const { id } = req.params;
    const capacidadTurno = await prisma.capacidadTurno.findMany({
      where: { turnoId: id },
      // Puedes incluir más detalles si tu modelo lo permite
    });

    res.json(capacidadTurno);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener capacidades del turno' });
  }
}

async function agregarCapacidadTurno(req, res) {
  try {
    const { id } = req.params;
    const { capacidades_por_region } = req.body;
    const turno = await prisma.turno.findUnique({
      where: { id: id },
    });
    for (const region in capacidades_por_region) {
      const capacidades = capacidades_por_region[region];

      for (const capacidad of capacidades) {
        const existe = await prisma.capacidadTurno.findFirst({
          where: {
            turnoId: turno.id,
            region: region,
            capacidad: capacidad,
          },
        });

        if (!existe) {
          await prisma.capacidadTurno.create({
            data: {
              turnoId: turno.id,
              region: region,
              capacidad: capacidad,
            },
          });
        }
      }
    }


    res.status(204).send();
  } catch (error) {
    console.error("Error al agregar capacidad al turno:", error);
    res.status(500).json({ error: "Error al agregar capacidad al turno" });
  }
}
async function editarCapacidadTurno(req, res) {
  try {
    const { capacidades} = req.body;
    for (const capacidad of capacidades) {
      id = capacidad.id;
      capacidadNumero = capacidad.capacidad;
      region = capacidad.region;
      await prisma.capacidadTurno.update({
      where: { id },
      data: {
        region: region,
        capacidad: capacidadNumero,
      },
    })};
    res.status(204).send();
  } catch (error) {
    console.error("Error al editar capacidad:", error);
    res.status(500).json({ error: "Error al editar capacidad" });
  }
}

async function editarAsignacionTurnoBus(req, res) {
  try {
    const { asignaciones} = req.body;
    for (const asignacion of asignaciones) {
      trabajadorTurnoId = asignacion.trabajadorTurnoId;
      busTurnoId = asignacion.busTurnoId;
      const asignacion_turno = await prisma.assignmentBus.findFirst({
      where: { trabajadorTurnoId: trabajadorTurnoId },
    });
      await prisma.assignmentBus.update({
      where: {  id: asignacion_turno.id },
      data: {
        busTurnoId: busTurnoId,
      },
    })};
    res.status(204).send();
  } catch (error) {
    console.error("Error al editar capacidad:", error);
    res.status(500).json({ error: "Error al editar asignacion" });
  }
}

async function editarAsignacionTurnoPlane(req, res) {
  try {
    const { asignaciones} = req.body;
    for (const asignacion of asignaciones) {
      trabajadorTurnoId = asignacion.trabajadorTurnoId;
      planeTurnoId = asignacion.planeTurnoId;
      const asignacion_turno = await prisma.assignmentPlane.findFirst({
      where: { trabajadorTurnoId: trabajadorTurnoId },
    });
      await prisma.assignmentPlane.update({
      where: {  id: asignacion_turno.id },
      data: {
        planeTurnoId: planeTurnoId,
      },
    })};
    res.status(204).send();
  } catch (error) {
    console.error("Error al editar capacidad:", error);
    res.status(500).json({ error: "Error al editar asignacion" });
  }
}

async function obtenerAsignacionTurnoBus(req, res) {
  try {
    const { busTurnoId } = req.params;

    // 1. Buscar el busTurno con sus datos
    const busTurno = await prisma.busTurno.findUnique({
      where: { id: busTurnoId },
      select: {
        id: true,
        comunas_origen: true,
        comunas_destino: true,
        turnoId: true
      }
    });

    if (!busTurno) {
      return res.status(404).json({ error: "BusTurno no encontrado" });
    }

let { comunas_origen, comunas_destino, turnoId } = busTurno;
comunas_destino = JSON.parse(comunas_destino);
comunas_origen = JSON.parse(comunas_origen);

    // 2. Obtener trabajadores asignados a ese bus
    const asignados = await prisma.assignmentBus.findMany({
  where: { busTurnoId },
        include: {
        trabajadorTurno: {
          include: {
            trabajador: true
          }
        },
        busTurno: true
      }

});
    const subida = comunas_destino.includes("SANTIAGO");

const filtroAcercamiento = subida ? { acercamiento: { in: comunas_origen } } : { acercamiento: { in: comunas_destino } };


    // 3. Obtener trabajadores disponibles para asignar 
const trabajadoresDisponibles = await prisma.trabajadorTurno.findMany({
  where: {
    turnoId: turnoId,
    subida: subida,
    ...filtroAcercamiento
  },
  include: {
    trabajador: true
  }
});
// 1. Obtener los IDs de los trabajadores ya asignados al bus
const idsAsignados = new Set(asignados.map(a => a.trabajadorTurno.trabajador.id));

// 2. Filtrar los trabajadores disponibles para que no estén en la lista de asignados
const trabajadoresFiltrados = trabajadoresDisponibles.filter(t => !idsAsignados.has(t.trabajador.id));


    return res.status(200).json({
      asignados: asignados,
      trabajadoresDisponibles: trabajadoresFiltrados,
    });

  } catch (error) {
    console.error("Error al obtener asignación de turno:", error);
    res.status(500).json({ error: "Error al obtener asignación de turno" });
  }
}

async function obtenerAsignacionTurnoPlane(req, res) {
  try {
    const { planeTurnoId , id} = req.params;

    // 1. Buscar el busTurno con sus datos
    const planeTurno = await prisma.planeTurno.findUnique({
      where: { id: planeTurnoId },
      include: {
        plane: true,
    }});

    if (!planeTurno) {
      return res.status(404).json({ error: "PlaneTurno no encontrado" });
    }

    // 2. Obtener trabajadores asignados a ese avion
    const asignados = await prisma.assignmentPlane.findMany({
  where: { planeTurnoId },
        include: {
        trabajadorTurno: {
          include: {
            trabajador: true
          }
        },
        planeTurno: {
          include: {
            plane: true
        }
      }

}});
    const subida = planeTurno.plane.ciudad_origen.includes("Santiago");

const filtroAcercamiento = subida
  ? { destino: planeTurno.plane.ciudad_destino.toUpperCase() }
  : { origen: planeTurno.plane.ciudad_origen.toUpperCase() };

    // 3. Obtener trabajadores disponibles para asignar 
const trabajadoresDisponibles = await prisma.trabajadorTurno.findMany({
  where: {
    turnoId: id,
    subida: subida,
    ...filtroAcercamiento
  },
  include: {
    trabajador: true
  }
});
// 1. Obtener los IDs de los trabajadores ya asignados al bus
const idsAsignados = new Set(asignados.map(a => a.trabajadorTurno.trabajador.id));

// 2. Filtrar los trabajadores disponibles para que no estén en la lista de asignados
const trabajadoresFiltrados = trabajadoresDisponibles.filter(t => !idsAsignados.has(t.trabajador.id));


    return res.status(200).json({
      subida: subida,
      trabajadoresDisponibles: trabajadoresFiltrados,
      asignados: asignados,
    });

  } catch (error) {
    console.error("Error al obtener asignación de turno:", error);
    res.status(500).json({ error: "Error al obtener asignación de turno" });
  }
} 


async function obtenerCompatiblesTurnoBus(req, res) {
  try {
    const { trabajadorTurnoId } = req.params;


    // 1. Buscar el trabajadorTurno con sus datos
    const trabajadorTurno = await prisma.trabajadorTurno.findUnique({
      where: { id: trabajadorTurnoId },
      include: { trabajador: true }
    });

    if (!trabajadorTurno) {
      return res.status(404).json({ error: "trabajadorTurno no encontrado" });
    }

    const { subida, turnoId } = trabajadorTurno;

    let origen, destino;
    if (subida) {
      origen = trabajadorTurno.acercamiento;
      destino = trabajadorTurno.origen;
    } else {
      origen = trabajadorTurno.destino;
      destino = trabajadorTurno.acercamiento;
    }




    const filtroAcercamiento = subida ? { acercamiento: origen } : { acercamiento: destino };

    // 2. Obtener todos los trabajadores disponibles con el mismo turno, sentido y origen
    const trabajadoresDisponibles = await prisma.trabajadorTurno.findMany({
      where: {
        turnoId: turnoId,
        subida: subida,
        ...filtroAcercamiento
      },
      include: {
        trabajador: true
      }
    });

    const asignacionBus = await prisma.assignmentBus.findFirst({
      where: { trabajadorTurnoId: trabajadorTurnoId }    });
    const idBus = asignacionBus.busTurnoId;
    const asignados = await prisma.assignmentBus.findMany({
      where: { busTurnoId: idBus },
      include: {trabajadorTurno: {include: {trabajador: true}}}});
    // 3. Obtener los IDs de los trabajadores ya asignados al bus
    const idsAsignados = new Set(asignados.map(a => a.trabajadorTurno.trabajador.id));

    // 4. Filtrar trabajadores:
    const trabajadoresFiltrados = trabajadoresDisponibles.filter(t => 
      !idsAsignados.has(t.trabajador.id) && t.id !== trabajadorTurno.id
    );

    return res.status(200).json({
      compatibles: trabajadoresFiltrados
    });

  } catch (error) {
    console.error("Error al obtener asignación de turno:", error);
    res.status(500).json({ error: "Error al obtener asignación de turno" });
  }
}

async function obtenerCompatiblesTurnoPlane(req, res) {
  try {
    const { trabajadorTurnoId } = req.params;

    // 1. Buscar el trabajadorTurno con sus datos
    const trabajadorTurno = await prisma.trabajadorTurno.findUnique({
      where: { id: trabajadorTurnoId },
      include: { trabajador: true }
    });

    if (!trabajadorTurno) {
      return res.status(404).json({ error: "trabajadorTurno no encontrado" });
    }

    const { subida, turnoId } = trabajadorTurno;

    let origen, destino;
    if (subida) {
      origen = trabajadorTurno.acercamiento;
      destino = trabajadorTurno.destino;
    } else {
      origen = trabajadorTurno.origen;
      destino = trabajadorTurno.acercamiento;
    }

    const filtroAcercamiento = subida ? { destino: destino } : { origen: origen };

    // 2. Obtener todos los trabajadores disponibles con el mismo turno, sentido y origen
    const trabajadoresDisponibles = await prisma.trabajadorTurno.findMany({
      where: {
        turnoId: turnoId,
        subida: subida,
        ...filtroAcercamiento
      },
      include: {
        trabajador: true
      }
    });
        const asignacionPlane = await prisma.assignmentPlane.findFirst({
      where: { trabajadorTurnoId: trabajadorTurnoId }    });
    const planeId = asignacionPlane.planeTurnoId;
    const asignados = await prisma.assignmentPlane.findMany({
      where: { planeTurnoId: planeId },
      include: {trabajadorTurno: {include: {trabajador: true}}}});
    // 3. Obtener los IDs de los trabajadores ya asignados al bus
    const idsAsignados = new Set(asignados.map(a => a.trabajadorTurno.trabajador.id));


    // 4. Filtrar trabajadores:
    const trabajadoresFiltrados = trabajadoresDisponibles.filter(t => 
      !idsAsignados.has(t.trabajador.id) && t.id !== trabajadorTurno.id
    );

    return res.status(200).json({
      compatibles: trabajadoresFiltrados
    });

  } catch (error) {
    console.error("Error al obtener asignación de turno:", error);
    res.status(500).json({ error: "Error al obtener asignación de turno" });
  }
}

async function intercambioAsignacionTurnoBus(req, res) {
  try {
    const { trabajadorTurnoId1, trabajadorTurnoId2} = req.body;
    asignacioBus1 = await prisma.assignmentBus.findFirst({
      where: { trabajadorTurnoId: trabajadorTurnoId1 }    });
    asignacioBus2 = await prisma.assignmentBus.findFirst({
      where: { trabajadorTurnoId: trabajadorTurnoId2 }    });
    await prisma.assignmentBus.update({where: { id: asignacioBus1.id },
      data: {
        trabajadorTurnoId: trabajadorTurnoId2}})
    await prisma.assignmentBus.update({where: { id: asignacioBus2.id },
      data: {
        trabajadorTurnoId: trabajadorTurnoId1}})
    res.status(204).send();
  } catch (error) {
    console.error("Error al intercambiar:", error);
    res.status(500).json({ error: "Error al intercambiar" });
  }
}

async function intercambioAsignacionTurnoPlane(req, res) {
  try {
    const { trabajadorTurnoId1, trabajadorTurnoId2} = req.body;
    asignacioBus1 = await prisma.assignmentPlane.findFirst({
      where: { trabajadorTurnoId: trabajadorTurnoId1 }    });
    asignacioBus2 = await prisma.assignmentPlane.findFirst({
      where: { trabajadorTurnoId: trabajadorTurnoId2 }    });
    await prisma.assignmentPlane.update({where: { id: asignacioBus1.id },
      data: {
        trabajadorTurnoId: trabajadorTurnoId2}})
    await prisma.assignmentPlane.update({where: { id: asignacioBus2.id },
      data: {
        trabajadorTurnoId: trabajadorTurnoId1}})
    res.status(204).send();
  } catch (error) {
    console.error("Error al intercambiar:", error);
    res.status(500).json({ error: "Error al intercambiar" });
  }
}

async function eliminarCapacidadTurno(req, res) {
  try {
    const {id} = req.body;
    await prisma.capacidadTurno.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error("Error al eliminar capacidad:", error);
    res.status(500).json({ error: 'Error al eliminar turno' });
  }
}

async function agregarAsignacionTurno(req, res) {
  try {
    const { id } = req.params;
    const { planeTurnoId, trabajadorTurnoId } = req.body;
    const restriccion = await prisma.assignmentPlane.create({
      data: {
        planeTurnoId,
        trabajadorTurnoId
      },
    });

    res.status(201).json(restriccion);
  } catch (error) {
        console.error("Error al crear asignacion:", error);

    res.status(500).json({ error: 'Error al crear asignacion' });
  }
}

async function eliminarAsignacionTurno(req, res) {
  const { id: turnoId, trabajadorTurnoId } = req.params;

  try {
    // Buscar los planeTurno del turno
    const planesDelTurno = await prisma.planeTurno.findMany({
      where: { turnoId },
      select: { id: true }
    });

    const planeTurnoIds = planesDelTurno.map(p => p.id);

    // Eliminar asignaciones del trabajador solo en esos planeTurno
    await prisma.assignmentPlane.deleteMany({
      where: {
        trabajadorTurnoId,
        planeTurnoId: { in: planeTurnoIds }
      }
    });

    res.status(204).send(); // No content
  } catch (error) {
    console.error("Error al eliminar asignación:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

async function editarAsignacionTurno(req, res) {
  try {
    const { turnoId, trabajadorTurnoId } = req.params;
    const { nuevoPlaneTurnoId } = req.body;

    const plane = await prisma.planeTurno.findUnique({
      where: { id: nuevoPlaneTurnoId },
      select: { turnoId: true },
    });

    if (!plane || plane.turnoId !== turnoId) {
      return res.status(400).json({ error: "Avión no válido para este turno" });
    }

    await prisma.assignmentPlane.updateMany({
      where: { trabajadorTurnoId },
      data: { planeTurnoId: nuevoPlaneTurnoId },
    });

    res.status(200).send("Asignación actualizada");
  } catch (error) {
    console.error("Error al editar asignación:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

// Eliminar turno
async function eliminarTurno(req, res) {
  try {
    const { id } = req.params;
    await prisma.turno.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar turno' });
  }
}

// Importar trabajadores al turno
async function importarTrabajadoresAlTurno(req, res) {
  try {
    const { id } = req.params;
    const { trabajadores } = req.body;

    for (const t of trabajadores) {
      // 1. Verificar si el trabajador existe
      let trabajador = await prisma.trabajador.findUnique({
        where: { rut: t.rut },
      });

      // 2. Si no existe, crearlo
      if (!trabajador) {
        trabajador = await prisma.trabajador.create({
          data: {
            rut: t.rut,
            nombreCompleto: t.nombre,
          },
        });
      }

      // 3. Crear el TrabajadorTurno
      await prisma.trabajadorTurno.create({
        data: {
          turnoId: id,
          trabajadorId: trabajador.id,
          acercamiento: t.acercamiento,
          region: t.region,
          subida: t.subida,
          origen: t.origen,
          destino: t.destino,
        },
      });
    }

    res.status(201).json({ message: `Trabajadores creados y asociados al turno ${id}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al importar trabajadores' });
  }
}

async function agregarTrabajadorATurno(req, res) {
  try {
    const { id: turnoId } = req.params;
    const { rut, nombreCompleto, acercamiento, region, subida, origen, destino } = req.body;

    // Validación básica
    if (!rut || !nombreCompleto || !acercamiento || !region || !origen || !destino || subida === undefined) {
      return res.status(400).json({ error: "Faltan campos obligatorios para crear trabajador" });
    }

    // 1. Verificar si el trabajador ya existe por RUT
    let trabajador = await prisma.trabajador.findUnique({ where: { rut } });

    // 2. Si no existe, crearlo
    if (!trabajador) {
      trabajador = await prisma.trabajador.create({
        data: { rut, nombreCompleto }
      });
    }

    // 3. Crear TrabajadorTurno
    const trabajadorTurno = await prisma.trabajadorTurno.create({
      data: {
        turnoId,
        trabajadorId: trabajador.id,
        acercamiento,
        region,
        subida,
        origen,
        destino,
      }
    });

    res.status(201).json({ message: "Trabajador creado y asignado al turno", trabajadorTurno });
  } catch (error) {
    console.error("Error al agregar trabajador al turno:", error);
    res.status(500).json({ error: "Error interno al agregar trabajador al turno" });
  }
}


// Asingar los aviones de un turno
const asignarAvionesATurno = async (req, res) => {
  try {
    const { id: turnoId } = req.params;
    const { aviones } = req.body;

    if (!Array.isArray(aviones) || aviones.length === 0) {
      return res.status(400).json({ error: 'Debe enviar un arreglo de aviones' });
    }

    // Obtener fecha del turno
    const turno = await prisma.turno.findUnique({
      where: { id: turnoId },
      select: { fecha: true },
    });

    if (!turno) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    const fechaTurno = new Date(turno.fecha);

    // Validar existencia de los aviones
    const avionesIDs = aviones.map(avion => avion.planeId);
    const planesExistentes = await prisma.plane.findMany({
      where: { id: { in: avionesIDs } },
      select: {
        id: true,
        capacidad: true,
        horario_salida: true,
        horario_llegada: true,
      }
    });

    const mapaPlanes = new Map();
    for (const plane of planesExistentes) {
      mapaPlanes.set(plane.id, plane);
    }

    const faltantes = aviones.filter(avion => !mapaPlanes.has(avion.planeId));
    if (faltantes.length > 0) {
      return res.status(400).json({
        error: `Los siguientes aviones no existen: ${faltantes.map(a => a.planeId).join(', ')}`
      });
    }

    // Evitar duplicados en planeTurno
    const existentesEnTurno = await prisma.planeTurno.findMany({
      where: { turnoId, planeId: { in: avionesIDs } },
      select: { planeId: true }
    });
    const yaAsignados = new Set(existentesEnTurno.map(e => e.planeId));

    const nuevosAviones = aviones.filter(avion => !yaAsignados.has(avion.planeId));

    // Función para combinar fecha del turno y hora tipo "18:30"
    const construirFechaHora = (fechaBase, horaStr) => {
      const [hh, mm] = horaStr.split(":").map(Number);
      const minutosTotales = hh * 60 + mm;
      const sumarDia = minutosTotales < 780; // antes de las 13:00
      const fechaBaseAjustada = new Date(fechaBase);
      if (sumarDia) fechaBaseAjustada.setDate(fechaBaseAjustada.getDate() + 1);
      fechaBaseAjustada.setHours(hh, mm, 0, 0);
      return fechaBaseAjustada;
    };

    const inserts = nuevosAviones.map(avion => {
      const plane = mapaPlanes.get(avion.planeId);
      const salidaDT = construirFechaHora(fechaTurno, avion.horario_salida || plane.horario_salida);
      const llegadaDT = construirFechaHora(fechaTurno, avion.horario_llegada || plane.horario_llegada);

      return prisma.planeTurno.create({
        data: {
          planeId: avion.planeId,
          turnoId,
          capacidad: plane.capacidad,
          horario_salida: salidaDT,
          horario_llegada: llegadaDT,
        }
      });
    });

    const resultados = await Promise.all(inserts);
    res.status(201).json({ message: 'Aviones asignados al turno', asignados: resultados });
  } catch (error) {
    console.error('Error al asignar aviones al turno:', error);
    res.status(500).json({ error: 'Error interno al asignar aviones al turno' });
  }
};


// Ejecutar modelo de optimización 
async function optimizarTurno(req, res) {
  const { id } = req.params;

  try {
    const busesScript = path.resolve(__dirname, '../../scripts/crear_buses.py');
    const resolverScript = path.resolve(__dirname, '../../scripts/resolver_modelo.py');

    // Paso 1: crear buses
    await new Promise((resolve, reject) => {
      execFile('python3', [busesScript, '--turnoId', id], (err, stdout, stderr) => {
        if (err) return reject(stderr);
        console.log(stdout);
        resolve();
      });
    });

    // Paso 2: resolver modelo
    const resultadoModelo = await new Promise((resolve, reject) => {
      execFile('python3', [resolverScript, '--turnoId', id], (err, stdout, stderr) => {
        if (err) return reject(stderr);
        console.log(stdout);
        if (stdout.includes("❌ No se encontró solución.")) {
          return reject("No se encontró solución para el modelo.");
        }
        resolve(stdout);
      });
    });

    await prisma.turno.update({
      where: { id: id },
      data: {
        modeloEjecutado: true
      }
    });    
    res.status(200).json({ message: `Modelo ejecutado para turno ${id}` });
  } catch (error) {
    console.error('Error al ejecutar modelo:', error);
    res.status(500).json({ error: `Error al ejecutar modelo: ${error}` });
  }
}


// Ver asignaciones de turno
async function obtenerAsignacionesDeTurno(req, res) {
  try {
    const { id } = req.params;

    const buses = await prisma.assignmentBus.findMany({
      where: {
        busTurno: {
          turnoId: id
        }
      },
      include: {
        busTurno: true,
        trabajadorTurno: {
          include: {
            trabajador: true
          }
        }
      }
    });

    const vuelos = await prisma.assignmentPlane.findMany({
      where: {
        planeTurno: {
          turnoId: id
        }
      },
      include: {
        planeTurno: {
          include: {
            plane: true
          }
        },
        trabajadorTurno: {
          include: {
            trabajador: true
          }
        }
      }
    });

    res.json({ buses, vuelos });
  } catch (error) {
    console.error("Error al obtener asignaciones:", error);
    res.status(500).json({ error: 'Error al obtener asignaciones' });
  }
}

async function eliminarAsignacionesDelTurno(req, res) {
  try {
    const { id: turnoId } = req.params;

    // 1. Obtener todos los TrabajadorTurno del turno
    const trabajadoresTurno = await prisma.trabajadorTurno.findMany({
      where: { turnoId },
      select: { id: true }
    });

    const trabajadorTurnoIds = trabajadoresTurno.map(t => t.id);

    if (trabajadorTurnoIds.length === 0) {
      // Aun así marcamos modeloEjecutado como false
      await prisma.turno.update({
        where: { id: turnoId },
        data: { modeloEjecutado: false },
      });

      return res.status(200).json({ message: "No hay asignaciones que eliminar, pero el modelo se marcó como no ejecutado." });
    }

    // 2. Eliminar asignaciones de buses y vuelos asociadas a estos TrabajadorTurno
    await prisma.assignmentBus.deleteMany({
      where: { trabajadorTurnoId: { in: trabajadorTurnoIds } }
    });

    await prisma.assignmentPlane.deleteMany({
      where: { trabajadorTurnoId: { in: trabajadorTurnoIds } }
    });

    // 3. Actualizar el turno: modeloEjecutado = false
    await prisma.turno.update({
      where: { id: turnoId },
      data: { modeloEjecutado: false },
    });

    res.status(200).json({ message: "Asignaciones eliminadas y modelo marcado como no ejecutado." });
  } catch (error) {
    console.error("Error al eliminar asignaciones del turno:", error);
    res.status(500).json({ error: "Error interno al eliminar asignaciones" });
  }
}



// Ver historial de asignaciones del turno
async function obtenerHistorialDeTurno(req, res) {
  try {
    const { id } = req.params;
    const historial = await prisma.historialAsignacion.findMany({
      where: { turnoId: id },
      include: { trabajador: true },
    });
    res.json(historial);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
}

// helpers/kpiUtils.js
function calcularKPIs(turno, assignmentBuses, assignmentPlanes, busMap, planeMap) {
  const totalTrab = turno.trabajadoresTurno.length;
  const subida = turno.trabajadoresTurno.filter(t => t.subida);
  const bajada = turno.trabajadoresTurno.filter(t => !t.subida);

  const totalBuses  = new Set(assignmentBuses.map(a => a.busTurnoId)).size;
  const totalVuelos = new Set(assignmentPlanes.map(a => a.planeTurnoId)).size;

  const ocupacionPorBus = turno.busTurno
    .map(b => {
      const asignados = assignmentBuses.filter(a => a.busTurnoId === b.id).length;
      return {
        asignados,
        capacidad: b.capacidad,
        ocupacion: b.capacidad ? asignados / b.capacidad : 0,
      };
    })
    .filter(b => b.asignados > 0);

  const promedioOcupacionBus = ocupacionPorBus.length > 0
    ? ocupacionPorBus.reduce((a, b) => a + b.ocupacion, 0) / ocupacionPorBus.length
    : 0;

  const ocupacionPorVuelo = turno.planeTurno
    .map(p => {
      const asignados = assignmentPlanes.filter(a => a.planeTurnoId === p.id).length;
      const capacidad = p.plane?.capacidad ?? p.capacidad;
      return {
        asignados,
        capacidad,
        ocupacion: capacidad ? asignados / capacidad : 0,
      };
    })
    .filter(p => p.asignados > 0);

  const promedioOcupacionVuelo = ocupacionPorVuelo.length > 0
    ? ocupacionPorVuelo.reduce((a, b) => a + b.ocupacion, 0) / ocupacionPorVuelo.length
    : 0;

  const tiemposTraslado = turno.trabajadoresTurno.map(t => {
    const bus = busMap[t.id];
    const vuelo = planeMap[t.id];
    if (!bus || !vuelo) return null;
    const inicio = new Date(t.subida ? bus.horario_salida : vuelo.horario_salida);
    const fin    = new Date(t.subida ? vuelo.horario_llegada : bus.horario_llegada);
    const horas  = (fin.getTime() - inicio.getTime()) / 36e5;
    return horas > 0 ? horas : null;
  }).filter(h => h !== null);

  const tPromedio = tiemposTraslado.length > 0
    ? tiemposTraslado.reduce((a, b) => a + b, 0) / tiemposTraslado.length
    : 0;

  const esperas = turno.trabajadoresTurno.map(t => {
    const bus = busMap[t.id];
    const vuelo = planeMap[t.id];
    if (!bus || !vuelo) return null;
    const espera = t.subida
      ? (new Date(vuelo.horario_salida).getTime() - new Date(bus.horario_llegada).getTime()) / 60000
      : (new Date(bus.horario_salida).getTime() - new Date(vuelo.horario_llegada).getTime()) / 60000;
    return espera > 0 ? espera : null;
  }).filter(e => e !== null);

  const esperaPromedio = esperas.length > 0
    ? esperas.reduce((a, b) => a + b, 0) / esperas.length
    : 0;

  const esperaSobre60 = esperas.filter(e => e > 60).length;
  const porcentajeSobre60 = esperas.length > 0
    ? (esperaSobre60 / esperas.length) * 100
    : 0;

  return [
    ["Trabajadores Totales", totalTrab],
    ["Trabajadores Subida", subida.length],
    ["Trabajadores Bajada", bajada.length],
    ["T. promedio traslado (h)", tPromedio.toFixed(1)],
    ["Espera promedio (min)", esperaPromedio.toFixed(0)],
    ["% espera > 60 min", porcentajeSobre60.toFixed(1) + " %"],
    ["Buses utilizados", totalBuses],
    ["Vuelos utilizados", totalVuelos],
    ["Ocupación media buses (%)", (promedioOcupacionBus * 100).toFixed(1)],
    ["Ocupación media vuelos (%)", (promedioOcupacionVuelo * 100).toFixed(1)]
  ];
}



async function exportarAsignacionesExcel(req, res) {
  const { id } = req.params;
  let nombreArchivo;

  const getHora = (date) => new Date(date).toISOString().substring(11, 16);

  try {
    /* === 1. Carga de datos ============================================ */
    const turno = await prisma.turno.findUnique({
      where: { id },
      include: {
        trabajadoresTurno: { include: { trabajador: true } },
        planeTurno: { include: { plane: true } },
        busTurno:  true,
      },
    });

    // Sanitize turno name for filename
    const safeTurnoName = turno.nombre ? turno.nombre.replace(/[^a-zA-Z0-9_-]/g, "_") : id;
    const dateObj = new Date(turno.fecha);
    const safeDate = !isNaN(dateObj) ? dateObj.toISOString().slice(0,10) : "fecha";
    nombreArchivo = `asignaciones_${safeTurnoName}_${safeDate}_excel`;

    const [assignmentBuses, assignmentPlanes] = await Promise.all([
      prisma.assignmentBus.findMany({
        where: { busTurno: { turnoId: id } },
        include: { busTurno: true },
      }),
      prisma.assignmentPlane.findMany({
        where: { planeTurno: { turnoId: id } },
        include: { planeTurno: { include: { plane: true } } },
      }),
    ]);

    /* === 2. Mapas rápidos ============================================= */
    const busMap   = Object.fromEntries(assignmentBuses .map(a => [a.trabajadorTurnoId, a.busTurno]));
    const planeMap = Object.fromEntries(assignmentPlanes.map(a => [a.trabajadorTurnoId, a.planeTurno]));

    /* === 3. Workbook ================================================== */
    const wb = new ExcelJS.Workbook();

    /******** Hoja 1: Resumen global ************************************/
    const resumen = wb.addWorksheet("Resumen");
    const kpis = calcularKPIs(turno, assignmentBuses, assignmentPlanes, busMap, planeMap);


    // KPI resumen
    resumen.addRows([["KPI", "Valor"], ...kpis]);
    resumen.columns.forEach(c => (c.width = 30));
    resumen.getRow(1).font = { bold: true };
    resumen.eachRow((row, rowNumber) => {
      row.eachCell(cell => {
        cell.alignment = { horizontal: 'center' };
      });
    });



    /******** Hoja itinerarios trabajadores por región ******************************/
    const porRegionYTipo = turno.trabajadoresTurno.reduce((acc, t) => {
      const region = t.region || "Sin región";
      const tipo = t.subida ? "Subida" : "Bajada";
      const key = `${region}_Región_` + tipo;
      acc[key] = acc[key] || [];
      acc[key].push(t);
      return acc;
    }, {});

    Object.entries(porRegionYTipo).forEach(([regionTipo, trabajadores]) => {
      const subida = regionTipo.includes("_Subida");

      const ws = wb.addWorksheet(regionTipo);

      // 🧭 Columnas según tipo
      ws.columns = subida
        ? [
            { header: "Nombre",         key: "nombre",  width: 25 },
            { header: "RUT",            key: "rut",     width: 15 },
            { header: "Comuna salida",  key: "origen",  width: 20 },
            { header: "Salida bus",     key: "sal_bus", width: 12 },
            { header: "Llegada bus",    key: "leg_bus", width: 12 },
            { header: "Aeropuerto",     key: "aerop",   width: 20 },
            { header: "Salida vuelo",   key: "sal_vue", width: 12 },
            { header: "Llegada vuelo",  key: "leg_vue", width: 12 },
            { header: "Comuna destino", key: "destino", width: 20 },
            { header: "T. total (h)",   key: "ttotal",  width: 12 },
          ]
        : [
            { header: "Nombre",         key: "nombre",  width: 25 },
            { header: "RUT",            key: "rut",     width: 15 },
            { header: "Comuna salida",  key: "origen",  width: 20 },
            { header: "Salida vuelo",   key: "sal_vue", width: 12 },
            { header: "Llegada vuelo",  key: "leg_vue", width: 12 },
            { header: "Aeropuerto",     key: "aerop",   width: 20 },
            { header: "Salida bus",     key: "sal_bus", width: 12 },
            { header: "Llegada bus",    key: "leg_bus", width: 12 },
            { header: "Comuna destino", key: "destino", width: 20 },
            { header: "T. total (h)",   key: "ttotal",  width: 12 },
          ];

      trabajadores.forEach(tt => {
        const bus   = busMap[tt.id];
        const vuelo = planeMap[tt.id];
        let origen = "";
        let destino = "";

        if (bus && bus.comunas_origen && bus.comunas_destino) {
          try {
            const comunasOrigen  = JSON.parse(bus.comunas_origen);
            const comunasDestino = JSON.parse(bus.comunas_destino);
            origen  = Array.isArray(comunasOrigen)  ? comunasOrigen.join(", ")  : comunasOrigen;
            destino = Array.isArray(comunasDestino) ? comunasDestino.join(", ") : comunasDestino;
          } catch {
            origen = bus.comunas_origen;
            destino = bus.comunas_destino;
          }
        } else {
          origen = "";
          destino = "";
        }
        
        const origen_bus     = tt.acercamiento ?? tt.origen;
        const destino_bus    = subida ? tt.origen : tt.acercamiento;
        const origen_vuelo   = vuelo?.plane?.ciudad_origen ?? "";
        const destino_vuelo  = vuelo?.plane?.ciudad_destino ?? "";

        let tTotalHr = "";
        if (bus && vuelo) {
          const salida = new Date(subida ? bus.horario_salida : vuelo.horario_salida);
          const llegada = new Date(subida ? vuelo.horario_llegada : bus.horario_llegada);
          tTotalHr = ((llegada.getTime() - salida.getTime()) / 36e5).toFixed(1);
        }

        // 🔀 Datos según tipo
        const row = subida
          ? {
              nombre:  tt.trabajador.nombreCompleto,
              rut:     tt.trabajador.rut,
              origen:  origen_bus,
              sal_bus: bus   ? getHora(bus.horario_salida) : "",
              leg_bus: bus   ? getHora(bus.horario_llegada) : "",
              aerop:   origen_vuelo,
              sal_vue: vuelo ? getHora(vuelo.horario_salida) : "",
              leg_vue: vuelo ? getHora(vuelo.horario_llegada) : "",
              destino: destino_vuelo,
              ttotal:  tTotalHr,
            }
          : {
              nombre:  tt.trabajador.nombreCompleto,
              rut:     tt.trabajador.rut,
              origen:  origen_vuelo,
              aerop:   destino_vuelo,
              sal_vue: vuelo ? getHora(vuelo.horario_salida) : "",
              leg_vue: vuelo ? getHora(vuelo.horario_llegada) : "",
              sal_bus: bus   ? getHora(bus.horario_salida) : "",
              leg_bus: bus   ? getHora(bus.horario_llegada) : "",
              destino: destino_bus,
              ttotal:  tTotalHr,
            };

        ws.addRow(row);
      });

      ws.getRow(1).font = { bold: true };
    });


    /******** Hoja itinerarios buses ************************************/
    const wsBuses = wb.addWorksheet("Itinerarios buses");
    wsBuses.columns = [
      { header: "Bus ID",     key: "id",   width: 20 },
      { header: "Capacidad",  key: "cap",  width: 12 },
      { header: "Ocupación",  key: "occ",  width: 12 },
      { header: "Ruta",       key: "ruta", width: 50 },
    ];

    turno.busTurno.forEach(b => {
      const occ = assignmentBuses.filter(a => a.busTurnoId === b.id).length;
      if (occ == 0) return; // solo buses usados
      let origen = "";
      let destino = "";

      if (b.comunas_origen && b.comunas_destino) {
        try {
          const comunasOrigen  = JSON.parse(b.comunas_origen);
          const comunasDestino = JSON.parse(b.comunas_destino);
          origen  = Array.isArray(comunasOrigen)  ? comunasOrigen.join(", ")  : comunasOrigen;
          destino = Array.isArray(comunasDestino) ? comunasDestino.join(", ") : comunasDestino;
        } catch {
          origen = b.comunas_origen;
          destino = b.comunas_destino;
        }
      } else {
        origen = "";
        destino = "";
      }

      wsBuses.addRow({
        id:  b.id,
        cap: b.capacidad,
        occ,
        ruta: `${origen} ➔ ${destino} (${getHora(b.horario_salida)}-${getHora(b.horario_llegada)})`,
      });
    });

    wsBuses.getRow(1).font = { bold: true };


    /******** Hoja itinerarios vuelos ***********************************/
    const wsVuelos = wb.addWorksheet("Itinerarios vuelos");
    wsVuelos.columns = [
      { header: "Vuelo ID",   key: "id",   width: 20 },
      { header: "Capacidad",  key: "cap",  width: 12 },
      { header: "Ocupación",  key: "occ",  width: 12 },
      { header: "Ruta",       key: "ruta", width: 50 },
    ];

    turno.planeTurno.forEach(p => {
      const occ = assignmentPlanes.filter(a => a.planeTurnoId === p.id).length;
      if (occ == 0) return; // solo vuelos usados
      wsVuelos.addRow({
        id:  p.id,
        cap: p.capacidad, // ← esto es la capacidad en PlaneTurno (no Plane)
        occ,
        ruta: `${p.plane?.ciudad_origen} ➔ ${p.plane?.ciudad_destino} (${getHora(p.horario_salida)}-${getHora(p.horario_llegada)})`,
      });
    });

    wsVuelos.getRow(1).font = { bold: true };


    /* === 4. Envío ===================================================== */
    res.setHeader("Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition",
      `attachment; filename=${nombreArchivo}.xlsx`);

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error exportando asignaciones:", err);
    res.status(500).json({ error: "Error al exportar asignaciones" });
  }
}

async function exportarAsignacionesPdf(req, res) {
  try {
    const { id } = req.params;

    // === 1. Carga de datos ===
    const turno = await prisma.turno.findUnique({
      where: { id },
      include: {
        trabajadoresTurno: { include: { trabajador: true } },
        planeTurno: { include: { plane: true } },
        busTurno:  true,
      },
    });

    // Sanitize turno name for filename
    const safeTurnoName = turno.nombre ? turno.nombre.replace(/[^a-zA-Z0-9_-]/g, "_") : id;
    const dateObj = new Date(turno.fecha);
    const safeDate = !isNaN(dateObj) ? dateObj.toISOString().slice(0,10) : "fecha";
    const nombreArchivo = `asignaciones_${safeTurnoName}_${safeDate}_pdf`;

    const [assignmentBuses, assignmentPlanes] = await Promise.all([
      prisma.assignmentBus.findMany({
        where: { busTurno: { turnoId: id } },
        include: { busTurno: true },
      }),
      prisma.assignmentPlane.findMany({
        where: { planeTurno: { turnoId: id } },
        include: { planeTurno: { include: { plane: true } } },
      }),
    ]);

    const busMap   = Object.fromEntries(assignmentBuses.map(a => [a.trabajadorTurnoId, a.busTurno]));
    const planeMap = Object.fromEntries(assignmentPlanes.map(a => [a.trabajadorTurnoId, a.planeTurno]));

    const kpis = calcularKPIs(turno, assignmentBuses, assignmentPlanes, busMap, planeMap);

    // Agrupar por región y tipo
    const porRegionYTipo = turno.trabajadoresTurno.reduce((acc, t) => {
      const region = t.region || 'Sin Región';
      const tipo   = t.subida ? 'Subida' : 'Bajada';
      const key    = `${region} – ${tipo}`;
      (acc[key] = acc[key] || []).push(t);
      return acc;
    }, {});

    // === 2. Definición del PDF ===
    const fonts = { Helvetica: { normal: 'Helvetica', bold: 'Helvetica-Bold' } };
    const printer = new PdfPrinter(fonts);

    const docDefinition = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [40, 60, 40, 60],
      content: [
        // Título
        { text: 'Reporte de Turno', style: 'header' },
        // Metadata básico
        {
          columns: [
            { width: 'auto', text: `ID: ${turno.id}`, style: 'smallText' },
            { width: '*', text: '' },
            { width: 'auto', text: `Fecha: ${new Date(turno.fecha).toLocaleDateString()}`, style: 'smallText' }
          ]
        },
        { text: '\n' },

        // === KPIs ===
        { text: '1. Resumen de KPIs', style: 'subheader' },
        {
          table: {
            headerRows: 1,
            widths: ['*', 100],
            body: [
              [{ text: 'Indicador', style: 'tableHeader' }, { text: 'Valor', style: 'tableHeader' }],
              ...kpis.map(([label, valor]) => [ label, valor ])
            ]
          },
          style: 'tableBody',
          layout: 'lightHorizontalLines',
        },

        // === Itinerarios por región ===
        { text: '\n2. Itinerarios por Región y Tipo', style: 'subheader' },
        ...Object.entries(porRegionYTipo).flatMap(([regionTipo, trabajadores]) => {
          // construyes un bloque para cada sección
          const header = [
            'Nombre','RUT',
            ...(regionTipo.endsWith('Subida')
              ? ['Origen Bus','Salida Bus','Llegada Bus','Aeropuerto','Salida Vuelo','Llegada Vuelo','Destino','T. total (h)']
              : ['Origen','Salida Vuelo','Llegada Vuelo','Aeropuerto','Salida Bus','Llegada Bus','Destino Bus','T. total (h)']
            )
          ];

          const rows = trabajadores.map(tt => {
            const bus   = busMap[tt.id];
            const vuelo = planeMap[tt.id];
            const getHora = dt => dt ? new Date(dt).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'}) : '';
            const tTotal = bus && vuelo
              ? (((vuelo.horario_llegada - (tt.subida ? bus.horario_salida : vuelo.horario_salida)) / 36e5).toFixed(1))
              : '';
            if (tt.subida) {
              return [
                tt.trabajador.nombreCompleto,
                tt.trabajador.rut,
                tt.origen ?? '',
                getHora(bus?.horario_salida),
                getHora(bus?.horario_llegada),
                bus?.plane?.ciudad_destino ?? '',
                getHora(vuelo?.horario_salida),
                getHora(vuelo?.horario_llegada),
                tt.destino ?? '',
                tTotal
              ];
            } else {
              return [
                tt.trabajador.nombreCompleto,
                tt.trabajador.rut,
                tt.origen ?? '',
                getHora(vuelo?.horario_salida),
                getHora(vuelo?.horario_llegada),
                vuelo?.plane?.ciudad_destino ?? '',
                getHora(bus?.horario_salida),
                getHora(bus?.horario_llegada),
                tt.origen ?? '',
                tTotal
              ];
            }
          });

          // Set explicit column widths for 10 columns
          const widths = [70, 55, 60, 45, 45, 60, 45, 45, 60, 45];

          return [
            { text: regionTipo, style: 'tableSubheader', margin: [0, 8, 0, 4] },
            {
              table: {
                headerRows: 1,
                widths,
                body: [ header, ...rows ]
              },
              style: 'tableBody',
              layout: 'lightHorizontalLines',
              margin: [0, 0, 0, 8]
            }
          ];
        }),

        // === Itinerarios Buses ===
        { text: '3. Itinerarios de Buses', style: 'subheader' },
        {
          table: {
            headerRows: 1,
            widths: [60, 50, '*'],
            body: [
              [{ text: 'Bus ID', style: 'tableHeader' }, { text: 'Capacidad', style: 'tableHeader' }, { text: 'Ruta (hh:mm-hh:mm)', style: 'tableHeader' }],
              ...turno.busTurno.map(b => {
                const occ = assignmentBuses.filter(a => a.busTurnoId === b.id).length;
                const ruta = `${new Date(b.horario_salida).toLocaleTimeString('es-CL')} - ${new Date(b.horario_llegada).toLocaleTimeString('es-CL')}`;
                return [ b.id, `${b.capacidad} (uso: ${occ})`, ruta ];
              })
            ]
          },
          style: 'tableBody',
          layout: 'lightHorizontalLines',
          pageBreak: 'after'
        },

        // === Itinerarios Vuelos ===
        { text: '4. Itinerarios de Vuelos', style: 'subheader', margin: [0,0,0,4] },
        {
          table: {
            headerRows: 1,
            widths: [60, 50, '*'],
            body: [
              [{ text: 'Vuelo ID', style: 'tableHeader' }, { text: 'Capacidad', style: 'tableHeader' }, { text: 'Ruta (hh:mm-hh:mm)', style: 'tableHeader' }],
              ...turno.planeTurno.map(p => {
                const occ = assignmentPlanes.filter(a => a.planeTurnoId === p.id).length;
                const ruta = `${new Date(p.horario_salida).toLocaleTimeString('es-CL')} - ${new Date(p.horario_llegada).toLocaleTimeString('es-CL')}`;
                return [ p.id, `${p.capacidad} (uso: ${occ})`, ruta ];
              })
            ]
          },
          style: 'tableBody',
          layout: 'lightHorizontalLines'
        }
      ],
      styles: {
        header:        { fontSize: 20, bold: true, alignment: 'center', margin: [0,0,0,10] },
        subheader:     { fontSize: 14, bold: true, margin: [0,10,0,4] },
        tableHeader:   { bold: true, fillColor: '#eeeeee' },
        tableSubheader:{ margin: [0,4,0,2] },
        smallText:     { fontSize: 8, color: '#666666' },
        tableBody:     { fontSize: 8 }
      },
      defaultStyle: {
        font: 'Helvetica',
        fontSize: 10,
        lineHeight: 1.2
      }
    };

    // === 3. Generar y enviar PDF ===
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks = [];
    pdfDoc.on('data', chunk => chunks.push(chunk));
    pdfDoc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${nombreArchivo}.pdf`);
      res.send(pdfBuffer);
    });
    pdfDoc.end();

  } catch (error) {
    console.error("Error generando PDF:", error);
    res.status(500).json({ error: 'No se pudo generar el PDF' });
  }
}



async function obtenerParametrosModelo(req, res) {
  try {
    const { id: turnoId } = req.params;
    const parametros = await prisma.parametrosModeloTurno.findUnique({
      where: { turnoId },
    });

    if (!parametros) {
      return res.status(404).json({ error: 'Parámetros no encontrados' });
    }

    res.json(parametros);
  } catch (error) {
    console.error("Error al obtener parámetros:", error);
    res.status(500).json({ error: 'Error al obtener parámetros del turno' });
  }
}



async function actualizarParametrosModeloTurno(req, res) {
  try {
    const { id: turnoId } = req.params;
    const {
      espera_conexion_subida,
      espera_conexion_bajada,
      tiempo_promedio_espera,
      max_tiempo_ejecucion,
      tiempo_adicional_parada,
      min_hora,
      max_hora,
    } = req.body;

    // Verifica existencia del turno
    const turno = await prisma.turno.findUnique({
      where: { id: turnoId },
      include: { parametrosModelo: true },
    });

    if (!turno) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    if (!turno.parametrosModelo) {
      return res.status(400).json({ error: 'Este turno no tiene parámetros asociados aún.' });
    }

    const parametrosActualizados = await prisma.parametrosModeloTurno.update({
      where: {
        turnoId: turnoId,
      },
      data: {
        espera_conexion_subida,
        espera_conexion_bajada,
        tiempo_promedio_espera,
        max_tiempo_ejecucion,
        tiempo_adicional_parada,
        min_hora,
        max_hora,
      },
    });

    res.json(parametrosActualizados);
  } catch (error) {
    console.error('Error al actualizar parámetros del modelo:', error);
    res.status(500).json({ error: 'Error al actualizar los parámetros del turno' });
  }
}


module.exports = {
  crearTurno,
  obtenerTurnos,
  obtenerTurno,
  obtenerTrabajadoresTurno,
  obtenerAvionesTurno,
  obtenerBusesTurno,
  editarTurno,
  eliminarTurno,
  importarTrabajadoresAlTurno,
  asignarAvionesATurno,
  optimizarTurno,
  obtenerAsignacionesDeTurno,
  obtenerHistorialDeTurno,
  exportarAsignacionesExcel,
  exportarAsignacionesPdf,
  agregarCapacidadTurno,
  obtenerCapacidadTurno,
  editarCapacidadTurno,
  eliminarCapacidadTurno,
  obtenerParametrosModelo,
  actualizarParametrosModeloTurno,
  eliminarAsignacionesDelTurno,
  agregarAsignacionTurno,
  eliminarAsignacionTurno,
  editarAsignacionTurno,
  editarAsignacionTurnoBus,
  editarAsignacionTurnoPlane,
  obtenerAsignacionTurnoBus,
  obtenerAsignacionTurnoPlane,
  obtenerCompatiblesTurnoBus,
  obtenerCompatiblesTurnoPlane,
  intercambioAsignacionTurnoBus,
  intercambioAsignacionTurnoPlane,
  agregarTrabajadorATurno
};
