// src/modules/dashboard/dashboard.service.js
const db = require('../../config/postgres');

/**
 * Obtiene un resumen completo de KPIs de todos los módulos.
 */
const getDashboardSummary = async () => {

    // 1. KPI: Ventas Totales (del mes actual, solo pedidos completados)
    const salesQuery = db.query(`
        SELECT SUM(total) as total_sales
        FROM sales_orders
        WHERE status = 'COMPLETED' AND order_date >= DATE_TRUNC('month', CURRENT_DATE);
    `);

    // 2. KPI: Nuevos Pedidos (del día de hoy)
    const newOrdersQuery = db.query(`
        SELECT COUNT(id) as new_orders_today
        FROM sales_orders
        WHERE order_date = CURRENT_DATE;
    `);

    // 3. KPI: Órdenes en Producción (actualmente en 'IN_PROGRESS')
    const productionQuery = db.query(`
        SELECT COUNT(id) as orders_in_progress
        FROM production_orders
        WHERE status = 'IN_PROGRESS';
    `);

    // 4. KPI: Alertas de Inventario (productos bajo el stock mínimo)
    const inventoryQuery = db.query(`
        SELECT COUNT(id) as low_stock_items
        FROM products
        WHERE current_stock <= min_stock AND is_active = TRUE;
    `);

    // 5. KPI: Finanzas (Ingresos vs Egresos del mes actual)
    const incomesQuery = db.query(`
        SELECT SUM(amount) as total_incomes
        FROM incomes
        WHERE date >= DATE_TRUNC('month', CURRENT_DATE);
    `);
    
    const expensesQuery = db.query(`
        SELECT SUM(amount) as total_expenses
        FROM expenses
        WHERE date >= DATE_TRUNC('month', CURRENT_DATE);
    `);

    // --- NUEVAS CONSULTAS ACCIONABLES ---

    // 6. Lista: Alertas de Inventario (Top 5 más críticos)
    const lowStockListQuery = db.query(`
        SELECT id, sku, description, current_stock, min_stock 
        FROM products
        WHERE current_stock <= min_stock AND is_active = TRUE
        ORDER BY (current_stock - min_stock) ASC -- Los más negativos primero
        LIMIT 5;
    `);

    // 7. Lista: Cotizaciones Pendientes (Top 5 más recientes)
    const pendingQuotesQuery = db.query(`
        SELECT so.id, so.order_number, c.name as client_name, so.total 
        FROM sales_orders so
        JOIN clients c ON so.client_id = c.id
        WHERE so.status = 'QUOTE'
        ORDER BY so.order_date DESC
        LIMIT 5;
    `);

    // 8. Lista: Producción Activa (Top 5)
    const inProgressOrdersQuery = db.query(`
        SELECT po.id, po.order_number, p.description as product_description, po.quantity 
        FROM production_orders po
        JOIN products p ON po.product_id = p.id
        WHERE po.status = 'IN_PROGRESS'
        ORDER BY po.planned_start_date ASC
        LIMIT 5;
    `);

    // 9. Lista: Top 5 Clientes (Ventas completadas del mes)
    const topClientsQuery = db.query(`
        SELECT c.name as client_name, SUM(so.total) as total_sales
        FROM sales_orders so
        JOIN clients c ON so.client_id = c.id
        WHERE so.status = 'COMPLETED' AND so.order_date >= DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY c.name
        ORDER BY total_sales DESC
        LIMIT 5;
    `);

    // Ejecutar todas las consultas en paralelo
    const results = await Promise.all([
        salesQuery, newOrdersQuery, productionQuery, inventoryQuery, incomesQuery, expensesQuery,
        lowStockListQuery, pendingQuotesQuery, inProgressOrdersQuery, topClientsQuery
    ]);

    // Consolidar los resultados
    const kpis = {
        total_sales_month: parseFloat(results[0].rows[0]?.total_sales) || 0,
        new_orders_today: parseInt(results[1].rows[0]?.new_orders_today) || 0,
        orders_in_progress: parseInt(results[2].rows[0]?.orders_in_progress) || 0,
        low_stock_items: parseInt(results[3].rows[0]?.low_stock_items) || 0,
        total_incomes_month: parseFloat(results[4].rows[0]?.total_incomes) || 0,
        total_expenses_month: parseFloat(results[5].rows[0]?.total_expenses) || 0,
    };

    const lists = {
        lowStockList: results[6].rows,
        pendingQuotes: results[7].rows,
        inProgressOrders: results[8].rows,
        topClients: results[9].rows,
    };

    return { kpis, lists };
};

module.exports = {
    getDashboardSummary,
};