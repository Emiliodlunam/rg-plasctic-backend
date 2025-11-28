// src/modules/inventory/inventory.routes.js
const express = require('express');
const router = express.Router();
const inventoryController = require('./inventory.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { checkRole } = require('../../middlewares/role.middleware');

// =================================================================================
// APLICAMOS EL MIDDLEWARE DE SEGURIDAD AL INICIO DEL ARCHIVO
// A partir de aquí, CUALQUIER ruta definida en este archivo requerirá un token válido.
// =================================================================================
router.use(authMiddleware.verifyToken);

// Roles con acceso a inventario (DEBEN coincidir con la columna 'position' en la tabla 'employees')
const ADMIN_ROLE = 'Gerente General';
const PROD_ROLE = 'Jefe de Producción';
const WAREHOUSE_ROLE = 'Encargado de Almacén';
const OPERATOR_ROLE = 'Operador de Extrusión';

// =================== Rutas para Productos (Ahora todas protegidas) ===================

// HU001: Crear un nuevo producto
router.post('/products', checkRole(ADMIN_ROLE, WAREHOUSE_ROLE), inventoryController.registerProduct);

// HU005: Obtener la lista de todos los productos (reporte general)
router.get('/products', checkRole(ADMIN_ROLE, PROD_ROLE, WAREHOUSE_ROLE), inventoryController.getInventoryReport);

// HU005: Obtener el reporte de productos con bajo stock
router.get('/products/low-stock', checkRole(ADMIN_ROLE, WAREHOUSE_ROLE), inventoryController.getLowStockReport);

// HU001: Obtener un producto específico por su ID
router.get('/products/:id', checkRole(ADMIN_ROLE, PROD_ROLE, WAREHOUSE_ROLE), inventoryController.getProductById);

// HU001 & HU002: Actualizar un producto existente (ej. para definir stock mínimo)
router.put('/products/:id', checkRole(ADMIN_ROLE, WAREHOUSE_ROLE), inventoryController.updateProductDetails);

// HU001: Eliminar (lógicamente) un producto
router.delete('/products/:id', checkRole(ADMIN_ROLE, WAREHOUSE_ROLE), inventoryController.removeProduct);


// =================== Rutas para Movimientos de Inventario (Ahora todas protegidas) ===================

// HU003: Registrar una entrada de inventario
router.post('/movements/entry', checkRole(ADMIN_ROLE, WAREHOUSE_ROLE), inventoryController.registerEntryMovement);

// HU004: Registrar una salida de inventario para producción
router.post('/movements/exit-production', checkRole(ADMIN_ROLE, PROD_ROLE, WAREHOUSE_ROLE), inventoryController.registerExitMovement);


module.exports = router;