const { exec } = require('child_process');
const path = require('path');

const ejecutarResolverModelo = (req, res) => {
  const scriptPath = path.join(__dirname, '../../scripts/resolver_modelo.py');
  exec(`python3 ${scriptPath}`, (error, stdout, stderr) => {
    if (error) return res.status(500).json({ error: stderr });
    return res.status(200).json({ message: 'Modelo ejecutado correctamente.', output: stdout });
  });
};

const ejecutarCrearBuses = (req, res) => {
  const scriptPath = path.join(__dirname, '../../scripts/crear_buses.py');
  exec(`python3 ${scriptPath}`, (error, stdout, stderr) => {
    if (error) return res.status(500).json({ error: stderr });
    return res.status(200).json({ message: 'Buses generados correctamente.', output: stdout });
  });
};

module.exports = {
  ejecutarResolverModelo,
  ejecutarCrearBuses
};
