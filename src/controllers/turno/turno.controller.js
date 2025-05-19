const ExcelJS = require('exceljs');
const { execFile } = require('child_process');
const path = require('path');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Crear turno
async function crearTurno(req, res) {
  try {
    const { fecha, creadoPorId } = req.body;
    if (!fecha || !creadoPorId)
      return res.status(400).json({ error: 'Faltan campos requeridos' });

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
          fecha: new Date(fecha),
          creadoPorId: creadoPorIdString,
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
    const turnos = await prisma.turno.findMany({
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
async function editarFechaTurno(req, res) {
  try {
    const { id } = req.params;
    const { fecha } = req.body;

    const fechaValida = new Date(fecha);
    if (isNaN(fechaValida)) {
      return res.status(400).json({ error: "Fecha inválida" });
    }

    await prisma.turno.update({
      where: { id },
      data: {
        fecha: fechaValida,
      },
    });

    res.status(204).send();
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

async function eliminarCapacidadTurno(req, res) {
  try {
    const {id} = req.body;
    console.log("ID de capacidad a eliminar:", id);
    await prisma.capacidadTurno.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error("Error al eliminar capacidad:", error);
    res.status(500).json({ error: 'Error al eliminar turno' });
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
      fechaBaseAjustada.setHours(hh+20, mm, 0, 0);
      return fechaBaseAjustada;
    };

    const inserts = nuevosAviones.map(avion => {
      const plane = mapaPlanes.get(avion.planeId);
      const salidaDT = construirFechaHora(fechaTurno, plane.horario_salida);
      const llegadaDT = construirFechaHora(fechaTurno, plane.horario_llegada);

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


async function exportarAsignaciones(req, res) {
  const { id } = req.params;
  const getHora = (date) => {
    const d = new Date(date);
    return d.toISOString().substring(11, 16); // "HH:MM"
  };

  try {
    const turno = await prisma.turno.findUnique({
      where: { id },
      include: {
        trabajadoresTurno: {
          include: {
            trabajador: true,
          },
        },
        planeTurno: {
          include: {
            plane: true,
          },
        },
        busTurno: true,
      },
    });

    const assignmentBuses = await prisma.assignmentBus.findMany({
      where: {
        busTurno: {
          turnoId: id,
        },
      },
      include: {
        busTurno: true,
      },
    });

    const assignmentPlanes = await prisma.assignmentPlane.findMany({
      where: {
        planeTurno: {
          turnoId: id,
        },
      },
      include: {
        planeTurno: true,
      },
    });

    // Crear mapas de asignaciones por trabajadorTurnoId
    const busMap = {};
    const planeMap = {};

    assignmentBuses.forEach(a => {
      busMap[a.trabajadorTurnoId] = a.busTurno;
    });

    assignmentPlanes.forEach(a => {
      planeMap[a.trabajadorTurnoId] = a.planeTurno;
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Asignaciones');

    sheet.columns = [
      { header: 'Nombre', key: 'nombre', width: 25 },
      { header: 'RUT', key: 'rut', width: 15 },
      { header: 'Subida/Bajada', key: 'subida', width: 15 },
      { header: 'Origen', key: 'origen', width: 20 },
      { header: 'Destino', key: 'destino', width: 20 },
      { header: 'Hora salida bus', key: 'salida_bus', width: 15 },
      { header: 'Hora llegada bus', key: 'llegada_bus', width: 15 },
      { header: 'Hora salida vuelo', key: 'salida_vuelo', width: 15 },
      { header: 'Hora llegada vuelo', key: 'llegada_vuelo', width: 15 },
    ];

    for (const tt of turno.trabajadoresTurno) {
      const bus = busMap[tt.id];
      const vuelo = planeMap[tt.id];

      const subida = tt.subida;
      const acercamiento = tt.acercamiento ?? '';
      const region = tt.region ?? '';
      const origen = subida ? acercamiento : tt.origen;
      const destino = subida ? tt.destino : acercamiento;

      sheet.addRow({
        nombre: tt.trabajador.nombreCompleto,
        rut: tt.trabajador.rut,
        subida: subida ? 'Subida' : 'Bajada',
        origen,
        destino,
        region,
        salida_bus: bus ? getHora(bus.horario_salida) : '',
        llegada_bus: bus ? getHora(bus.horario_llegada) : '',
        salida_vuelo: vuelo ? vuelo.horario_salida : '',
        llegada_vuelo: vuelo ? vuelo.horario_llegada : '',
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=asignaciones_turno_${id}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exportando asignaciones:', error);
    res.status(500).json({ error: 'Error al exportar asignaciones' });
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
  editarFechaTurno,
  eliminarTurno,
  importarTrabajadoresAlTurno,
  asignarAvionesATurno,
  optimizarTurno,
  obtenerAsignacionesDeTurno,
  obtenerHistorialDeTurno,
  exportarAsignaciones,
  agregarCapacidadTurno,
  obtenerCapacidadTurno,
  editarCapacidadTurno,
  eliminarCapacidadTurno,
  obtenerParametrosModelo,
  actualizarParametrosModeloTurno,
};
