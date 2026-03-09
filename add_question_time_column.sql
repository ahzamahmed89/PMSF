-- Add time_seconds column to quiz_questions table
-- This allows setting individual time limits for each question when using perQuestion time mode

ALTER TABLE quiz_questions
ADD time_seconds INT NULL; -- Time allowed for this specific question in seconds

GO

-- Add comment explaining the column
EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Time allowed for this question in seconds (used when quiz time_type is perQuestion)', 
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'quiz_questions',
    @level2type = N'COLUMN', @level2name = N'time_seconds';

GO

PRINT 'Successfully added time_seconds column to quiz_questions table';
