-- ============================================
-- Quiz Edit Feature - Database Migration
-- SQL Server (T-SQL) - Execute if not already done
-- ============================================

-- IMPORTANT: Run these commands on your existing database to enable the edit feature

-- Step 1: Add last_edited_by column to quizzes table (if it doesn't exist)
-- This tracks which admin last modified each quiz
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_NAME = 'quizzes' AND COLUMN_NAME = 'last_edited_by')
BEGIN
    ALTER TABLE quizzes
    ADD last_edited_by NVARCHAR(100) NULL;
    
    PRINT 'Column last_edited_by added successfully';
END
ELSE
BEGIN
    PRINT 'Column last_edited_by already exists';
END
GO

-- Step 2: Verify all date columns exist
-- This ensures we have proper tracking of creation and modification
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_NAME = 'quizzes' AND COLUMN_NAME = 'created_at')
BEGIN
    ALTER TABLE quizzes
    ADD created_at DATETIME2 DEFAULT GETDATE();
    
    PRINT 'Column created_at added successfully';
END
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_NAME = 'quizzes' AND COLUMN_NAME = 'updated_at')
BEGIN
    ALTER TABLE quizzes
    ADD updated_at DATETIME2 DEFAULT GETDATE();
    
    PRINT 'Column updated_at added successfully';
END
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_NAME = 'quizzes' AND COLUMN_NAME = 'created_by')
BEGIN
    ALTER TABLE quizzes
    ADD created_by NVARCHAR(100) NULL;
    
    PRINT 'Column created_by added successfully';
END
GO

-- Step 3: Verify the quizzes table structure
-- Run this to see the current schema
PRINT '========================================';
PRINT 'Quiz Table Current Structure:';
PRINT '========================================';

SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'quizzes'
ORDER BY ORDINAL_POSITION;
GO

-- Step 4: Update existing quizzes if needed
-- Set updated_at to created_at for existing records (optional)
UPDATE quizzes
SET updated_at = ISNULL(updated_at, GETDATE()),
    created_at = ISNULL(created_at, GETDATE())
WHERE updated_at IS NULL OR created_at IS NULL;

PRINT 'Updated timestamps for existing quizzes';
GO

-- Step 5: Verify data integrity
-- Check that all required columns have values
SELECT 
    'Quizzes with NULL created_at' AS Check_Name,
    COUNT(*) as Count
FROM quizzes
WHERE created_at IS NULL
UNION ALL
SELECT 
    'Quizzes with NULL updated_at' AS Check_Name,
    COUNT(*) as Count
FROM quizzes
WHERE updated_at IS NULL
UNION ALL
SELECT 
    'Total Active Quizzes' AS Check_Name,
    COUNT(*) as Count
FROM quizzes
WHERE is_active = 1;
GO

PRINT '========================================';
PRINT 'Migration Complete!';
PRINT '========================================';
PRINT 'Your database is now ready for:';
PRINT '✓ Quiz editing functionality';
PRINT '✓ Creation date tracking';
PRINT '✓ Last modification tracking';
PRINT '✓ User attribution (created_by, last_edited_by)';
PRINT '========================================';
