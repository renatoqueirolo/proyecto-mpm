const { PrismaClient } = require('@prisma/client');
const { spawn } = require('child_process')
const path = require('path');

const prisma = new PrismaClient();

/**
 * Llama al scraper en Python para (origen, destino, fecha) y parsea su JSON de salida.
 * Asumimos que ya adaptaste scraper_vuelos.py para que reciba 3 args:
 *   --origen SCL --destino LIM --fecha 2025-06-10
 * y que imprima por stdout un array JSON de vuelos en un formato unificado.
 */
async function callPythonScraper(origen, destino, fecha) {
  return new Promise((resolve, reject) => {
    // Ajusta la ruta al script Python según tu estructura de carpetas
    const scriptPath = path.join(__dirname, "../scripts/scraper/scraper_vuelos.py");

    // Aquí ejecutamos: python scraper_vuelos.py --origen SCL --destino LIM --fecha 2025-06-10
    const py = spawn("python3", [
      scriptPath,
      "--origen",
      origen,
      "--destino",
      destino,
      "--fecha",
      fecha,
    ]);

    let stdoutData = "";
    let stderrData = "";

    py.stdout.on("data", (data) => {
      stdoutData += data.toString();
    });
    py.stderr.on("data", (data) => {
      stderrData += data.toString();
    });
    py.on("close", (code) => {
      if (code !== 0) {
        console.error("Error al invocar scraper Python:", stderrData);
        return reject(new Error(`Python scraper finalizó con código ${code}`));
      }
      try {
        const json = JSON.parse(stdoutData);
        return resolve(json);
      } catch (e) {
        console.error("No se pudo parsear JSON del scraper:", stdoutData);
        return reject(e);
      }
    });
  });
}

/**
 * Transforma el JSON “crudo” del scraper a la forma exacta que espera la tabla Flight.
 * Depende de cómo imprimas el JSON desde Python; aquí asumimos un array de objetos con claves:
 * {
 *   airline, flightCode, origin, destination,
 *   departureDate, departureTime, arrivalTime,
 *   durationMinutes, priceClp, direct, stops,
 *   stopsDetail, seatsAvailable
 * }
 */

function fixTimestamp(ts) {
  // Si viene “YYYY-MM-DDTHH:MM:SS:00”, corto el último ":00"
  return ts.replace(/:00$/, "");
}

function normalizeFlights(rawArray) {
  return rawArray.map((f) => ({
    airline: f.airline,
    flightCode: f.flightCode,
    origin: f.origin,
    destination: f.destination,
    // Convertir strings ISO a Date
    departureDate: new Date(f.departureDate),
    departureTime: new Date(fixTimestamp(f.departureTime)),
    arrivalTime: new Date(fixTimestamp(f.arrivalTime)),
    durationMinutes: f.durationMinutes,
    priceClp: BigInt(f.priceClp),
    direct: f.direct,
    stops: f.stops,
    stopsDetail: f.stopsDetail ?? [],
    seatsAvailable: f.seatsAvailable,
  }));
}

/**
 * Función principal que devuelven todos los vuelos de (origen, destino, fecha).
 * - Si existe al menos un registro en BD con createdAt >= now()-12h,
 *   devuelve todos los registros (sin llamar al scraper).
 * - Si no, llama al scraper, borra los vuelos viejos de esa ruta+fecha,
 *   los inserta con createdAt=now() y devuelve el conjunto recién insertado.
 */
async function getFlights(origen, destino, fecha) {
  // 1. Calcular “hace 12 horas”
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

  // 2. Consultar cuántos vuelos “recientes” existen para esta ruta+fecha
  const countRecent = await prisma.commercialPlane.count({
    where: {
      origin: origen,
      destination: destino,
      departureDate: new Date(fecha),
      createdAt: {
        gte: twelveHoursAgo,
      },
    },
  });

  if (countRecent > 0) {
    // 2a. Devuelve todos los vuelos de esa ruta+fecha, ordenados por hora de salida
    const cached = await prisma.commercialPlane.findMany({
      where: {
        origin: origen,
        destination: destino,
        departureDate: new Date(fecha),
      },
      orderBy: {
        departureTime: "asc",
      },
    });

    // Transformamos a “tipo crudo” para que coincida con el retorno esperado
    return cached.map((f) => ({
      airline: f.airline,
      flightCode: f.flightCode,
      origin: f.origin,
      destination: f.destination,
      departureDate: f.departureDate,
      departureTime: f.departureTime,
      arrivalTime: f.arrivalTime,
      durationMinutes: f.durationMinutes,
      priceClp: f.priceClp,
      direct: f.direct,
      stops: f.stops,
      stopsDetail: f.stopsDetail,
      seatsAvailable: f.seatsAvailable,
    }));
  }

  // 2b. No hay datos recientes → invocar el scraper en Python
  const rawAll = await callPythonScraper(origen, destino, fecha);
  const allFlights = normalizeFlights(rawAll);

  // 3. Por cada vuelo scraped: hacer UPSERT en lugar de borrar + crear
  for (const f of allFlights) {
    await prisma.commercialPlane.upsert({
      where: {
        // Índice único: (airline, flightCode, departureDate)
        // Prisma espera que eso esté declarado así en schema.prisma:
        airline_flightCode_departureDate: {
          airline: f.airline,
          flightCode: f.flightCode,
          departureDate: f.departureDate,
        },
      },
      update: {
        // Lo que cambia: horarios, precio, disponibilidad, stopsDetail, createdAt
        departureTime: f.departureTime,
        arrivalTime: f.arrivalTime,
        durationMinutes: f.durationMinutes,
        priceClp: f.priceClp,
        direct: f.direct,
        stops: f.stops,
        stopsDetail: f.stopsDetail,
        seatsAvailable: f.seatsAvailable,
        createdAt: new Date(), // marcamos como “fresco”
      },
      create: {
        airline: f.airline,
        flightCode: f.flightCode,
        origin: f.origin,
        destination: f.destination,
        departureDate: f.departureDate,
        departureTime: f.departureTime,
        arrivalTime: f.arrivalTime,
        durationMinutes: f.durationMinutes,
        priceClp: f.priceClp,
        direct: f.direct,
        stops: f.stops,
        stopsDetail: f.stopsDetail,
        seatsAvailable: f.seatsAvailable,
        // createdAt usa el default @default(now())
      },
    });
  }

  // 4. Ahora que hemos upserteado los “allFlights”, vamos a devolver solo los vuelos frescos:
  const justInserted = await prisma.commercialPlane.findMany({
    where: {
      origin: origen,
      destination: destino,
      departureDate: new Date(fecha),
      createdAt: {
        gte: twelveHoursAgo,
      },
    },
    orderBy: {
      departureTime: "asc",
    },
  });

  return justInserted.map((f) => ({
    airline: f.airline,
    flightCode: f.flightCode,
    origin: f.origin,
    destination: f.destination,
    departureDate: f.departureDate,
    departureTime: f.departureTime,
    arrivalTime: f.arrivalTime,
    durationMinutes: f.durationMinutes,
    priceClp: f.priceClp,
    direct: f.direct,
    stops: f.stops,
    stopsDetail: f.stopsDetail,
    seatsAvailable: f.seatsAvailable,
  }));
}

module.exports = {
  getFlights,
};
