// src/modules/finances/finances.controller.js
const financesService = require('./finances.service');

// --- Controladores para Ingresos ---

const addIncome = async (req, res) => {
    try {
        // Validación básica
        if (!req.body.amount || req.body.amount <= 0 || !req.body.date || !req.body.source) {
            return res.status(400).json({ success: false, message: 'Faltan datos requeridos (monto > 0, fecha, fuente).' });
        }
        const income = await financesService.createIncome(req.body);
        res.status(201).json({ success: true, message: 'Ingreso registrado.', data: income });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al registrar el ingreso.' });
    }
};

const getIncomes = async (req, res) => {
    try {
        const paginatedData = await financesService.findAllIncomes(req.query);
        res.status(200).json({ success: true, data: paginatedData });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener los ingresos.' });
    }
};

// --- Controladores para Egresos ---

const addExpense = async (req, res) => {
    try {
        if (!req.body.amount || req.body.amount <= 0 || !req.body.date || !req.body.category) {
            return res.status(400).json({ success: false, message: 'Faltan datos requeridos (monto > 0, fecha, categoría).' });
        }
        const expense = await financesService.createExpense(req.body);
        res.status(201).json({ success: true, message: 'Egreso registrado.', data: expense });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al registrar el egreso.' });
    }
};

const getExpenses = async (req, res) => {
    try {
        const paginatedData = await financesService.findAllExpenses(req.query);
        res.status(200).json({ success: true, data: paginatedData });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener los egresos.' });
    }
};

/**
 * HU033: Controlador para el reporte de utilidad por cliente.
 */
const getProfitReport = async (req, res) => {
    try {
        const reportData = await financesService.getProfitReportByClient(req.query);
        res.status(200).json({ success: true, data: reportData });
    } catch (error) {
        console.error("Error al generar el reporte de utilidad:", error.message);
        res.status(500).json({ success: false, message: 'Error al generar el reporte de utilidad.' });
    }
};

/**
 * HU032: Controlador para registrar un nuevo costeo.
 */
const addCosting = async (req, res) => {
    try {
        if (!req.body.product_id || !req.body.calculation_date) {
            return res.status(400).json({ success: false, message: 'Faltan datos requeridos (product_id, calculation_date).' });
        }
        const costing = await financesService.createCosting(req.body);
        res.status(201).json({ success: true, message: 'Costeo registrado.', data: costing });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al registrar el costeo.' });
    }
};

/**
 * HU032: Controlador para obtener el historial de costeos de un producto.
 */
const getCostingsForProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const history = await financesService.getCostingHistoryForProduct(productId);
        res.status(200).json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener el historial de costeos.' });
    }
};

module.exports = {
    addIncome,
    getIncomes,
    addExpense,
    getExpenses,
    getProfitReport,
    addCosting,
    getCostingsForProduct,
};