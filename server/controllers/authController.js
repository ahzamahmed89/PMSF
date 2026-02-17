import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import sql from 'mssql';
import { getPool } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dib-pmsf-secret-key-2026';
const SALT_ROUNDS = 10;

// Login function
const login = async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('username', sql.NVarChar(50), username)
      .query(`
        SELECT UserID, Username, PasswordHash, Email, FullName, IsActive, 
               FailedLoginAttempts, AccountLockedUntil
        FROM UserLogins
        WHERE Username = @username
      `);
    
    if (result.recordset.length === 0) {
      await logLoginAttempt(null, username, 'Failed', 'User not found', req);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.recordset[0];
    
    // Convert PasswordHash from Buffer to string if needed
    const passwordHash = user.PasswordHash instanceof Buffer 
      ? user.PasswordHash.toString('utf8') 
      : user.PasswordHash;
    
    // Check if account is locked
    if (user.AccountLockedUntil && new Date(user.AccountLockedUntil) > new Date()) {
      const lockTimeRemaining = Math.ceil((new Date(user.AccountLockedUntil) - new Date()) / 60000);
      return res.status(403).json({ 
        error: `Account is locked. Please try again after ${lockTimeRemaining} minutes.` 
      });
    }
    
    // Check if account is active
    if (!user.IsActive) {
      return res.status(403).json({ error: 'Account is deactivated. Contact administrator.' });
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, passwordHash);
    
    if (!passwordMatch) {
      await incrementFailedAttempts(user.UserID);
      await logLoginAttempt(user.UserID, username, 'Failed', 'Invalid password', req);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Get user roles
    const rolesResult = await pool.request()
      .input('userId', sql.Int, user.UserID)
      .query(`
        SELECT r.RoleID, r.RoleName
        FROM UserRoles ur
        INNER JOIN Roles r ON ur.RoleID = r.RoleID
        WHERE ur.UserID = @userId AND r.IsActive = 1
      `);
    
    const roles = rolesResult.recordset.map(r => r.RoleName);
    
    // Get user permissions
    const permissionsResult = await pool.request()
      .input('userId', sql.Int, user.UserID)
      .query(`
        SELECT DISTINCT p.PermissionName
        FROM UserRoles ur
        INNER JOIN RolePermissions rp ON ur.RoleID = rp.RoleID
        INNER JOIN Permissions p ON rp.PermissionID = p.PermissionID
        INNER JOIN Roles r ON ur.RoleID = r.RoleID
        WHERE ur.UserID = @userId AND r.IsActive = 1 AND p.IsActive = 1
      `);
    
    const permissions = permissionsResult.recordset.map(p => p.PermissionName);
    
    // Reset failed attempts and update last login
    await resetFailedAttempts(user.UserID);
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.UserID, 
        username: user.Username,
        email: user.Email,
        roles: roles
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    // Log successful login
    await logLoginAttempt(user.UserID, username, 'Success', null, req);
    
    res.json({
      success: true,
      token,
      user: {
        userId: user.UserID,
        username: user.Username,
        email: user.Email,
        fullName: user.FullName,
        roles: roles,
        permissions: permissions
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify token
const verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user still exists and is active
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, decoded.userId)
      .query(`
        SELECT UserID, Username, Email, FullName, IsActive
        FROM UserLogins
        WHERE UserID = @userId AND IsActive = 1
      `);
    
    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    
    const user = result.recordset[0];
    
    // Fetch fresh roles from database
    const rolesResult = await pool.request()
      .input('userId', sql.Int, decoded.userId)
      .query(`
        SELECT r.RoleID, r.RoleName
        FROM UserRoles ur
        INNER JOIN Roles r ON ur.RoleID = r.RoleID
        WHERE ur.UserID = @userId AND r.IsActive = 1
      `);
    
    const roles = rolesResult.recordset.map(r => r.RoleName);
    
    // Get user permissions
    const permissionsResult = await pool.request()
      .input('userId', sql.Int, decoded.userId)
      .query(`
        SELECT DISTINCT p.PermissionName
        FROM UserRoles ur
        INNER JOIN RolePermissions rp ON ur.RoleID = rp.RoleID
        INNER JOIN Permissions p ON rp.PermissionID = p.PermissionID
        INNER JOIN Roles r ON ur.RoleID = r.RoleID
        WHERE ur.UserID = @userId AND r.IsActive = 1 AND p.IsActive = 1
      `);
    
    const permissions = permissionsResult.recordset.map(p => p.PermissionName);
    
    res.json({ 
      success: true, 
      user: {
        userId: user.UserID,
        username: user.Username,
        email: user.Email,
        fullName: user.FullName,
        roles: roles,
        permissions: permissions
      }
    });
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Change password
const changePassword = async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  
  try {
    // Get current password hash
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT PasswordHash
        FROM UserLogins
        WHERE UserID = @userId
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, result.recordset[0].PasswordHash);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    // Update password
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('passwordHash', sql.VarBinary(256), Buffer.from(newPasswordHash))
      .query(`
        UPDATE UserLogins
        SET PasswordHash = @passwordHash,
            LastPasswordChangeDate = GETDATE()
        WHERE UserID = @userId
      `);
    
    res.json({ success: true, message: 'Password changed successfully' });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Register new user (admin only)
const register = async (req, res) => {
  const { username, password, email, fullName } = req.body;
  
  try {
    const pool = await getPool();
    // Check if username already exists
    const checkResult = await pool.request()
      .input('username', sql.NVarChar(50), username)
      .query(`
        SELECT UserID FROM UserLogins WHERE Username = @username
      `);
    
    if (checkResult.recordset.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Insert new user
    const result = await pool.request()
      .input('username', sql.NVarChar(50), username)
      .input('passwordHash', sql.VarBinary(256), Buffer.from(passwordHash))
      .input('email', sql.NVarChar(100), email)
      .input('fullName', sql.NVarChar(100), fullName)
      .query(`
        INSERT INTO UserLogins (Username, PasswordHash, Email, FullName, IsActive, FailedLoginAttempts)
        OUTPUT INSERTED.UserID
        VALUES (@username, @passwordHash, @email, @fullName, 1, 0)
      `);
    
    const newUserId = result.recordset[0].UserID;
    
    res.status(201).json({ 
      success: true, 
      message: 'User registered successfully',
      userId: newUserId
    });
    
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper functions
const logLoginAttempt = async (userId, username, status, reason, req) => {
  try {
    const pool = await getPool();
    const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('username', sql.NVarChar(50), username)
      .input('status', sql.NVarChar(20), status)
      .input('reason', sql.NVarChar(100), reason)
      .input('ipAddress', sql.NVarChar(50), ipAddress.substring(0, 50))
      .input('userAgent', sql.NVarChar(500), userAgent.substring(0, 500))
      .query(`
        INSERT INTO LoginAuditLog 
        (UserID, Username, LoginStatus, FailureReason, IPAddress, UserAgent, LoginDateTime)
        VALUES (@userId, @username, @status, @reason, @ipAddress, @userAgent, GETDATE())
      `);
  } catch (error) {
    console.error('Error logging login attempt:', error);
  }
};

const incrementFailedAttempts = async (userId) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE UserLogins
        SET FailedLoginAttempts = FailedLoginAttempts + 1,
            AccountLockedUntil = CASE 
              WHEN FailedLoginAttempts >= 4 THEN DATEADD(MINUTE, 30, GETDATE())
              ELSE AccountLockedUntil
            END
        WHERE UserID = @userId
      `);
  } catch (error) {
    console.error('Error incrementing failed attempts:', error);
  }
};

const resetFailedAttempts = async (userId) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE UserLogins
        SET FailedLoginAttempts = 0,
            AccountLockedUntil = NULL,
            LastLoginDate = GETDATE()
        WHERE UserID = @userId
      `);
  } catch (error) {
    console.error('Error resetting failed attempts:', error);
  }
};

export {
  login,
  verifyToken,
  changePassword,
  register
};
