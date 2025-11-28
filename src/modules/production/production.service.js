// src/modules/production/production.service.js
const db = require('../../config/postgres');
const pool = db.pool;

const { createExitMovement } = require('../inventory/inventory.service');
const { createEntryMovement } = require('../inventory/inventory.service'); // <-- Esta faltaba

/**
 * Crea una nueva orden de producción.
 * @param {object} orderData - Datos de la orden (product_id, quantity, etc.)
 * @returns {Promise<object>} La orden creada.
 */
const createProductionOrder = async (orderData) => {
    const { product_id, quantity, planned_start_date, planned_end_date, notes, created_by, priority, gauge, measures, machine } = orderData;
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Obtenemos el próximo ID disponible
        const idResult = await client.query("SELECT NEXTVAL('production_orders_id_seq') as id;");
        const newOrderId = idResult.rows[0].id;
        
        // Construimos el número de orden
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const newOrderNumber = `OP-${today}-${newOrderId}`;

        const text = `
            INSERT INTO production_orders (
                id, order_number, product_id, quantity, planned_start_date, 
                planned_end_date, notes, created_by, status, priority, 
                gauge, measures, machine
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', $9, $10, $11, $12)
            RETURNING *;
        `;
        const values = [
            newOrderId, newOrderNumber, product_id, quantity, planned_start_date, 
            planned_end_date, notes, created_by, priority || 'MEDIUM', 
            gauge, measures, machine
        ];
        
        const result = await client.query(text, values);
        
        await client.query('COMMIT');
        return result.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Busca todas las órdenes de producción de forma paginada.
 * Se une con productos para mostrar descripción. Permite filtrar por estado.
 */
const findAllProductionOrders = async (filters = {}) => {
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 10;
  const offset = (page - 1) * limit;
  
  const params = [];
  let statusCondition = '';
  let searchCondition = '';
  let productCondition = ''; // <-- Nueva condición

  if (filters.status) {
    params.push(filters.status);
    statusCondition = `AND po.status = $${params.length}`;
  }
  
  if (filters.search) {
      params.push(`%${filters.search}%`);
      searchCondition = `AND (po.order_number ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
  }

  // --- NUEVA LÓGICA DE FILTRO ---
  if (filters.product_id) {
      params.push(filters.product_id);
      productCondition = `AND po.product_id = $${params.length}`;
  }
  // ------------------------------

  const countQuery = `
    SELECT COUNT(*) 
    FROM production_orders po
    JOIN products p ON po.product_id = p.id
    WHERE 1=1 ${statusCondition} ${searchCondition} ${productCondition}
  `;
  
  const dataQuery = `
    SELECT 
      po.id, po.order_number, po.quantity, po.status, po.priority,
      po.planned_start_date, po.planned_end_date,
      p.sku as product_sku, p.description as product_description
    FROM production_orders po
    JOIN products p ON po.product_id = p.id
    WHERE 1=1 ${statusCondition} ${searchCondition} ${productCondition}
    ORDER BY po.planned_start_date DESC, po.id DESC
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
 * Busca los detalles completos de una orden de producción por su ID.
 * Incluye datos del producto. Más adelante se añadirán consumos, mermas, etc.
 */
const findProductionOrderById = async (id) => {
    const query = `
        SELECT 
            po.*, 
            p.sku as product_sku, 
            p.description as product_description
        FROM production_orders po
        JOIN products p ON po.product_id = p.id
        WHERE po.id = $1;
    `;
    const { rows } = await db.query(query, [id]);
    
    // Aquí podríamos añadir consultas para obtener consumos, mermas, lotes, etc.
    // y agregarlos al objeto 'rows[0]' antes de devolverlo.
    
    return rows[0];
};

/**
 * Actualiza únicamente el estado de una orden de producción.
 */
const updateProductionOrderStatus = async (id, status) => {
    // Podríamos añadir lógica aquí para validar transiciones de estado permitidas.
    // Ej: No se puede pasar de PENDING a COMPLETED directamente.
    
    const text = `
        UPDATE production_orders 
        SET status = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2 
        RETURNING *;
    `;
    const { rows } = await db.query(text, [status, id]);
    // Registrar auditoría si es necesario
    return rows[0];
};

/**
 * HU011: Registra el consumo de una materia prima para una orden de producción.
 * Es transaccional: registra el consumo y descuenta el stock del inventario.
 */
const registerConsumption = async (orderId, consumptionData) => {
    const { material_id, consumed_quantity, user_id } = consumptionData;
    // Determina si usamos un cliente existente (pasado como parte de consumptionData para tests o lógica más compleja) 
    // o creamos uno nuevo para esta transacción.
    const client = consumptionData.client || await pool.connect();

    try {
        // Solo iniciamos/cerramos transacción si creamos el cliente aquí
        if (!consumptionData.client) await client.query('BEGIN'); 

        // 1. Verificar que la orden de producción exista y esté en un estado válido
        const orderCheck = await client.query('SELECT status, order_number FROM production_orders WHERE id = $1;', [orderId]);
        if (orderCheck.rows.length === 0) {
            throw new Error('Orden de producción no encontrada.');
        }
        const orderStatus = orderCheck.rows[0].status;
        const orderNumber = orderCheck.rows[0].order_number;
        // Opcional: Podrías restringir el registro de consumo solo a órdenes 'IN_PROGRESS'
        // if (orderStatus !== 'IN_PROGRESS') {
        //     throw new Error(`No se puede registrar consumo en una orden con estado ${orderStatus}.`);
        // }

        // 2. Insertar el registro en la tabla production_consumptions
        const consumptionText = `
            INSERT INTO production_consumptions (order_id, material_id, consumed_quantity, date)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            RETURNING *;
        `;
        const consumptionResult = await client.query(consumptionText, [orderId, material_id, consumed_quantity]);

        // 3. Crear el movimiento de salida en el inventario
        const movementData = {
            product_id: material_id,
            quantity: consumed_quantity,
            user_id: user_id,
            reference_document: `Consumo OP: ${orderNumber}`
        };
        // Ahora sí podemos llamar a createExitMovement porque está importada
        await createExitMovement(movementData, client); // Pasamos el cliente para usar la misma transacción

        if (!consumptionData.client) await client.query('COMMIT');
        return consumptionResult.rows[0];

    } catch (error) {
        if (!consumptionData.client) await client.query('ROLLBACK');
        // Simplificamos el re-lanzamiento del error para que el controlador lo maneje
        throw error; 
    } finally {
        // Solo liberamos el cliente si lo creamos aquí
        if (!consumptionData.client) client.release();
    }
};

/**
 * HU012 / HU013: Registra un lote de producción terminado y actualiza el stock.
 * Es transaccional: inserta lote, actualiza stock producto final, crea movimiento entrada.
 * @param {number} orderId - ID de la orden de producción.
 * @param {object} batchData - { batch_number, quantity_produced, production_date, quality, user_id }
 * @returns {Promise<object>} El lote de producción creado.
 */
const registerProductionBatch = async (orderId, batchData) => {
    const { batch_number, quantity_produced, production_date, quality, user_id } = batchData;
    // Determina si usamos un cliente existente o creamos uno nuevo
    const client = batchData.client || await pool.connect();

    try {
        if (!batchData.client) await client.query('BEGIN');

        // 1. Verificar la orden y obtener el product_id a fabricar
        const orderCheck = await client.query('SELECT product_id, order_number, status FROM production_orders WHERE id = $1;', [orderId]);
        if (orderCheck.rows.length === 0) throw new Error('Orden de producción no encontrada.');
        const finishedProductId = orderCheck.rows[0].product_id;
        const orderNumber = orderCheck.rows[0].order_number;
        const orderStatus = orderCheck.rows[0].status;

        // Opcional: Validar que la orden esté 'IN_PROGRESS'
        // if (orderStatus !== 'IN_PROGRESS') {
        //     throw new Error(`No se puede registrar producción para una orden con estado ${orderStatus}.`);
        // }

        // 2. Insertar el registro en la tabla production_batches
        const batchText = `
            INSERT INTO production_batches (batch_number, order_id, production_date, quality)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        // Usamos COALESCE para poner 'RELEASED' si no se especifica calidad
        const batchResult = await client.query(batchText, [batch_number, orderId, production_date || new Date(), quality || 'RELEASED']);

        // 3. Crear el movimiento de ENTRADA en el inventario para el producto terminado
        const movementData = {
            product_id: finishedProductId,
            quantity: quantity_produced, // La función createEntryMovement maneja cantidades positivas
            user_id: user_id,
            reference_document: `Producción OP: ${orderNumber} / Lote: ${batch_number}`,
            batch: batch_number // Guardamos el número de lote en el movimiento
        };
        // ¡IMPORTANTE! Necesitamos modificar createEntryMovement para aceptar un cliente opcional.
        await createEntryMovement(movementData, client); // Pasamos el cliente

        // Opcional: Podríamos actualizar el estado de la OP a 'COMPLETED' si la cantidad producida >= cantidad ordenada
        // const orderQuantity = await client.query('SELECT quantity FROM production_orders WHERE id = $1;', [orderId]);
        // const totalProduced = await client.query('SELECT SUM(quantity_produced_placeholder) FROM production_batches WHERE order_id = $1;', [orderId]); // Necesitaríamos añadir quantity_produced a la tabla batches
        // if (totalProduced >= orderQuantity.rows[0].quantity) {
        //    await client.query("UPDATE production_orders SET status = 'COMPLETED' WHERE id = $1;", [orderId]);
        // }

        if (!batchData.client) await client.query('COMMIT');
        return batchResult.rows[0];

    } catch (error) {
        if (!batchData.client) await client.query('ROLLBACK');
        console.error("Error registrando lote de producción:", error);
        if (error.code === '23505' && error.constraint === 'production_batches_batch_number_key') {
             throw new Error(`El número de lote '${batch_number}' ya existe.`);
        }
        throw new Error('Error al registrar el lote de producción.');
    } finally {
        if (!batchData.client) client.release();
    }
};

/**
 * HU014: Registra una merma (desperdicio) asociada a una orden de producción.
 * @param {number} orderId - ID de la orden de producción.
 * @param {object} wasteData - { process, quantity, reason, user_id }
 * @returns {Promise<object>} El registro de merma creado.
 */
const registerWaste = async (orderId, wasteData) => {
    const { process, quantity, reason, user_id } = wasteData; // Asumimos que user_id vendrá del controller

    // Validar que la orden exista (opcional, pero buena práctica)
    const orderCheck = await db.query('SELECT id FROM production_orders WHERE id = $1;', [orderId]);
    if (orderCheck.rows.length === 0) {
        throw new Error('Orden de producción no encontrada.');
    }

    const text = `
        INSERT INTO wastes (order_id, process, quantity, reason, date) 
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING *;
    `;
    const values = [orderId, process, quantity, reason];
    
    const { rows } = await db.query(text, values);
    // Podríamos añadir lógica aquí para afectar costos o inventario de scrap si fuera necesario.
    // También se podría registrar en una tabla de auditoría.
    
    return rows[0];
};

/**
 * HU014: Obtiene un reporte de las mermas registradas.
 * Permite filtrar por orden de producción o rango de fechas.
 * @param {object} filters - { orderId, startDate, endDate }
 * @returns {Promise<Array>} Lista de registros de merma.
 */
const getWastesReport = async (filters = {}) => {
    const { orderId, startDate, endDate } = filters;
    const params = [];
    let conditions = [];

    if (orderId) {
        params.push(orderId);
        conditions.push(`w.order_id = $${params.length}`);
    }
    if (startDate) {
        params.push(startDate);
        conditions.push(`w.date >= $${params.length}`);
    }
    if (endDate) {
        params.push(endDate);
        conditions.push(`w.date <= $${params.length}`);
    }

    // Construimos la cláusula WHERE dinámicamente
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
        SELECT 
            w.id,
            w.date,
            w.process,
            w.quantity,
            w.reason,
            po.order_number -- Añadimos el número de orden para referencia
        FROM wastes w
        JOIN production_orders po ON w.order_id = po.id
        ${whereClause}
        ORDER BY w.date DESC; 
    `;

    const { rows } = await db.query(query, params);
    return rows;
};

/**
 * HU014: Obtiene datos agregados para el gráfico de mermas.
 * Calcula la suma total de mermas por proceso.
 */
const getWastesChartData = async (filters = {}) => {
    const { startDate, endDate } = filters;
    const params = [];
    let conditions = [];

    if (startDate) {
        params.push(startDate);
        conditions.push(`date >= $${params.length}`);
    }
    if (endDate) {
        params.push(endDate);
        conditions.push(`date <= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
        SELECT 
            process,
            SUM(quantity) as total_waste
        FROM wastes
        ${whereClause}
        GROUP BY process
        ORDER BY total_waste DESC;
    `;

    const { rows } = await db.query(query, params);
    return rows;
};

/**
 * HU032: Analiza una Orden de Producción para calcular sus costos reales.
 * Calcula el costo total de los materiales consumidos y las mermas.
 */
const getProductionOrderCostAnalysis = async (orderId) => {
    // 1. Obtener la OP y el producto que fabricó
    const orderQuery = `
        SELECT po.id, po.order_number, po.quantity as quantity_produced, p.cost_price as manufactured_product_cost_estimate
        FROM production_orders po
        JOIN products p ON po.product_id = p.id
        WHERE po.id = $1;
    `;

    // 2. Calcular el costo total de los materiales consumidos
    const consumptionQuery = `
        SELECT 
            SUM(pc.consumed_quantity * p.cost_price) as total_material_cost
        FROM production_consumptions pc
        JOIN products p ON pc.material_id = p.id
        WHERE pc.order_id = $1;
    `;

    // 3. Calcular el costo total de la merma
    // (Asumimos que el costo de la merma es el costo promedio de la materia prima principal)
    // Esta es una consulta compleja; una simplificación es sumar la cantidad de merma
    const wasteQuery = `
        SELECT 
            SUM(w.quantity) as total_waste_quantity
        FROM wastes w
        WHERE w.order_id = $1;
    `;
    
    // (Para este ejemplo, calcularemos el costo de merma basándonos en un costo promedio simple, 
    // ya que no sabemos qué material específico se convirtió en merma)
    // Supongamos un costo promedio de merma de $20/kg por ahora.
    // Una lógica más avanzada multiplicaría 'total_waste_quantity' por el costo del material principal.
    
    const [orderResult, consumptionResult, wasteResult] = await Promise.all([
        db.query(orderQuery, [orderId]),
        db.query(consumptionQuery, [orderId]),
        db.query(wasteQuery, [orderId])
    ]);

    if (orderResult.rows.length === 0) {
        throw new Error('Orden de producción no encontrada.');
    }

    const order = orderResult.rows[0];
    const material_cost = parseFloat(consumptionResult.rows[0].total_material_cost) || 0;
    const total_waste_kg = parseFloat(wasteResult.rows[0].total_waste_quantity) || 0;
    
    // Lógica simple de costo de merma: 
    // Asumimos un costo de $25 por kg de merma (similar al Polietileno)
    const waste_cost = total_waste_kg * 25.0; 

    // El 'labor_cost' se deja en 0 para que el analista lo ingrese manualmente por ahora.
    const labor_cost = 0; 
    
    const total_cost = material_cost + labor_cost + waste_cost;

    return {
        order_id: order.id,
        order_number: order.order_number,
        product_id: order.product_id, // El ID del producto que se fabricó
        quantity_produced: order.quantity_produced,
        material_cost: material_cost.toFixed(2),
        labor_cost: labor_cost.toFixed(2),
        waste_cost: waste_cost.toFixed(2),
        total_cost: total_cost.toFixed(2),
        cost_per_unit: (total_cost / order.quantity_produced).toFixed(2)
    };
};


module.exports = {
    createProductionOrder,
    findAllProductionOrders,
    findProductionOrderById,
    updateProductionOrderStatus,
    registerConsumption,
    registerProductionBatch,
    registerWaste,
    getWastesReport,
    getWastesChartData,
    getProductionOrderCostAnalysis,
};