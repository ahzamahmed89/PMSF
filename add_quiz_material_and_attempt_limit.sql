-- Add study material and attempt-limit support to quizzes table

IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'quizzes' AND COLUMN_NAME = 'max_attempts'
)
BEGIN
    ALTER TABLE quizzes ADD max_attempts INT NULL;
    PRINT 'Added max_attempts column to quizzes';
END

IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'quizzes' AND COLUMN_NAME = 'study_material_name'
)
BEGIN
    ALTER TABLE quizzes ADD study_material_name NVARCHAR(255) NULL;
    PRINT 'Added study_material_name column to quizzes';
END

IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'quizzes' AND COLUMN_NAME = 'study_material_url'
)
BEGIN
    ALTER TABLE quizzes ADD study_material_url NVARCHAR(500) NULL;
    PRINT 'Added study_material_url column to quizzes';
END

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'idx_quizzes_max_attempts' AND object_id = OBJECT_ID('quizzes')
)
BEGIN
    CREATE INDEX idx_quizzes_max_attempts ON quizzes(max_attempts);
    PRINT 'Created idx_quizzes_max_attempts index';
END
