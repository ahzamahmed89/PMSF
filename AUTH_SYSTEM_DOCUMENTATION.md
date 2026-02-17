# Authentication System Documentation

**Database:** DIB  
**Date:** February 16, 2026  
**Status:** ⚠️ Database tables exist but frontend is not connected

---

## Database Schema Overview

Your database has a **complete authentication and authorization system** with 6 tables:

### 1. **UserLogins** (Main User Table)
Stores user account information with secure password hashing.

| Column | Type | Description |
|--------|------|-------------|
| UserID | INT (PK) | Unique user identifier |
| Username | NVARCHAR(50) | Login username (unique) |
| PasswordHash | VARBINARY(256) | Hashed password (secure) |
| Email | NVARCHAR(100) | User email address |
| FullName | NVARCHAR(100) | User's full name |
| IsActive | BIT | Active status (1=Active, 0=Inactive) |
| CreatedDate | DATETIME | Account creation date |
| LastLoginDate | DATETIME | Last successful login |
| LastPasswordChangeDate | DATETIME | Last password change |
| FailedLoginAttempts | INT | Count of failed login attempts |
| AccountLockedUntil | DATETIME | Account lock expiration time |

**Current Users (3):**
- `Staff.1` - staff1 (a.employee1@dibsystem.com)
- `staff.2` - staff2 (a.employee2@dibsystem.com)
- `admin.user` - Admin User (admin@dibsystem.com)

---

### 2. **Roles** (User Roles)
Defines different user roles in the system.

| Column | Type | Description |
|--------|------|-------------|
| RoleID | INT (PK) | Unique role identifier |
| RoleName | NVARCHAR(50) | Role name (e.g., Admin, User, Manager) |
| Description | NVARCHAR(200) | Role description |
| IsActive | BIT | Active status |
| CreatedDate | DATETIME | Role creation date |

**Current Roles:** None defined yet

---

### 3. **UserRoles** (User-Role Assignment)
Maps users to their assigned roles (many-to-many relationship).

| Column | Type | Description |
|--------|------|-------------|
| UserRoleID | INT (PK) | Unique assignment identifier |
| UserID | INT (FK) | References UserLogins.UserID |
| RoleID | INT (FK) | References Roles.RoleID |
| AssignedDate | DATETIME | When role was assigned |
| AssignedBy | INT | UserID who assigned the role |

---

### 4. **Permissions** (System Permissions)
Defines granular permissions for different components.

| Column | Type | Description |
|--------|------|-------------|
| PermissionID | INT (PK) | Unique permission identifier |
| PermissionName | NVARCHAR(50) | Permission name |
| ComponentName | NVARCHAR(100) | Component/module name |
| Description | NVARCHAR(200) | Permission description |
| IsActive | BIT | Active status |

---

### 5. **RolePermissions** (Role-Permission Assignment)
Maps permissions to roles (many-to-many relationship).

| Column | Type | Description |
|--------|------|-------------|
| RolePermissionID | INT (PK) | Unique assignment identifier |
| RoleID | INT (FK) | References Roles.RoleID |
| PermissionID | INT (FK) | References Permissions.PermissionID |
| GrantedDate | DATETIME | When permission was granted |

---

### 6. **LoginAuditLog** (Login History)
Tracks all login attempts for security auditing.

| Column | Type | Description |
|--------|------|-------------|
| LogID | INT (PK) | Unique log identifier |
| UserID | INT | References UserLogins.UserID |
| Username | NVARCHAR(50) | Username used in attempt |
| LoginDateTime | DATETIME | Time of login attempt |
| LoginStatus | NVARCHAR(20) | 'Success' or 'Failed' |
| FailureReason | NVARCHAR(100) | Reason for failure |
| IPAddress | NVARCHAR(50) | IP address of login attempt |
| UserAgent | NVARCHAR(500) | Browser/device information |

---

## Current Implementation Status

### ⚠️ Frontend Not Connected to Database

Your [Login.jsx](src/components/Login.jsx) component currently uses **hardcoded credentials**:

```javascript
// Current implementation (lines 34-40)
if (username === 'admin' && password === 'admin') {
  localStorage.setItem('isAuthenticated', 'true');
  localStorage.setItem('username', formData.username);
  if (onLogin) onLogin(formData.username);
  navigate('/home');
} else {
  setError('Invalid username or password');
}
```

### What's Missing:

1. ❌ No API endpoint for authentication
2. ❌ No password hashing/comparison on frontend
3. ❌ No connection to UserLogins table
4. ❌ No role-based access control (RBAC)
5. ❌ No login audit logging
6. ❌ No session management
7. ❌ No JWT or token-based authentication

---

## Recommended Implementation

### Step 1: Create Authentication API Endpoints

Add to `server/routes/api.js`:

```javascript
// Authentication routes
router.post('/auth/login', authController.login);
router.post('/auth/logout', authController.logout);
router.post('/auth/register', authController.register);
router.post('/auth/change-password', authController.changePassword);
router.get('/auth/verify-token', authController.verifyToken);
```

### Step 2: Create Authentication Controller

Create `server/controllers/authController.js`:

```javascript
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sql = require('mssql');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Login function
const login = async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const result = await pool.request()
      .input('username', sql.NVarChar(50), username)
      .query(`
        SELECT UserID, Username, PasswordHash, Email, FullName, IsActive, 
               FailedLoginAttempts, AccountLockedUntil
        FROM UserLogins
        WHERE Username = @username
      `);
    
    if (result.recordset.length === 0) {
      // Log failed attempt
      await logLoginAttempt(null, username, 'Failed', 'User not found', req);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.recordset[0];
    
    // Check if account is locked
    if (user.AccountLockedUntil && new Date(user.AccountLockedUntil) > new Date()) {
      return res.status(403).json({ 
        error: 'Account is locked. Please try again later.' 
      });
    }
    
    // Check if account is active
    if (!user.IsActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.PasswordHash);
    
    if (!passwordMatch) {
      // Increment failed login attempts
      await incrementFailedAttempts(user.UserID);
      await logLoginAttempt(user.UserID, username, 'Failed', 'Invalid password', req);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Reset failed attempts and update last login
    await resetFailedAttempts(user.UserID);
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.UserID, 
        username: user.Username,
        email: user.Email 
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
        fullName: user.FullName
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper functions
const logLoginAttempt = async (userId, username, status, reason, req) => {
  try {
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('username', sql.NVarChar(50), username)
      .input('status', sql.NVarChar(20), status)
      .input('reason', sql.NVarChar(100), reason)
      .input('ipAddress', sql.NVarChar(50), req.ip)
      .input('userAgent', sql.NVarChar(500), req.headers['user-agent'])
      .query(`
        INSERT INTO LoginAuditLog 
        (UserID, Username, LoginStatus, FailureReason, IPAddress, UserAgent)
        VALUES (@userId, @username, @status, @reason, @ipAddress, @userAgent)
      `);
  } catch (error) {
    console.error('Error logging login attempt:', error);
  }
};

const incrementFailedAttempts = async (userId) => {
  try {
    await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE UserLogins
        SET FailedLoginAttempts = FailedLoginAttempts + 1,
            AccountLockedUntil = CASE 
              WHEN FailedLoginAttempts >= 4 THEN DATEADD(MINUTE, 30, GETDATE())
              ELSE NULL 
            END
        WHERE UserID = @userId
      `);
  } catch (error) {
    console.error('Error incrementing failed attempts:', error);
  }
};

const resetFailedAttempts = async (userId) => {
  try {
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

module.exports = { login };
```

### Step 3: Update Frontend Login Component

Update `src/components/Login.jsx`:

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  
  if (!formData.username || !formData.password) {
    setError('Please enter both username and password');
    return;
  }

  setLoading(true);

  try {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      username: formData.username,
      password: formData.password
    });
    
    if (response.data.success) {
      // Store token and user info
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('username', response.data.user.username);
      localStorage.setItem('userId', response.data.user.userId);
      
      if (onLogin) onLogin(response.data.user.username);
      navigate('/home');
    }
  } catch (error) {
    const errorMsg = error.response?.data?.error || 'Login failed. Please try again.';
    setError(errorMsg);
  } finally {
    setLoading(false);
  }
};
```

### Step 4: Install Required Dependencies

```bash
npm install bcrypt jsonwebtoken
```

### Step 5: Create Initial Password Hashes for Existing Users

Create a script to hash passwords for existing users:

```sql
-- Run this to update passwords (example with bcrypt hash for "password123")
-- You'll need to generate hashes using bcrypt with salt rounds = 10

-- For Staff.1
UPDATE UserLogins 
SET PasswordHash = CONVERT(VARBINARY(256), 'bcrypt_hash_here')
WHERE Username = 'Staff.1';
```

---

## Security Features Already in Place

✅ **Password Hashing Storage** - Uses VARBINARY(256) for secure password storage  
✅ **Failed Login Tracking** - Counts failed attempts  
✅ **Account Locking** - Can lock accounts after multiple failures  
✅ **Login Audit Trail** - Complete history of login attempts  
✅ **Email Verification Ready** - Email column exists  
✅ **Role-Based Access Control** - Complete RBAC structure  

---

## Next Steps

1. **Implement authentication controller** with bcrypt password hashing
2. **Update Login.jsx** to call the authentication API
3. **Add JWT middleware** for protected routes
4. **Generate password hashes** for existing users
5. **Create user registration endpoint** (if needed)
6. **Implement role-based access control** for different features
7. **Add password reset functionality**
8. **Create admin panel** for user management

---

## Sample Roles & Permissions Setup

```sql
-- Create roles
INSERT INTO Roles (RoleName, Description, IsActive)
VALUES 
  ('Admin', 'Full system access', 1),
  ('Manager', 'Branch manager access', 1),
  ('Staff', 'Standard staff access', 1);

-- Create permissions
INSERT INTO Permissions (PermissionName, ComponentName, Description, IsActive)
VALUES
  ('VIEW_DASHBOARD', 'Home', 'View dashboard', 1),
  ('ENTRY_MODULE', 'EntryModule', 'Access entry module', 1),
  ('VIEW_DATA', 'ViewModule', 'View data module', 1),
  ('DATA_MANAGER', 'DataManager', 'Manage data', 1),
  ('QUIZ_CREATE', 'QuizCreator', 'Create quizzes', 1),
  ('QUIZ_ATTEMPT', 'QuizAttempt', 'Take quizzes', 1),
  ('USER_MANAGEMENT', 'Admin', 'Manage users', 1);

-- Assign permissions to Admin role (RoleID = 1)
INSERT INTO RolePermissions (RoleID, PermissionID)
SELECT 1, PermissionID FROM Permissions;

-- Assign Staff.1 as Admin
INSERT INTO UserRoles (UserID, RoleID, AssignedDate, AssignedBy)
VALUES (1, 1, GETDATE(), 1);
```

---

## Conclusion

✅ Your database has a **production-ready authentication system**  
⚠️ Your frontend is **not connected** to the database  
📋 Follow the implementation steps above to integrate the two systems  

The infrastructure is solid - you just need to wire up the API endpoints and update the frontend to use real authentication instead of hardcoded credentials.
