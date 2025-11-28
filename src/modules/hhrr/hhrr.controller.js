// src/modules/hhrr/hhrr.controller.js
const hhrrService = require('./hhrr.service');

// --- Controladores para Empleados (HU040) ---
const createEmployee = async (req, res) => {
    try {
        const employee = await hhrrService.createEmployee(req.body);
        res.status(201).json({ success: true, message: 'Empleado creado.', data: employee });
    } catch (error) { res.status(500).json({ success: false, message: 'Error al crear el empleado.' }); }
};
const getAllEmployees = async (req, res) => {
    try {
        const paginatedData = await hhrrService.findAllEmployees(req.query);
        res.status(200).json({ success: true, data: paginatedData });
    } catch (error) { res.status(500).json({ success: false, message: 'Error al obtener los empleados.' }); }
};
const getEmployeeById = async (req, res) => {
    try {
        const employee = await hhrrService.findEmployeeById(req.params.id);
        if (!employee) return res.status(404).json({ success: false, message: 'Empleado no encontrado.' });
        res.status(200).json({ success: true, data: employee });
    } catch (error) { res.status(500).json({ success: false, message: 'Error al obtener el empleado.' }); }
};
const updateEmployee = async (req, res) => {
    try {
        const employee = await hhrrService.updateEmployee(req.params.id, req.body);
        if (!employee) return res.status(404).json({ success: false, message: 'Empleado no encontrado.' });
        res.status(200).json({ success: true, message: 'Empleado actualizado.', data: employee });
    } catch (error) { res.status(500).json({ success: false, message: 'Error al actualizar el empleado.' }); }
};
const deleteEmployee = async (req, res) => {
    try {
        const employee = await hhrrService.deleteEmployee(req.params.id);
        if (!employee) return res.status(404).json({ success: false, message: 'Empleado no encontrado.' });
        res.status(200).json({ success: true, message: 'Empleado desactivado correctamente.' });
    } catch (error) { res.status(500).json({ success: false, message: 'Error al desactivar el empleado.' }); }
};

// --- Controladores para Usuarios (HU043) ---
const createNewUser = async (req, res) => {
    try {
        const { username, password, role, employee_id } = req.body;
        if (!username || !password || !role || !employee_id) {
            return res.status(400).json({ success: false, message: 'Username, password, role y employee_id son requeridos.' });
        }
        const user = await hhrrService.createUser(req.body);
        res.status(201).json({ success: true, message: 'Usuario creado.', data: user });
    } catch (error) {
        if (error.code === '23505') { return res.status(400).json({ success: false, message: 'El username o email ya existe, o el empleado ya está asignado.' }); }
        res.status(500).json({ success: false, message: 'Error al crear el usuario.' });
    }
};
const getAllUsers = async (req, res) => {
    try {
        const paginatedData = await hhrrService.findAllUsers(req.query);
        res.status(200).json({ success: true, data: paginatedData });
    } catch (error) { res.status(500).json({ success: false, message: 'Error al obtener los usuarios.' }); }
};
const getUserById = async (req, res) => {
    try {
        const user = await hhrrService.findUserById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        res.status(200).json({ success: true, data: user });
    } catch (error) { res.status(500).json({ success: false, message: 'Error al obtener el usuario.' }); }
};
const updateUserDetails = async (req, res) => {
    try {
        const user = await hhrrService.updateUser(req.params.id, req.body);
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        res.status(200).json({ success: true, message: 'Usuario actualizado.', data: user });
    } catch (error) {
         if (error.code === '23505') { return res.status(400).json({ success: false, message: 'El username o email ya existe, o el empleado ya está asignado.' }); }
        res.status(500).json({ success: false, message: 'Error al actualizar el usuario.' });
    }
};
const deleteUser = async (req, res) => {
    try {
        const user = await hhrrService.deleteUser(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        res.status(200).json({ success: true, message: 'Usuario desactivado correctamente.' });
    } catch (error) { res.status(500).json({ success: false, message: 'Error al desactivar el usuario.' }); }
};

// --- Controladores para Asistencia (HU041) ---
const addAttendance = async (req, res) => {
    try {
        const { employee_id, date } = req.body;
        if (!employee_id || !date) {
            return res.status(400).json({ success: false, message: 'employee_id y date son requeridos.' });
        }
        const attendance = await hhrrService.registerAttendance(req.body);
        res.status(201).json({ success: true, message: 'Asistencia registrada/actualizada.', data: attendance });
    } catch (error) { 
        console.error("Error en addAttendance Controller:", error); // Log de error mejorado
        res.status(500).json({ success: false, message: error.message || 'Error al registrar la asistencia.' }); 
    }
};
const getAttendances = async (req, res) => {
    try {
        const data = await hhrrService.findAttendances(req.query);
        res.status(200).json({ success: true, data: data });
    } catch (error) { res.status(500).json({ success: false, message: 'Error al obtener las asistencias.' }); }
};

// --- Controladores para Turnos (HU042) ---
const addShift = async (req, res) => {
    try {
        const { employee_id, date, duration } = req.body;
        if (!employee_id || !date || !duration || duration <= 0) {
            return res.status(400).json({ success: false, message: 'employee_id, date y duration > 0 son requeridos.' });
        }
        const shift = await hhrrService.createShift(req.body);
        res.status(201).json({ success: true, message: 'Turno asignado.', data: shift });
    } catch (error) { res.status(500).json({ success: false, message: 'Error al asignar el turno.' }); }
};
const getShifts = async (req, res) => {
    try {
        const data = await hhrrService.findShifts(req.query);
        res.status(200).json({ success: true, data: data });
    } catch (error) { res.status(500).json({ success: false, message: 'Error al obtener los turnos.' }); }
};
const updateShiftDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const shift = await hhrrService.updateShift(id, req.body);
        if (!shift) return res.status(404).json({ success: false, message: 'Turno no encontrado.' });
        res.status(200).json({ success: true, message: 'Turno actualizado.', data: shift });
    } catch (error) { res.status(500).json({ success: false, message: 'Error al actualizar el turno.' }); }
};
const deleteShift = async (req, res) => {
    try {
        const { id } = req.params;
        const shift = await hhrrService.deleteShift(id);
        if (!shift) return res.status(404).json({ success: false, message: 'Turno no encontrado.' });
        res.status(200).json({ success: true, message: 'Turno eliminado.' });
    } catch (error) { res.status(500).json({ success: false, message: 'Error al eliminar el turno.' }); }
};

const getPayroll = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, message: 'Se requieren startDate y endDate.' });
        }
        const data = await hhrrService.getPayrollReport(req.query);
        res.status(200).json({ success: true, data: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Error al generar el reporte de nómina.' });
    }
};

// --- EXPORTACIONES COMPLETAS ---
module.exports = {
    createEmployee, getAllEmployees, getEmployeeById, updateEmployee, deleteEmployee,
    createNewUser, getAllUsers, getUserById, updateUserDetails, deleteUser,
    addAttendance, getAttendances,
    addShift, getShifts, updateShiftDetails, deleteShift,
    getPayroll,
};