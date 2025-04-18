const { exec } = require('child_process');
const path = require('path');

const ejecutarResolverModelo = (req, res) => {
    try {
        const scriptPath = path.join(__dirname, '../../scripts/resolver_modelo.py');
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
    const scriptPath = path.join(__dirname, '../../scripts/crear_buses.py');
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
  ejecutarCrearBuses
};