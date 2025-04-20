const { exec } = require('child_process');
const path = require('path');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runFullOptimizacion(req, res) {
  try {
    const workers = await prisma.worker.findMany();
    const planes = await prisma.plane.findMany();

    if (workers.length === 0) return res.status(400).json({ error: 'No hay trabajadores importados' });
    if (planes.length === 0) return res.status(400).json({ error: 'No hay vuelos importados' });

    console.log('Ejecutando crear_buses.py...');
    await new Promise((resolve, reject) => {
      exec('python3 src/scripts/crear_buses.py', (error, stdout, stderr) => {
        if (error) {
          console.error('Error en crear_buses.py:', error);
          console.error('stderr:', stderr);
          return reject(error);
        }
        console.log(stdout);
        resolve();
      });
    });

    console.log('Ejecutando resolver_modelo.py...');
    await new Promise((resolve, reject) => {
      exec('python3 src/scripts/resolver_modelo.py', (error, stdout, stderr) => {
        if (error) {
          console.error('Error en resolver_modelo.py:', error);
          console.error('stderr:', stderr);
          return reject(error);
        }
        console.log(stdout);
        resolve();
      });
    });

    res.json({ message: 'Modelo ejecutado con éxito.' });
  } catch (error) {
    console.error('Error al ejecutar modelo completo:', error);
    res.status(500).json({ error: 'Error al ejecutar modelo completo.' });
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