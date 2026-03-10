import sql from 'mssql';
import { getPool } from '../config/database.js';

/**
 * Employee Controller
 * Handles all employee management operations
 */

// Get all employees with optional filters
export const getAllEmployees = async (req, res) => {
    try {
        const { department, role, grade, search, active } = req.query;
        const pool = await getPool();
        
        let query = `
            SELECT 
                id,
                employee_code,
                employee_name,
                employee_id,
                functional_department,
                functional_role,
                grade,
                is_active,
                created_at,
                updated_at
            FROM employees
            WHERE 1=1
        `;
        
        const params = [];
        
        if (department) {
            query += ` AND functional_department = @department`;
            params.push({ name: 'department', type: sql.NVarChar, value: department });
        }
        
        if (role) {
            query += ` AND functional_role = @role`;
            params.push({ name: 'role', type: sql.NVarChar, value: role });
        }
        
        if (grade) {
            query += ` AND grade = @grade`;
            params.push({ name: 'grade', type: sql.VarChar, value: grade });
        }
        
        if (search) {
            query += ` AND (employee_name LIKE @search OR employee_id LIKE @search OR employee_code LIKE @search)`;
            params.push({ name: 'search', type: sql.NVarChar, value: `%${search}%` });
        }
        
        if (active !== undefined) {
            query += ` AND is_active = @active`;
            params.push({ name: 'active', type: sql.Bit, value: active === 'true' ? 1 : 0 });
        }
        
        query += ` ORDER BY employee_name`;
        
        const request = pool.request();
        params.forEach(param => {
            request.input(param.name, param.type, param.value);
        });
        
        const result = await request.query(query);
        
        res.json({
            success: true,
            employees: result.recordset,
            count: result.recordset.length
        });
        
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch employees',
            error: error.message
        });
    }
};

// Get single employee by ID
export const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT 
                    id,
                    employee_code,
                    employee_name,
                    employee_id,
                    functional_department,
                    functional_role,
                    grade,
                    is_active,
                    created_at,
                    updated_at
                FROM employees
                WHERE id = @id
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }
        
        res.json({
            success: true,
            employee: result.recordset[0]
        });
        
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch employee',
            error: error.message
        });
    }
};

// Create new employee
export const createEmployee = async (req, res) => {
    try {
        const {
            employee_code,
            employee_name,
            employee_id,
            functional_department,
            functional_role,
            grade
        } = req.body;
        
        // Validation
        if (!employee_code || !employee_name || !employee_id || 
            !functional_department || !functional_role || !grade) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }
        
        // Validate employee code (5 digits max)
        if (!/^\d{1,5}$/.test(employee_code)) {
            return res.status(400).json({
                success: false,
                message: 'Employee code must be 1-5 digits'
            });
        }
        
        const pool = await poolPromise;
        const userId = req.user?.userId || null;
        
        // Check for duplicate employee_code or employee_id
        const checkDuplicate = await pool.request()
            .input('employee_code', sql.VarChar, employee_code)
            .input('employee_id', sql.VarChar, employee_id)
            .query(`
                SELECT COUNT(*) as count 
                FROM employees 
                WHERE employee_code = @employee_code OR employee_id = @employee_id
            `);
        
        if (checkDuplicate.recordset[0].count > 0) {
            return res.status(409).json({
                success: false,
                message: 'Employee code or employee ID already exists'
            });
        }
        
        const result = await pool.request()
            .input('employee_code', sql.VarChar, employee_code)
            .input('employee_name', sql.NVarChar, employee_name)
            .input('employee_id', sql.VarChar, employee_id)
            .input('functional_department', sql.NVarChar, functional_department)
            .input('functional_role', sql.NVarChar, functional_role)
            .input('grade', sql.VarChar, grade)
            .input('created_by', sql.Int, userId)
            .query(`
                INSERT INTO employees (
                    employee_code, employee_name, employee_id,
                    functional_department, functional_role, grade,
                    created_by, updated_by
                )
                OUTPUT INSERTED.*
                VALUES (
                    @employee_code, @employee_name, @employee_id,
                    @functional_department, @functional_role, @grade,
                    @created_by, @created_by
                )
            `);
        
        res.status(201).json({
            success: true,
            message: 'Employee created successfully',
            employee: result.recordset[0]
        });
        
    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create employee',
            error: error.message
        });
    }
};

// Update employee
export const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            employee_code,
            employee_name,
            employee_id,
            functional_department,
            functional_role,
            grade,
            is_active
        } = req.body;
        
        const pool = await getPool();
        const userId = req.user?.userId || null;
        
        // Check if employee exists
        const checkExists = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT id FROM employees WHERE id = @id');
        
        if (checkExists.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }
        
        // Check for duplicate employee_code or employee_id (excluding current employee)
        const checkDuplicate = await pool.request()
            .input('id', sql.Int, id)
            .input('employee_code', sql.VarChar, employee_code)
            .input('employee_id', sql.VarChar, employee_id)
            .query(`
                SELECT COUNT(*) as count 
                FROM employees 
                WHERE (employee_code = @employee_code OR employee_id = @employee_id)
                    AND id != @id
            `);
        
        if (checkDuplicate.recordset[0].count > 0) {
            return res.status(409).json({
                success: false,
                message: 'Employee code or employee ID already exists'
            });
        }
        
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('employee_code', sql.VarChar, employee_code)
            .input('employee_name', sql.NVarChar, employee_name)
            .input('employee_id', sql.VarChar, employee_id)
            .input('functional_department', sql.NVarChar, functional_department)
            .input('functional_role', sql.NVarChar, functional_role)
            .input('grade', sql.VarChar, grade)
            .input('is_active', sql.Bit, is_active !== undefined ? is_active : 1)
            .input('updated_by', sql.Int, userId)
            .query(`
                UPDATE employees
                SET 
                    employee_code = @employee_code,
                    employee_name = @employee_name,
                    employee_id = @employee_id,
                    functional_department = @functional_department,
                    functional_role = @functional_role,
                    grade = @grade,
                    is_active = @is_active,
                    updated_by = @updated_by,
                    updated_at = GETDATE()
                OUTPUT INSERTED.*
                WHERE id = @id
            `);
        
        res.json({
            success: true,
            message: 'Employee updated successfully',
            employee: result.recordset[0]
        });
        
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update employee',
            error: error.message
        });
    }
};

// Delete employee (soft delete)
export const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        
        // Check if employee has quiz attempts
        const checkAttempts = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT COUNT(*) as count 
                FROM employee_quiz_attempts 
                WHERE employee_id = @id
            `);
        
        if (checkAttempts.recordset[0].count > 0) {
            // Soft delete - just deactivate
            await pool.request()
                .input('id', sql.Int, id)
                .query('UPDATE employees SET is_active = 0 WHERE id = @id');
            
            return res.json({
                success: true,
                message: 'Employee deactivated successfully (has quiz history)'
            });
        }
        
        // Hard delete if no quiz attempts
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM employees WHERE id = @id');
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Employee deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete employee',
            error: error.message
        });
    }
};

// Get unique departments
export const getDepartments = async (req, res) => {
    try {
        const pool = await getPool();
        
        const result = await pool.request().query(`
            SELECT DISTINCT functional_department as department
            FROM employees
            WHERE is_active = 1
            ORDER BY functional_department
        `);
        
        res.json({
            success: true,
            departments: result.recordset.map(r => r.department)
        });
        
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch departments',
            error: error.message
        });
    }
};

// Get unique roles
export const getRoles = async (req, res) => {
    try {
        const pool = await getPool();
        
        const result = await pool.request().query(`
            SELECT DISTINCT functional_role as role
            FROM employees
            WHERE is_active = 1
            ORDER BY functional_role
        `);
        
        res.json({
            success: true,
            roles: result.recordset.map(r => r.role)
        });
        
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch roles',
            error: error.message
        });
    }
};

// Get unique grades
export const getGrades = async (req, res) => {
    try {
        const pool = await getPool();
        
        const result = await pool.request().query(`
            SELECT DISTINCT grade
            FROM employees
            WHERE is_active = 1
            ORDER BY grade
        `);
        
        res.json({
            success: true,
            grades: result.recordset.map(r => r.grade)
        });
        
    } catch (error) {
        console.error('Error fetching grades:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch grades',
            error: error.message
        });
    }
};

// Get eligible employees for quiz assignment (with filters)
export const getEligibleEmployees = async (req, res) => {
    try {
        const normalizeQueryValues = (rawValue) => {
            if (!rawValue) return [];
            if (Array.isArray(rawValue)) {
                return rawValue
                    .flatMap(value => String(value).split(','))
                    .map(value => value.trim())
                    .filter(Boolean);
            }
            return String(rawValue)
                .split(',')
                .map(value => value.trim())
                .filter(Boolean);
        };

        const departments = normalizeQueryValues(req.query.department);
        const roles = normalizeQueryValues(req.query.role);
        const grades = normalizeQueryValues(req.query.grade);
        
        const pool = await getPool();
        
        // Build dynamic query for multiple filter support
        let query = `
            SELECT 
                id,
                employee_code,
                employee_name,
                employee_id,
                functional_department,
                functional_role,
                grade
            FROM employees
            WHERE is_active = 1
        `;
        
        const queryConditions = [];
        const request = pool.request();
        
        if (departments.length > 0) {
            const deptParams = departments.map((_, i) => `@dept${i}`).join(',');
            queryConditions.push(`functional_department IN (${deptParams})`);
            departments.forEach((dept, i) => {
                request.input(`dept${i}`, sql.NVarChar, dept);
            });
        }
        
        if (roles.length > 0) {
            const roleParams = roles.map((_, i) => `@role${i}`).join(',');
            queryConditions.push(`functional_role IN (${roleParams})`);
            roles.forEach((role, i) => {
                request.input(`role${i}`, sql.NVarChar, role);
            });
        }
        
        if (grades.length > 0) {
            const gradeParams = grades.map((_, i) => `@grade${i}`).join(',');
            queryConditions.push(`grade IN (${gradeParams})`);
            grades.forEach((grade, i) => {
                request.input(`grade${i}`, sql.VarChar, grade);
            });
        }
        
        if (queryConditions.length > 0) {
            query += ' AND ' + queryConditions.join(' AND ');
        }
        
        query += ' ORDER BY employee_name';
        
        const result = await request.query(query);
        
        res.json({
            success: true,
            employees: result.recordset,
            count: result.recordset.length,
            filters: { departments, roles, grades }
        });
        
    } catch (error) {
        console.error('Error fetching eligible employees:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch eligible employees',
            error: error.message
        });
    }
};

const normalizeString = (value) => (value || '').toString().trim();
const normalizeKey = (value) => normalizeString(value).toLowerCase();
const normalizeBoolean = (value, defaultValue = true) => {
    if (value === undefined || value === null || value === '') return defaultValue;
    if (typeof value === 'boolean') return value;
    return ['true', '1', 'yes', 'y'].includes(value.toString().trim().toLowerCase());
};

const sanitizeUploadedEmployees = (employees) => {
    const sanitized = [];
    const errors = [];
    const seenEmployeeIds = new Set();
    const seenEmployeeCodes = new Set();

    employees.forEach((emp, index) => {
        const row = index + 2;

        const employee_code = normalizeString(emp.employee_code);
        const employee_name = normalizeString(emp.employee_name);
        const employee_id = normalizeString(emp.employee_id);
        const functional_department = normalizeString(emp.functional_department);
        const functional_role = normalizeString(emp.functional_role);
        const grade = normalizeString(emp.grade);
        const is_active = normalizeBoolean(emp.is_active, true);

        if (!employee_code || !employee_name || !employee_id || !functional_department || !functional_role || !grade) {
            errors.push({ row, error: 'Missing required fields' });
            return;
        }

        if (!/^\d{1,5}$/.test(employee_code)) {
            errors.push({ row, error: `Invalid employee code "${employee_code}". Must be 1-5 digits.` });
            return;
        }

        const employeeIdKey = normalizeKey(employee_id);
        const employeeCodeKey = normalizeKey(employee_code);

        if (seenEmployeeIds.has(employeeIdKey)) {
            errors.push({ row, error: `Duplicate employee_id "${employee_id}" in uploaded file` });
            return;
        }

        if (seenEmployeeCodes.has(employeeCodeKey)) {
            errors.push({ row, error: `Duplicate employee_code "${employee_code}" in uploaded file` });
            return;
        }

        seenEmployeeIds.add(employeeIdKey);
        seenEmployeeCodes.add(employeeCodeKey);

        sanitized.push({
            employee_code,
            employee_name,
            employee_id,
            functional_department,
            functional_role,
            grade,
            is_active
        });
    });

    return { sanitized, errors };
};

const buildSyncPlan = (existingEmployees, uploadedEmployees) => {
    const existingByEmployeeId = new Map();

    existingEmployees.forEach(emp => {
        existingByEmployeeId.set(normalizeKey(emp.employee_id), emp);
    });

    const uploadKeys = new Set();
    const toAdd = [];
    const toUpdate = [];
    const unchanged = [];

    uploadedEmployees.forEach(uploadEmp => {
        const key = normalizeKey(uploadEmp.employee_id);
        uploadKeys.add(key);

        const existing = existingByEmployeeId.get(key);
        if (!existing) {
            toAdd.push(uploadEmp);
            return;
        }

        const changed =
            normalizeString(existing.employee_code) !== uploadEmp.employee_code ||
            normalizeString(existing.employee_name) !== uploadEmp.employee_name ||
            normalizeString(existing.functional_department) !== uploadEmp.functional_department ||
            normalizeString(existing.functional_role) !== uploadEmp.functional_role ||
            normalizeString(existing.grade) !== uploadEmp.grade ||
            normalizeBoolean(existing.is_active, true) !== normalizeBoolean(uploadEmp.is_active, true);

        if (changed) {
            toUpdate.push({
                id: existing.id,
                employee_id: existing.employee_id,
                before: {
                    employee_code: normalizeString(existing.employee_code),
                    employee_name: normalizeString(existing.employee_name),
                    functional_department: normalizeString(existing.functional_department),
                    functional_role: normalizeString(existing.functional_role),
                    grade: normalizeString(existing.grade),
                    is_active: normalizeBoolean(existing.is_active, true)
                },
                after: uploadEmp
            });
        } else {
            unchanged.push(existing);
        }
    });

    const toEliminate = existingEmployees.filter(emp => !uploadKeys.has(normalizeKey(emp.employee_id)));

    return { toAdd, toUpdate, toEliminate, unchanged };
};

export const previewBulkImportEmployees = async (req, res) => {
    try {
        const { employees } = req.body;

        if (!Array.isArray(employees) || employees.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid employees data'
            });
        }

        const { sanitized, errors: validationErrors } = sanitizeUploadedEmployees(employees);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Upload contains validation errors',
                errors: validationErrors
            });
        }

        const pool = await getPool();
        const existingResult = await pool.request().query(`
            SELECT id, employee_code, employee_name, employee_id, functional_department, functional_role, grade, is_active
            FROM employees
        `);

        const plan = buildSyncPlan(existingResult.recordset, sanitized);

        res.json({
            success: true,
            summary: {
                uploadCount: sanitized.length,
                existingCount: existingResult.recordset.length,
                toAdd: plan.toAdd.length,
                toUpdate: plan.toUpdate.length,
                toEliminate: plan.toEliminate.length,
                unchanged: plan.unchanged.length
            },
            details: {
                add: plan.toAdd.slice(0, 50),
                update: plan.toUpdate.slice(0, 50),
                eliminate: plan.toEliminate.slice(0, 50)
            }
        });
    } catch (error) {
        console.error('Error previewing bulk import employees:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to preview bulk import',
            error: error.message
        });
    }
};

// Bulk import employees
export const bulkImportEmployees = async (req, res) => {
    try {
        const { employees, syncMode = false, confirmSync = false } = req.body;
        
        if (!Array.isArray(employees) || employees.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid employees data'
            });
        }

        const { sanitized, errors: validationErrors } = sanitizeUploadedEmployees(employees);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Upload contains validation errors',
                errors: validationErrors
            });
        }
        
        const pool = await getPool();
        const userId = req.user?.userId || null;

        if (syncMode) {
            if (!confirmSync) {
                return res.status(400).json({
                    success: false,
                    message: 'Sync confirmation is required before applying changes'
                });
            }

            const existingResult = await pool.request().query(`
                SELECT id, employee_code, employee_name, employee_id, functional_department, functional_role, grade, is_active
                FROM employees
            `);

            const plan = buildSyncPlan(existingResult.recordset, sanitized);
            const transaction = new sql.Transaction(pool);
            await transaction.begin();

            try {
                for (const emp of plan.toAdd) {
                    await new sql.Request(transaction)
                        .input('employee_code', sql.VarChar, emp.employee_code)
                        .input('employee_name', sql.NVarChar, emp.employee_name)
                        .input('employee_id', sql.VarChar, emp.employee_id)
                        .input('functional_department', sql.NVarChar, emp.functional_department)
                        .input('functional_role', sql.NVarChar, emp.functional_role)
                        .input('grade', sql.VarChar, emp.grade)
                        .input('is_active', sql.Bit, emp.is_active ? 1 : 0)
                        .input('created_by', sql.Int, userId)
                        .query(`
                            INSERT INTO employees (
                                employee_code, employee_name, employee_id,
                                functional_department, functional_role, grade, is_active,
                                created_by, updated_by
                            )
                            VALUES (
                                @employee_code, @employee_name, @employee_id,
                                @functional_department, @functional_role, @grade, @is_active,
                                @created_by, @created_by
                            )
                        `);
                }

                for (const emp of plan.toUpdate) {
                    await new sql.Request(transaction)
                        .input('id', sql.Int, emp.id)
                        .input('employee_code', sql.VarChar, emp.after.employee_code)
                        .input('employee_name', sql.NVarChar, emp.after.employee_name)
                        .input('functional_department', sql.NVarChar, emp.after.functional_department)
                        .input('functional_role', sql.NVarChar, emp.after.functional_role)
                        .input('grade', sql.VarChar, emp.after.grade)
                        .input('is_active', sql.Bit, emp.after.is_active ? 1 : 0)
                        .input('updated_by', sql.Int, userId)
                        .query(`
                            UPDATE employees
                            SET
                                employee_code = @employee_code,
                                employee_name = @employee_name,
                                functional_department = @functional_department,
                                functional_role = @functional_role,
                                grade = @grade,
                                is_active = @is_active,
                                updated_by = @updated_by,
                                updated_at = GETDATE()
                            WHERE id = @id
                        `);
                }

                for (const emp of plan.toEliminate) {
                    await new sql.Request(transaction)
                        .input('id', sql.Int, emp.id)
                        .input('updated_by', sql.Int, userId)
                        .query(`
                            UPDATE employees
                            SET
                                is_active = 0,
                                updated_by = @updated_by,
                                updated_at = GETDATE()
                            WHERE id = @id
                        `);
                }

                await transaction.commit();
            } catch (txError) {
                await transaction.rollback();
                throw txError;
            }

            return res.json({
                success: true,
                message: `Sync complete. Added: ${plan.toAdd.length}, Updated: ${plan.toUpdate.length}, Eliminated: ${plan.toEliminate.length}`,
                summary: {
                    added: plan.toAdd.length,
                    updated: plan.toUpdate.length,
                    eliminated: plan.toEliminate.length,
                    unchanged: plan.unchanged.length
                }
            });
        }
        
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        for (const emp of sanitized) {
            try {
                // Check duplicate
                const checkDup = await pool.request()
                    .input('employee_code', sql.VarChar, emp.employee_code)
                    .input('employee_id', sql.VarChar, emp.employee_id)
                    .query(`
                        SELECT COUNT(*) as count 
                        FROM employees 
                        WHERE employee_code = @employee_code OR employee_id = @employee_id
                    `);
                
                if (checkDup.recordset[0].count > 0) {
                    errors.push({
                        employee: emp,
                        error: 'Duplicate employee_code or employee_id'
                    });
                    errorCount++;
                    continue;
                }
                
                // Insert
                await pool.request()
                    .input('employee_code', sql.VarChar, emp.employee_code)
                    .input('employee_name', sql.NVarChar, emp.employee_name)
                    .input('employee_id', sql.VarChar, emp.employee_id)
                    .input('functional_department', sql.NVarChar, emp.functional_department)
                    .input('functional_role', sql.NVarChar, emp.functional_role)
                    .input('grade', sql.VarChar, emp.grade)
                    .input('created_by', sql.Int, userId)
                    .query(`
                        INSERT INTO employees (
                            employee_code, employee_name, employee_id,
                            functional_department, functional_role, grade,
                            created_by, updated_by
                        )
                        VALUES (
                            @employee_code, @employee_name, @employee_id,
                            @functional_department, @functional_role, @grade,
                            @created_by, @created_by
                        )
                    `);
                
                successCount++;
                
            } catch (err) {
                errors.push({
                    employee: emp,
                    error: err.message
                });
                errorCount++;
            }
        }
        
        res.json({
            success: true,
            message: `Imported ${successCount} employees, ${errorCount} errors`,
            successCount,
            errorCount,
            errors: errors.length > 0 ? errors : undefined,
            mode: 'append'
        });
        
    } catch (error) {
        console.error('Error bulk importing employees:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to import employees',
            error: error.message
        });
    }
};
