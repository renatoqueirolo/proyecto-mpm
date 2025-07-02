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
let scrapingInProgress = false;  // Variable de bloqueo

async function getFlights(origen, destino, fecha, turnoId) {
  if (scrapingInProgress) {
    throw new Error("Scraping ya en progreso.");
  }

  scrapingInProgress = true;  // Bloqueamos el scraping

  try {
    // 1. Eliminamos la lógica de "12 horas"
    // const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    // 2. Eliminar la verificación de vuelos recientes
    // const countRecent = await prisma.commercialPlane.count({
    //   where: {
    //     origin: origen,
    //     destination: destino,
    //     departureDate: new Date(fecha),
    //     createdAt: { gte: twelveHoursAgo },  // Esta lógica se elimina
    //   },
    // });

    // 3. Siempre se hace scraping y no se consulta la base de datos
    const rawAll = await callPythonScraper(origen, destino, fecha);
    const allFlights = normalizeFlights(rawAll);

    // 4. Insertamos los vuelos recién obtenidos en la base de datos
    for (const f of allFlights) {
      await prisma.commercialPlane.upsert({
        where: {
          airline_flightCode_departureDate: {
            airline: f.airline,
            flightCode: f.flightCode,
            departureDate: f.departureDate,
          },
        },
        update: {
          departureTime: f.departureTime,
          arrivalTime: f.arrivalTime,
          durationMinutes: f.durationMinutes,
          priceClp: f.priceClp,
          direct: f.direct,
          stops: f.stops,
          stopsDetail: f.stopsDetail,
          seatsAvailable: f.seatsAvailable,
          createdAt: new Date(),
          turnoId,
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
          turno: { connect: { id: turnoId } },
        },
      });
    }

    // 5. Devolvemos los vuelos frescos (sin importar la antigüedad)
    const justInserted = await prisma.commercialPlane.findMany({
      where: {
        origin: origen,
        destination: destino,
        departureDate: new Date(fecha),
        turnoId,
      },
      orderBy: { departureTime: "asc" },
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
  } catch (err) {
    console.error("Error en scraping o base de datos:", err);
    throw new Error("Error al obtener los vuelos.");
  } finally {
    scrapingInProgress = false;  // Liberamos el bloqueo
  }
}



module.exports = {
  getFlights,
};
