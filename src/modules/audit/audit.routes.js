// src/modules/audit/audit.routes.js
const express = require('express');
const router = express.Router();
const auditController = require('./audit.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { checkRole } = require('../../middlewares/role.middleware');

router.use(authMiddleware.verifyToken);

const ADMIN_ROLE = 'Gerente General';

// HU043: Obtener los logs de auditoría
router.get('/', checkRole(ADMIN_ROLE), auditController.getAuditLogs);

module.exports = router;