const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Función para limpiar y formatear el RUT
function formatearRut(rut) {
  if (!rut) return null;
  console.log("Formateando RUT:", rut);
  rut = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase().trim();

  // Solo acepta ruts de 8 o 9 caracteres (7-8 dígitos + 1 dv)
  if (!/^\d{7,8}[0-9K]$/.test(rut)) return null;

  const cuerpo = rut.slice(0, rut.length - 1); // todos menos el último
  const dv = rut.slice(-1); // último caracter

  return `${cuerpo}-${dv}`;
}


async function consultaOpenAI(req, res) {
  const { pregunta, numero } = req.body;

  // 1. Buscar el RUT en la pregunta o en el historial
  const mensajes = await prisma.mensaje.findMany({
    where: { numero },
    orderBy: { id: 'asc' },
  });

  // Buscar el rut en la pregunta o historial
  // Buscar el rut en la pregunta o historial
const rutRegex = /\b(\d{1,2}\.?\d{3}\.?\d{3})-?\s*([0-9Kk])\b/;

let rutUsuario = null;

// 1. Intentar extraer un RUT del mensaje actual
let rutMatch = pregunta.match(rutRegex);

if (rutMatch) {
  const rutCrudo = `${rutMatch[1]}${rutMatch[2]}`;
  rutUsuario = formatearRut(rutCrudo);

  if (!rutUsuario) {
    // Si el mensaje actual tiene un RUT, pero es inválido → no buscar en historial
    return res.json({
      respuestaConversacional: "Parece que el RUT que me diste no está completo o tiene un error. ¿Podrías enviarlo nuevamente en formato 12345678-9? 😊",
      resultado: null,
      explicacion: null,
    });
  }
} else {
  // 2. Si no hay RUT en este mensaje, busca en historial
  for (const m of mensajes.reverse()) {
    rutMatch = m.mensaje.match(rutRegex);
    if (rutMatch) {
      const rutCrudo = `${rutMatch[1]}${rutMatch[2]}`;
      rutUsuario = formatearRut(rutCrudo);
      if (rutUsuario) break; // solo acepta si es válido
    }
  }

  if (!rutUsuario) {
    return res.json({
      respuestaConversacional: "Por favor, indícame tu RUT en formato 12345678-9 para poder ayudarte 😊",
      resultado: null,
      explicacion: null,
    });
  }
}


  // 2. Ejecutar la consulta Prisma directamente
  let result = null;
  try {
    console.log("Consultando base de datos para el RUT:", rutUsuario);
    result = await prisma.trabajador.findUnique({
      where: { rut: rutUsuario },
      include: {
        trabajadorTurnos: {
          include: {
            assignmentBuses: {
              include: { busTurno: true }
            },
            assignmentPlanes: {
              include: { planeTurno: true }
            }
          }
        }
      }
    });
    result.trabajadorTurnos.sort((a, b) => {
  const aHora = new Date(a.assignmentPlanes?.[0]?.planeTurno?.horario_salida || 0);
  const bHora = new Date(b.assignmentPlanes?.[0]?.planeTurno?.horario_salida || 0);
  return bHora - aHora;
});
console.log("Resultado de la consulta:", result);
  } catch (e) {
    return res.status(500).json({ error: "Error al consultar la base de datos", detalle: e.message });
  }
  if (!pregunta.includes("todos")) {
    result.trabajadorTurnos = result.trabajadorTurnos[0] ? [result.trabajadorTurnos[0]] : [];
  }
  // 3. Generar respuesta conversacional con prompt2
const prompt2 = `Un usuario me pidió: "${pregunta}". En la base de datos estan los siguientes datos: ${JSON.stringify(result.trabajadorTurnos[0], null, 2)}.

Tu tarea es generar una respuesta clara, explicativa y conversacional basada en estos datos, pero solo respondiendo la pregunta del usuario. Sigue **estrictamente** estas reglas:

✅ Reglas obligatorias:
- Si el resultado está vacío, responde que no se encontraron resultados.
- Si el usuario pregunta por vuelos o buses asignados, entrega **solo el más reciente** (según la fecha de llegada o salida más nueva, en formato ISO). Si no hay ninguno, indícalo claramente.
- Solo si el usuario pregunta por todos sus vuelos o buses, muestra **todos los asignados**.
- **Ordena siempre por la fecha más reciente** (campo: "horario_llegada" o "horario_salida").
- No muestres ningún valor como "Pendiente". Omite ese campo si no tiene valor claro.
- No incluyas ningún campo de tipo ID.
- Solo muestra informacion que te pidio el usuario, no detalles adicionales. Por ejemplo si el usuario pregunta por su bus, no muestres información de vuelos.
- Usa un saludo con el nombre del usuario si está disponible. Si no, usa un saludo general con emojis.
- Usa un tono profesional, amigable y **simple**, con uso de emojis.
- No digas frases como “según los datos” o “según la base de datos”. Responde de forma natural, como si fueras una persona ayudando.
- Siempre ofrece ayuda adicional al final.

✅ Formato de presentación:
- Si hay información que mostrar, utiliza un punteo con emojis representativos para cada dato (por ejemplo, ✈️ Avion, 📍 Destino, 📅 Fecha, ⏰ Hora, 🚌 Bus).
- Asegúrate de que toda la información esté en lenguaje natural y sea fácil de entender.
- No incluyas detalles técnicos sobre la consulta o la base de datos.
- Revisa las instrucciones una vez más antes de generar la respuesta. No te las saltes.`;

  const respuestaConversacional = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "user", content: prompt2 }
    ],
    max_tokens: 300,
    temperature: 0.5,
  });

  const respuestaFinal = respuestaConversacional.choices[0].message.content;

  // 4. Guardar la pregunta y la respuesta en el historial
  await prisma.mensaje.create({
    data: {
      numero: numero,
      mensaje: pregunta,
      esBot: false,
    },
  });
  await prisma.mensaje.create({
    data: {
      numero: numero,
      mensaje: respuestaFinal,
      esBot: true,
    },
  });

  return res.json({
    resultado: result,
    respuestaConversacional: respuestaFinal,
    explicacion: null,
  });
}

module.exports = {
  consultaOpenAI,
};