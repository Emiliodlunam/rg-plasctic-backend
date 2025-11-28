// src/modules/suppliers/suppliers.controller.js
const supplierService = require('./suppliers.service');

const getAllSuppliers = async (req, res) => {
  try {
    const suppliers = await supplierService.findAllSuppliers();
    res.status(200).json({
      success: true,
      data: suppliers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al obtener los proveedores.' });
  }
};

module.exports = {
  getAllSuppliers,
};