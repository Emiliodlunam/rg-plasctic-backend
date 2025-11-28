// src/modules/notifications/notifications.service.js
const db = require('../../config/postgres');

/**
 * Obtiene un resumen de notificaciones y alertas clave del sistema.
 * @param {object} userData - Datos del usuario (para futuras notificaciones personalizadas).
 */
const getNotificationsSummary = async (userData) => {
    
    // Consulta 1: Contar productos con stock bajo o crítico
    const lowStockQuery = db.query(`
        SELECT COUNT(id) as low_stock_count
        FROM products
        WHERE current_stock <= min_stock AND is_active = TRUE;
    `);

    // Consulta 2: Contar cotizaciones ('QUOTE') pendientes de aprobación
    const pendingQuotesQuery = db.query(`
        SELECT COUNT(id) as pending_quotes_count
        FROM sales_orders
        WHERE status = 'QUOTE';
    `);
    
    // Consulta 3: Contar órdenes de producción pendientes de iniciar
    const pendingProductionQuery = db.query(`
        SELECT COUNT(id) as pending_production_count
        FROM production_orders
        WHERE status = 'PENDING';
    `);

    // Ejecutar todas las consultas en paralelo
    const [
        lowStockResult,
        pendingQuotesResult,
        pendingProductionResult
    ] = await Promise.all([
        lowStockQuery,
        pendingQuotesQuery,
        pendingProductionQuery
    ]);

    // Consolidar los resultados
    const summary = {
        low_stock_count: parseInt(lowStockResult.rows[0].low_stock_count) || 0,
        pending_quotes_count: parseInt(pendingQuotesResult.rows[0].pending_quotes_count) || 0,
        pending_production_count: parseInt(pendingProductionResult.rows[0].pending_production_count) || 0,
    };

    return summary;
};

module.exports = {
  getNotificationsSummary,
};