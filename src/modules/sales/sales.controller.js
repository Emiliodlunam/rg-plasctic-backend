// src/modules/sales/sales.controller.js
const salesService = require('./sales.service');

const createNewClient = async (req, res) => {
    try {
        const client = await salesService.createClient(req.body);
        res.status(201).json({ success: true, message: 'Cliente creado exitosamente.', data: client });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ success: false, message: 'El código de cliente ya existe.' });
        }
        res.status(500).json({ success: false, message: 'Error al crear el cliente.' });
    }
};

const getAllClients = async (req, res) => {
    try {
        const paginatedData = await salesService.findAllClients(req.query);
        res.status(200).json({ success: true, data: paginatedData });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener los clientes.' });
    }
};

const getClientDetails = async (req, res) => {
    try {
        const client = await salesService.findClientById(req.params.id);
        if (!client) return res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
        res.status(200).json({ success: true, data: client });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener el cliente.' });
    }
};

const updateClientDetails = async (req, res) => {
    try {
        const client = await salesService.updateClient(req.params.id, req.body);
        if (!client) return res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
        res.status(200).json({ success: true, message: 'Cliente actualizado exitosamente.', data: client });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar el cliente.' });
    }
};

const removeClient = async (req, res) => {
    try {
        const client = await salesService.deleteClient(req.params.id);
        if (!client) return res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
        res.status(200).json({ success: true, message: 'Cliente eliminado correctamente.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar el cliente.' });
    }
};


/**
 * HU021: Controlador para crear un nuevo pedido de venta.
 */
const createOrder = async (req, res) => {
    try {
        const orderData = {
            ...req.body,
            user_id: req.user.id // Obtenemos el ID del usuario desde el token verificado
        };

        // Validaciones básicas
        if (!orderData.products || orderData.products.length === 0) {
            return res.status(400).json({ success: false, message: 'El pedido debe contener al menos un producto.' });
        }

        const newOrder = await salesService.createSalesOrder(orderData);
        res.status(201).json({ success: true, message: 'Pedido creado exitosamente.', data: newOrder });

    } catch (error) {
        // Capturamos los errores específicos del servicio (ej. stock insuficiente)
        console.error("Error al crear el pedido:", error.message);
        res.status(400).json({ success: false, message: error.message || 'Error al procesar el pedido.' });
    }
};

/**
 * Controlador para actualizar el estado de un pedido.
 */
const changeOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validación simple del estado
        const validStatuses = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Estado no válido.' });
        }

        const order = await salesService.updateOrderStatus(id, status);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado.' });
        }

        res.status(200).json({ success: true, message: `Pedido actualizado al estado: ${status}`, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar el estado del pedido.' });
    }
};


/**
 * Controlador para obtener una lista paginada de todos los pedidos de venta.
 */
const getAllOrders = async (req, res) => {
    try {
        const paginatedData = await salesService.findAllSalesOrders(req.query);
        res.status(200).json({ success: true, data: paginatedData });
    } catch (error) {
        console.error("Error al obtener los pedidos:", error.message);
        res.status(500).json({ success: false, message: 'Error al obtener los pedidos de venta.' });
    }
};

/**
 * Controlador para obtener los detalles completos de un pedido de venta.
 */
const getOrderDetails = async (req, res) => {
    try {
        const order = await salesService.findSalesOrderById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado.' });
        }
        res.status(200).json({ success: true, data: order });
    } catch (error) {
        console.error("Error al obtener los detalles del pedido:", error.message);
        res.status(500).json({ success: false, message: 'Error al obtener los detalles del pedido.' });
    }
};

/**
 * HU023: Controlador para el reporte de ventas por cliente.
 */
const getSalesByClientReport = async (req, res) => {
    try {
        // req.query puede contener startDate y endDate
        const reportData = await salesService.getSalesReportByClient(req.query);
        res.status(200).json({ success: true, data: reportData });
    } catch (error) {
        console.error("Error al generar el reporte de ventas:", error.message);
        res.status(500).json({ success: false, message: 'Error al generar el reporte de ventas.' });
    }
};

const getSalesDashboard = async (req, res) => {
    try {
        const dashboardData = await salesService.getDashboardData(req.query);
        res.status(200).json({ success: true, data: dashboardData });
    } catch (error) {
        console.error("Error al generar datos del dashboard:", error.message);
        res.status(500).json({ success: false, message: 'Error al generar datos del dashboard.' });
    }
};

module.exports = {
    createNewClient,
    getAllClients,
    getClientDetails,
    updateClientDetails,
    removeClient,
    createOrder,
    getAllOrders,
    getOrderDetails,
    getSalesByClientReport,
    changeOrderStatus,
    getSalesDashboard
};