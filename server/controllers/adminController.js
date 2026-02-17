import bcrypt from 'bcrypt';
import sql from 'mssql';
import { getPool } from '../config/database.js';

const SALT_ROUNDS = 10;

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT 
          u.UserID,
          u.Username,
          u.Email,
          u.FullName,
          u.IsActive,
          u.CreatedDate,
          u.LastLoginDate,
          u.FailedLoginAttempts,
          u.AccountLockedUntil,
          STRING_AGG(r.RoleName, ', ') as Roles
        FROM UserLogins u
        LEFT JOIN UserRoles ur ON u.UserID = ur.UserID
        LEFT JOIN Roles r ON ur.RoleID = r.RoleID AND r.IsActive = 1
        GROUP BY u.UserID, u.Username, u.Email, u.FullName, u.IsActive, 
                 u.CreatedDate, u.LastLoginDate, u.FailedLoginAttempts, u.AccountLockedUntil
        ORDER BY u.CreatedDate DESC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Create new user
const createUser = async (req, res) => {
  const { username, password, email, fullName, roleIds } = req.body;
  
  try {
    const pool = await getPool();
    // Check if username already exists
    const checkResult = await pool.request()
      .input('username', sql.NVarChar(50), username)
      .query('SELECT UserID FROM UserLogins WHERE Username = @username');
    
    if (checkResult.recordset.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Insert user
    const transaction = pool.transaction();
    await transaction.begin();
    
    try {
      const userResult = await transaction.request()
        .input('username', sql.NVarChar(50), username)
        .input('passwordHash', sql.VarBinary(256), Buffer.from(passwordHash))
        .input('email', sql.NVarChar(100), email)
        .input('fullName', sql.NVarChar(100), fullName)
        .query(`
          INSERT INTO UserLogins (Username, PasswordHash, Email, FullName, IsActive, FailedLoginAttempts)
          OUTPUT INSERTED.UserID
          VALUES (@username, @passwordHash, @email, @fullName, 1, 0)
        `);
      
      const newUserId = userResult.recordset[0].UserID;
      
      // Assign roles
      if (roleIds && roleIds.length > 0) {
        for (const roleId of roleIds) {
          await transaction.request()
            .input('userId', sql.Int, newUserId)
            .input('roleId', sql.Int, roleId)
            .input('assignedBy', sql.Int, req.user.userId)
            .query(`
              INSERT INTO UserRoles (UserID, RoleID, AssignedDate, AssignedBy)
              VALUES (@userId, @roleId, GETDATE(), @assignedBy)
            `);
        }
      }
      
      await transaction.commit();
      
      res.status(201).json({ 
        success: true, 
        message: 'User created successfully',
        userId: newUserId
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// Update user
const updateUser = async (req, res) => {
  const { userId } = req.params;
  const { email, fullName, isActive, roleIds } = req.body;
  
  try {
    const pool = await getPool();
    const transaction = pool.transaction();
    await transaction.begin();
    
    try {
      // Update user info
      await transaction.request()
        .input('userId', sql.Int, userId)
        .input('email', sql.NVarChar(100), email)
        .input('fullName', sql.NVarChar(100), fullName)
        .input('isActive', sql.Bit, isActive)
        .query(`
          UPDATE UserLogins
          SET Email = @email,
              FullName = @fullName,
              IsActive = @isActive
          WHERE UserID = @userId
        `);
      
      // Update roles
      if (roleIds !== undefined) {
        // Remove existing roles
        await transaction.request()
          .input('userId', sql.Int, userId)
          .query('DELETE FROM UserRoles WHERE UserID = @userId');
        
        // Add new roles
        if (roleIds && roleIds.length > 0) {
          for (const roleId of roleIds) {
            await transaction.request()
              .input('userId', sql.Int, userId)
              .input('roleId', sql.Int, roleId)
              .input('assignedBy', sql.Int, req.user.userId)
              .query(`
                INSERT INTO UserRoles (UserID, RoleID, AssignedDate, AssignedBy)
                VALUES (@userId, @roleId, GETDATE(), @assignedBy)
              `);
          }
        }
      }
      
      await transaction.commit();
      
      res.json({ 
        success: true, 
        message: 'User updated successfully'
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Reset user password (admin)
const resetPassword = async (req, res) => {
  const { userId } = req.params;
  const { newPassword } = req.body;
  
  try {
    const pool = await getPool();
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('passwordHash', sql.VarBinary(256), Buffer.from(passwordHash))
      .query(`
        UPDATE UserLogins
        SET PasswordHash = @passwordHash,
            LastPasswordChangeDate = GETDATE(),
            FailedLoginAttempts = 0,
            AccountLockedUntil = NULL
        WHERE UserID = @userId
      `);
    
    res.json({ 
      success: true, 
      message: 'Password reset successfully'
    });
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

// Unlock user account
const unlockAccount = async (req, res) => {
  const { userId } = req.params;
  
  try {
    const pool = await getPool();
    await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE UserLogins
        SET FailedLoginAttempts = 0,
            AccountLockedUntil = NULL
        WHERE UserID = @userId
      `);
    
    res.json({ 
      success: true, 
      message: 'Account unlocked successfully'
    });
    
  } catch (error) {
    console.error('Unlock account error:', error);
    res.status(500).json({ error: 'Failed to unlock account' });
  }
};

// Get all roles
const getAllRoles = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT 
          r.RoleID,
          r.RoleName,
          r.Description,
          r.IsActive,
          r.CreatedDate,
          COUNT(ur.UserID) as UserCount,
          COUNT(rp.PermissionID) as PermissionCount
        FROM Roles r
        LEFT JOIN UserRoles ur ON r.RoleID = ur.RoleID
        LEFT JOIN RolePermissions rp ON r.RoleID = rp.RoleID
        GROUP BY r.RoleID, r.RoleName, r.Description, r.IsActive, r.CreatedDate
        ORDER BY r.RoleName
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Get all roles error:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
};

// Create role
const createRole = async (req, res) => {
  const { roleName, description, permissionIds } = req.body;
  
  try {
    const pool = await getPool();
    const transaction = pool.transaction();
    await transaction.begin();
    
    try {
      // Insert role
      const roleResult = await transaction.request()
        .input('roleName', sql.NVarChar(50), roleName)
        .input('description', sql.NVarChar(200), description)
        .query(`
          INSERT INTO Roles (RoleName, Description, IsActive, CreatedDate)
          OUTPUT INSERTED.RoleID
          VALUES (@roleName, @description, 1, GETDATE())
        `);
      
      const newRoleId = roleResult.recordset[0].RoleID;
      
      // Assign permissions
      if (permissionIds && permissionIds.length > 0) {
        for (const permissionId of permissionIds) {
          await transaction.request()
            .input('roleId', sql.Int, newRoleId)
            .input('permissionId', sql.Int, permissionId)
            .query(`
              INSERT INTO RolePermissions (RoleID, PermissionID, GrantedDate)
              VALUES (@roleId, @permissionId, GETDATE())
            `);
        }
      }
      
      await transaction.commit();
      
      res.status(201).json({ 
        success: true, 
        message: 'Role created successfully',
        roleId: newRoleId
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
};

// Update role
const updateRole = async (req, res) => {
  const { roleId } = req.params;
  const { roleName, description, isActive, permissionIds } = req.body;
  
  console.log('Updating role:', { roleId, roleName, description, isActive, permissionIds });
  
  try {
    const pool = await getPool();
    const transaction = pool.transaction();
    await transaction.begin();
    
    try {
      // Update role
      await transaction.request()
        .input('roleId', sql.Int, roleId)
        .input('roleName', sql.NVarChar(50), roleName)
        .input('description', sql.NVarChar(200), description)
        .input('isActive', sql.Bit, isActive)
        .query(`
          UPDATE Roles
          SET RoleName = @roleName,
              Description = @description,
              IsActive = @isActive
          WHERE RoleID = @roleId
        `);
      
      // Update permissions
      if (permissionIds !== undefined) {
        // Remove existing permissions
        await transaction.request()
          .input('roleId', sql.Int, roleId)
          .query('DELETE FROM RolePermissions WHERE RoleID = @roleId');
        
        // Add new permissions
        if (permissionIds && permissionIds.length > 0) {
          for (const permissionId of permissionIds) {
            await transaction.request()
              .input('roleId', sql.Int, roleId)
              .input('permissionId', sql.Int, permissionId)
              .query(`
                INSERT INTO RolePermissions (RoleID, PermissionID, GrantedDate)
                VALUES (@roleId, @permissionId, GETDATE())
              `);
          }
        }
      }
      
      await transaction.commit();
      
      res.json({ 
        success: true, 
        message: 'Role updated successfully'
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
};

// Get all permissions
const getAllPermissions = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT 
          PermissionID,
          PermissionName,
          ComponentName,
          Description,
          IsActive
        FROM Permissions
        ORDER BY ComponentName, PermissionName
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Get all permissions error:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
};

// Get role permissions
const getRolePermissions = async (req, res) => {
  const { roleId } = req.params;
  
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('roleId', sql.Int, roleId)
      .query(`
        SELECT p.PermissionID
        FROM RolePermissions rp
        INNER JOIN Permissions p ON rp.PermissionID = p.PermissionID
        WHERE rp.RoleID = @roleId AND p.IsActive = 1
      `);
    
    res.json(result.recordset.map(r => r.PermissionID));
  } catch (error) {
    console.error('Get role permissions error:', error);
    res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
};

// Get login audit logs
const getLoginAuditLogs = async (req, res) => {
  const { limit = 100, userId } = req.query;
  
  try {
    const pool = await getPool();
    const request = pool.request()
      .input('limit', sql.Int, parseInt(limit));
    
    let query = `
      SELECT TOP (@limit)
        l.LogID,
        l.UserID,
        l.Username,
        l.LoginDateTime,
        l.LoginStatus,
        l.FailureReason,
        l.IPAddress,
        l.UserAgent
      FROM LoginAuditLog l
    `;
    
    if (userId) {
      query += ' WHERE l.UserID = @userId';
      request.input('userId', sql.Int, userId);
    }
    
    query += ' ORDER BY l.LoginDateTime DESC';
    
    const result = await request.query(query);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Get login audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

export {
  getAllUsers,
  createUser,
  updateUser,
  resetPassword,
  unlockAccount,
  getAllRoles,
  createRole,
  updateRole,
  getAllPermissions,
  getRolePermissions,
  getLoginAuditLogs
};
