import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/EmployeeManager.css';

const EmployeeManager = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'create'
    const [filters, setFilters] = useState({
        search: '',
        department: '',
        role: '',
        grade: '',
        active: 'true'
    });
    
    // CSV import states
    const [csvFile, setCsvFile] = useState(null);
    const [csvError, setCsvError] = useState('');
    const [importedEmployees, setImportedEmployees] = useState([]);
    const [importPreview, setImportPreview] = useState(null);
    const [importMode, setImportMode] = useState('sync');
    const fileInputRef = React.useRef(null);
    
    // Filter options
    const [departments, setDepartments] = useState([]);
    const [roles, setRoles] = useState([]);
    const [grades, setGrades] = useState([]);
    
    // Form data for create/edit
    const [formData, setFormData] = useState({
        employee_code: '',
        employee_name: '',
        employee_id: '',
        functional_department: '',
        functional_role: '',
        grade: '',
        is_active: true
    });
    
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });

    const getAuthToken = () => localStorage.getItem('authToken') || localStorage.getItem('token');
    const getAuthHeaders = (extraHeaders = {}) => ({
        ...extraHeaders,
        'Authorization': `Bearer ${getAuthToken()}`
    });
    const handleUnauthorized = () => {
        setEmployees([]);
        setMessage({ type: 'error', text: 'Session expired. Please login again.' });
        localStorage.removeItem('authToken');
        localStorage.removeItem('token');
        localStorage.removeItem('isAuthenticated');
        navigate('/login');
    };
    
    // Fetch employees
    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const token = getAuthToken();
            if (!token) {
                handleUnauthorized();
                return;
            }

            const queryParams = new URLSearchParams();
            if (filters.search) queryParams.append('search', filters.search);
            if (filters.department) queryParams.append('department', filters.department);
            if (filters.role) queryParams.append('role', filters.role);
            if (filters.grade) queryParams.append('grade', filters.grade);
            if (filters.active) queryParams.append('active', filters.active);
            
            const response = await fetch(`http://localhost:5000/api/employees?${queryParams}`, {
                headers: getAuthHeaders()
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to fetch employees (${response.status})`);
            }
            
            const data = await response.json();
            if (data.success) {
                setEmployees(data.employees);
            } else {
                setEmployees([]);
                setMessage({ type: 'error', text: data.message || 'Failed to fetch employees' });
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
            setEmployees([]);
            setMessage({ type: 'error', text: error.message || 'Failed to fetch employees' });
        } finally {
            setLoading(false);
        }
    };
    
    // Fetch filter options
    const fetchFilterOptions = async () => {
        try {
            const token = getAuthToken();
            if (!token) {
                handleUnauthorized();
                return;
            }

            const headers = getAuthHeaders();
            
            const [deptRes, roleRes, gradeRes] = await Promise.all([
                fetch('http://localhost:5000/api/employees/departments', { headers }),
                fetch('http://localhost:5000/api/employees/roles', { headers }),
                fetch('http://localhost:5000/api/employees/grades', { headers })
            ]);
            
            if (deptRes.status === 401 || roleRes.status === 401 || gradeRes.status === 401) {
                handleUnauthorized();
                return;
            }

            const [deptData, roleData, gradeData] = await Promise.all([
                deptRes.json(),
                roleRes.json(),
                gradeRes.json()
            ]);
            
            if (deptData.success) setDepartments(deptData.departments);
            if (roleData.success) setRoles(roleData.roles);
            if (gradeData.success) setGrades(gradeData.grades);
        } catch (error) {
            console.error('Error fetching filter options:', error);
        }
    };
    
    useEffect(() => {
        fetchEmployees();
        fetchFilterOptions();
    }, [filters]);
    
    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };
    
    // Handle filter changes
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    
    // Create or update employee
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            setLoading(true);
            const url = editingEmployee 
                ? `http://localhost:5000/api/employees/${editingEmployee.id}`
                : 'http://localhost:5000/api/employees';
            
            const method = editingEmployee ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                setMessage({ 
                    type: 'success', 
                    text: editingEmployee ? 'Employee updated successfully' : 'Employee created successfully'
                });
                resetForm();
                fetchEmployees();
                setViewMode('list');
            } else {
                setMessage({ type: 'error', text: data.message || 'Operation failed' });
            }
        } catch (error) {
            console.error('Error saving employee:', error);
            setMessage({ type: 'error', text: 'Failed to save employee' });
        } finally {
            setLoading(false);
        }
    };
    
    // Delete employee
    const handleDelete = async (id) => {
        try {
            setLoading(true);
            const response = await fetch(`http://localhost:5000/api/employees/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            
            const data = await response.json();
            
            if (data.success) {
                setMessage({ type: 'success', text: data.message });
                fetchEmployees();
            } else {
                setMessage({ type: 'error', text: data.message });
            }
        } catch (error) {
            console.error('Error deleting employee:', error);
            setMessage({ type: 'error', text: 'Failed to delete employee' });
        } finally {
            setLoading(false);
            setShowDeleteConfirm(null);
        }
    };
    
    // Edit employee
    const handleEdit = (employee) => {
        setFormData({
            employee_code: employee.employee_code,
            employee_name: employee.employee_name,
            employee_id: employee.employee_id,
            functional_department: employee.functional_department,
            functional_role: employee.functional_role,
            grade: employee.grade,
            is_active: employee.is_active
        });
        setEditingEmployee(employee);
        setViewMode('create');
    };
    
    // Reset form
    const resetForm = () => {
        setFormData({
            employee_code: '',
            employee_name: '',
            employee_id: '',
            functional_department: '',
            functional_role: '',
            grade: '',
            is_active: true
        });
        setEditingEmployee(null);
    };
    
    // Clear message after 5 seconds
    useEffect(() => {
        if (message.text) {
            const timer = setTimeout(() => setMessage({ type: '', text: '' }), 5000);
            return () => clearTimeout(timer);
        }
    }, [message]);
    
    const escapeCSV = (value) => {
        const text = (value ?? '').toString();
        if (text.includes(',') || text.includes('"') || text.includes('\n')) {
            return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
    };

    // Download CSV template/current list
    const downloadCSVTemplate = () => {
        const headers = 'Employee Code,Employee Name,Employee ID,Functional Department,Functional Role,Grade,Active';
        const rows = employees.map((emp) => [
            escapeCSV(emp.employee_code),
            escapeCSV(emp.employee_name),
            escapeCSV(emp.employee_id),
            escapeCSV(emp.functional_department),
            escapeCSV(emp.functional_role),
            escapeCSV(emp.grade),
            emp.is_active ? 'true' : 'false'
        ].join(','));

        const template = [headers, ...rows].join('\n');
        
        const blob = new Blob([template], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'employee_current_list.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };
    
    // Handle CSV upload
    const handleCsvUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        setCsvFile(file);
        setCsvError('');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const employees = parseCSV(text);
                
                if (employees.length === 0) {
                    setCsvError('No valid employees found in CSV file');
                    return;
                }
                
                setImportedEmployees(employees);
                if (importMode === 'sync') {
                    previewBulkImport(employees);
                } else {
                    setImportPreview(null);
                }
            } catch (error) {
                setCsvError(error.message);
                alert('Error parsing CSV: ' + error.message);
            }
        };
        
        reader.onerror = () => {
            setCsvError('Error reading file');
        };
        
        reader.readAsText(file);
    };
    
    // Parse CSV file
    const parseCSV = (text) => {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length < 2) {
            throw new Error('CSV file must contain a header row and at least one employee');
        }
        
        const parseCSVLine = (line) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current);
            return result;
        };
        
        const dataLines = lines.slice(1);
        const employees = [];
        
        dataLines.forEach((line, index) => {
            try {
                const fields = parseCSVLine(line);
                
                if (fields.length < 7) {
                    throw new Error(`Row ${index + 2}: Insufficient columns. Expected 7 columns.`);
                }
                
                const employee_code = fields[0].trim();
                const employee_name = fields[1].trim();
                const employee_id = fields[2].trim();
                const functional_department = fields[3].trim();
                const functional_role = fields[4].trim();
                const grade = fields[5].trim();
                const is_active = fields[6] ? fields[6].trim().toLowerCase() === 'true' : true;
                
                if (!employee_code || employee_code.length > 5) {
                    throw new Error(`Row ${index + 2}: Invalid employee code "${employee_code}". Must be 1-5 digits.`);
                }
                if (!employee_name) {
                    throw new Error(`Row ${index + 2}: Employee name is required.`);
                }
                if (!employee_id) {
                    throw new Error(`Row ${index + 2}: Employee ID is required.`);
                }
                if (!functional_department) {
                    throw new Error(`Row ${index + 2}: Functional department is required.`);
                }
                if (!functional_role) {
                    throw new Error(`Row ${index + 2}: Functional role is required.`);
                }
                if (!grade) {
                    throw new Error(`Row ${index + 2}: Grade is required.`);
                }
                
                employees.push({
                    employee_code,
                    employee_name,
                    employee_id,
                    functional_department,
                    functional_role,
                    grade,
                    is_active
                });
            } catch (error) {
                throw new Error(`${error.message}`);
            }
        });
        
        return employees;
    };

    const previewBulkImport = async (employeesToPreview) => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:5000/api/employees/bulk-import/preview', {
                method: 'POST',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ employees: employeesToPreview })
            });

            const data = await response.json();
            if (!data.success) {
                setCsvError(data.message || 'Failed to preview import');
                return;
            }

            setImportPreview(data.summary);
        } catch (error) {
            console.error('Error previewing bulk import:', error);
            setCsvError('Failed to preview import changes');
        } finally {
            setLoading(false);
        }
    };
    
    // Bulk import employees
    const handleBulkImport = async () => {
        if (importedEmployees.length === 0) {
            alert('No employees to import. Please upload a CSV file first.');
            return;
        }

        if (importMode === 'sync') {
            if (!importPreview) {
                setMessage({ type: 'error', text: 'Preview not available. Please upload file again.' });
                return;
            }

            const confirmed = window.confirm(
                `Bulk sync summary:\n` +
                `• To Add: ${importPreview.toAdd}\n` +
                `• To Update: ${importPreview.toUpdate}\n` +
                `• To Eliminate (deactivate): ${importPreview.toEliminate}\n\n` +
                `Do you want to apply these changes?`
            );

            if (!confirmed) {
                return;
            }
        }
        
        try {
            setLoading(true);
            const response = await fetch('http://localhost:5000/api/employees/bulk-import', {
                method: 'POST',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    employees: importedEmployees,
                    syncMode: importMode === 'sync',
                    confirmSync: importMode === 'sync'
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                if (importMode === 'sync') {
                    setMessage({ 
                        type: 'success', 
                        text: `Sync complete. Added: ${data.summary?.added ?? 0}, Updated: ${data.summary?.updated ?? 0}, Eliminated: ${data.summary?.eliminated ?? 0}` 
                    });
                } else {
                    setMessage({
                        type: 'success',
                        text: `Append complete. Imported: ${data.successCount ?? 0}, Skipped: ${data.errorCount ?? 0}`
                    });
                }
                clearImportedEmployees();
                fetchEmployees();
            } else {
                setMessage({ type: 'error', text: data.message || 'Bulk import failed' });
            }
        } catch (error) {
            console.error('Error bulk importing employees:', error);
            setMessage({ type: 'error', text: 'Failed to import employees' });
        } finally {
            setLoading(false);
        }
    };
    
    // Clear imported employees
    const clearImportedEmployees = () => {
        setImportedEmployees([]);
        setCsvFile(null);
        setCsvError('');
        setImportPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    
    return (
        <div className="employee-manager-container">
            <div className="employee-manager-header">
                <h1>Employee Management</h1>
                <p>Manage employee records for quiz assignments</p>
            </div>
            
            {message.text && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}
            
            <div className="view-mode-tabs">
                <button 
                    className={`tab-btn ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => { setViewMode('list'); resetForm(); }}
                >
                    Employee List
                </button>
                <button 
                    className={`tab-btn ${viewMode === 'create' ? 'active' : ''}`}
                    onClick={() => setViewMode('create')}
                >
                    {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                </button>
            </div>
            
            {viewMode === 'list' ? (
                <div className="employee-list-section">
                    {/* Filters */}
                    <div className="filters-section">
                        <input
                            type="text"
                            name="search"
                            placeholder="Search by name, ID, or code..."
                            value={filters.search}
                            onChange={handleFilterChange}
                            className="search-input"
                        />
                        
                        <select
                            name="department"
                            value={filters.department}
                            onChange={handleFilterChange}
                            className="filter-select"
                        >
                            <option value="">All Departments</option>
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                        
                        <select
                            name="role"
                            value={filters.role}
                            onChange={handleFilterChange}
                            className="filter-select"
                        >
                            <option value="">All Roles</option>
                            {roles.map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                        
                        <select
                            name="grade"
                            value={filters.grade}
                            onChange={handleFilterChange}
                            className="filter-select"
                        >
                            <option value="">All Grades</option>
                            {grades.map(grade => (
                                <option key={grade} value={grade}>{grade}</option>
                            ))}
                        </select>
                        
                        <select
                            name="active"
                            value={filters.active}
                            onChange={handleFilterChange}
                            className="filter-select"
                        >
                            <option value="">All Status</option>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </select>
                    </div>
                    
                    {/* CSV Import/Export Section */}
                    <div className="csv-import-section">
                        <div className="csv-import-header">
                            <h3>Bulk Import Employees</h3>
                            <p>Choose import mode, upload file, review result, then apply</p>
                        </div>

                        <div className="import-mode-toggle">
                            <label className="import-mode-option">
                                <input
                                    type="radio"
                                    name="importMode"
                                    value="sync"
                                    checked={importMode === 'sync'}
                                    onChange={(e) => {
                                        setImportMode(e.target.value);
                                        setImportPreview(null);
                                    }}
                                />
                                Full Sync (add/update/eliminate)
                            </label>
                            <label className="import-mode-option">
                                <input
                                    type="radio"
                                    name="importMode"
                                    value="append"
                                    checked={importMode === 'append'}
                                    onChange={(e) => {
                                        setImportMode(e.target.value);
                                        setImportPreview(null);
                                    }}
                                />
                                Append Only (no elimination)
                            </label>
                        </div>
                        
                        <div className="csv-import-actions">
                            <button 
                                onClick={downloadCSVTemplate} 
                                className="btn-download-template"
                            >
                                📥 Download Current List (CSV)
                            </button>
                            
                            <div className="csv-upload-wrapper">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept=".csv"
                                    onChange={handleCsvUpload}
                                    className="employee-csv-file-input"
                                    id="csv-file-input"
                                />
                                <label htmlFor="csv-file-input" className="btn-upload-csv">
                                    📤 Upload CSV File
                                </label>
                                {csvFile && (
                                    <span className="csv-file-name">{csvFile.name}</span>
                                )}
                            </div>
                            
                            {importedEmployees.length > 0 && (
                                <button 
                                    onClick={handleBulkImport}
                                    className="btn-bulk-import"
                                    disabled={loading}
                                >
                                    {importMode === 'sync'
                                        ? `✅ Apply Sync for ${importedEmployees.length} Employees`
                                        : `✅ Append Import ${importedEmployees.length} Employees`}
                                </button>
                            )}
                            
                            {importedEmployees.length > 0 && (
                                <button 
                                    onClick={clearImportedEmployees}
                                    className="btn-clear-import"
                                >
                                    ❌ Clear
                                </button>
                            )}
                        </div>
                        
                        {csvError && (
                            <div className="csv-error">
                                ⚠️ {csvError}
                            </div>
                        )}
                        
                        {importedEmployees.length > 0 && (
                            <div className="csv-preview">
                                <strong>Uploaded:</strong> {importedEmployees.length} employees parsed from CSV
                                {importMode === 'sync' && importPreview && (
                                    <div className="csv-impact">
                                        <div><strong>Will Add:</strong> {importPreview.toAdd}</div>
                                        <div><strong>Will Update:</strong> {importPreview.toUpdate}</div>
                                        <div><strong>Will Eliminate (deactivate):</strong> {importPreview.toEliminate}</div>
                                        <div><strong>Unchanged:</strong> {importPreview.unchanged}</div>
                                    </div>
                                )}
                                {importMode === 'append' && (
                                    <div className="csv-impact-note">
                                        Append mode will only add new employees and skip duplicates. No existing employee will be eliminated.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {/* Employee Table */}
                    {loading ? (
                        <div className="loading">Loading...</div>
                    ) : employees.length === 0 ? (
                        <div className="empty-state">
                            <p>No employees found</p>
                        </div>
                    ) : (
                        <div className="employee-table-wrapper">
                            <table className="employee-table">
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Name</th>
                                        <th>Employee ID</th>
                                        <th>Department</th>
                                        <th>Role</th>
                                        <th>Grade</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map(emp => (
                                        <tr key={emp.id}>
                                            <td>{emp.employee_code}</td>
                                            <td>{emp.employee_name}</td>
                                            <td>{emp.employee_id}</td>
                                            <td>{emp.functional_department}</td>
                                            <td>{emp.functional_role}</td>
                                            <td>{emp.grade}</td>
                                            <td>
                                                <span className={`status-badge ${emp.is_active ? 'active' : 'inactive'}`}>
                                                    {emp.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="action-buttons">
                                                <button 
                                                    className="btn-edit"
                                                    onClick={() => handleEdit(emp)}
                                                >
                                                    Edit
                                                </button>
                                                <button 
                                                    className="btn-delete"
                                                    onClick={() => setShowDeleteConfirm(emp.id)}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    
                    {/* Delete Confirmation Modal */}
                    {showDeleteConfirm && (
                        <div className="modal-overlay">
                            <div className="modal-content">
                                <h3>Confirm Delete</h3>
                                <p>Are you sure you want to delete this employee?</p>
                                <div className="modal-actions">
                                    <button 
                                        className="btn-cancel"
                                        onClick={() => setShowDeleteConfirm(null)}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        className="btn-confirm-delete"
                                        onClick={() => handleDelete(showDeleteConfirm)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="employee-form-section">
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Employee Code (5 digits max) *</label>
                                <input
                                    type="text"
                                    name="employee_code"
                                    value={formData.employee_code}
                                    onChange={handleInputChange}
                                    maxLength="5"
                                    pattern="\d{1,5}"
                                    required
                                    className="form-input"
                                    placeholder="e.g., 00001"
                                />
                                <span className="helper-text">Numeric code up to 5 digits</span>
                            </div>
                            
                            <div className="form-group">
                                <label>Employee ID *</label>
                                <input
                                    type="text"
                                    name="employee_id"
                                    value={formData.employee_id}
                                    onChange={handleInputChange}
                                    required
                                    className="form-input"
                                    placeholder="e.g., ahzam.ahmed"
                                />
                                <span className="helper-text">Unique identifier (e.g., firstname.lastname)</span>
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label>Employee Name *</label>
                            <input
                                type="text"
                                name="employee_name"
                                value={formData.employee_name}
                                onChange={handleInputChange}
                                required
                                className="form-input"
                                placeholder="Full name"
                            />
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Functional Department *</label>
                                <input
                                    type="text"
                                    name="functional_department"
                                    value={formData.functional_department}
                                    onChange={handleInputChange}
                                    required
                                    className="form-input"
                                    list="departments-list"
                                    placeholder="e.g., IT, HR, Finance"
                                />
                                <datalist id="departments-list">
                                    {departments.map(dept => (
                                        <option key={dept} value={dept} />
                                    ))}
                                </datalist>
                            </div>
                            
                            <div className="form-group">
                                <label>Functional Role *</label>
                                <input
                                    type="text"
                                    name="functional_role"
                                    value={formData.functional_role}
                                    onChange={handleInputChange}
                                    required
                                    className="form-input"
                                    list="roles-list"
                                    placeholder="e.g., Software Engineer"
                                />
                                <datalist id="roles-list">
                                    {roles.map(role => (
                                        <option key={role} value={role} />
                                    ))}
                                </datalist>
                            </div>
                            
                            <div className="form-group">
                                <label>Grade *</label>
                                <input
                                    type="text"
                                    name="grade"
                                    value={formData.grade}
                                    onChange={handleInputChange}
                                    required
                                    className="form-input"
                                    list="grades-list"
                                    placeholder="e.g., G5, G6"
                                />
                                <datalist id="grades-list">
                                    {grades.map(grade => (
                                        <option key={grade} value={grade} />
                                    ))}
                                </datalist>
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={handleInputChange}
                                />
                                Active Employee
                            </label>
                        </div>
                        
                        <div className="form-actions">
                            <button 
                                type="button" 
                                className="btn-cancel"
                                onClick={() => { setViewMode('list'); resetForm(); }}
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="btn-submit"
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : (editingEmployee ? 'Update Employee' : 'Create Employee')}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default EmployeeManager;
