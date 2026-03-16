-- Add regulatory and initiating department fields to quizzes table
-- Safe to run multiple times

IF COL_LENGTH('quizzes', 'department_name') IS NULL
BEGIN
    ALTER TABLE quizzes ADD department_name NVARCHAR(150) NULL;
    PRINT 'Added quizzes.department_name';
END
ELSE
BEGIN
    PRINT 'quizzes.department_name already exists';
END

IF COL_LENGTH('quizzes', 'is_regulatory') IS NULL
BEGIN
    ALTER TABLE quizzes ADD is_regulatory BIT NOT NULL CONSTRAINT DF_quizzes_is_regulatory DEFAULT 0;
    PRINT 'Added quizzes.is_regulatory';
END
ELSE
BEGIN
    PRINT 'quizzes.is_regulatory already exists';
END

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'idx_quizzes_department_name'
      AND object_id = OBJECT_ID('quizzes')
)
BEGIN
    CREATE INDEX idx_quizzes_department_name ON quizzes(department_name);
END

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'idx_quizzes_is_regulatory'
      AND object_id = OBJECT_ID('quizzes')
)
BEGIN
    CREATE INDEX idx_quizzes_is_regulatory ON quizzes(is_regulatory);
END
