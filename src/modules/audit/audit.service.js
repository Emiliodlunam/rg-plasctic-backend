// src/modules/audit/audit.service.js
const db = require('../../config/postgres');

/**
 * Registra una nueva acción en el log de auditoría.
 * Esta función está diseñada para ser llamada desde otros servicios.
 * @param {number} user_id - El ID del usuario que realiza la acción.
 * @param {string} action - La acción realizada (ej: 'CREATE_PRODUCT', 'UPDATE_ORDER_STATUS').
 * @param {object} details - Un objeto JSON o texto con detalles (ej: { product_id: 10, new_status: 'COMPLETED' }).
 */
const logAction = async (user_id, action, details) => {
    try {
        const text = `
            INSERT INTO audits (user_id, action, details)
            VALUES ($1, $2, $3);
        `;
        // Convertimos el objeto de detalles a un string JSON para guardarlo en la BD
        const detailsString = JSON.stringify(details);
        const values = [user_id, action, detailsString];
        
        await db.query(text, values);
        
    } catch (error) {
        // Si la auditoría falla, no queremos que la operación principal (ej. crear un pedido) falle.
        // Por eso, solo imprimimos el error en la consola del servidor y no lo relanzamos.
        // Esto es una decisión de diseño: la auditoría es importante, pero no debe detener el negocio.
        console.error('Error grave: Fallo al registrar en la auditoría.', error);
    }
};

/**
 * Obtiene una lista paginada de todos los registros de auditoría.
 * Permite filtrar por usuario, acción y rango de fechas.
 */
const findAudits = async (filters = {}) => {
    const { page, limit = 15, userId, action, startDate, endDate } = filters;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let conditions = [];

    if (userId) {
        params.push(userId);
        conditions.push(`a.user_id = $${params.length}`);
    }
    if (action) {
        params.push(`%${action}%`);
        conditions.push(`a.action ILIKE $${params.length}`);
    }
    if (startDate) {
        params.push(startDate);
        conditions.push(`a.timestamp >= $${params.length}`);
    }
    if (endDate) {
        params.push(endDate);
        conditions.push(`a.timestamp <= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) FROM audits a ${whereClause}`;
    
    const dataQuery = `
        SELECT 
            a.id, 
            a.timestamp, 
            a.action, 
            a.details, 
            u.username as user_name
        FROM audits a
        JOIN users u ON a.user_id = u.id
        ${whereClause}
        ORDER BY a.timestamp DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;

    const [countResult, dataResult] = await Promise.all([
        db.query(countQuery, params),
        db.query(dataQuery, [...params, limit, offset])
    ]);

    const totalItems = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalItems / limit);

    return { items: dataResult.rows, totalPages, currentPage: parseInt(page) || 1, totalItems };
};


module.exports = {
    logAction,
    findAudits,
};