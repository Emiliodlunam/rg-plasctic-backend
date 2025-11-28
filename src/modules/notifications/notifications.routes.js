// src/modules/notifications/notifications.routes.js
const express = require('express');
const router = express.Router();
const notificationsController = require('./notifications.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// Cualquier usuario logueado puede ver sus notificaciones
router.use(authMiddleware.verifyToken);

router.get('/summary', notificationsController.getSummary);

module.exports = router;