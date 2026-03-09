-- Password Recovery System - Database Schema Updates
-- This script adds password recovery functionality to the UserLogins table

-- Check if columns exist, if not, add them
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'UserLogins' AND COLUMN_NAME = 'PasswordResetCode')
BEGIN
    ALTER TABLE UserLogins
    ADD PasswordResetCode NVARCHAR(50) NULL;
END;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'UserLogins' AND COLUMN_NAME = 'PasswordResetExpiry')
BEGIN
    ALTER TABLE UserLogins
    ADD PasswordResetExpiry DATETIME NULL;
END;

-- Create index on PasswordResetCode for faster lookup
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_UserLogins_PasswordResetCode')
BEGIN
    CREATE INDEX IX_UserLogins_PasswordResetCode 
    ON UserLogins(PasswordResetCode);
END;

PRINT 'Password recovery schema updated successfully.';
