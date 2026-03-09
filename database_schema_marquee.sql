-- Marquee Items Table
-- This table stores the text items that appear in the scrolling marquee on the home page

CREATE TABLE marquee_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    text_content NVARCHAR(500) NOT NULL,
    icon NVARCHAR(10) NULL,  -- Optional emoji icon
    display_order INT NOT NULL DEFAULT 0,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    created_by NVARCHAR(100) NULL,
    updated_at DATETIME DEFAULT GETDATE(),
    updated_by NVARCHAR(100) NULL
);

-- Create index for active items ordered by display_order
CREATE INDEX idx_marquee_active_order ON marquee_items(is_active, display_order);

-- Insert default marquee items
INSERT INTO marquee_items (text_content, icon, display_order, is_active, created_by)
VALUES 
    ('Quiz system enhanced with per-question time allocation', '🔄', 1, 1, 'System'),
    ('New visit data visualization features added', '📊', 2, 1, 'System'),
    ('Performance improvements implemented', '✅', 3, 1, 'System'),
    ('Product Knowledge quiz system optimized', '🎯', 4, 1, 'System');
