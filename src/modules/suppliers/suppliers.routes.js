// src/modules/suppliers/suppliers.routes.js
const express = require('express');
const router = express.Router();
const supplierController = require('./suppliers.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// Protegemos la ruta para que solo usuarios logueados puedan ver los proveedores
router.use(authMiddleware.verifyToken);

router.get('/', supplierController.getAllSuppliers);

module.exports = router;