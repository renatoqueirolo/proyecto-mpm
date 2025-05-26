const { exec } = require('child_process');
const path = require('path');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runFullOptimizacion(req, res) {
  try {
    // Check if we have workers and planes
    const workers = await prisma.worker.findMany();
    const planes = await prisma.plane.findMany();

    if (workers.length === 0) {
      return res.status(400).json({ error: 'No hay trabajadores importados. Por favor, importe trabajadores primero.' });
    }
    if (planes.length === 0) {
      return res.status(400).json({ error: 'No hay vuelos importados. Por favor, importe vuelos primero.' });
    }

    // Delete existing buses before creating new ones
    await prisma.busTurno.deleteMany();
    console.log('Buses anteriores eliminados.');

    // Create buses
    console.log('Ejecutando crear_buses.py...');
    await new Promise((resolve, reject) => {
      exec('python3 src/scripts/crear_buses.py', (error, stdout, stderr) => {
        if (error) {
          console.error('Error en crear_buses.py:', error);
          console.error('stderr:', stderr);
          return reject(new Error(`Error al crear buses: ${stderr || error.message}`));
        }
        console.log(stdout);
        resolve();
      });
    });

    // Check if buses were created
    const buses = await prisma.busTurno.findMany();
    if (buses.length === 0) {
      return res.status(400).json({ error: 'No se pudieron crear los buses. Verifique los datos de entrada.' });
    }

    // Run optimization model
    console.log('Ejecutando resolver_modelo.py...');
    await new Promise((resolve, reject) => {
      exec('python3 src/scripts/resolver_modelo.py', (error, stdout, stderr) => {
        if (error) {
          console.error('Error en resolver_modelo.py:', error);
          console.error('stderr:', stderr);
          return reject(new Error(`Error al ejecutar el modelo: ${stderr || error.message}`));
        }
        console.log(stdout);
        resolve();
      });
    });

    // Check if assignments were created
    const assignments = await prisma.assignmentBus.findMany();
    if (assignments.length === 0) {
      return res.status(400).json({ error: 'No se pudieron crear las asignaciones. El modelo no encontró una solución factible.' });
    }

    res.json({ 
      message: 'Modelo ejecutado con éxito.',
      details: {
        workers: workers.length,
        planes: planes.length,
        buses: buses.length,
        assignments: assignments.length
      }
    });
  } catch (error) {
    console.error('Error al ejecutar modelo completo:', error);
    res.status(500).json({ 
      error: 'Error al ejecutar modelo completo.',
      details: error.message
    });
  }
}


const ejecutarResolverModelo = (req, res) => {
    try {
        const scriptPath = path.join(__dirname, '../../../scripts/resolver_modelo.py');
        exec(`python3 ${scriptPath}`, (error, stdout, stderr) => {
        if (error) return res.status(500).json({ error: stderr });
        return res.status(200).json({ message: 'Modelo ejecutado correctamente.', output: stdout });
    });
    } catch (error) {
        console.error("Error al ejecutar el modelo ->", error.message);
        return res.status(500).json({ message: error.message });
    }
    
};

const ejecutarCrearBuses = (req, res) => {
  try {
    const scriptPath = path.join(__dirname, '../../../scripts/crear_buses.py');
    exec(`python3 ${scriptPath}`, (error, stdout, stderr) => {
      if (error) return res.status(500).json({ error: stderr });
      return res.status(200).json({ message: 'Buses generados correctamente.', output: stdout });
    });  
  } catch (error) {
    console.error("Error al crear los buses ->", error.message);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  ejecutarResolverModelo,
  ejecutarCrearBuses,
  runFullOptimizacion
};