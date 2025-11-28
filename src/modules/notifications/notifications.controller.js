// src/modules/notifications/notifications.controller.js
const notificationsService = require('./notifications.service');

const getSummary = async (req, res) => {
    try {
        // Pasamos req.user por si en el futuro queremos notificaciones por rol
        const summary = await notificationsService.getNotificationsSummary(req.user);
        res.status(200).json({ success: true, data: summary });
    } catch (error) {
        console.error("Error al generar el resumen de notificaciones:", error.message);
        res.status(500).json({ success: false, message: 'Error al generar las notificaciones.' });
    }
};

module.exports = {
    getSummary,
};