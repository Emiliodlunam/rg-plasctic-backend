// src/modules/hhrr/hhrr.routes.js
const express = require('express');
const router = express.Router();
const hhrrController = require('./hhrr.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { checkRole } = require('../../middlewares/role.middleware');

router.use(authMiddleware.verifyToken);

const ADMIN_ROLE = 'Gerente General';
const PROD_ROLE = 'Jefe de Producción'; 
// const HR_ROLE = 'RRHH'; 

// --- Rutas para Empleados (HU040) ---
router.post('/employees', checkRole(ADMIN_ROLE), hhrrController.createEmployee);
router.get('/employees', checkRole(ADMIN_ROLE), hhrrController.getAllEmployees);
router.get('/employees/:id', checkRole(ADMIN_ROLE), hhrrController.getEmployeeById);
router.put('/employees/:id', checkRole(ADMIN_ROLE), hhrrController.updateEmployee);
router.delete('/employees/:id', checkRole(ADMIN_ROLE), hhrrController.deleteEmployee);

// --- Rutas para Usuarios (HU043) ---
router.post('/users', checkRole(ADMIN_ROLE), hhrrController.createNewUser);
router.get('/users', checkRole(ADMIN_ROLE), hhrrController.getAllUsers);
router.get('/users/:id', checkRole(ADMIN_ROLE), hhrrController.getUserById);
router.put('/users/:id', checkRole(ADMIN_ROLE), hhrrController.updateUserDetails);
router.delete('/users/:id', checkRole(ADMIN_ROLE), hhrrController.deleteUser);

// --- Rutas de Asistencia (HU041) ---
router.post('/attendances', checkRole(ADMIN_ROLE, PROD_ROLE), hhrrController.addAttendance);
router.get('/attendances', checkRole(ADMIN_ROLE, PROD_ROLE), hhrrController.getAttendances);

// --- Rutas para Turnos (HU042) ---
router.post('/shifts', checkRole(ADMIN_ROLE, PROD_ROLE), hhrrController.addShift);
router.get('/shifts', checkRole(ADMIN_ROLE, PROD_ROLE), hhrrController.getShifts);
router.put('/shifts/:id', checkRole(ADMIN_ROLE, PROD_ROLE), hhrrController.updateShiftDetails);
router.delete('/shifts/:id', checkRole(ADMIN_ROLE, PROD_ROLE), hhrrController.deleteShift);

// --- Ruta para Reporte de Nómina ---
router.get('/payroll', checkRole(ADMIN_ROLE), hhrrController.getPayroll);

module.exports = router;