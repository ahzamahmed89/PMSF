import sql from 'mssql';
import { getPool } from '../config/database.js';

/**
 * Quiz Assignment Controller
 * Handles quiz assignment to employees based on filters and periods
 */

// Get all quiz assignments
export const getAllAssignments = async (req, res) => {
    try {
        const { quiz_id, active } = req.query;
        const pool = await getPool();
        
        let query = `
            SELECT 
                qa.id,
                qa.quiz_id,
                qa.assignment_name,
                qa.filter_department,
                qa.filter_role,
                qa.filter_grade,
                qa.period_type,
                qa.period_start_date,
                qa.period_end_date,
                qa.is_active,
                qa.assigned_at,
                q.subject as quiz_title,
                u.Username as assigned_by_username,
                (SELECT COUNT(*) FROM employee_quiz_attempts WHERE assignment_id = qa.id) as total_employees,
                (SELECT COUNT(*) FROM employee_quiz_attempts WHERE assignment_id = qa.id AND status = 'completed') as completed_count,
                (SELECT COUNT(*) FROM employee_quiz_attempts WHERE assignment_id = qa.id AND status = 'not_started') as pending_count
            FROM quiz_assignments qa
            LEFT JOIN quizzes q ON qa.quiz_id = q.quiz_id
            LEFT JOIN UserLogins u ON qa.assigned_by = u.UserID
            WHERE 1=1
        `;
        
        const params = [];
        
        if (quiz_id) {
            query += ` AND qa.quiz_id = @quiz_id`;
            params.push({ name: 'quiz_id', type: sql.Int, value: parseInt(quiz_id) });
        }
        
        if (active !== undefined) {
            query += ` AND qa.is_active = @active`;
            params.push({ name: 'active', type: sql.Bit, value: active === 'true' ? 1 : 0 });
        }
        
        query += ` ORDER BY qa.assigned_at DESC`;
        
        const request = pool.request();
        params.forEach(param => {
            request.input(param.name, param.type, param.value);
        });
        
        const result = await request.query(query);
        
        res.json({
            success: true,
            assignments: result.recordset,
            count: result.recordset.length
        });
        
    } catch (error) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch assignments',
            error: error.message
        });
    }
};

// Get single assignment details
export const getAssignmentById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        
        // Get assignment details
        const assignment = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT 
                    qa.*,
                    q.subject as quiz_title,
                    CAST(NULL AS NVARCHAR(500)) as quiz_description,
                    u.Username as assigned_by_username
                FROM quiz_assignments qa
                LEFT JOIN quizzes q ON qa.quiz_id = q.quiz_id
                LEFT JOIN UserLogins u ON qa.assigned_by = u.UserID
                WHERE qa.id = @id
            `);
        
        if (assignment.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found'
            });
        }
        
        // Get employee attempts for this assignment
        const attempts = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT 
                    eqa.*,
                    e.employee_name,
                    e.employee_code,
                    e.employee_id,
                    e.functional_department,
                    e.functional_role,
                    e.grade
                FROM employee_quiz_attempts eqa
                LEFT JOIN employees e ON eqa.employee_id = e.id
                WHERE eqa.assignment_id = @id
                ORDER BY e.employee_name
            `);
        
        res.json({
            success: true,
            assignment: assignment.recordset[0],
            attempts: attempts.recordset
        });
        
    } catch (error) {
        console.error('Error fetching assignment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch assignment',
            error: error.message
        });
    }
};

// Create new quiz assignment
export const createAssignment = async (req, res) => {
    try {
        const {
            quiz_id,
            assignment_name,
            filter_department,
            filter_role,
            filter_grade,
            period_type,
            period_start_date
        } = req.body;
        
        // Validation
        if (!quiz_id || !assignment_name || !period_type || !period_start_date) {
            return res.status(400).json({
                success: false,
                message: 'Quiz ID, assignment name, period type, and start date are required'
            });
        }
        
        // Validate period type
        const validPeriodTypes = ['yearly', 'half-yearly', 'quarterly', 'monthly', 'once'];
        if (!validPeriodTypes.includes(period_type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid period type'
            });
        }
        
        const pool = await getPool();
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        // Check if quiz exists
        const quizCheck = await pool.request()
            .input('quiz_id', sql.Int, quiz_id)
            .query('SELECT quiz_id FROM quizzes WHERE quiz_id = @quiz_id');
        
        if (quizCheck.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Quiz not found'
            });
        }

        const departments = Array.isArray(filter_department)
            ? filter_department.filter(Boolean)
            : (filter_department ? [filter_department] : []);
        const roles = Array.isArray(filter_role)
            ? filter_role.filter(Boolean)
            : (filter_role ? [filter_role] : []);
        const grades = Array.isArray(filter_grade)
            ? filter_grade.filter(Boolean)
            : (filter_grade ? [filter_grade] : []);

        const hasMultiFilters = departments.length > 1 || roles.length > 1 || grades.length > 1;

        let assignmentId;
        let employeesAssigned;

        if (!hasMultiFilters) {
            const result = await pool.request()
                .input('quiz_id', sql.Int, quiz_id)
                .input('assignment_name', sql.NVarChar, assignment_name)
                .input('filter_department', sql.NVarChar, departments[0] || null)
                .input('filter_role', sql.NVarChar, roles[0] || null)
                .input('filter_grade', sql.VarChar, grades[0] || null)
                .input('period_type', sql.VarChar, period_type)
                .input('period_start_date', sql.Date, period_start_date)
                .input('assigned_by', sql.Int, userId)
                .output('assignment_id', sql.Int)
                .execute('sp_CreateQuizAssignment');

            assignmentId = result.output.assignment_id;
            employeesAssigned = result.recordset[0]?.employees_assigned || 0;
        } else {
            const getPeriodIdentifier = (type, startDate) => {
                const date = new Date(startDate);
                const year = date.getFullYear();
                const month = date.getMonth() + 1;

                if (type === 'yearly') return `${year}`;
                if (type === 'half-yearly') return `${year}-H${month <= 6 ? 1 : 2}`;
                if (type === 'quarterly') return `${year}-Q${Math.ceil(month / 3)}`;
                if (type === 'monthly') return `${year}-${String(month).padStart(2, '0')}`;
                return 'once';
            };

            const transaction = new sql.Transaction(pool);
            await transaction.begin();

            try {
                const filterDepartmentText = departments.length > 0 ? departments.join(', ') : null;
                const filterRoleText = roles.length > 0 ? roles.join(', ') : null;
                const filterGradeText = grades.length > 0 ? grades.join(', ') : null;

                const assignmentInsert = await transaction.request()
                    .input('quiz_id', sql.Int, quiz_id)
                    .input('assignment_name', sql.NVarChar, assignment_name)
                    .input('filter_department', sql.NVarChar, filterDepartmentText)
                    .input('filter_role', sql.NVarChar, filterRoleText)
                    .input('filter_grade', sql.VarChar, filterGradeText)
                    .input('period_type', sql.VarChar, period_type)
                    .input('period_start_date', sql.Date, period_start_date)
                    .input('assigned_by', sql.Int, userId)
                    .query(`
                        INSERT INTO quiz_assignments (
                            quiz_id, assignment_name,
                            filter_department, filter_role, filter_grade,
                            period_type, period_start_date, assigned_by
                        )
                        OUTPUT INSERTED.id
                        VALUES (
                            @quiz_id, @assignment_name,
                            @filter_department, @filter_role, @filter_grade,
                            @period_type, @period_start_date, @assigned_by
                        )
                    `);

                assignmentId = assignmentInsert.recordset[0].id;
                const periodIdentifier = getPeriodIdentifier(period_type, period_start_date);

                let attemptQuery = `
                    INSERT INTO employee_quiz_attempts (
                        assignment_id, employee_id, quiz_id,
                        period_identifier, status
                    )
                    SELECT @assignment_id, e.id, @quiz_id, @period_identifier, 'not_started'
                    FROM employees e
                    WHERE e.is_active = 1
                `;

                const queryConditions = [];
                const attemptRequest = transaction.request()
                    .input('assignment_id', sql.Int, assignmentId)
                    .input('quiz_id', sql.Int, quiz_id)
                    .input('period_identifier', sql.VarChar, periodIdentifier);

                if (departments.length > 0) {
                    const deptParams = departments.map((_, i) => `@dept${i}`).join(',');
                    queryConditions.push(`e.functional_department IN (${deptParams})`);
                    departments.forEach((department, i) => {
                        attemptRequest.input(`dept${i}`, sql.NVarChar, department);
                    });
                }

                if (roles.length > 0) {
                    const roleParams = roles.map((_, i) => `@role${i}`).join(',');
                    queryConditions.push(`e.functional_role IN (${roleParams})`);
                    roles.forEach((roleValue, i) => {
                        attemptRequest.input(`role${i}`, sql.NVarChar, roleValue);
                    });
                }

                if (grades.length > 0) {
                    const gradeParams = grades.map((_, i) => `@grade${i}`).join(',');
                    queryConditions.push(`e.grade IN (${gradeParams})`);
                    grades.forEach((gradeValue, i) => {
                        attemptRequest.input(`grade${i}`, sql.VarChar, gradeValue);
                    });
                }

                if (queryConditions.length > 0) {
                    attemptQuery += ` AND ${queryConditions.join(' AND ')}`;
                }

                await attemptRequest.query(attemptQuery);

                const countResult = await transaction.request()
                    .input('assignment_id', sql.Int, assignmentId)
                    .query(`SELECT COUNT(*) as employees_assigned FROM employee_quiz_attempts WHERE assignment_id = @assignment_id`);

                employeesAssigned = countResult.recordset[0]?.employees_assigned || 0;
                await transaction.commit();
            } catch (transactionError) {
                await transaction.rollback();
                throw transactionError;
            }
        }
        
        res.status(201).json({
            success: true,
            message: `Quiz assigned successfully to ${employeesAssigned} employee(s)`,
            assignment_id: assignmentId,
            employees_assigned: employeesAssigned
        });
        
    } catch (error) {
        console.error('Error creating assignment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create assignment',
            error: error.message
        });
    }
};

// Update assignment (mainly for deactivating)
export const updateAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active, period_end_date } = req.body;
        
        const pool = await getPool();
        
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('is_active', sql.Bit, is_active !== undefined ? is_active : null)
            .input('period_end_date', sql.Date, period_end_date || null)
            .query(`
                UPDATE quiz_assignments
                SET 
                    is_active = ISNULL(@is_active, is_active),
                    period_end_date = ISNULL(@period_end_date, period_end_date)
                OUTPUT INSERTED.*
                WHERE id = @id
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Assignment updated successfully',
            assignment: result.recordset[0]
        });
        
    } catch (error) {
        console.error('Error updating assignment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update assignment',
            error: error.message
        });
    }
};

// Delete assignment
export const deleteAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        
        // Check if there are completed attempts
        const checkAttempts = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT COUNT(*) as count 
                FROM employee_quiz_attempts 
                WHERE assignment_id = @id AND status = 'completed'
            `);
        
        if (checkAttempts.recordset[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete assignment with completed attempts. Deactivate instead.'
            });
        }
        
        // Delete assignment (cascades to employee_quiz_attempts)
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM quiz_assignments WHERE id = @id');
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Assignment deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting assignment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete assignment',
            error: error.message
        });
    }
};

// Refresh period attempts (create new period for recurring assignments)
export const refreshPeriodAttempts = async (req, res) => {
    try {
        const { assignment_id, new_period_identifier } = req.body;
        
        if (!assignment_id || !new_period_identifier) {
            return res.status(400).json({
                success: false,
                message: 'Assignment ID and new period identifier are required'
            });
        }
        
        const pool = await getPool();
        
        const result = await pool.request()
            .input('assignment_id', sql.Int, assignment_id)
            .input('new_period_identifier', sql.VarChar, new_period_identifier)
            .execute('sp_RefreshPeriodAttempts');
        
        const newAttemptsCreated = result.recordset[0]?.new_attempts_created || 0;
        
        res.json({
            success: true,
            message: `Created ${newAttemptsCreated} new period attempts`,
            new_attempts_created: newAttemptsCreated
        });
        
    } catch (error) {
        console.error('Error refreshing period attempts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to refresh period attempts',
            error: error.message
        });
    }
};

// Get employee quiz dashboard
export const getEmployeeDashboard = async (req, res) => {
    try {
        const { employee_id, status, period } = req.query;
        const pool = await getPool();
        
        let query = `
            SELECT * FROM vw_EmployeeQuizDashboard
            WHERE 1=1
        `;
        
        const params = [];
        
        if (employee_id) {
            query += ` AND employee_id = @employee_id`;
            params.push({ name: 'employee_id', type: sql.VarChar, value: employee_id });
        }
        
        if (status) {
            query += ` AND status = @status`;
            params.push({ name: 'status', type: sql.VarChar, value: status });
        }
        
        if (period) {
            query += ` AND period_identifier = @period`;
            params.push({ name: 'period', type: sql.VarChar, value: period });
        }
        
        query += ` ORDER BY employee_name, assigned_at DESC`;
        
        const request = pool.request();
        params.forEach(param => {
            request.input(param.name, param.type, param.value);
        });
        
        const result = await request.query(query);
        
        res.json({
            success: true,
            dashboard: result.recordset,
            count: result.recordset.length
        });
        
    } catch (error) {
        console.error('Error fetching employee dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch employee dashboard',
            error: error.message
        });
    }
};

// Get assignment statistics
export const getAssignmentStatistics = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        
        const stats = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT 
                    COUNT(*) as total_employees,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                    SUM(CASE WHEN status = 'not_started' THEN 1 ELSE 0 END) as not_started,
                    SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
                    AVG(CASE WHEN percentage IS NOT NULL THEN percentage ELSE NULL END) as avg_score,
                    MAX(percentage) as highest_score,
                    MIN(CASE WHEN percentage IS NOT NULL THEN percentage ELSE NULL END) as lowest_score
                FROM employee_quiz_attempts
                WHERE assignment_id = @id
            `);
        
        res.json({
            success: true,
            statistics: stats.recordset[0]
        });
        
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: error.message
        });
    }
};

// Get my assigned quizzes (for employee view)
export const getMyAssignedQuizzes = async (req, res) => {
    try {
        let identifier = req.params.employeeId || req.query.employee_id;
        
        if (!identifier) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID or username is required'
            });
        }
        
        const pool = await getPool();
        
        // Try to find employee by employee_id first, then try by username
        let employee = await pool.request()
            .input('identifier', sql.VarChar, identifier)
            .query('SELECT id FROM employees WHERE employee_id = @identifier');
        
        let empId;
        let empIdField = identifier;
        
        if (employee.recordset.length === 0) {
            // Try to find by username from UserLogins
            const userLookup = await pool.request()
                .input('username', sql.VarChar, identifier)
                .query('SELECT UserID FROM UserLogins WHERE Username = @username');
            
            if (userLookup.recordset.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User/Employee not found'
                });
            }
            
            // Get the employee.id using employee_id field that matches username
            const employeeLookup = await pool.request()
                .input('emp_id_field', sql.VarChar, identifier)
                .query('SELECT id FROM employees WHERE employee_id = @emp_id_field');
            
            if (employeeLookup.recordset.length === 0) {
                // If still not found, return error
                return res.status(404).json({
                    success: false,
                    message: 'Employee record not found after username lookup'
                });
            }
            
            empId = employeeLookup.recordset[0].id;
        } else {
            empId = employee.recordset[0].id;
        }
        
        const result = await pool.request()
            .input('emp_id', sql.Int, empId)
            .query(`
                SELECT 
                    eqa.id as attempt_id,
                    eqa.status,
                    eqa.score,
                    eqa.percentage,
                    eqa.completed_at,
                    eqa.expires_at,
                    eqa.period_identifier,
                    eqa.attempt_number,
                    q.quiz_id as quiz_id,
                    q.subject as quiz_title,
                    CAST(NULL AS NVARCHAR(500)) as quiz_description,
                    qa.assignment_name,
                    qa.period_type,
                    CASE 
                        WHEN eqa.status = 'completed' THEN 'Completed'
                        WHEN eqa.expires_at < GETDATE() THEN 'Expired'
                        WHEN eqa.status = 'in_progress' THEN 'In Progress'
                        ELSE 'Pending'
                    END AS display_status
                FROM employee_quiz_attempts eqa
                INNER JOIN quiz_assignments qa ON eqa.assignment_id = qa.id
                INNER JOIN quizzes q ON eqa.quiz_id = q.quiz_id
                WHERE eqa.employee_id = @emp_id
                    AND qa.is_active = 1
                ORDER BY 
                    CASE WHEN eqa.status = 'not_started' THEN 0 ELSE 1 END,
                    eqa.expires_at ASC,
                    qa.assigned_at DESC
            `);
        
        res.json({
            success: true,
            assigned_quizzes: result.recordset,
            count: result.recordset.length
        });
        
    } catch (error) {
        console.error('Error fetching assigned quizzes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch assigned quizzes',
            error: error.message
        });
    }
};


// Mark assignment as completed after quiz attempt
export const markAssignmentCompleted = async (req, res) => {
    try {
        const { id } = req.params;
        const { employee_id, quiz_id, status } = req.body;
        
        const pool = await getPool();
        
        // Update the employee_quiz_attempts record
        const result = await pool.request()
            .input('assignment_id', sql.Int, id)
            .input('employee_id', sql.VarChar, employee_id)
            .input('quiz_id', sql.Int, quiz_id)
            .input('status', sql.VarChar, status || 'completed')
            .input('completed_at', sql.DateTime2, new Date())
            .query(`
                UPDATE employee_quiz_attempts
                SET status = @status, completed_at = @completed_at
                WHERE assignment_id = @assignment_id 
                  AND employee_id = @employee_id
                  AND quiz_id = @quiz_id
            `);
        
        if (result.rowsAffected && result.rowsAffected[0] > 0) {
            res.json({
                success: true,
                message: 'Assignment marked as completed'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Assignment record not found'
            });
        }
    } catch (error) {
        console.error('Error marking assignment completed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark assignment as completed',
            error: error.message
        });
    }
};
