// src/modules/audit/audit.controller.js
const auditService = require('./audit.service');

const getAuditLogs = async (req, res) => {
    try {
        const paginatedData = await auditService.findAudits(req.query);
        res.status(200).json({ success: true, data: paginatedData });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener los logs de auditoría.' });
    }
};

module.exports = {
    getAuditLogs,
};