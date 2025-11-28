// src/modules/production/production.controller.js
const productionService = require('./production.service');

const createOrder = async (req, res) => {
    try {
        const orderData = {
            ...req.body,
            created_by: req.user.id // ID del usuario que crea la orden
        };
        const newOrder = await productionService.createProductionOrder(orderData);
        res.status(201).json({ success: true, message: 'Orden de producción creada.', data: newOrder });
    } catch (error) {
        console.error("Error al crear OP:", error);
        res.status(500).json({ success: false, message: 'Error al crear la orden de producción.' });
    }
};

const getAllOrders = async (req, res) => {
    try {
        const paginatedData = await productionService.findAllProductionOrders(req.query);
        res.status(200).json({ success: true, data: paginatedData });
    } catch (error) {
        console.error("Error al obtener OPs:", error);
        res.status(500).json({ success: false, message: 'Error al obtener las órdenes de producción.' });
    }
};

const getOrderDetails = async (req, res) => {
    try {
        const order = await productionService.findProductionOrderById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Orden de producción no encontrada.' });
        }
        res.status(200).json({ success: true, data: order });
    } catch (error) {
        console.error("Error al obtener detalle de OP:", error);
        res.status(500).json({ success: false, message: 'Error al obtener los detalles.' });
    }
};

const changeStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Estado no válido.' });
        }

        const order = await productionService.updateProductionOrderStatus(id, status);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Orden de producción no encontrada.' });
        }

        res.status(200).json({ success: true, message: `Estado actualizado a ${status}`, data: order });
    } catch (error) {
        console.error("Error al cambiar estado de OP:", error);
        res.status(500).json({ success: false, message: 'Error al actualizar el estado.' });
    }
};

/**
 * HU011: Controlador para registrar un consumo de material.
 */
const addConsumption = async (req, res) => {
    try {
        const { orderId } = req.params;
        const consumptionData = {
            ...req.body,
            user_id: req.user.id // ID del usuario que registra el consumo
        };

        // Validaciones básicas
        if (!consumptionData.material_id || !consumptionData.consumed_quantity || consumptionData.consumed_quantity <= 0) {
             return res.status(400).json({ success: false, message: 'Faltan datos requeridos (material, cantidad > 0).' });
        }

        const newConsumption = await productionService.registerConsumption(orderId, consumptionData);
        res.status(201).json({ success: true, message: 'Consumo registrado exitosamente.', data: newConsumption });

    } catch (error) {
        // Capturamos el error específico de stock insuficiente
        if (error.message.includes('Stock insuficiente')) {
             return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: error.message || 'Error al registrar el consumo.' });
    }
};

/**
 * HU012 / HU013: Controlador para registrar un lote de producción terminado.
 */
const addBatch = async (req, res) => {
    try {
        const { orderId } = req.params;
        const batchData = {
            ...req.body,
            user_id: req.user.id // ID del usuario que registra el lote
        };

        // Validaciones básicas
        if (!batchData.batch_number || !batchData.quantity_produced || batchData.quantity_produced <= 0) {
             return res.status(400).json({ success: false, message: 'Faltan datos requeridos (número de lote, cantidad > 0).' });
        }

        const newBatch = await productionService.registerProductionBatch(orderId, batchData);
        res.status(201).json({ success: true, message: 'Lote de producción registrado y stock actualizado.', data: newBatch });

    } catch (error) {
        res.status(400).json({ success: false, message: error.message || 'Error al registrar el lote.' });
    }
};

/**
 * HU014: Controlador para registrar una merma.
 */
const addWaste = async (req, res) => {
    try {
        const { orderId } = req.params;
        const wasteData = {
            ...req.body,
            user_id: req.user.id // ID del usuario que registra
        };

        // Validaciones básicas
        const validProcesses = ['EXTRUSION', 'BLOWING']; // Asegúrate que coincidan con tu ENUM
        if (!wasteData.process || !validProcesses.includes(wasteData.process) || !wasteData.quantity || wasteData.quantity <= 0) {
             return res.status(400).json({ success: false, message: 'Faltan datos requeridos (proceso válido, cantidad > 0).' });
        }

        const newWaste = await productionService.registerWaste(orderId, wasteData);
        res.status(201).json({ success: true, message: 'Merma registrada exitosamente.', data: newWaste });

    } catch (error) {
        res.status(400).json({ success: false, message: error.message || 'Error al registrar la merma.' });
    }
};

/**
 * HU014: Controlador para obtener el reporte de mermas.
 */
const getWastes = async (req, res) => {
    try {
        // req.query puede contener orderId, startDate, endDate
        const wastesData = await productionService.getWastesReport(req.query);
        res.status(200).json({ success: true, data: wastesData });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al generar el reporte de mermas.' });
    }
};

/**
 * HU014: Controlador para obtener los datos del gráfico de mermas.
 */
const getWastesChart = async (req, res) => {
    try {
        const chartData = await productionService.getWastesChartData(req.query);
        res.status(200).json({ success: true, data: chartData });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al generar los datos del gráfico.' });
    }
};

/**
 * HU032: Controlador para obtener el análisis de costos de una OP.
 */
const getCostAnalysis = async (req, res) => {
    try {
        const { orderId } = req.params;
        const analysisData = await productionService.getProductionOrderCostAnalysis(orderId);
        res.status(200).json({ success: true, data: analysisData });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message || 'Error al calcular los costos.' });
    }
};

module.exports = {
    createOrder,
    getAllOrders,
    getOrderDetails,
    changeStatus,
    addConsumption,
    addBatch,
    addWaste,
    getWastes,
    getWastesChart,
    getCostAnalysis,
};