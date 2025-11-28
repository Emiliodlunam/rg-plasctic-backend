// src/modules/sales/sales.routes.js
const express = require('express');
const router = express.Router();
const salesController = require('./sales.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { checkRole } = require('../../middlewares/role.middleware');

// Todas las rutas de ventas y clientes estarán protegidas
router.use(authMiddleware.verifyToken);

// Roles permitidos para gestionar clientes
const ADMIN_ROLE = 'Gerente General';
// Ajusta este rol si el nombre de la posición es diferente en tu base de datos
const SALES_ROLE = 'Ejecutiva de Ventas'; 

// HU020: CRUD para Clientes
router.post('/clients', checkRole(ADMIN_ROLE, SALES_ROLE), salesController.createNewClient);
router.get('/clients', checkRole(ADMIN_ROLE, SALES_ROLE), salesController.getAllClients);
router.get('/clients/:id', checkRole(ADMIN_ROLE, SALES_ROLE), salesController.getClientDetails);
router.put('/clients/:id', checkRole(ADMIN_ROLE, SALES_ROLE), salesController.updateClientDetails);
router.delete('/clients/:id', checkRole(ADMIN_ROLE, SALES_ROLE), salesController.removeClient);
// HU021: Crear un nuevo pedido de venta
router.post('/orders', checkRole(ADMIN_ROLE, SALES_ROLE), salesController.createOrder);
// --- RUTAS PARA PEDIDOS ---
router.post('/orders', checkRole(ADMIN_ROLE, SALES_ROLE), salesController.createOrder);
// --- NUEVA RUTA PARA LISTAR PEDIDOS ---
router.get('/orders', checkRole(ADMIN_ROLE, SALES_ROLE), salesController.getAllOrders);
router.get('/orders/:id', checkRole(ADMIN_ROLE, SALES_ROLE), salesController.getOrderDetails);
router.patch('/orders/:id/status', checkRole(ADMIN_ROLE, SALES_ROLE), salesController.changeOrderStatus);
// --- NUEVA RUTA PARA REPORTES ---
router.get('/reports/by-client', checkRole(ADMIN_ROLE, SALES_ROLE), salesController.getSalesByClientReport);
router.get('/reports/dashboard', checkRole(ADMIN_ROLE, SALES_ROLE), salesController.getSalesDashboard);


module.exports = router;