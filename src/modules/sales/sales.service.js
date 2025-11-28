// src/modules/sales/sales.service.js
const db = require('../../config/postgres');
const pool = db.pool;

// --- Función de ayuda para convertir camelCase a snake_case ---
const camelToSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

/**
 * HU020: Crea un nuevo cliente en la base de datos.
 */
const createClient = async (clientData) => {
  const { code, name, tax_id, contact, phone, email, address, credit_limit, payment_terms } = clientData;
  const text = `
    INSERT INTO clients(code, name, tax_id, contact, phone, email, address, credit_limit, payment_terms, is_active)
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
    RETURNING *;
  `;
  const values = [code, name, tax_id, contact, phone, email, address, credit_limit || 0, payment_terms || 30];
  const { rows } = await db.query(text, values);
  return rows[0];
};

/**
 * HU020: Busca todos los clientes activos.
 */
const findAllClients = async (filters = {}) => {
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const offset = (page - 1) * limit;
    
    const params = [];
    let searchCondition = '';
  
    if (filters.search) {
      params.push(`%${filters.search}%`);
      searchCondition = `AND (code ILIKE $${params.length} OR name ILIKE $${params.length})`;
    }
  
    const countQuery = `SELECT COUNT(*) FROM clients WHERE is_active = TRUE ${searchCondition}`;
    
    const dataQuery = `
      SELECT * FROM clients 
      WHERE is_active = TRUE ${searchCondition}
      ORDER BY name ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
  
    const [countResult, dataResult] = await Promise.all([
      db.query(countQuery, params),
      db.query(dataQuery, [...params, limit, offset])
    ]);
  
    const totalItems = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalItems / limit);
    
    return {
      items: dataResult.rows,
      totalPages,
      currentPage: page,
      totalItems,
    };
};

/**
 * HU020: Busca un cliente por su ID.
 */
const findClientById = async (id) => {
  const text = 'SELECT * FROM clients WHERE id = $1 AND is_active = TRUE';
  const { rows } = await db.query(text, [id]);
  return rows[0];
};

/**
 * HU020: Actualiza un cliente existente.
 */
const updateClient = async (id, clientData) => {
    const dataToUpdate = { ...clientData };
    delete dataToUpdate.id;
    delete dataToUpdate.created_at;
    delete dataToUpdate.updated_at;

    const updatableKeys = Object.keys(dataToUpdate);
    if (updatableKeys.length === 0) return findClientById(id);

    const fields = updatableKeys.map((key, i) => `${camelToSnakeCase(key)} = $${i + 1}`).join(', ');
    const values = updatableKeys.map(key => dataToUpdate[key]);

    const text = `UPDATE clients SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length + 1} AND is_active = TRUE RETURNING *;`;
    const { rows } = await db.query(text, [...values, id]);
    return rows[0];
};

/**
 * HU020: Realiza un borrado lógico de un cliente.
 */
const deleteClient = async (id) => {
    const text = `UPDATE clients SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id;`;
    const { rows } = await db.query(text, [id]);
    return rows[0];
};

// ... (Las funciones del CRUD de clientes, findAllSalesOrders, etc. se mantienen igual) ...

/**
 * HU021 & HU022: Crea un nuevo pedido de venta, validando LÍMITE DE CRÉDITO y stock.
 */
const createSalesOrder = async (orderData) => {
    const { client_id, user_id, notes, products, delivery_date } = orderData;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // --- INICIO DE LA LÓGICA DE VALIDACIÓN DE CRÉDITO (HU022) ---

        // 1. Obtener el límite de crédito del cliente.
        const clientResult = await client.query('SELECT credit_limit FROM clients WHERE id = $1;', [client_id]);
        if (clientResult.rows.length === 0) throw new Error('Cliente no encontrado.');
        const creditLimit = parseFloat(clientResult.rows[0].credit_limit);

        // 2. Calcular el saldo pendiente del cliente (suma de pedidos con facturas no pagadas).
        // Esta es una simplificación. Un sistema real podría consultar una tabla de cuentas por cobrar.
        const outstandingBalanceResult = await client.query(`
            SELECT SUM(so.total) as pending_balance
            FROM sales_orders so
            LEFT JOIN invoices i ON so.id = i.order_id
            WHERE so.client_id = $1 AND (i.status = 'PENDING' OR i.status = 'OVERDUE');
        `, [client_id]);
        const outstandingBalance = parseFloat(outstandingBalanceResult.rows[0].pending_balance) || 0;

        // --- FIN DE LA LÓGICA DE VALIDACIÓN DE CRÉDITO ---

        // Calcular el total del nuevo pedido (lógica existente)
        let subtotal = 0;
        for (const product of products) {
            subtotal += product.quantity * product.price;
        }
        const tax_amount = subtotal * 0.16;
        const newOrderTotal = subtotal + tax_amount;

        // --- VALIDACIÓN FINAL DEL LÍMITE DE CRÉDITO ---
        if ((outstandingBalance + newOrderTotal) > creditLimit) {
            throw new Error(`Límite de crédito excedido. Límite: $${creditLimit.toFixed(2)}, Saldo Pendiente: $${outstandingBalance.toFixed(2)}, Total de este pedido: $${newOrderTotal.toFixed(2)}.`);
        }
        // --- FIN DE LA VALIDACIÓN ---

        // Verificación de stock (lógica existente)
        for (const product of products) {
            const stockResult = await client.query('SELECT current_stock FROM products WHERE id = $1 FOR UPDATE;', [product.product_id]);
            if (stockResult.rows.length === 0) throw new Error(`Producto con ID ${product.product_id} no encontrado.`);
            if (stockResult.rows[0].current_stock < product.quantity) {
                throw new Error(`Stock insuficiente para el producto ID ${product.product_id}. Stock disponible: ${stockResult.rows[0].current_stock}`);
            }
        }
        
        // Inserción del pedido y sus detalles (lógica existente)
        const idResult = await client.query("SELECT NEXTVAL('sales_orders_id_seq') as id;");
        const newOrderId = idResult.rows[0].id;
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const newOrderNumber = `SO-${today}-${newOrderId}`;
        
        const orderText = `
            INSERT INTO sales_orders(id, order_number, client_id, order_date, subtotal, tax_amount, total, notes, created_by, status, delivery_date)
            VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8, 'QUOTE', $9);
        `;
        await client.query(orderText, [newOrderId, newOrderNumber, client_id, subtotal, tax_amount, newOrderTotal, notes, user_id, delivery_date]);

        for (const product of products) {
            await client.query('INSERT INTO order_products(order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4);', [newOrderId, product.product_id, product.quantity, product.price]);
            await client.query('UPDATE products SET current_stock = current_stock - $1 WHERE id = $2;', [product.quantity, product.product_id]);
            await client.query(`INSERT INTO inventory_movements (product_id, movement_type, quantity, user_id, reference_document) VALUES ($1, 'EXIT', $2, $3, $4);`, [product.product_id, -product.quantity, user_id, newOrderNumber]);
        }

        await client.query('COMMIT');
        
        return { id: newOrderId, order_number: newOrderNumber, total: newOrderTotal };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
  // ... (todas las demás exportaciones)
  createSalesOrder,
};

/**
 * Actualiza únicamente el estado de un pedido de venta.
 * @param {number} id - El ID del pedido.
 * @param {string} status - El nuevo estado ('CONFIRMED', 'COMPLETED', etc.).
 * @returns {Promise<object>} El pedido actualizado.
 */
const updateOrderStatus = async (id, status) => {
    const text = `
        UPDATE sales_orders 
        SET status = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2 
        RETURNING *;
    `;
    const { rows } = await db.query(text, [status, id]);
    // Aquí podrías añadir lógica para registrar en la tabla de auditoría
    return rows[0];
};

/**
 * Busca todos los pedidos de venta de forma paginada.
 * Se une con la tabla de clientes para obtener el nombre del cliente.
 */
const findAllSalesOrders = async (filters = {}) => {
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 10;
  const offset = (page - 1) * limit;
  
  const params = [];
  let searchCondition = '';

  if (filters.search) {
    params.push(`%${filters.search}%`);
    // Permite buscar por número de orden o nombre de cliente
    searchCondition = `AND (so.order_number ILIKE $${params.length} OR c.name ILIKE $${params.length})`;
  }

  const countQuery = `
    SELECT COUNT(*) 
    FROM sales_orders so
    JOIN clients c ON so.client_id = c.id
    WHERE 1=1 ${searchCondition}
  `;
  
  const dataQuery = `
    SELECT 
      so.id,
      so.order_number,
      so.order_date,
      so.delivery_date,
      so.status,
      so.total,
      c.name as client_name
    FROM sales_orders so
    JOIN clients c ON so.client_id = c.id
    WHERE 1=1 ${searchCondition}
    ORDER BY so.order_date DESC, so.id DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const [countResult, dataResult] = await Promise.all([
    db.query(countQuery, params),
    db.query(dataQuery, [...params, limit, offset])
  ]);

  const totalItems = parseInt(countResult.rows[0].count, 10);
  const totalPages = Math.ceil(totalItems / limit);
  
  return {
    items: dataResult.rows,
    totalPages,
    currentPage: page,
    totalItems,
  };
};

/**
 * Busca los detalles completos de un pedido de venta por su ID.
 * Incluye los datos del cliente y la lista de productos del pedido.
 */
const findSalesOrderById = async (id) => {
  // Consulta 1: Obtener los datos principales del pedido y del cliente.
  const orderQuery = `
    SELECT 
      so.id, so.order_number, so.order_date, so.delivery_date, so.status,
      so.subtotal, so.tax_amount, so.total, so.notes,
      c.name as client_name, c.code as client_code, c.address as client_address
    FROM sales_orders so
    JOIN clients c ON so.client_id = c.id
    WHERE so.id = $1;
  `;

  // Consulta 2: Obtener los productos asociados a ese pedido.
  const productsQuery = `
    SELECT 
      op.quantity, op.price,
      p.sku, p.description, p.unit
    FROM order_products op
    JOIN products p ON op.product_id = p.id
    WHERE op.order_id = $1;
  `;

  // Ejecutamos ambas consultas en paralelo para mayor eficiencia
  const [orderResult, productsResult] = await Promise.all([
    db.query(orderQuery, [id]),
    db.query(productsQuery, [id])
  ]);

  if (orderResult.rows.length === 0) {
    return null; // Si no se encuentra el pedido, devolvemos null
  }

  // Combinamos los resultados en un solo objeto
  const orderDetails = orderResult.rows[0];
  const products = productsResult.rows;

  return { ...orderDetails, products };
};

/**
 * HU023: Genera un reporte de ventas agrupado por cliente.
 * Permite filtrar por un rango de fechas.
 */
const getSalesReportByClient = async (filters = {}) => {
  const { startDate, endDate } = filters;
  const params = [];
  let dateCondition = '';

  // Construcción de la condición de fecha
  if (startDate && endDate) {
    params.push(startDate, endDate);
    dateCondition = `AND so.order_date BETWEEN $1 AND $2`;
  } else if (startDate) {
    params.push(startDate);
    dateCondition = `AND so.order_date >= $1`;
  } else if (endDate) {
    params.push(endDate);
    dateCondition = `AND so.order_date <= $1`;
  }

  const query = `
    SELECT 
      c.id as client_id,
      c.name as client_name,
      COUNT(so.id) as total_orders,
      SUM(so.total) as total_sales
    FROM clients c
    JOIN sales_orders so ON c.id = so.client_id
    WHERE so.status = 'COMPLETED' ${dateCondition} 
    GROUP BY c.id, c.name
    ORDER BY total_sales DESC;
  `;

  const { rows } = await db.query(query, params);
  return rows;
};

/**
 * HU023: Genera datos agregados para el Dashboard de Ventas.
 * @param {object} filters - { period ('daily', 'weekly', 'monthly'), clientId, startDate, endDate }
 */
const getDashboardData = async (filters = {}) => {
  const { period, clientId, startDate, endDate } = filters;
  const params = [];
  let clientCondition = '';
  let dateCondition = '';
  let groupByClause = `DATE_TRUNC('day', so.order_date)`; // Por defecto agrupa por día

  // --- Construcción de Filtros ---
  if (clientId) {
    params.push(clientId);
    clientCondition = `AND so.client_id = $${params.length}`;
  }

  if (startDate && endDate) {
    params.push(startDate, endDate);
    dateCondition = `AND so.order_date BETWEEN $${params.length - 1} AND $${params.length}`;
  } else {
    // Si no hay rango de fechas, usa el período predefinido
    switch (period) {
      case 'today':
        dateCondition = `AND so.order_date >= CURRENT_DATE`;
        groupByClause = `DATE_TRUNC('hour', so.created_at)`;
        break;
      case 'weekly':
        dateCondition = `AND so.order_date >= DATE_TRUNC('week', CURRENT_DATE)`;
        groupByClause = `DATE_TRUNC('day', so.order_date)`;
        break;
      case 'monthly':
        dateCondition = `AND so.order_date >= DATE_TRUNC('month', CURRENT_DATE)`;
        groupByClause = `DATE_TRUNC('day', so.order_date)`;
        break;
      case 'yearly':
        dateCondition = `AND so.order_date >= DATE_TRUNC('year', CURRENT_DATE)`;
        groupByClause = `DATE_TRUNC('month', so.order_date)`;
        break;
      default: // Por defecto, la última semana
        dateCondition = `AND so.order_date >= CURRENT_DATE - INTERVAL '7 days'`;
        groupByClause = `DATE_TRUNC('day', so.order_date)`;
    }
  }
  
  // --- Consultas a la Base de Datos ---

  // 1. Datos para el gráfico de ventas a lo largo del tiempo
  const salesOverTimeQuery = `
    SELECT 
      ${groupByClause} as date,
      SUM(so.total) as total_sales
    FROM sales_orders so
    WHERE so.status = 'COMPLETED' ${clientCondition} ${dateCondition}
    GROUP BY date
    ORDER BY date ASC;
  `;

  // 2. KPIs principales (Ventas Totales, Pedidos, Ticket Promedio)
  const kpisQuery = `
    SELECT 
      SUM(so.total) as total_revenue,
      COUNT(so.id) as total_orders,
      AVG(so.total) as average_order_value
    FROM sales_orders so
    WHERE so.status = 'COMPLETED' ${clientCondition} ${dateCondition};
  `;

  // 3. Top 5 Clientes por ventas
  const topClientsQuery = `
    SELECT c.name as client_name, SUM(so.total) as total_sales
    FROM sales_orders so
    JOIN clients c ON so.client_id = c.id
    WHERE so.status = 'COMPLETED' ${dateCondition} -- El top clientes no se filtra por cliente individual
    GROUP BY c.name
    ORDER BY total_sales DESC
    LIMIT 5;
  `;

  // Ejecutar todas las consultas en paralelo
  const [salesOverTimeResult, kpisResult, topClientsResult] = await Promise.all([
    db.query(salesOverTimeQuery, params),
    db.query(kpisQuery, params),
    db.query(topClientsQuery, params.filter(p => p !== clientId)) // Quitar el clientId si existe
  ]);

  return {
    kpis: kpisResult.rows[0],
    salesOverTime: salesOverTimeResult.rows,
    topClients: topClientsResult.rows,
  };
};


module.exports = {
  createClient,
  findAllClients,
  findClientById,
  updateClient,
  deleteClient,
  createSalesOrder,
  findAllSalesOrders,
  findSalesOrderById,
  getSalesReportByClient,
  updateOrderStatus,
  getDashboardData,
};