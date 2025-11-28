// src/modules/finances/finances.routes.js
const express = require('express');
const router = express.Router();
const financesController = require('./finances.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { checkRole } = require('../../middlewares/role.middleware');

router.use(authMiddleware.verifyToken);

// Roles con acceso al módulo de finanzas (Ajusta según necesites)
const ADMIN_ROLE = 'Gerente General';
const FINANCE_ROLE = 'Analista Financiero'; // Asumiendo que existe este rol

// --- Rutas para Ingresos (HU030) ---
router.post('/incomes', checkRole(ADMIN_ROLE, FINANCE_ROLE), financesController.addIncome);
router.get('/incomes', checkRole(ADMIN_ROLE, FINANCE_ROLE), financesController.getIncomes);

// --- Rutas para Egresos (HU031) ---
router.post('/expenses', checkRole(ADMIN_ROLE, FINANCE_ROLE), financesController.addExpense);
router.get('/expenses', checkRole(ADMIN_ROLE, FINANCE_ROLE), financesController.getExpenses);

// --- NUEVA RUTA PARA REPORTE DE UTILIDAD (HU033) ---
router.get('/reports/profit-by-client', checkRole(ADMIN_ROLE, FINANCE_ROLE), financesController.getProfitReport);

// Registrar un nuevo costeo para un producto
router.post('/costings', checkRole(ADMIN_ROLE, FINANCE_ROLE), financesController.addCosting);

// Obtener el historial de costeos de un producto específico
router.get('/costings/product/:productId', checkRole(ADMIN_ROLE, FINANCE_ROLE), financesController.getCostingsForProduct);

module.exports = router;