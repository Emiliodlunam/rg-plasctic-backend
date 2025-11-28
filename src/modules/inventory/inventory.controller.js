// src/modules/inventory/inventory.controller.js
const inventoryService = require('./inventory.service');
// --- IMPORTAR EL SERVICIO DE AUDITORÍA ---
const { logAction } = require('../audit/audit.service');

const registerProduct = async (req, res) => {
  try {
    const newProduct = await inventoryService.createProduct(req.body);
    
    // --- REGISTRO DE AUDITORÍA ---
    // (req.user.id viene del middleware de autenticación)
    await logAction(req.user.id, 'CREATE_PRODUCT', { productId: newProduct.id, sku: newProduct.sku });
    // ----------------------------

    res.status(201).json({
      success: true,
      message: 'Producto registrado correctamente',
      data: newProduct,
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: `El SKU '${req.body.sku}' ya existe.` });
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al registrar el producto.' });
  }
};

const getInventoryReport = async (req, res) => {
  try {
    const paginatedData = await inventoryService.findAllProducts(req.query);
    res.status(200).json({
      success: true,
      message: 'Reporte de inventario generado.',
      data: paginatedData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al generar el reporte.' });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await inventoryService.findProductById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    }
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al obtener el producto.' });
  }
};

const updateProductDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedProduct = await inventoryService.updateProduct(id, req.body);
    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado para actualizar.' });
    }

    // --- REGISTRO DE AUDITORÍA ---
    await logAction(req.user.id, 'UPDATE_PRODUCT', { productId: id, changes: req.body });
    // ----------------------------

    res.status(200).json({
      success: true,
      message: 'Producto actualizado correctamente.',
      data: updatedProduct,
    });
  } catch (error) {
     if (error.code === '23505') {
      return res.status(400).json({ success: false, message: `El SKU ya está en uso por otro producto.` });
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al actualizar el producto.' });
  }
};

const removeProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedProduct = await inventoryService.deleteProduct(id);
    if (!deletedProduct) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado para eliminar.' });
    }

    // --- REGISTRO DE AUDITORÍA ---
    await logAction(req.user.id, 'DELETE_PRODUCT', { productId: id });
    // ----------------------------

    res.status(200).json({ success: true, message: 'Producto eliminado correctamente.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al eliminar el producto.' });
  }
};

const getLowStockReport = async (req, res) => {
  try {
    const products = await inventoryService.getLowStockProducts();
    res.status(200).json({
      success: true,
      message: 'Reporte de bajo stock generado.',
      data: products,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al generar el reporte de bajo stock.' });
  }
};

const registerEntryMovement = async (req, res) => {
  try {
    const movement = await inventoryService.createEntryMovement(req.body);

    // --- REGISTRO DE AUDITORÍA ---
    await logAction(req.user.id, 'INVENTORY_ENTRY', { 
      movementId: movement.id, 
      productId: movement.product_id, 
      quantity: movement.quantity 
    });
    // ----------------------------

    res.status(201).json({
      success: true,
      message: 'Movimiento de entrada registrado y stock actualizado.',
      data: movement,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al registrar la entrada.' });
  }
};

const registerExitMovement = async (req, res) => {
  try {
    const movement = await inventoryService.createExitMovement(req.body);

    // --- REGISTRO DE AUDITORÍA ---
    await logAction(req.user.id, 'INVENTORY_EXIT', { 
      movementId: movement.id, 
      productId: movement.product_id, 
      quantity: movement.quantity 
    });
    // ----------------------------

    res.status(201).json({
      success: true,
      message: 'Movimiento de salida registrado y stock actualizado.',
      data: movement,
    });
  } catch (error) {
    if (error.message.includes('Stock insuficiente')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al registrar la salida.' });
  }
};

module.exports = {
  registerProduct,
  getInventoryReport,
  getProductById,
  updateProductDetails,
  removeProduct,
  getLowStockReport,
  registerEntryMovement,
  registerExitMovement,
};