// src/modules/production/production.routes.js
const express = require('express');
const router = express.Router();
const productionController = require('./production.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { checkRole } = require('../../middlewares/role.middleware');

router.use(authMiddleware.verifyToken);

// Roles con acceso al módulo de producción
const ADMIN_ROLE = 'Gerente General';
const PROD_ROLE = 'Jefe de Producción';
// Podrías añadir 'Operador de Extrusión' o similar con permisos más limitados
// const OPERATOR_ROLE = 'Operador de Extrusión';

// Crear una nueva orden de producción
router.post('/orders', checkRole(ADMIN_ROLE, PROD_ROLE), productionController.createOrder);

// Listar todas las órdenes (con filtros de status y paginación)
router.get('/orders', checkRole(ADMIN_ROLE, PROD_ROLE), productionController.getAllOrders);

// Ver detalles de una orden específica
router.get('/orders/:id', checkRole(ADMIN_ROLE, PROD_ROLE), productionController.getOrderDetails);

// Cambiar el estado de una orden
router.patch('/orders/:id/status', checkRole(ADMIN_ROLE, PROD_ROLE), productionController.changeStatus);

// HU011: Registrar consumo de materia prima para una orden específica
router.post('/orders/:orderId/consumptions', checkRole(ADMIN_ROLE, PROD_ROLE), productionController.addConsumption);

// HU012 / HU013: Registrar un lote de producción terminado para una orden
router.post('/orders/:orderId/batches', checkRole(ADMIN_ROLE, PROD_ROLE), productionController.addBatch);

// HU014: Registrar merma para una orden específica
router.post('/orders/:orderId/wastes', checkRole(ADMIN_ROLE, PROD_ROLE), productionController.addWaste);

// HU014: Obtener reporte de mermas (con filtros opcionales)
router.get('/wastes', checkRole(ADMIN_ROLE, PROD_ROLE), productionController.getWastes);

// HU014: Obtener datos para gráfico de mermas
router.get('/wastes/chart', checkRole(ADMIN_ROLE, PROD_ROLE), productionController.getWastesChart);

// HU032: Obtener análisis de costos de una orden de producción
router.get('/orders/:orderId/cost-analysis', checkRole(ADMIN_ROLE, PROD_ROLE, 'Analista Financiero'), productionController.getCostAnalysis);

module.exports = router;