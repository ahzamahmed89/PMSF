-- =====================================================
-- EMPLOYEE AND QUIZ ASSIGNMENT SYSTEM
-- This schema supports employee management and 
-- quiz assignment with period-based tracking
-- =====================================================

-- =====================================================
-- 1. EMPLOYEES TABLE
-- =====================================================
CREATE TABLE employees (
    id INT IDENTITY(1,1) PRIMARY KEY,
    employee_code VARCHAR(5) NOT NULL UNIQUE,
    employee_name NVARCHAR(100) NOT NULL,
    employee_id VARCHAR(50) NOT NULL UNIQUE,  -- e.g., ahzam.ahmed
    functional_department NVARCHAR(100) NOT NULL,
    functional_role NVARCHAR(100) NOT NULL,
    grade VARCHAR(20) NOT NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    created_by INT NULL,
    updated_by INT NULL
);

-- Indexes for filtering performance
CREATE INDEX idx_employees_department ON employees(functional_department);
CREATE INDEX idx_employees_role ON employees(functional_role);
CREATE INDEX idx_employees_grade ON employees(grade);
CREATE INDEX idx_employees_active ON employees(is_active);

-- =====================================================
-- 2. QUIZ ASSIGNMENTS TABLE
-- Tracks which quizzes are assigned to which groups
-- =====================================================
CREATE TABLE quiz_assignments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    quiz_id INT NOT NULL,
    assignment_name NVARCHAR(200) NOT NULL,
    
    -- Filter criteria (NULL means no filter on that field)
    filter_department NVARCHAR(100) NULL,
    filter_role NVARCHAR(100) NULL,
    filter_grade VARCHAR(20) NULL,
    
    -- Period settings
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('yearly', 'half-yearly', 'quarterly', 'monthly', 'once')),
    period_start_date DATE NOT NULL,
    period_end_date DATE NULL,
    
    -- Assignment metadata
    is_active BIT DEFAULT 1,
    assigned_by INT NOT NULL,
    assigned_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_quiz_assignments_quiz ON quiz_assignments(quiz_id);
CREATE INDEX idx_quiz_assignments_active ON quiz_assignments(is_active);
CREATE INDEX idx_quiz_assignments_period ON quiz_assignments(period_type, period_start_date);

-- =====================================================
-- 3. EMPLOYEE QUIZ ATTEMPTS TABLE
-- Tracks individual employee quiz attempts with period tracking
-- =====================================================
CREATE TABLE employee_quiz_attempts (
    id INT IDENTITY(1,1) PRIMARY KEY,
    assignment_id INT NOT NULL,
    employee_id INT NOT NULL,
    quiz_id INT NOT NULL,
    
    -- Attempt tracking
    attempt_number INT DEFAULT 1,  -- Tracks which attempt in the current period
    period_identifier VARCHAR(50) NOT NULL,  -- e.g., "2026-Q1", "2026-03", "2026"
    
    -- Quiz results
    score INT NULL,
    total_questions INT NULL,
    percentage DECIMAL(5,2) NULL,
    time_taken INT NULL,  -- in seconds
    status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'expired')),
    
    -- Timestamps
    started_at DATETIME NULL,
    completed_at DATETIME NULL,
    expires_at DATETIME NULL,
    
    -- Metadata
    created_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (assignment_id) REFERENCES quiz_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id)
);

-- Indexes
CREATE INDEX idx_employee_attempts_assignment ON employee_quiz_attempts(assignment_id);
CREATE INDEX idx_employee_attempts_employee ON employee_quiz_attempts(employee_id);
CREATE INDEX idx_employee_attempts_period ON employee_quiz_attempts(period_identifier);
CREATE INDEX idx_employee_attempts_status ON employee_quiz_attempts(status);
CREATE UNIQUE INDEX idx_employee_attempts_unique ON employee_quiz_attempts(assignment_id, employee_id, period_identifier, attempt_number);

-- =====================================================
-- 4. QUIZ ASSIGNMENT NOTIFICATIONS TABLE
-- Tracks when employees should be notified about quizzes
-- =====================================================
CREATE TABLE quiz_assignment_notifications (
    id INT IDENTITY(1,1) PRIMARY KEY,
    assignment_id INT NOT NULL,
    employee_id INT NOT NULL,
    period_identifier VARCHAR(50) NOT NULL,
    
    notification_sent BIT DEFAULT 0,
    notification_sent_at DATETIME NULL,
    
    due_date DATE NULL,
    is_overdue BIT DEFAULT 0,
    
    created_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (assignment_id) REFERENCES quiz_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_employee ON quiz_assignment_notifications(employee_id);
CREATE INDEX idx_notifications_overdue ON quiz_assignment_notifications(is_overdue);

-- =====================================================
-- 5. STORED PROCEDURE: Get Eligible Employees for Assignment
-- =====================================================
GO
CREATE PROCEDURE sp_GetEligibleEmployees
    @department NVARCHAR(100) = NULL,
    @role NVARCHAR(100) = NULL,
    @grade VARCHAR(20) = NULL
AS
BEGIN
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
        AND (@department IS NULL OR functional_department = @department)
        AND (@role IS NULL OR functional_role = @role)
        AND (@grade IS NULL OR grade = @grade)
    ORDER BY employee_name;
END;
GO

-- =====================================================
-- 6. STORED PROCEDURE: Create Quiz Assignment Records
-- Automatically creates attempt records for eligible employees
-- =====================================================
GO
CREATE PROCEDURE sp_CreateQuizAssignment
    @quiz_id INT,
    @assignment_name NVARCHAR(200),
    @filter_department NVARCHAR(100) = NULL,
    @filter_role NVARCHAR(100) = NULL,
    @filter_grade VARCHAR(20) = NULL,
    @period_type VARCHAR(20),
    @period_start_date DATE,
    @assigned_by INT,
    @assignment_id INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Create the assignment
    INSERT INTO quiz_assignments (
        quiz_id, assignment_name, 
        filter_department, filter_role, filter_grade,
        period_type, period_start_date, assigned_by
    )
    VALUES (
        @quiz_id, @assignment_name,
        @filter_department, @filter_role, @filter_grade,
        @period_type, @period_start_date, @assigned_by
    );
    
    SET @assignment_id = SCOPE_IDENTITY();
    
    -- Get current period identifier
    DECLARE @period_identifier VARCHAR(50);
    
    IF @period_type = 'yearly'
        SET @period_identifier = CAST(YEAR(@period_start_date) AS VARCHAR(4));
    ELSE IF @period_type = 'half-yearly'
        SET @period_identifier = CAST(YEAR(@period_start_date) AS VARCHAR(4)) + '-H' + 
                                CAST(CASE WHEN MONTH(@period_start_date) <= 6 THEN 1 ELSE 2 END AS VARCHAR(1));
    ELSE IF @period_type = 'quarterly'
        SET @period_identifier = CAST(YEAR(@period_start_date) AS VARCHAR(4)) + '-Q' + 
                                CAST(DATEPART(QUARTER, @period_start_date) AS VARCHAR(1));
    ELSE IF @period_type = 'monthly'
        SET @period_identifier = FORMAT(@period_start_date, 'yyyy-MM');
    ELSE
        SET @period_identifier = 'once';
    
    -- Insert attempt records for all eligible employees
    INSERT INTO employee_quiz_attempts (
        assignment_id, employee_id, quiz_id, 
        period_identifier, status
    )
    SELECT 
        @assignment_id,
        e.id,
        @quiz_id,
        @period_identifier,
        'not_started'
    FROM employees e
    WHERE e.is_active = 1
        AND (@filter_department IS NULL OR e.functional_department = @filter_department)
        AND (@filter_role IS NULL OR e.functional_role = @filter_role)
        AND (@filter_grade IS NULL OR e.grade = @filter_grade);
    
    -- Return summary
    SELECT 
        @assignment_id AS assignment_id,
        COUNT(*) AS employees_assigned
    FROM employee_quiz_attempts
    WHERE assignment_id = @assignment_id;
END;
GO

-- =====================================================
-- 7. STORED PROCEDURE: Refresh Period Attempts
-- Creates new attempt records for a new period
-- =====================================================
GO
CREATE PROCEDURE sp_RefreshPeriodAttempts
    @assignment_id INT,
    @new_period_identifier VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Get assignment details
    DECLARE @quiz_id INT, @filter_dept NVARCHAR(100), 
            @filter_role NVARCHAR(100), @filter_grade VARCHAR(20);
    
    SELECT 
        @quiz_id = quiz_id,
        @filter_dept = filter_department,
        @filter_role = filter_role,
        @filter_grade = filter_grade
    FROM quiz_assignments
    WHERE id = @assignment_id;
    
    -- Create new period attempts for eligible employees
    INSERT INTO employee_quiz_attempts (
        assignment_id, employee_id, quiz_id,
        period_identifier, attempt_number, status
    )
    SELECT 
        @assignment_id,
        e.id,
        @quiz_id,
        @new_period_identifier,
        1,
        'not_started'
    FROM employees e
    WHERE e.is_active = 1
        AND (@filter_dept IS NULL OR e.functional_department = @filter_dept)
        AND (@filter_role IS NULL OR e.functional_role = @filter_role)
        AND (@filter_grade IS NULL OR e.grade = @filter_grade)
        AND NOT EXISTS (
            SELECT 1 FROM employee_quiz_attempts
            WHERE assignment_id = @assignment_id
                AND employee_id = e.id
                AND period_identifier = @new_period_identifier
        );
    
    SELECT @@ROWCOUNT AS new_attempts_created;
END;
GO

-- =====================================================
-- 8. VIEW: Employee Quiz Dashboard
-- Shows current quiz status for all employees
-- =====================================================
GO
CREATE VIEW vw_EmployeeQuizDashboard AS
SELECT 
    e.employee_code,
    e.employee_name,
    e.employee_id,
    e.functional_department,
    e.functional_role,
    e.grade,
    qa.assignment_name,
    q.title AS quiz_title,
    qa.period_type,
    eqa.period_identifier,
    eqa.attempt_number,
    eqa.status,
    eqa.score,
    eqa.percentage,
    eqa.completed_at,
    eqa.expires_at,
    CASE 
        WHEN eqa.status = 'completed' THEN 'Completed'
        WHEN eqa.expires_at < GETDATE() THEN 'Expired'
        WHEN eqa.status = 'in_progress' THEN 'In Progress'
        ELSE 'Pending'
    END AS display_status
FROM employees e
INNER JOIN employee_quiz_attempts eqa ON e.id = eqa.employee_id
INNER JOIN quiz_assignments qa ON eqa.assignment_id = qa.id
INNER JOIN quizzes q ON eqa.quiz_id = q.id
WHERE e.is_active = 1 AND qa.is_active = 1;
GO

-- =====================================================
-- 9. Sample Data Insert Scripts
-- =====================================================

-- Sample employees
INSERT INTO employees (employee_code, employee_name, employee_id, functional_department, functional_role, grade)
VALUES 
    ('00001', 'Ahzam Ahmed', 'ahzam.ahmed', 'IT', 'Software Engineer', 'G5'),
    ('00002', 'Sarah Khan', 'sarah.khan', 'HR', 'HR Manager', 'G6'),
    ('00003', 'Ali Raza', 'ali.raza', 'IT', 'Senior Developer', 'G6'),
    ('00004', 'Fatima Malik', 'fatima.malik', 'Finance', 'Accountant', 'G4'),
    ('00005', 'Ahmed Hassan', 'ahmed.hassan', 'IT', 'DevOps Engineer', 'G5');

-- =====================================================
-- 10. Cleanup Scripts (if needed)
-- =====================================================
/*
-- Drop all objects in reverse order
DROP VIEW IF EXISTS vw_EmployeeQuizDashboard;
DROP PROCEDURE IF EXISTS sp_RefreshPeriodAttempts;
DROP PROCEDURE IF EXISTS sp_CreateQuizAssignment;
DROP PROCEDURE IF EXISTS sp_GetEligibleEmployees;
DROP TABLE IF EXISTS quiz_assignment_notifications;
DROP TABLE IF EXISTS employee_quiz_attempts;
DROP TABLE IF EXISTS quiz_assignments;
DROP TABLE IF EXISTS employees;
*/
