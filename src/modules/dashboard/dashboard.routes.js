// src/modules/dashboard/dashboard.routes.js
const express = require('express');
const router = express.Router();
const dashboardController = require('./dashboard.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// El dashboard debe ser visible para cualquier usuario logueado
router.use(authMiddleware.verifyToken);

// Obtener el resumen de KPIs para el dashboard principal
router.get('/summary', dashboardController.getSummary);

module.exports = router;