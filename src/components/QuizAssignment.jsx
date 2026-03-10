import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/QuizAssignment.css';

const QuizAssignment = () => {
    const location = useLocation();
    const preSelectedQuiz = location.state?.selectedQuiz;
    const [viewMode, setViewMode] = useState('assignments'); // 'assignments', 'assign', 'dashboard'
    const [assignments, setAssignments] = useState([]);
    const [quizzes, setQuizzes] = useState([]);
    const [eligibleEmployees, setEligibleEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    // Filter options
    const [departments, setDepartments] = useState([]);
    const [roles, setRoles] = useState([]);
    const [grades, setGrades] = useState([]);
    const [filterDropdownOpen, setFilterDropdownOpen] = useState({
        department: false,
        role: false,
        grade: false
    });
    
    // Assignment form
    const [assignmentForm, setAssignmentForm] = useState({
        quiz_id: '',
        assignment_name: '',
        filter_department: [],
        filter_role: [],
        filter_grade: [],
        period_type: 'monthly',
        period_start_date: new Date().toISOString().split('T')[0]
    });
    
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [assignmentDetails, setAssignmentDetails] = useState(null);

    const getAuthToken = () => localStorage.getItem('authToken') || localStorage.getItem('token');
    const getAuthHeaders = (includeContentType = false) => {
        const token = getAuthToken();
        const headers = {
            'Authorization': `Bearer ${token}`
        };
        if (includeContentType) {
            headers['Content-Type'] = 'application/json';
        }
        return headers;
    };
    
    // Fetch assignments
    const fetchAssignments = async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:5000/api/quiz-assignments?active=true', {
                headers: getAuthHeaders()
            });
            
            const data = await response.json();
            if (data.success) {
                setAssignments(data.assignments);
            }
        } catch (error) {
            console.error('Error fetching assignments:', error);
            setMessage({ type: 'error', text: 'Failed to fetch assignments' });
        } finally {
            setLoading(false);
        }
    };
    
    // Fetch available quizzes
    const fetchQuizzes = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/quizzes', {
                headers: getAuthHeaders()
            });
            
            const data = await response.json();
            // API returns array directly, not wrapped in {success, quizzes}
            if (Array.isArray(data)) {
                setQuizzes(data);
            } else if (data.success && data.quizzes) {
                setQuizzes(data.quizzes);
            }
        } catch (error) {
            console.error('Error fetching quizzes:', error);
        }
    };
    
    // Fetch filter options
    const fetchFilterOptions = async () => {
        try {
            const headers = getAuthHeaders();
            
            const [deptRes, roleRes, gradeRes] = await Promise.all([
                fetch('http://localhost:5000/api/employees/departments', { headers }),
                fetch('http://localhost:5000/api/employees/roles', { headers }),
                fetch('http://localhost:5000/api/employees/grades', { headers })
            ]);
            
            const [deptData, roleData, gradeData] = await Promise.all([
                deptRes.json(),
                roleRes.json(),
                gradeRes.json()
            ]);
            
            if (deptData.success) {
                setDepartments(deptData.departments);
            }
            if (roleData.success) {
                setRoles(roleData.roles);
            }
            if (gradeData.success) {
                setGrades(gradeData.grades);
            }
        } catch (error) {
            console.error('Error fetching filter options:', error);
            setMessage({ type: 'error', text: 'Failed to fetch filter options' });
        }
    };
    
    // Fetch eligible employees based on filters
    const fetchEligibleEmployees = async () => {
        try {
            const queryParams = new URLSearchParams();
            if (assignmentForm.filter_department && assignmentForm.filter_department.length > 0) {
                queryParams.set('department', assignmentForm.filter_department.join(','));
            }
            if (assignmentForm.filter_role && assignmentForm.filter_role.length > 0) {
                queryParams.set('role', assignmentForm.filter_role.join(','));
            }
            if (assignmentForm.filter_grade && assignmentForm.filter_grade.length > 0) {
                queryParams.set('grade', assignmentForm.filter_grade.join(','));
            }
            
            const response = await fetch(`http://localhost:5000/api/employees/eligible?${queryParams}`, {
                headers: getAuthHeaders()
            });
            
            const data = await response.json();
            
            if (data.success) {
                setEligibleEmployees(data.employees || []);
            } else {
                console.error('API returned success=false:', data);
                setMessage({ type: 'error', text: data.message || 'Failed to fetch employees' });
            }
        } catch (error) {
            console.error('Error fetching eligible employees:', error);
            setMessage({ type: 'error', text: 'Failed to fetch employees: ' + error.message });
        }
    };
    
    // Fetch assignment details with attempts
    const fetchAssignmentDetails = async (assignmentId) => {
        try {
            setLoading(true);
            const response = await fetch(`http://localhost:5000/api/quiz-assignments/${assignmentId}`, {
                headers: getAuthHeaders()
            });
            
            const data = await response.json();
            if (data.success) {
                setAssignmentDetails(data);
                setSelectedAssignment(assignmentId);
            }
        } catch (error) {
            console.error('Error fetching assignment details:', error);
            setMessage({ type: 'error', text: 'Failed to fetch assignment details' });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchAssignments();
        fetchQuizzes();
        fetchFilterOptions();
    }, []);
    
    useEffect(() => {
        if (viewMode === 'assign') {
            fetchEligibleEmployees();
        }
    }, [assignmentForm.filter_department, assignmentForm.filter_role, assignmentForm.filter_grade, viewMode]);
    
    // Handle pre-selected quiz from navigation
    useEffect(() => {
        if (preSelectedQuiz) {
            setViewMode('assign');
            setAssignmentForm(prev => ({
                ...prev,
                quiz_id: preSelectedQuiz.quiz_id.toString(),
                assignment_name: `${preSelectedQuiz.subject} Assignment`
            }));
        }
    }, [preSelectedQuiz]);
    
    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setAssignmentForm(prev => ({ ...prev, [name]: value }));
    };
    
    // Create assignment
    const handleCreateAssignment = async (e) => {
        e.preventDefault();
        
        if (!assignmentForm.quiz_id || !assignmentForm.assignment_name) {
            setMessage({ type: 'error', text: 'Please fill in all required fields' });
            return;
        }
        
        if (eligibleEmployees.length === 0) {
            setMessage({ type: 'error', text: 'No eligible employees match the selected filters' });
            return;
        }
        
        try {
            setLoading(true);
            const response = await fetch('http://localhost:5000/api/quiz-assignments', {
                method: 'POST',
                headers: getAuthHeaders(true),
                body: JSON.stringify(assignmentForm)
            });
            
            const data = await response.json();
            
            if (data.success) {
                setMessage({ 
                    type: 'success', 
                    text: `Quiz assigned successfully to ${data.employees_assigned} employee(s)` 
                });
                resetForm();
                fetchAssignments();
                setViewMode('assignments');
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to create assignment' });
            }
        } catch (error) {
            console.error('Error creating assignment:', error);
            setMessage({ type: 'error', text: 'Failed to create assignment' });
        } finally {
            setLoading(false);
        }
    };
    
    // Deactivate assignment
    const handleDeactivateAssignment = async (assignmentId) => {
        try {
            setLoading(true);
            const response = await fetch(`http://localhost:5000/api/quiz-assignments/${assignmentId}`, {
                method: 'PUT',
                headers: getAuthHeaders(true),
                body: JSON.stringify({ is_active: false })
            });
            
            const data = await response.json();
            
            if (data.success) {
                setMessage({ type: 'success', text: 'Assignment deactivated successfully' });
                fetchAssignments();
            } else {
                setMessage({ type: 'error', text: data.message });
            }
        } catch (error) {
            console.error('Error deactivating assignment:', error);
            setMessage({ type: 'error', text: 'Failed to deactivate assignment' });
        } finally {
            setLoading(false);
        }
    };
    
    // Reset form
    const resetForm = () => {
        setAssignmentForm({
            quiz_id: '',
            assignment_name: '',
            filter_department: [],
            filter_role: [],
            filter_grade: [],
            period_type: 'monthly',
            period_start_date: new Date().toISOString().split('T')[0]
        });
        setEligibleEmployees([]);
    };

    const toggleFilterDropdown = (filterKey) => {
        setFilterDropdownOpen(prev => ({ ...prev, [filterKey]: !prev[filterKey] }));
    };

    const toggleFilterValue = (filterType, value) => {
        setAssignmentForm(prev => {
            const currentValues = prev[filterType] || [];
            const updatedValues = currentValues.includes(value)
                ? currentValues.filter(item => item !== value)
                : [...currentValues, value];
            return { ...prev, [filterType]: updatedValues };
        });
    };

    const getSelectedLabel = (values, label) => {
        if (!values || values.length === 0) return `All ${label}`;
        if (values.length === 1) return values[0];
        return `${values.length} selected`;
    };
    
    // Clear message after 5 seconds
    useEffect(() => {
        if (message.text) {
            const timer = setTimeout(() => setMessage({ type: '', text: '' }), 5000);
            return () => clearTimeout(timer);
        }
    }, [message]);
    
    // Get completion percentage
    const getCompletionPercentage = (assignment) => {
        if (!assignment.total_employees || assignment.total_employees === 0) return 0;
        return Math.round((assignment.completed_count / assignment.total_employees) * 100);
    };
    
    return (
        <div className="quiz-assignment-container">
            <div className="quiz-assignment-header">
                <h1>Quiz Assignment Management</h1>
                <p>Assign quizzes to employees based on department, role, or grade</p>
            </div>
            
            {message.text && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}
            
            <div className="view-mode-tabs">
                <button 
                    className={`tab-btn ${viewMode === 'assignments' ? 'active' : ''}`}
                    onClick={() => { setViewMode('assignments'); setSelectedAssignment(null); }}
                >
                    Active Assignments
                </button>
                <button 
                    className={`tab-btn ${viewMode === 'assign' ? 'active' : ''}`}
                    onClick={() => setViewMode('assign')}
                >
                    Create New Assignment
                </button>
            </div>
            
            {/* Assignments List View */}
            {viewMode === 'assignments' && !selectedAssignment && (
                <div className="assignments-list-section">
                    {loading ? (
                        <div className="loading">Loading...</div>
                    ) : assignments.length === 0 ? (
                        <div className="empty-state">
                            <p>No active assignments found</p>
                            <button 
                                className="btn-primary"
                                onClick={() => setViewMode('assign')}
                            >
                                Create First Assignment
                            </button>
                        </div>
                    ) : (
                        <div className="assignments-grid">
                            {assignments.map(assignment => (
                                <div key={assignment.id} className="assignment-card">
                                    <div className="assignment-card-header">
                                        <h3>{assignment.assignment_name}</h3>
                                        <span className="period-badge">{assignment.period_type}</span>
                                    </div>
                                    
                                    <div className="assignment-card-body">
                                        <p><strong>Quiz:</strong> {assignment.quiz_title}</p>
                                        <p><strong>Start Date:</strong> {new Date(assignment.period_start_date).toLocaleDateString()}</p>
                                        
                                        {assignment.filter_department && (
                                            <p><strong>Department:</strong> {assignment.filter_department}</p>
                                        )}
                                        {assignment.filter_role && (
                                            <p><strong>Role:</strong> {assignment.filter_role}</p>
                                        )}
                                        {assignment.filter_grade && (
                                            <p><strong>Grade:</strong> {assignment.filter_grade}</p>
                                        )}
                                        
                                        <div className="progress-section">
                                            <div className="progress-stats">
                                                <span>{assignment.completed_count} / {assignment.total_employees} completed</span>
                                                <span>{getCompletionPercentage(assignment)}%</span>
                                            </div>
                                            <div className="progress-bar">
                                                <div 
                                                    className="progress-fill"
                                                    style={{ width: `${getCompletionPercentage(assignment)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="assignment-card-actions">
                                        <button 
                                            className="btn-view"
                                            onClick={() => fetchAssignmentDetails(assignment.id)}
                                        >
                                            View Details
                                        </button>
                                        <button 
                                            className="btn-deactivate"
                                            onClick={() => handleDeactivateAssignment(assignment.id)}
                                        >
                                            Deactivate
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            
            {/* Assignment Details View */}
            {viewMode === 'assignments' && selectedAssignment && assignmentDetails && (
                <div className="assignment-details-section">
                    <button 
                        className="btn-back"
                        onClick={() => { setSelectedAssignment(null); setAssignmentDetails(null); }}
                    >
                        ← Back to Assignments
                    </button>
                    
                    <div className="details-header">
                        <h2>{assignmentDetails.assignment.assignment_name}</h2>
                        <p className="quiz-title">{assignmentDetails.assignment.quiz_title}</p>
                    </div>
                    
                    <div className="details-info">
                        <div className="info-item">
                            <strong>Period Type:</strong> {assignmentDetails.assignment.period_type}
                        </div>
                        <div className="info-item">
                            <strong>Start Date:</strong> {new Date(assignmentDetails.assignment.period_start_date).toLocaleDateString()}
                        </div>
                        <div className="info-item">
                            <strong>Assigned By:</strong> {assignmentDetails.assignment.assigned_by_username}
                        </div>
                    </div>
                    
                    <h3>Employee Attempts ({assignmentDetails.attempts.length})</h3>
                    
                    <div className="attempts-table-wrapper">
                        <table className="attempts-table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Department</th>
                                    <th>Role</th>
                                    <th>Grade</th>
                                    <th>Status</th>
                                    <th>Score</th>
                                    <th>Completed At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assignmentDetails.attempts.map(attempt => (
                                    <tr key={attempt.id}>
                                        <td>
                                            <div>{attempt.employee_name}</div>
                                            <small>{attempt.employee_id}</small>
                                        </td>
                                        <td>{attempt.functional_department}</td>
                                        <td>{attempt.functional_role}</td>
                                        <td>{attempt.grade}</td>
                                        <td>
                                            <span className={`status-badge ${attempt.status}`}>
                                                {attempt.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            {attempt.percentage !== null 
                                                ? `${attempt.score}/${attempt.total_questions} (${attempt.percentage}%)`
                                                : '-'
                                            }
                                        </td>
                                        <td>
                                            {attempt.completed_at 
                                                ? new Date(attempt.completed_at).toLocaleString()
                                                : '-'
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {/* Create Assignment View */}
            {viewMode === 'assign' && (
                <div className="create-assignment-section">
                    <form onSubmit={handleCreateAssignment}>
                        <div className="form-group">
                            <label>Assignment Name *</label>
                            <input
                                type="text"
                                name="assignment_name"
                                value={assignmentForm.assignment_name}
                                onChange={handleInputChange}
                                required
                                className="form-input"
                                placeholder="e.g., Q1 2026 IT Department Safety Quiz"
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Select Quiz *</label>
                            <select
                                name="quiz_id"
                                value={assignmentForm.quiz_id}
                                onChange={handleInputChange}
                                required
                                className="form-select"
                            >
                                <option value="">-- Select a Quiz --</option>
                                {quizzes.map(quiz => (
                                    <option key={quiz.quiz_id} value={quiz.quiz_id}>
                                        {quiz.subject} ({quiz.question_count} questions)
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="filters-section">
                            <h3>Filter Employees (optional - leave empty for all employees)</h3>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Departments (Select multiple)</label>
                                    <div className="multi-dropdown">
                                        <button
                                            type="button"
                                            className="multi-dropdown-trigger"
                                            onClick={() => toggleFilterDropdown('department')}
                                        >
                                            {getSelectedLabel(assignmentForm.filter_department, 'Departments')}
                                        </button>
                                        {filterDropdownOpen.department && (
                                            <div className="multi-dropdown-menu">
                                                {departments.map(dept => (
                                                    <label key={dept} className="multi-dropdown-item">
                                                        <input
                                                            type="checkbox"
                                                            checked={assignmentForm.filter_department.includes(dept)}
                                                            onChange={() => toggleFilterValue('filter_department', dept)}
                                                        />
                                                        <span>{dept}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="form-group">
                                    <label>Roles (Select multiple)</label>
                                    <div className="multi-dropdown">
                                        <button
                                            type="button"
                                            className="multi-dropdown-trigger"
                                            onClick={() => toggleFilterDropdown('role')}
                                        >
                                            {getSelectedLabel(assignmentForm.filter_role, 'Roles')}
                                        </button>
                                        {filterDropdownOpen.role && (
                                            <div className="multi-dropdown-menu">
                                                {roles.map(role => (
                                                    <label key={role} className="multi-dropdown-item">
                                                        <input
                                                            type="checkbox"
                                                            checked={assignmentForm.filter_role.includes(role)}
                                                            onChange={() => toggleFilterValue('filter_role', role)}
                                                        />
                                                        <span>{role}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="form-group">
                                    <label>Grades (Select multiple)</label>
                                    <div className="multi-dropdown">
                                        <button
                                            type="button"
                                            className="multi-dropdown-trigger"
                                            onClick={() => toggleFilterDropdown('grade')}
                                        >
                                            {getSelectedLabel(assignmentForm.filter_grade, 'Grades')}
                                        </button>
                                        {filterDropdownOpen.grade && (
                                            <div className="multi-dropdown-menu">
                                                {grades.map(grade => (
                                                    <label key={grade} className="multi-dropdown-item">
                                                        <input
                                                            type="checkbox"
                                                            checked={assignmentForm.filter_grade.includes(grade)}
                                                            onChange={() => toggleFilterValue('filter_grade', grade)}
                                                        />
                                                        <span>{grade}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="period-section">
                            <h3>Quiz Period Settings</h3>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Period Type *</label>
                                    <select
                                        name="period_type"
                                        value={assignmentForm.period_type}
                                        onChange={handleInputChange}
                                        required
                                        className="form-select"
                                    >
                                        <option value="once">One Time</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="quarterly">Quarterly</option>
                                        <option value="half-yearly">Half-Yearly (Twice a Year)</option>
                                        <option value="yearly">Yearly</option>
                                    </select>
                                    <span className="helper-text">
                                        {assignmentForm.period_type === 'once' && 'Quiz is assigned only once'}
                                        {assignmentForm.period_type === 'monthly' && 'Quiz will recur every month'}
                                        {assignmentForm.period_type === 'quarterly' && 'Quiz will recur every 3 months'}
                                        {assignmentForm.period_type === 'half-yearly' && 'Quiz will recur every 6 months'}
                                        {assignmentForm.period_type === 'yearly' && 'Quiz will recur once per year'}
                                    </span>
                                </div>
                                
                                <div className="form-group">
                                    <label>Start Date *</label>
                                    <input
                                        type="date"
                                        name="period_start_date"
                                        value={assignmentForm.period_start_date}
                                        onChange={handleInputChange}
                                        required
                                        className="form-input"
                                    />
                                </div>
                            </div>
                        </div>

                        {viewMode === 'assign' && (
                            eligibleEmployees.length > 0 ? (
                                <div className="eligible-employees-section">
                                    <div className="eligible-employees-header">
                                        <strong>{eligibleEmployees.length}</strong> employee(s) will be assigned this quiz
                                    </div>
                                    <div className="eligible-employees-table-wrapper">
                                        <table className="eligible-employees-table">
                                            <thead>
                                                <tr>
                                                    <th>Employee Code</th>
                                                    <th>Name</th>
                                                    <th>Employee ID</th>
                                                    <th>Department</th>
                                                    <th>Role</th>
                                                    <th>Grade</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {eligibleEmployees.map(employee => (
                                                    <tr key={employee.id}>
                                                        <td>{employee.employee_code}</td>
                                                        <td>{employee.employee_name}</td>
                                                        <td>{employee.employee_id}</td>
                                                        <td>{employee.functional_department}</td>
                                                        <td>{employee.functional_role}</td>
                                                        <td>{employee.grade}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="eligible-employees-info">
                                    <strong>0</strong> employee(s) match the selected filters. Adjust filters or leave empty for all active employees.
                                </div>
                            )
                        )}
                        
                        <div className="form-actions">
                            <button 
                                type="button" 
                                className="btn-cancel"
                                onClick={() => { setViewMode('assignments'); resetForm(); }}
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="btn-submit"
                                disabled={loading || eligibleEmployees.length === 0}
                            >
                                {loading ? 'Creating Assignment...' : 'Create Assignment'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default QuizAssignment;
