// src/modules/inventory/inventory.service.js
const db = require('../../config/postgres');
const pool = db.pool;

// =======================================================================
// SERVICIOS PARA PRODUCTOS (HU001, HU002, HU005)
// =======================================================================
const camelToSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

/**
 * HU001: Crea un nuevo producto en la base de datos.
 */
const createProduct = async (productData) => {
  const { sku, description, type, unit, cost_price, min_stock, supplier_id } = productData;
  const text = `
    INSERT INTO products(sku, description, type, unit, cost_price, min_stock, current_stock, supplier_id, is_active)
    VALUES($1, $2, $3, $4, $5, $6, 0, $7, TRUE)
    RETURNING *;
  `;
  const values = [sku, description, type || 'FINISHED_PRODUCT', unit, cost_price, min_stock || 0, supplier_id];
  const { rows } = await db.query(text, values);
  return rows[0];
};

/**
 * HU005: Busca todos los productos activos, con opción de filtro por búsqueda.
 */
const findAllProducts = async (filters = {}) => {
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 10; // 10 productos por página por defecto
  const offset = (page - 1) * limit;
  
  const params = [];
  let searchCondition = '';

  if (filters.search) {
    params.push(`%${filters.search}%`);
    searchCondition = `AND (p.sku ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
  }

  // Consulta para obtener el conteo total de productos que coinciden con la búsqueda
  const countQuery = `SELECT COUNT(*) FROM products p WHERE p.is_active = TRUE ${searchCondition}`;
  
  // Consulta para obtener los productos de la página actual
  const dataQuery = `
    SELECT p.*, s.name as supplier_name 
    FROM products p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.is_active = TRUE ${searchCondition}
    ORDER BY p.sku ASC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const [countResult, dataResult] = await Promise.all([
    db.query(countQuery, params),
    db.query(dataQuery, [...params, limit, offset])
  ]);

  const totalProducts = parseInt(countResult.rows[0].count, 10);
  const totalPages = Math.ceil(totalProducts / limit);
  
  return {
    products: dataResult.rows,
    totalPages,
    currentPage: page,
    totalProducts,
  };
};


/**
 * HU001: Encuentra un producto activo por su ID.
 */
const findProductById = async (id) => {
  const text = 'SELECT * FROM products WHERE id = $1 AND is_active = TRUE';
  const { rows } = await db.query(text, [id]);
  return rows[0];
};

/**
 * HU001 & HU002: Actualiza un producto existente en la base de datos.
 */
const updateProduct = async (id, productData) => {
  // --- CORRECCIÓN DEFINITIVA ---
  // Creamos una copia de los datos para no modificar el objeto original
  const dataToUpdate = { ...productData };

  // Eliminamos explícitamente CUALQUIER versión de la clave conflictiva
  delete dataToUpdate.updated_at; // Versión snake_case
  delete dataToUpdate.updatedAt; // Versión camelCase
  delete dataToUpdate.id;         // También eliminamos el id por seguridad
  // ----------------------------

  // --- LÍNEA DE DEPURACIÓN ---
  console.log('2. Datos que se usarán para construir el SQL:', dataToUpdate);
  // ----------------------------

  const updatableKeys = Object.keys(dataToUpdate);

  if (updatableKeys.length === 0) {
    return findProductById(id);
  }
  
  const fields = updatableKeys
    .map((key, index) => `${camelToSnakeCase(key)} = $${index + 1}`)
    .join(', ');
    
  const values = updatableKeys.map(key => dataToUpdate[key]);
  
  const text = `
    UPDATE products SET ${fields}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${values.length + 1} AND is_active = TRUE
    RETURNING *;
  `;

  const { rows } = await db.query(text, [...values, id]);
  return rows[0];
};


/**
 * HU001: Realiza un borrado lógico (soft delete) de un producto.
 */
const deleteProduct = async (id) => {
  const text = `
    UPDATE products SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND is_active = TRUE
    RETURNING id;
  `;
  const { rows } = await db.query(text, [id]);
  return rows[0];
};

/**
 * HU005: Obtiene una lista de productos con bajo stock.
 */
const getLowStockProducts = async () => {
  const text = 'SELECT * FROM products WHERE current_stock <= min_stock AND is_active = TRUE ORDER BY sku ASC';
  const { rows } = await db.query(text);
  return rows;
};

// =======================================================================
// SERVICIOS PARA MOVIMIENTOS DE INVENTARIO (HU003, HU004)
// =======================================================================

/**
 * HU003 / HU013: Registra un movimiento de ENTRADA y actualiza el stock.
 * MODIFICADO: Acepta un cliente de PostgreSQL opcional.
 * @param {object} movementData - Datos del movimiento.
 * @param {object} [existingClient] - Un cliente de pg conectado (opcional).
 * @returns {Promise<object>} El movimiento de inventario creado.
 */
const createEntryMovement = async (movementData, existingClient) => { // <-- Añadir existingClient
  const { product_id, quantity, user_id, reference_document, notes, batch } = movementData;
  const client = existingClient || await pool.connect(); // <-- Usar o crear cliente

  try {
    if (!existingClient) await client.query('BEGIN'); // <-- Iniciar transacción si es necesario

    const movementText = `
      INSERT INTO inventory_movements (product_id, movement_type, quantity, user_id, reference_document, notes, batch)
      VALUES ($1, 'ENTRY', $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const movementValues = [product_id, quantity, user_id, reference_document, notes, batch];
    const movementResult = await client.query(movementText, movementValues);
    
    // Usamos FOR UPDATE para bloquear la fila y evitar problemas de concurrencia al actualizar stock
    await client.query('SELECT current_stock FROM products WHERE id = $1 FOR UPDATE;', [product_id]);
    const updateStockText = 'UPDATE products SET current_stock = current_stock + $1 WHERE id = $2;';
    await client.query(updateStockText, [quantity, product_id]);

    if (!existingClient) await client.query('COMMIT'); // <-- Confirmar transacción si es necesario
    return movementResult.rows[0];
  } catch (error) {
    if (!existingClient) await client.query('ROLLBACK'); // <-- Revertir transacción si es necesario
    throw error;
  } finally {
    if (!existingClient) client.release(); // <-- Liberar cliente si es necesario
  }
};

/**
 * HU004 / HU011: Registra un movimiento de SALIDA y actualiza el stock.
 * MODIFICADO: Acepta un cliente de PostgreSQL opcional para participar en transacciones externas.
 * @param {object} movementData - Datos del movimiento.
 * @param {object} [existingClient] - Un cliente de pg conectado (opcional).
 * @returns {Promise<object>} El movimiento de inventario creado.
 */
const createExitMovement = async (movementData, existingClient) => {
  const { product_id, quantity, user_id, reference_document, notes, batch } = movementData;
  // Determina si usamos un cliente existente o creamos uno nuevo
  const client = existingClient || await pool.connect(); 

  try {
    // Solo iniciamos/cerramos transacción si NO nos pasaron un cliente
    if (!existingClient) await client.query('BEGIN');

    const checkStockText = 'SELECT current_stock FROM products WHERE id = $1 FOR UPDATE;';
    const stockResult = await client.query(checkStockText, [product_id]);
    
    if (stockResult.rows.length === 0) throw new Error('Producto no encontrado.');
    
    const currentStock = stockResult.rows[0].current_stock;
    if (currentStock < quantity) throw new Error(`Stock insuficiente para producto ID ${product_id}. Disponible: ${currentStock}, Requerido: ${quantity}`);

    const movementText = `
      INSERT INTO inventory_movements (product_id, movement_type, quantity, user_id, reference_document, notes, batch)
      VALUES ($1, 'EXIT', $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    // Guardamos la cantidad como negativa en la tabla de movimientos
    const movementValues = [product_id, -quantity, user_id, reference_document, notes, batch]; 
    const movementResult = await client.query(movementText, movementValues);

    const updateStockText = 'UPDATE products SET current_stock = current_stock - $1 WHERE id = $2;';
    await client.query(updateStockText, [quantity, product_id]);

    if (!existingClient) await client.query('COMMIT');
    return movementResult.rows[0];
    
  } catch (error) {
    if (!existingClient) await client.query('ROLLBACK');
    // Re-lanzamos el error para que la transacción externa (si existe) también falle
    throw error; 
  } finally {
    // Solo liberamos el cliente si lo creamos aquí
    if (!existingClient) client.release();
  }
};


module.exports = {
  // Productos
  createProduct,
  findAllProducts,
  findProductById,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  // Movimientos
  createEntryMovement,
  createExitMovement,
};