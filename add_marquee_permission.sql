-- Add MARQUEE_EDIT permission to the system
-- This allows administrators to assign marquee editing rights to specific roles

-- Check if the permission already exists
IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionName = 'MARQUEE_EDIT')
BEGIN
    INSERT INTO Permissions (PermissionName, ComponentName, Description, IsActive)
    VALUES ('MARQUEE_EDIT', 'Home', 'Edit marquee updates on home page', 1);
    PRINT 'MARQUEE_EDIT permission created successfully';
END
ELSE
BEGIN
    PRINT 'MARQUEE_EDIT permission already exists';
END

-- Optional: Assign to Admin role by default
DECLARE @adminRoleId INT;
SELECT @adminRoleId = RoleID FROM Roles WHERE RoleName = 'Admin';

IF @adminRoleId IS NOT NULL
BEGIN
    DECLARE @marqueePermId INT;
    SELECT @marqueePermId = PermissionID FROM Permissions WHERE PermissionName = 'MARQUEE_EDIT';
    
    IF NOT EXISTS (SELECT 1 FROM RolePermissions WHERE RoleID = @adminRoleId AND PermissionID = @marqueePermId)
    BEGIN
        INSERT INTO RolePermissions (RoleID, PermissionID, GrantedDate)
        VALUES (@adminRoleId, @marqueePermId, GETDATE());
        PRINT 'MARQUEE_EDIT permission assigned to Admin role';
    END
    ELSE
    BEGIN
        PRINT 'Admin role already has MARQUEE_EDIT permission';
    END
END

-- Optional: Create an Editor role if it doesn't exist and assign MARQUEE_EDIT
IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'Editor')
BEGIN
    INSERT INTO Roles (RoleName, Description, IsActive, CreatedDate)
    VALUES ('Editor', 'Content editors for marquee and announcements', 1, GETDATE());
    PRINT 'Editor role created';
    
    -- Get the new Editor role ID
    DECLARE @editorRoleId INT;
    SELECT @editorRoleId = RoleID FROM Roles WHERE RoleName = 'Editor';
    
    -- Assign MARQUEE_EDIT permission to Editor role
    DECLARE @marqueePermId2 INT;
    SELECT @marqueePermId2 = PermissionID FROM Permissions WHERE PermissionName = 'MARQUEE_EDIT';
    
    INSERT INTO RolePermissions (RoleID, PermissionID, GrantedDate)
    VALUES (@editorRoleId, @marqueePermId2, GETDATE());
    PRINT 'MARQUEE_EDIT permission assigned to Editor role';
END
ELSE
BEGIN
    PRINT 'Editor role already exists';
END

PRINT 'Migration completed successfully!';
