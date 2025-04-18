const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de MPM Transporte',
      version: '1.0.0',
      description: 'Documentación automática de la API para el proyecto de optimización de transporte',
    },
    servers: [
      {
        url: 'http://localhost:3000', 
      },
    ],
    tags: [
      {
        name: 'Autenticación',
        description: 'Login y registro de usuarios externos o internos.',
      },
      {
        name: 'Administración de Usuarios',
        description: 'CRUD de usuarios internos realizado por un administrador.',
      },
      {
        name: 'Gestión de Aviones',
        description: 'Registro y mantenimiento de datos de vuelos.',
      },
      {
        name: 'Asignaciones de Aviones',
        description: 'Asignación de vuelos a trabajadores.',
      },
      {
        name: 'Gestión de Trabajadores',
        description: 'Manejo de la información de trabajadores transportados.',
      },
      {
        name: 'Optimización de Itinerarios',
        description: 'Ejecución del modelo de optimización para asignación de transporte.',
      },
      {
        name: 'Asignaciones de Buses',
        description: 'Asignación de buses a trabajadores según origen y destino.',
      },
      {
        name: 'Gestión de Buses',
        description: 'Registro y mantenimiento de datos de buses.',
      },
      {
        name: 'Carga de Archivos Excel',
        description: 'Carga masiva de datos desde planillas Excel.',
      }
    ]
  },
  apis: [__dirname + '/../routes/**/*.js'], 
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
