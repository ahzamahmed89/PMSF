-- ============================================
-- Authentication System Setup
-- Initial Roles, Permissions, and User Configuration
-- ============================================

USE DIB;
GO

-- ============================================
-- STEP 1: Create Roles
-- ============================================

-- Check if roles exist, if not create them
IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'Admin')
BEGIN
    INSERT INTO Roles (RoleName, Description, IsActive, CreatedDate)
    VALUES ('Admin', 'Full system access and administration', 1, GETDATE());
    PRINT 'Admin role created';
END
ELSE
BEGIN
    PRINT 'Admin role already exists';
END

IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'Manager')
BEGIN
    INSERT INTO Roles (RoleName, Description, IsActive, CreatedDate)
    VALUES ('Manager', 'Branch manager access with reporting', 1, GETDATE());
    PRINT 'Manager role created';
END
ELSE
BEGIN
    PRINT 'Manager role already exists';
END

IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'Staff')
BEGIN
    INSERT INTO Roles (RoleName, Description, IsActive, CreatedDate)
    VALUES ('Staff', 'Standard staff member access', 1, GETDATE());
    PRINT 'Staff role created';
END
ELSE
BEGIN
    PRINT 'Staff role already exists';
END

-- ============================================
-- STEP 2: Create Permissions
-- ============================================

-- Define all system permissions
DECLARE @permissions TABLE (
    PermissionName NVARCHAR(50),
    ComponentName NVARCHAR(100),
    Description NVARCHAR(200)
);

INSERT INTO @permissions VALUES
    ('VIEW_DASHBOARD', 'Home', 'Access home dashboard'),
    ('ENTRY_MODULE', 'EntryModule', 'Access PMSF entry module'),
    ('VIEW_DATA', 'ViewModule', 'View PMSF data'),
    ('DATA_MANAGER', 'DataManager', 'Manage PMSF master data'),
    ('QUIZ_CREATE', 'QuizCreator', 'Create and edit quizzes'),
    ('QUIZ_ATTEMPT', 'QuizAttempt', 'Take quizzes'),
    ('QUIZ_VIEW_STATS', 'QuizStats', 'View quiz statistics'),
    ('USER_MANAGEMENT', 'AdminPanel', 'Manage users and accounts'),
    ('ROLE_MANAGEMENT', 'AdminPanel', 'Manage roles and permissions'),
    ('AUDIT_LOGS', 'AdminPanel', 'View audit logs');

-- Insert permissions if they don't exist
DECLARE @permName NVARCHAR(50), @compName NVARCHAR(100), @permDesc NVARCHAR(200);

DECLARE perm_cursor CURSOR FOR SELECT PermissionName, ComponentName, Description FROM @permissions;
OPEN perm_cursor;

FETCH NEXT FROM perm_cursor INTO @permName, @compName, @permDesc;

WHILE @@FETCH_STATUS = 0
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionName = @permName)
    BEGIN
        INSERT INTO Permissions (PermissionName, ComponentName, Description, IsActive)
        VALUES (@permName, @compName, @permDesc, 1);
        PRINT 'Permission created: ' + @permName;
    END
    ELSE
    BEGIN
        PRINT 'Permission already exists: ' + @permName;
    END
    
    FETCH NEXT FROM perm_cursor INTO @permName, @compName, @permDesc;
END

CLOSE perm_cursor;
DEALLOCATE perm_cursor;

-- ============================================
-- STEP 3: Assign Permissions to Roles
-- ============================================

-- Get role IDs
DECLARE @adminRoleId INT, @managerRoleId INT, @staffRoleId INT;

SELECT @adminRoleId = RoleID FROM Roles WHERE RoleName = 'Admin';
SELECT @managerRoleId = RoleID FROM Roles WHERE RoleName = 'Manager';
SELECT @staffRoleId = RoleID FROM Roles WHERE RoleName = 'Staff';

-- Admin gets all permissions
INSERT INTO RolePermissions (RoleID, PermissionID, GrantedDate)
SELECT @adminRoleId, PermissionID, GETDATE()
FROM Permissions
WHERE NOT EXISTS (
    SELECT 1 FROM RolePermissions 
    WHERE RoleID = @adminRoleId AND PermissionID = Permissions.PermissionID
);
PRINT 'Admin permissions assigned';

-- Manager gets most permissions except user/role management
INSERT INTO RolePermissions (RoleID, PermissionID, GrantedDate)
SELECT @managerRoleId, PermissionID, GETDATE()
FROM Permissions
WHERE PermissionName NOT IN ('USER_MANAGEMENT', 'ROLE_MANAGEMENT')
AND NOT EXISTS (
    SELECT 1 FROM RolePermissions 
    WHERE RoleID = @managerRoleId AND PermissionID = Permissions.PermissionID
);
PRINT 'Manager permissions assigned';

-- Staff gets basic permissions
INSERT INTO RolePermissions (RoleID, PermissionID, GrantedDate)
SELECT @staffRoleId, PermissionID, GETDATE()
FROM Permissions
WHERE PermissionName IN ('VIEW_DASHBOARD', 'ENTRY_MODULE', 'VIEW_DATA', 'QUIZ_ATTEMPT')
AND NOT EXISTS (
    SELECT 1 FROM RolePermissions 
    WHERE RoleID = @staffRoleId AND PermissionID = Permissions.PermissionID
);
PRINT 'Staff permissions assigned';

-- ============================================
-- STEP 4: Assign Roles to Users
-- ============================================

-- Assign admin.user as Admin
IF NOT EXISTS (
    SELECT 1 FROM UserRoles ur
    INNER JOIN UserLogins u ON ur.UserID = u.UserID
    WHERE u.Username = 'admin.user' AND ur.RoleID = @adminRoleId
)
BEGIN
    INSERT INTO UserRoles (UserID, RoleID, AssignedDate, AssignedBy)
    SELECT UserID, @adminRoleId, GETDATE(), NULL
    FROM UserLogins
    WHERE Username = 'admin.user';
    PRINT 'Admin role assigned to admin.user';
END
ELSE
BEGIN
    PRINT 'admin.user already has Admin role';
END

-- Assign Staff.1 as Staff
IF NOT EXISTS (
    SELECT 1 FROM UserRoles ur
    INNER JOIN UserLogins u ON ur.UserID = u.UserID
    WHERE u.Username = 'Staff.1' AND ur.RoleID = @staffRoleId
)
BEGIN
    INSERT INTO UserRoles (UserID, RoleID, AssignedDate, AssignedBy)
    SELECT UserID, @staffRoleId, GETDATE(), NULL
    FROM UserLogins
    WHERE Username = 'Staff.1';
    PRINT 'Staff role assigned to Staff.1';
END
ELSE
BEGIN
    PRINT 'Staff.1 already has Staff role';
END

-- Assign staff.2 as Staff
IF NOT EXISTS (
    SELECT 1 FROM UserRoles ur
    INNER JOIN UserLogins u ON ur.UserID = u.UserID
    WHERE u.Username = 'staff.2' AND ur.RoleID = @staffRoleId
)
BEGIN
    INSERT INTO UserRoles (UserID, RoleID, AssignedDate, AssignedBy)
    SELECT UserID, @staffRoleId, GETDATE(), NULL
    FROM UserLogins
    WHERE Username = 'staff.2';
    PRINT 'Staff role assigned to staff.2';
END
ELSE
BEGIN
    PRINT 'staff.2 already has Staff role';
END

-- ============================================
-- STEP 5: Verification Queries
-- ============================================

PRINT '';
PRINT '============================================';
PRINT 'Setup completed! Verification:';
PRINT '============================================';

-- Show all roles
PRINT '';
PRINT 'Roles:';
SELECT RoleID, RoleName, Description, IsActive FROM Roles;

-- Show all permissions
PRINT '';
PRINT 'Permissions count:';
SELECT COUNT(*) as TotalPermissions FROM Permissions;

-- Show role permissions
PRINT '';
PRINT 'Role Permissions:';
SELECT 
    r.RoleName,
    COUNT(rp.PermissionID) as PermissionCount
FROM Roles r
LEFT JOIN RolePermissions rp ON r.RoleID = rp.RoleID
GROUP BY r.RoleName;

-- Show user roles
PRINT '';
PRINT 'User Roles:';
SELECT 
    u.Username,
    u.Email,
    STRING_AGG(r.RoleName, ', ') as Roles
FROM UserLogins u
LEFT JOIN UserRoles ur ON u.UserID = ur.UserID
LEFT JOIN Roles r ON ur.RoleID = r.RoleID
GROUP BY u.Username, u.Email;

PRINT '';
PRINT '============================================';
PRINT 'IMPORTANT: Update User Passwords';
PRINT '============================================';
PRINT 'You need to generate bcrypt password hashes and update the PasswordHash field.';
PRINT 'Run the Node.js password hash generator script to create secure password hashes.';
PRINT '';
PRINT 'Current user accounts:';
SELECT UserID, Username, Email, FullName, IsActive FROM UserLogins;

GO
