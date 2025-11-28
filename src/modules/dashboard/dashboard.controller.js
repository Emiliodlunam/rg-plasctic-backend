// src/modules/dashboard/dashboard.controller.js
const dashboardService = require('./dashboard.service');

const getSummary = async (req, res) => {
    try {
        const kpis = await dashboardService.getDashboardSummary();
        res.status(200).json({ success: true, data: kpis });
    } catch (error) {
        console.error("Error al generar el resumen del dashboard:", error.message);
        res.status(500).json({ success: false, message: 'Error al generar el resumen del dashboard.' });
    }
};

module.exports = {
    getSummary,
};