const twilio = require('twilio');
const { consultaOpenAI } = require('./chatbot.controller');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER; // Ej: 'whatsapp:+14155238886'
const client = twilio(accountSid, authToken);

// Adaptador para usar consultaOpenAI fuera de Express
async function consultaOpenAIWhatsapp(pregunta, numero) {
  let resultado = null;
  let error = null;
  let res = {
    json: (data) => { resultado = data; },
    status: () => ({ json: (data) => { error = data; } }) // Simula res.status().json()
  };
  await consultaOpenAI({ body: { pregunta, numero } }, res);
  if (error) {
    return error.error || "Ocurrió un error en la consulta.";
  }
  return resultado.respuestaConversacional || resultado.explicacion || "No se pudo obtener respuesta.";
}

// En tu handler:
async function recibirMensaje(req, res) {
  const mensaje = req.body.Body;
  const de = req.body.From;

  // Aquí puedes procesar el mensaje recibido
const respuesta = await consultaOpenAIWhatsapp(mensaje, de);
           await prisma.mensaje.create({
      data: {
        numero: de,
        mensaje: respuesta,
        esBot: true,
      },
    }); 
  // Responder al usuario
  await enviarMensaje(de, respuesta);

  res.status(200).send('<Response></Response>');
}

// Enviar mensaje de WhatsApp
async function enviarMensaje(to, body) {
  console.log("Enviando mensaje a:", to, "con cuerpo:", body);
  return client.messages.create({
    from: whatsappFrom,
    to: to, // Ejemplo: 'whatsapp:+569XXXXXXXX'
    body: body,
  });
}

async function borrarHistorial(req, res) {
  try {
    // First delete all related assignments
    await prisma.mensaje.deleteMany({});
    
    // Then delete all planes    
    return res.status(200).json({ message: "Todos los mensajes fueron eliminados." });
  } catch (error) {
    console.error("Error al eliminar todos los mensajes ->", error.message);
    return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    borrarHistorial,
  recibirMensaje,
  enviarMensaje,
};