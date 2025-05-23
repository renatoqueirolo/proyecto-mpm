
const express = require('express');
const router = express.Router();
const {  userMustBeLogged  } = require('../../middlewares/auth.middleware');
const {
  crearTurno,
  obtenerTurnos,
  obtenerTurno,
  obtenerTrabajadoresTurno,
  obtenerBusesTurno,
  obtenerAvionesTurno,
  editarTurno,
  eliminarTurno,
  importarTrabajadoresAlTurno,
  asignarAvionesATurno,
  optimizarTurno,
  obtenerAsignacionesDeTurno,
  obtenerHistorialDeTurno,
  exportarAsignacionesExcel,
  exportarAsignacionesPdf,
  agregarCapacidadTurno,
  obtenerCapacidadTurno,
  editarCapacidadTurno,
  eliminarCapacidadTurno,
  obtenerParametrosModelo,
  actualizarParametrosModeloTurno,
  eliminarAsignacionesDelTurno,
  agregarAsignacionTurno,
  editarAsignacionTurnoBus,
  editarAsignacionTurnoPlane,
  obtenerAsignacionTurnoBus,
  obtenerAsignacionTurnoPlane,
  obtenerCompatiblesTurnoBus,
  obtenerCompatiblesTurnoPlane,
  intercambioAsignacionTurnoBus,
  intercambioAsignacionTurnoPlane
} = require('../../controllers/turno/turno.controller');

router.use(userMustBeLogged)

/**
 * @swagger
 * tags:
 *   name: Turnos
 *   description: Gestión de turnos
 */

/**
 * @swagger
 * /turnos:
 *   post:
 *     summary: Crear un nuevo turno
 *     tags: [Turnos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, fecha, subida, creadoPorId]
 *             properties:
 *               nombre:
 *                 type: string
 *               fecha:
 *                 type: string
 *                 format: date
 *               subida:
 *                 type: boolean
 *               creadoPorId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Turno creado
 */
router.post('/', crearTurno);

/**
 * @swagger
 * /turnos:
 *   get:
 *     summary: Obtener todos los turnos
 *     tags: [Turnos]
 *     responses:
 *       200:
 *         description: Lista de turnos
 */
router.get('/', obtenerTurnos);

/**
 * @swagger
 * /turnos/{id}:
 *   get:
 *     summary: Obtener un turno específico
 *     tags: [Turnos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Turno encontrado
 *       404:
 *         description: No encontrado
 */
router.get('/:id', obtenerTurno);
router.get('/:id/trabajadores', obtenerTrabajadoresTurno);
router.get('/:id/aviones', obtenerAvionesTurno);
router.get('/:id/buses', obtenerBusesTurno);

router.put('/:id', editarTurno);


/**
 * @swagger
 * /turnos/{id}:
 *   delete:
 *     summary: Eliminar un turno
 *     tags: [Turnos]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Eliminado exitosamente
 */
router.delete('/:id', eliminarTurno);

/**
 * @swagger
 * /turnos/{id}/trabajadores:
 *   post:
 *     summary: Importar trabajadores a un turno
 *     tags: [Turnos]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               trabajadores:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     trabajadorId:
 *                       type: string
 *                     origen:
 *                       type: string
 *                     destino:
 *                       type: string
 *     responses:
 *       201:
 *         description: Trabajadores importados
 */
router.post('/:id/trabajadores', importarTrabajadoresAlTurno);

/**
 * @swagger
 * /turnos/{id}/aviones:
 *   post:
 *     summary: Asigna aviones a un turno con horarios y capacidades específicos
 *     tags:
 *       - Turnos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del turno
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               aviones:
 *                 type: array
 *                 description: Lista de aviones a asignar al turno
 *                 items:
 *                   type: object
 *                   required:
 *                     - planeId
 *                     - capacidad
 *                     - horario_salida
 *                     - horario_llegada
 *                   properties:
 *                     planeId:
 *                       type: string
 *                       description: ID del avión base (tabla Plane)
 *                       example: clx12abc
 *                     capacidad:
 *                       type: integer
 *                       description: Capacidad específica para este turno
 *                       example: 180
 *                     horario_salida:
 *                       type: string
 *                       format: time
 *                       description: Hora de salida (formato HH:mm)
 *                       example: "17:30"
 *                     horario_llegada:
 *                       type: string
 *                       format: time
 *                       description: Hora de llegada (formato HH:mm)
 *                       example: "19:15"
 *     responses:
 *       201:
 *         description: Aviones asignados correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Aviones asignados al turno
 *                 asignados:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PlaneTurno'
 *       400:
 *         description: Datos inválidos o aviones no encontrados
 *       404:
 *         description: Turno no encontrado
 *       500:
 *         description: Error interno del servidor
 */

router.post('/:id/planes', asignarAvionesATurno);


/**
 * @swagger
 * /turnos/{id}/optimizar:
 *   post:
 *     summary: Ejecutar el modelo de optimización
 *     tags: [Turnos]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Optimización ejecutada
 */
router.post('/:id/optimizar', optimizarTurno);

/**
 * @swagger
 * /turnos/{id}/capacidad:
 *   post:
 *     summary: Crear una capacidad para un turno
 *     tags: [Turnos]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Capacidad creada
 */
router.post('/:id/capacidad', agregarCapacidadTurno);

/**
 * @swagger
 * /turnos/{id}/capacidad:
 *   get:
 *     summary: Obtener capacidades de un turno
 *     tags: [Turnos]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Capacidades encontradas
 */
router.get('/:id/capacidad', obtenerCapacidadTurno);

router.put('/:id/capacidad', editarCapacidadTurno);


/**
 * @swagger
 * /turnos/{id}/capacidad:
 *   delete:
 *     summary: Eliminar capacidad
 *     tags: [Turnos]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Eliminado exitosamente
 */
router.delete('/:id/capacidad', eliminarCapacidadTurno);
/**
 * @swagger
 * /turnos/{id}/asignaciones:
 *   get:
 *     summary: Obtener asignaciones de un turno
 *     tags: [Turnos]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Asignaciones encontradas
 */
router.get('/:id/asignaciones', obtenerAsignacionesDeTurno);

/**
 * @swagger
 * /turnos/{id}/asignaciones:
 *   post:
 *     summary: Crear una asignacion para un turno
 *     tags: [Turnos]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Asignacion creada
 */
router.post('/:id/asignaciones', agregarAsignacionTurno);

router.put('/:id/asignaciones/bus', editarAsignacionTurnoBus);

router.put('/:id/asignaciones/plane', editarAsignacionTurnoPlane);

router.get('/:id/asignaciones/bus/:busTurnoId', obtenerAsignacionTurnoBus);

router.get('/:id/asignaciones/plane/:planeTurnoId', obtenerAsignacionTurnoPlane);

router.get('/:id/asignaciones/bus/compatibles/:trabajadorTurnoId', obtenerCompatiblesTurnoBus);

router.get('/:id/asignaciones/plane/compatibles/:trabajadorTurnoId', obtenerCompatiblesTurnoPlane);

router.put('/:id/asignaciones/bus/intercambio', intercambioAsignacionTurnoBus);

router.put('/:id/asignaciones/plane/intercambio', intercambioAsignacionTurnoPlane);

/**
 * @swagger
 * /turnos/{id}/historial:
 *   get:
 *     summary: Obtener historial de asignaciones
 *     tags: [Turnos]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Historial encontrado
 */
router.get('/:id/historial', obtenerHistorialDeTurno);

router.get('/:id/exportar_excel', exportarAsignacionesExcel);

router.get('/:id/exportar_pdf', exportarAsignacionesPdf);



/**
 * @swagger
 * /turnos/{id}/parametros:
 *   get:
 *     summary: Obtener parámetros del modelo de optimización
 *     tags: [Turnos]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Parámetros encontrados
 *       404:
 *        description: No encontrado
 */
router.get('/:id/parametros', obtenerParametrosModelo);

/**
 * @swagger
 * /turnos/{id}/parametros:
 *   put:
 *     summary: Actualizar parámetros del modelo de optimización
 *     tags: [Turnos]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *              espera_conexion_subida:
 *                type: integer
 *                description: Tiempo de espera para la conexión de subida
 *              espera_conexion_bajada:
 *                type: integer
 *                description: Tiempo de espera para la conexión de bajada
 *              tiempo_promedio_espera:
 *                type: integer
 *                description: Tiempo promedio de espera
 *              max_tiempo_ejecucion:
 *                type: integer
 *                description: Tiempo máximo de ejecución
 *              tiempo_adicional_parada:
 *                type: integer
 *                description: Tiempo adicional de parada
 *              min_hora:
 *                type: string
 *                description: Hora mínima de operación
 *              max_hora:
 *                type: string
 *                description: Hora máxima de operación
 */
router.put('/:id/parametros', actualizarParametrosModeloTurno);
router.delete('/:id/asignaciones', eliminarAsignacionesDelTurno);


module.exports = router;
