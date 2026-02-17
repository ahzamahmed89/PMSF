import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Button from './Button';
import FormInput from './FormInput';
import FormSelect from './FormSelect';
import Modal from './Modal';
import ErrorMessage from './ErrorMessage';
import LoadingSpinner from './LoadingSpinner';
import { API_URL } from '../config/api';
import '../styles/AdminPanel.css';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'roles', 'permissions', 'logs'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check if user is admin
  useEffect(() => {
    const roles = JSON.parse(localStorage.getItem('userRoles') || '[]');
    if (!roles.includes('Admin')) {
      navigate('/home');
    }
  }, [navigate]);

  // Refresh current user's session
  const refreshCurrentUserSession = async () => {
    try {
      const currentUserId = localStorage.getItem('userId');
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_URL}/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Update localStorage with fresh data
        localStorage.setItem('userRoles', JSON.stringify(response.data.user.roles));
        localStorage.setItem('userPermissions', JSON.stringify(response.data.user.permissions || []));
        localStorage.setItem('username', response.data.user.username);
        localStorage.setItem('userEmail', response.data.user.email);
        localStorage.setItem('userFullName', response.data.user.fullName);
      }
    } catch (error) {
      console.error('Auto-refresh error:', error);
    }
  };

  // Get auth headers
  const getAuthHeaders = () => ({
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    }
  });

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <Button onClick={() => navigate('/home')} variant="outline">
          Back to Home
        </Button>
      </div>

      <div className="admin-tabs">
        <button 
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button 
          className={`tab ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          Roles
        </button>
        <button 
          className={`tab ${activeTab === 'permissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          Permissions
        </button>
        <button 
          className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          Login Logs
        </button>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}
      {success && <ErrorMessage message={success} type="success" onDismiss={() => setSuccess('')} />}

      <div className="admin-content">
        {activeTab === 'users' && <UsersTab getAuthHeaders={getAuthHeaders} setError={setError} setSuccess={setSuccess} />}
        {activeTab === 'roles' && <RolesTab getAuthHeaders={getAuthHeaders} setError={setError} setSuccess={setSuccess} refreshCurrentUserSession={refreshCurrentUserSession} />}
        {activeTab === 'permissions' && <PermissionsTab getAuthHeaders={getAuthHeaders} setError={setError} setSuccess={setSuccess} />}
        {activeTab === 'logs' && <LogsTab getAuthHeaders={getAuthHeaders} setError={setError} />}
      </div>
    </div>
  );
};

// Users Tab Component
const UsersTab = ({ getAuthHeaders, setError, setSuccess }) => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    fullName: '',
    isActive: true,
    roleIds: []
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/admin/users`, getAuthHeaders());
      setUsers(response.data);
    } catch (error) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/roles`, getAuthHeaders());
      setRoles(response.data);
    } catch (error) {
      setError('Failed to fetch roles');
    }
  };

  const handleCreateUser = () => {
    setModalMode('create');
    setFormData({
      username: '',
      password: '',
      email: '',
      fullName: '',
      isActive: true,
      roleIds: []
    });
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({
      email: user.Email,
      fullName: user.FullName,
      isActive: user.IsActive,
      roleIds: [] // Will be fetched from user roles
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      const currentUserId = localStorage.getItem('userId');
      const isUpdatingSelf = selectedUser && selectedUser.UserID === parseInt(currentUserId);
      
      if (modalMode === 'create') {
        await axios.post(`${API_URL}/admin/users`, formData, getAuthHeaders());
        setSuccess('User created successfully');
      } else {
        await axios.put(`${API_URL}/admin/users/${selectedUser.UserID}`, formData, getAuthHeaders());
        setSuccess('User updated successfully');
        
        // If updating own roles, refresh session
        if (isUpdatingSelf) {
          await refreshCurrentUserSession();
        }
      }
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      setError(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleResetPassword = async (userId) => {
    const newPassword = prompt('Enter new password:');
    if (!newPassword) return;

    try {
      await axios.post(`${API_URL}/admin/users/${userId}/reset-password`, 
        { newPassword }, 
        getAuthHeaders()
      );
      setSuccess('Password reset successfully');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to reset password');
    }
  };

  const handleUnlockAccount = async (userId) => {
    try {
      await axios.post(`${API_URL}/admin/users/${userId}/unlock`, {}, getAuthHeaders());
      setSuccess('Account unlocked successfully');
      fetchUsers();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to unlock account');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="users-tab">
      <div className="tab-header">
        <h2>User Management</h2>
        <Button onClick={handleCreateUser} icon="➕">
          Create User
        </Button>
      </div>

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Roles</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Failed Attempts</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.UserID}>
                <td>{user.Username}</td>
                <td>{user.FullName}</td>
                <td>{user.Email}</td>
                <td>{user.Roles || 'None'}</td>
                <td>
                  <span className={`status ${user.IsActive ? 'active' : 'inactive'}`}>
                    {user.IsActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{user.LastLoginDate ? new Date(user.LastLoginDate).toLocaleString() : 'Never'}</td>
                <td>{user.FailedLoginAttempts}</td>
                <td>
                  <div className="action-buttons">
                    <Button size="small" onClick={() => handleEditUser(user)}>
                      Edit
                    </Button>
                    <Button size="small" variant="secondary" onClick={() => handleResetPassword(user.UserID)}>
                      Reset Password
                    </Button>
                    {user.AccountLockedUntil && new Date(user.AccountLockedUntil) > new Date() && (
                      <Button size="small" variant="warning" onClick={() => handleUnlockAccount(user.UserID)}>
                        Unlock
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalMode === 'create' ? 'Create User' : 'Edit User'}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {modalMode === 'create' ? 'Create' : 'Update'}
            </Button>
          </>
        }
      >
        <div className="form-container">
          {modalMode === 'create' && (
            <>
              <FormInput
                label="Username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
              <FormInput
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </>
          )}
          <FormInput
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <FormInput
            label="Full Name"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          />
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              Active
            </label>
          </div>
          <div className="form-group">
            <label>Roles</label>
            {roles.filter(role => role.IsActive).map(role => (
              <label key={role.RoleID}>
                <input
                  type="checkbox"
                  checked={formData.roleIds.includes(role.RoleID)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({ ...formData, roleIds: [...formData.roleIds, role.RoleID] });
                    } else {
                      setFormData({ ...formData, roleIds: formData.roleIds.filter(id => id !== role.RoleID) });
                    }
                  }}
                />
                {role.RoleName}
              </label>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Roles Tab Component
const RolesTab = ({ getAuthHeaders, setError, setSuccess, refreshCurrentUserSession }) => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({
    roleName: '',
    description: '',
    isActive: true,
    permissionIds: []
  });

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/admin/roles`, getAuthHeaders());
      setRoles(response.data);
    } catch (error) {
      setError('Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/permissions`, getAuthHeaders());
      setPermissions(response.data);
    } catch (error) {
      setError('Failed to fetch permissions');
    }
  };

  const handleCreateRole = () => {
    setModalMode('create');
    setFormData({
      roleName: '',
      description: '',
      isActive: true,
      permissionIds: []
    });
    setShowModal(true);
  };

  const handleEditRole = async (role) => {
    setModalMode('edit');
    setSelectedRole(role);
    
    try {
      const response = await axios.get(`${API_URL}/admin/roles/${role.RoleID}/permissions`, getAuthHeaders());
      setFormData({
        roleName: role.RoleName,
        description: role.Description,
        isActive: role.IsActive,
        permissionIds: response.data
      });
      setShowModal(true);
    } catch (error) {
      setError('Failed to fetch role permissions');
    }
  };

  const handleSubmit = async () => {
    try {
      const currentUserRoles = JSON.parse(localStorage.getItem('userRoles') || '[]');
      
      // Warn if deactivating a role the current user has
      if (modalMode === 'edit' && !formData.isActive && currentUserRoles.includes(selectedRole.RoleName)) {
        const confirmed = window.confirm(
          `Warning: You are about to deactivate the "${selectedRole.RoleName}" role which you currently have assigned. ` +
          `This will remove your access. Are you sure you want to continue?`
        );
        if (!confirmed) return;
      }
      
      console.log('Submitting role data:', formData);
      
      if (modalMode === 'create') {
        await axios.post(`${API_URL}/admin/roles`, formData, getAuthHeaders());
        setSuccess('Role created successfully');
      } else {
        await axios.put(`${API_URL}/admin/roles/${selectedRole.RoleID}`, formData, getAuthHeaders());
        setSuccess('Role updated successfully');
        
        // Refresh current user's session in case their role was modified
        await refreshCurrentUserSession();
      }
      setShowModal(false);
      fetchRoles();
    } catch (error) {
      console.error('Role update error:', error);
      setError(error.response?.data?.error || 'Operation failed');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="roles-tab">
      <div className="tab-header">
        <h2>Role Management</h2>
        <Button onClick={handleCreateRole} icon="➕">
          Create Role
        </Button>
      </div>

      <div className="roles-grid">
        {roles.map(role => (
          <div key={role.RoleID} className="role-card">
            <div className="role-header">
              <h3>{role.RoleName}</h3>
              <span className={`status ${role.IsActive ? 'active' : 'inactive'}`}>
                {role.IsActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p>{role.Description}</p>
            <div className="role-stats">
              <span>{role.UserCount} users</span>
              <span>{role.PermissionCount} permissions</span>
            </div>
            <Button size="small" onClick={() => handleEditRole(role)} fullWidth>
              Edit Role
            </Button>
          </div>
        ))}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalMode === 'create' ? 'Create Role' : 'Edit Role'}
        size="large"
        key={selectedRole?.RoleID || 'new'}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {modalMode === 'create' ? 'Create' : 'Update'}
            </Button>
          </>
        }
      >
        <div className="form-container">
          <FormInput
            label="Role Name"
            value={formData.roleName}
            onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
            required
          />
          <FormInput
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => {
                  console.log('Role checkbox clicked, new value:', e.target.checked);
                  setFormData({ ...formData, isActive: e.target.checked });
                }}
              />
              Active
            </label>
          </div>
          <div className="permissions-list">
            <h4>Permissions</h4>
            {permissions.map(permission => (
              <label key={permission.PermissionID} className="permission-item">
                <input
                  type="checkbox"
                  checked={formData.permissionIds.includes(permission.PermissionID)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({ ...formData, permissionIds: [...formData.permissionIds, permission.PermissionID] });
                    } else {
                      setFormData({ ...formData, permissionIds: formData.permissionIds.filter(id => id !== permission.PermissionID) });
                    }
                  }}
                />
                <div>
                  <strong>{permission.PermissionName}</strong>
                  <span>{permission.ComponentName}</span>
                  <small>{permission.Description}</small>
                </div>
              </label>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Permissions Tab Component
const PermissionsTab = ({ getAuthHeaders, setError }) => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/admin/permissions`, getAuthHeaders());
      setPermissions(response.data);
    } catch (error) {
      setError('Failed to fetch permissions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  // Group permissions by component
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.ComponentName]) {
      acc[perm.ComponentName] = [];
    }
    acc[perm.ComponentName].push(perm);
    return acc;
  }, {});

  return (
    <div className="permissions-tab">
      <div className="tab-header">
        <h2>System Permissions</h2>
      </div>

      <div className="permissions-grid">
        {Object.entries(groupedPermissions).map(([component, perms]) => (
          <div key={component} className="permission-group">
            <h3>{component}</h3>
            <div className="permission-list">
              {perms.map(perm => (
                <div key={perm.PermissionID} className="permission-card">
                  <strong>{perm.PermissionName}</strong>
                  <p>{perm.Description}</p>
                  <span className={`status ${perm.IsActive ? 'active' : 'inactive'}`}>
                    {perm.IsActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Logs Tab Component
const LogsTab = ({ getAuthHeaders, setError }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ limit: 100, userId: '' });

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(filter).toString();
      const response = await axios.get(`${API_URL}/admin/audit-logs?${params}`, getAuthHeaders());
      setLogs(response.data);
    } catch (error) {
      setError('Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="logs-tab">
      <div className="tab-header">
        <h2>Login Audit Logs</h2>
        <div className="filters">
          <FormSelect
            label="Limit"
            value={filter.limit}
            onChange={(e) => setFilter({ ...filter, limit: e.target.value })}
            options={[50, 100, 200, 500]}
          />
        </div>
      </div>

      <div className="logs-table">
        <table>
          <thead>
            <tr>
              <th>Date/Time</th>
              <th>Username</th>
              <th>Status</th>
              <th>IP Address</th>
              <th>Failure Reason</th>
              <th>User Agent</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.LogID}>
                <td>{new Date(log.LoginDateTime).toLocaleString()}</td>
                <td>{log.Username}</td>
                <td>
                  <span className={`status ${log.LoginStatus === 'Success' ? 'success' : 'failed'}`}>
                    {log.LoginStatus}
                  </span>
                </td>
                <td>{log.IPAddress}</td>
                <td>{log.FailureReason || '-'}</td>
                <td title={log.UserAgent}>{log.UserAgent?.substring(0, 50)}...</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPanel;
