import jwt from 'jsonwebtoken';
import sql from 'mssql';
import { getPool } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dib-pmsf-secret-key-2026';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Middleware to check if user has specific role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRoles = req.user.roles || [];
    const hasRole = roles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

// Middleware to check if user has specific permission
const requirePermission = (permissionName) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const pool = await getPool();
      // Check if user has the required permission through their roles
      const result = await pool.request()
        .input('userId', sql.Int, req.user.userId)
        .input('permissionName', sql.NVarChar(50), permissionName)
        .query(`
          SELECT COUNT(*) as hasPermission
          FROM UserRoles ur
          INNER JOIN RolePermissions rp ON ur.RoleID = rp.RoleID
          INNER JOIN Permissions p ON rp.PermissionID = p.PermissionID
          WHERE ur.UserID = @userId 
            AND p.PermissionName = @permissionName 
            AND p.IsActive = 1
        `);

      if (result.recordset[0].hasPermission === 0) {
        return res.status(403).json({ 
          error: 'Access denied. Permission required: ' + permissionName 
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

export {
  authenticateToken,
  requireRole,
  requirePermission
};
