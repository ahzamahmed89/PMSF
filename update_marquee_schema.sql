-- Update marquee_items table to add is_enabled field and remove soft-delete is_active
-- This allows toggling items on/off without actually deleting them from audit perspective

-- First, check if is_active column exists and remove it
IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'marquee_items' AND COLUMN_NAME = 'is_active'
)
BEGIN
    -- Drop only non-primary key indexes that use is_active
    IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_marquee_active_order' AND object_id = OBJECT_ID('marquee_items'))
    BEGIN
        DROP INDEX idx_marquee_active_order ON marquee_items;
        PRINT 'Dropped index idx_marquee_active_order';
    END
    
    -- Now drop the column
    ALTER TABLE marquee_items
    DROP COLUMN is_active;
    PRINT 'is_active column removed from marquee_items table';
END

-- Check if is_enabled column already exists
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'marquee_items' AND COLUMN_NAME = 'is_enabled'
)
BEGIN
    -- Add is_enabled column if it doesn't exist
    ALTER TABLE marquee_items
    ADD is_enabled BIT NOT NULL DEFAULT 1;
    PRINT 'is_enabled column added to marquee_items table';
END
ELSE
BEGIN
    PRINT 'is_enabled column already exists';
END

-- Create new index for enabled items ordered by display_order
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_marquee_enabled_order' AND object_id = OBJECT_ID('marquee_items'))
BEGIN
    CREATE INDEX idx_marquee_enabled_order ON marquee_items(is_enabled, display_order);
    PRINT 'Created index idx_marquee_enabled_order';
END

PRINT 'Migration completed successfully!';
