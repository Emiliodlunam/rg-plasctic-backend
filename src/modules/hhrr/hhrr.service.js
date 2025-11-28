// src/modules/hhrr/hhrr.service.js
const db = require('../../config/postgres');
const camelToSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const { hashPassword } = require('../../utils/hash');

// --- Lógica para Empleados (HU040) ---
const createEmployee = async (employeeData) => {
    const { name, position, shift, hire_date, salary } = employeeData;
    const text = `
        INSERT INTO employees (name, position, shift, hire_date, salary, is_active)
        VALUES ($1, $2, $3, $4, $5, TRUE)
        RETURNING *;
    `;
    const values = [name, position, shift || 'MORNING', hire_date, salary || null];
    const { rows } = await db.query(text, values);
    return rows[0];
};

const findAllEmployees = async (filters = {}) => {
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const offset = (page - 1) * limit;
    const params = [];
    let searchCondition = '';
    if (filters.search) {
        params.push(`%${filters.search}%`);
        searchCondition = `AND (name ILIKE $${params.length} OR position ILIKE $${params.length})`;
    }
    const countQuery = `SELECT COUNT(*) FROM employees WHERE is_active = TRUE ${searchCondition}`;
    const dataQuery = `
        SELECT id, name, position, shift, hire_date, salary, is_active 
        FROM employees
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
    return { items: dataResult.rows, totalPages, currentPage: page, totalItems };
};

const findEmployeeById = async (id) => {
    const text = 'SELECT * FROM employees WHERE id = $1 AND is_active = TRUE';
    const { rows } = await db.query(text, [id]);
    return rows[0];
};

const updateEmployee = async (id, employeeData) => {
    const dataToUpdate = { ...employeeData };
    delete dataToUpdate.id;
    delete dataToUpdate.created_at;
    delete dataToUpdate.updated_at;
    const updatableKeys = Object.keys(dataToUpdate);
    if (updatableKeys.length === 0) return findEmployeeById(id);
    const fields = updatableKeys.map((key, i) => `${camelToSnakeCase(key)} = $${i + 1}`).join(', ');
    const values = updatableKeys.map(key => dataToUpdate[key]);
    const text = `
        UPDATE employees SET ${fields}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $${values.length + 1} AND is_active = TRUE 
        RETURNING *;
    `;
    const { rows } = await db.query(text, [...values, id]);
    return rows[0];
};

const deleteEmployee = async (id) => {
    const text = `UPDATE employees SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id;`;
    const { rows } = await db.query(text, [id]);
    return rows[0];
};

// --- Lógica para Usuarios (HU043) ---
const createUser = async (userData) => {
    const { employee_id, username, password, email, role } = userData;
    const hashedPassword = await hashPassword(password);
    const text = `
        INSERT INTO users (employee_id, username, password_hash, email, role, is_active)
        VALUES ($1, $2, $3, $4, $5, TRUE)
        RETURNING id, username, email, role, employee_id, is_active;
    `;
    const values = [employee_id, username, hashedPassword, email, role];
    const { rows } = await db.query(text, values);
    return rows[0];
};

const findAllUsers = async (filters = {}) => {
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const offset = (page - 1) * limit;
    const countQuery = `SELECT COUNT(*) FROM users`;
    const dataQuery = `
        SELECT 
            u.id, u.username, u.email, u.role, u.is_active, u.last_login,
            e.name as employee_name
        FROM users u
        LEFT JOIN employees e ON u.employee_id = e.id
        ORDER BY u.username ASC
        LIMIT $1 OFFSET $2;
    `;
    const [countResult, dataResult] = await Promise.all([
        db.query(countQuery),
        db.query(dataQuery, [limit, offset])
    ]);
    const totalItems = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalItems / limit);
    return { items: dataResult.rows, totalPages, currentPage: page, totalItems };
};

const findUserById = async (id) => {
    const text = `SELECT id, username, email, role, employee_id, is_active FROM users WHERE id = $1;`;
    const { rows } = await db.query(text, [id]);
    return rows[0];
};

const updateUser = async (id, userData) => {
    const { username, email, role, employee_id, is_active, password } = userData;
    let query, values;
    if (password) {
        const hashedPassword = await hashPassword(password);
        query = `
            UPDATE users SET 
                username = $1, email = $2, role = $3, employee_id = $4, is_active = $5, 
                password_hash = $6, updated_at = CURRENT_TIMESTAMP
            WHERE id = $7 RETURNING id, username, email, role, employee_id, is_active;
        `;
        values = [username, email, role, employee_id, is_active, hashedPassword, id];
    } else {
        query = `
            UPDATE users SET 
                username = $1, email = $2, role = $3, employee_id = $4, is_active = $5, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6 RETURNING id, username, email, role, employee_id, is_active;
        `;
        values = [username, email, role, employee_id, is_active, id];
    }
    const { rows } = await db.query(query, values);
    return rows[0];
};

const deleteUser = async (id) => {
    const text = `UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id;`;
    const { rows } = await db.query(text, [id]);
    return rows[0];
};

// --- Lógica para Asistencia (HU041) ---
const registerAttendance = async (attendanceData) => {
    const { employee_id, date, entry_time, exit_time, absence_reason, overtime_hours } = attendanceData;
    const query = `
        INSERT INTO attendances (employee_id, date, entry_time, exit_time, absence_reason, overtime_hours)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (employee_id, date) DO UPDATE SET
            entry_time = COALESCE($3, attendances.entry_time),
            exit_time = COALESCE($4, attendances.exit_time),
            absence_reason = COALESCE($5, attendances.absence_reason),
            overtime_hours = COALESCE($6, attendances.overtime_hours)
        RETURNING *;
    `;
    const values = [ employee_id, date, entry_time || null, exit_time || null, absence_reason || null, overtime_hours || null ];
    const { rows } = await db.query(query, values);
    return rows[0];
};

const findAttendances = async (filters = {}) => {
    const { employeeId, startDate, endDate } = filters;
    const params = [];
    let conditions = [];
    if (employeeId) { params.push(employeeId); conditions.push(`a.employee_id = $${params.length}`); }
    if (startDate) { params.push(startDate); conditions.push(`a.date >= $${params.length}`); }
    if (endDate) { params.push(endDate); conditions.push(`a.date <= $${params.length}`); }
    
    // --- CORRECCIÓN IMPORTANTE ---
    // Hacemos un LEFT JOIN desde employees para asegurarnos de listar a TODOS los empleados activos,
    // tengan o no un registro de asistencia en ese día.
    const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const dataQuery = `
        SELECT 
            e.id as employee_id,
            e.name as employee_name,
            e.position,
            a.id, a.date, a.entry_time, a.exit_time, a.absence_reason, a.overtime_hours
        FROM employees e
        LEFT JOIN attendances a ON e.id = a.employee_id ${whereClause}
        WHERE e.is_active = TRUE
        ORDER BY e.name ASC;
    `;
    const { rows } = await db.query(dataQuery, params);
    return rows;
};

// --- Lógica para Turnos (HU042) ---
const createShift = async (shiftData) => {
    const { employee_id, date, machine, duration } = shiftData;
    const text = `
        INSERT INTO shifts (employee_id, date, machine, duration)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
    `;
    const values = [employee_id, date, machine, duration];
    const { rows } = await db.query(text, values);
    return rows[0];
};

const findShifts = async (filters = {}) => {
    const { employeeId, startDate, endDate } = filters;
    const params = [];
    let conditions = [];
    if (employeeId) { params.push(employeeId); conditions.push(`s.employee_id = $${params.length}`); }
    if (startDate) { params.push(startDate); conditions.push(`s.date >= $${params.length}`); }
    if (endDate) { params.push(endDate); conditions.push(`s.date <= $${params.length}`); }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const dataQuery = `
        SELECT s.*, e.name as employee_name
        FROM shifts s
        JOIN employees e ON s.employee_id = e.id
        ${whereClause}
        ORDER BY s.date DESC, e.name ASC;
    `;
    const { rows } = await db.query(dataQuery, params);
    return rows;
};

const updateShift = async (id, shiftData) => {
    const dataToUpdate = { ...shiftData };
    // Eliminamos campos que no se deben pasar
    delete dataToUpdate.id;

    const updatableKeys = Object.keys(dataToUpdate);
    if (updatableKeys.length === 0) {
        const { rows: currentShift } = await db.query('SELECT * FROM shifts WHERE id = $1', [id]);
        return currentShift[0];
    }

    const fields = updatableKeys.map((key, i) => `${camelToSnakeCase(key)} = $${i + 1}`).join(', ');
    const values = updatableKeys.map(key => dataToUpdate[key]);

    const text = `
        UPDATE shifts 
        SET ${fields}
        WHERE id = $${values.length + 1}
        RETURNING *;
    `;
    const { rows } = await db.query(text, [...values, id]);
    return rows[0];
};

const deleteShift = async (id) => {
    const text = `DELETE FROM shifts WHERE id = $1 RETURNING id;`;
    const { rows } = await db.query(text, [id]);
    return rows[0];
};

/**
 * Genera un reporte de nómina para un rango de fechas.
 * Calcula pagos extra y deducciones basado en la asistencia.
 */
const getPayrollReport = async (filters = {}) => {
    const { employeeId, startDate, endDate } = filters;
    
    // Validar que las fechas existan para este reporte
    if (!startDate || !endDate) {
        throw new Error("Se requieren fechas de inicio y fin para el reporte de nómina.");
    }

    const params = [startDate, endDate];
    let employeeCondition = '';
    
    if (employeeId) {
        params.push(employeeId);
        employeeCondition = `AND e.id = $${params.length}`;
    }

    // Usamos CTEs (Common Table Expressions) para organizar la consulta
    const query = `
        -- 1. Calcular la tarifa por hora de cada empleado
        WITH EmployeeRates AS (
            SELECT 
                id, 
                name, 
                position,
                salary,
                (salary / 160.0) as hourly_rate -- Asumimos 160 horas/mes
            FROM employees
            WHERE is_active = TRUE ${employeeCondition}
        ),
        -- 2. Agrupar los datos de asistencia (horas extra y faltas) en el período
        PeriodData AS (
            SELECT
                employee_id,
                SUM(COALESCE(overtime_hours, 0)) as total_overtime_hours,
                COUNT(*) FILTER (WHERE absence_reason IS NOT NULL) as total_absence_days
            FROM attendances
            WHERE date BETWEEN $1 AND $2
            GROUP BY employee_id
        )
        -- 3. Unir todo y calcular la nómina
        SELECT
            e.id as employee_id,
            e.name as employee_name,
            e.position,
            e.salary as base_salary,
            e.hourly_rate,
            COALESCE(p.total_overtime_hours, 0) as total_overtime_hours,
            (COALESCE(p.total_overtime_hours, 0) * (e.hourly_rate * 2)) as overtime_pay,
            COALESCE(p.total_absence_days, 0) as total_absence_days,
            (COALESCE(p.total_absence_days, 0) * 8 * e.hourly_rate) as absence_deduction,
            (e.salary + (COALESCE(p.total_overtime_hours, 0) * (e.hourly_rate * 2)) - (COALESCE(p.total_absence_days, 0) * 8 * e.hourly_rate)) as total_pay
        FROM EmployeeRates e
        LEFT JOIN PeriodData p ON e.id = p.employee_id
        ORDER BY e.name;
    `;
    
    const { rows } = await db.query(query, params);
    return rows;
};

// --- EXPORTACIONES COMPLETAS ---
module.exports = {
  createEmployee, findAllEmployees, findEmployeeById, updateEmployee, deleteEmployee,
  createUser, findAllUsers, findUserById, updateUser, deleteUser,
  registerAttendance, findAttendances,
  createShift, findShifts, updateShift, deleteShift,
  getPayrollReport,
};