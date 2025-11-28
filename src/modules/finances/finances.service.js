// src/modules/finances/finances.service.js
const db = require('../../config/postgres');

// --- Funciones para Ingresos (HU030) ---

/**
 * Registra un nuevo ingreso.
 */
const createIncome = async (incomeData) => {
    const { amount, date, source, invoice_id } = incomeData;
    const text = `
        INSERT INTO incomes (amount, date, source, invoice_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
    `;
    // Asegurarse de que invoice_id sea null si viene vacío
    const values = [amount, date, source, invoice_id || null]; 
    const { rows } = await db.query(text, values);
    // Aquí podríamos añadir lógica para actualizar saldos de cuentas por cobrar si invoice_id está presente.
    return rows[0];
};

/**
 * Obtiene una lista paginada de ingresos, con filtros opcionales.
 */
const findAllIncomes = async (filters = {}) => {
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const offset = (page - 1) * limit;
    const { startDate, endDate, source } = filters;
    
    const params = [];
    let conditions = [];

    if (source) {
        params.push(`%${source}%`);
        conditions.push(`source ILIKE $${params.length}`);
    }
    if (startDate) {
        params.push(startDate);
        conditions.push(`date >= $${params.length}`);
    }
    if (endDate) {
        params.push(endDate);
        conditions.push(`date <= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) FROM incomes ${whereClause}`;
    const dataQuery = `
        SELECT * FROM incomes 
        ${whereClause}
        ORDER BY date DESC, id DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const [countResult, dataResult] = await Promise.all([
        db.query(countQuery, params),
        db.query(dataQuery, [...params, limit, offset])
    ]);

    const totalItems = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalItems / limit);

    return { items: dataResult.rows, totalPages, currentPage: page, totalItems };
};


// --- Funciones para Egresos (HU031) ---

/**
 * Registra un nuevo egreso.
 */
const createExpense = async (expenseData) => {
    const { amount, date, category, supplier_id } = expenseData;
    const text = `
        INSERT INTO expenses (amount, date, category, supplier_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
    `;
    // Asegurarse de que supplier_id sea null si viene vacío
    const values = [amount, date, category, supplier_id || null];
    const { rows } = await db.query(text, values);
    // Aquí podríamos añadir lógica para actualizar saldos de cuentas por pagar.
    return rows[0];
};

/**
 * Obtiene una lista paginada de egresos, con filtros opcionales.
 */
const findAllExpenses = async (filters = {}) => {
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const offset = (page - 1) * limit;
    const { startDate, endDate, category, supplierId } = filters;
    
    const params = [];
    let conditions = [];

    if (category) {
        params.push(`%${category}%`);
        conditions.push(`e.category ILIKE $${params.length}`);
    }
     if (supplierId) {
        params.push(supplierId);
        conditions.push(`e.supplier_id = $${params.length}`);
    }
    if (startDate) {
        params.push(startDate);
        conditions.push(`e.date >= $${params.length}`);
    }
    if (endDate) {
        params.push(endDate);
        conditions.push(`e.date <= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) FROM expenses e ${whereClause}`;
    const dataQuery = `
        SELECT e.*, s.name as supplier_name 
        FROM expenses e
        LEFT JOIN suppliers s ON e.supplier_id = s.id
        ${whereClause}
        ORDER BY e.date DESC, e.id DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const [countResult, dataResult] = await Promise.all([
        db.query(countQuery, params),
        db.query(dataQuery, [...params, limit, offset])
    ]);

    const totalItems = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalItems / limit);

    return { items: dataResult.rows, totalPages, currentPage: page, totalItems };
};

/**
 * HU033: Genera un reporte de utilidad (ingresos - costos) agrupado por cliente.
 * Se basa en pedidos 'COMPLETED' y en los costos de la tabla 'costings'.
 */
const getProfitReportByClient = async (filters = {}) => {
    const { startDate, endDate } = filters;
    const params = [];
    let dateCondition = '';

    if (startDate) {
        params.push(startDate);
        conditions.push(`so.order_date >= $${params.length}`);
    }
    if (endDate) {
        params.push(endDate);
        conditions.push(`so.order_date <= $${params.length}`);
    }

    // Usamos una Subconsulta (Common Table Expression - CTE) para obtener el costo más reciente de cada producto.
    // Esto es crucial para no mezclar costos antiguos.
    const query = `
        WITH LatestCosts AS (
        SELECT 
            product_id, 
            total as product_cost
        FROM costings c1
        WHERE c1.calculation_date = (
            SELECT MAX(c2.calculation_date) 
            FROM costings c2 
            WHERE c2.product_id = c1.product_id
        )
        )
        SELECT 
        c.id as client_id,
        c.name as client_name,
        COUNT(DISTINCT so.id) as total_orders,
        SUM(op.quantity * op.price) as total_revenue,
        SUM(op.quantity * COALESCE(lc.product_cost, 0)) as total_cost,
        SUM(op.quantity * op.price) - SUM(op.quantity * COALESCE(lc.product_cost, 0)) as total_profit
        FROM sales_orders so
        JOIN clients c ON so.client_id = c.id
        JOIN order_products op ON so.id = op.order_id
        LEFT JOIN LatestCosts lc ON op.product_id = lc.product_id
        WHERE so.status = 'COMPLETED' ${dateCondition ? 'AND ' + dateCondition : ''}
        GROUP BY c.id, c.name
        ORDER BY total_profit DESC;
    `;

    const { rows } = await db.query(query, params);
    return rows;
};

/**
 * HU032: Registra un nuevo cálculo de costeo para un producto.
 * @param {object} costingData - { product_id, material_cost, labor_cost, waste_cost, calculation_date }
 * @returns {Promise<object>} El registro de costeo creado.
 */
const createCosting = async (costingData) => {
    const { product_id, material_cost, labor_cost, waste_cost, calculation_date } = costingData;
    
    // El sistema calcula el total
    const total = (parseFloat(material_cost) || 0) + (parseFloat(labor_cost) || 0) + (parseFloat(waste_cost) || 0);

    const text = `
        INSERT INTO costings (product_id, material_cost, labor_cost, waste_cost, total, calculation_date)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
    `;
    const values = [product_id, material_cost || 0, labor_cost || 0, waste_cost || 0, total, calculation_date || new Date()];
    const { rows } = await db.query(text, values);
    return rows[0];
};

/**
 * HU032: Obtiene el historial de costeos para un producto específico, ordenado por fecha.
 * @param {number} productId - El ID del producto.
 * @returns {Promise<Array>} Lista de registros de costeo.
 */
const getCostingHistoryForProduct = async (productId) => {
    const text = `
        SELECT * FROM costings 
        WHERE product_id = $1 
        ORDER BY calculation_date DESC;
    `;
    const { rows } = await db.query(text, [productId]);
    return rows;
};

module.exports = {
    createIncome,
    findAllIncomes,
    createExpense,
    findAllExpenses,
    getProfitReportByClient,
    createCosting,
    getCostingHistoryForProduct,
};