import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import PageHeader from './PageHeader';
import '../styles/QuizAssignment.css';

const QuizAssignment = () => {
    const location = useLocation();
    const preSelectedQuiz = location.state?.selectedQuiz;
    const initialTab = location.state?.initialTab;
    const isOverviewEntry = initialTab === 'overview';
    const [viewMode, setViewMode] = useState(initialTab === 'overview' ? 'overview' : 'assignments'); // 'assignments', 'assign', 'overview'
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
    const filterDropdownRef = useRef(null);
    
    // Assignment form
    const [assignmentForm, setAssignmentForm] = useState({
        quiz_id: '',
        assignment_name: '',
        filter_department: [],
        filter_role: [],
        filter_grade: [],
        period_type: 'monthly',
        period_start_date: new Date().toISOString().split('T')[0],
        expiry_date: ''
    });
    
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [assignmentDetails, setAssignmentDetails] = useState(null);
    const [overviewFilters, setOverviewFilters] = useState({
        active: 'active',
        quiz_id: 'all',
        status: 'all',
        search: '',
        expiredYear: 'all',
        expiredMonth: 'all'
    });

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

    const ExcelIcon = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" fill="#21A366" />
            <path d="M14 2v5h5" fill="#33C481" />
            <rect x="3" y="7" width="8" height="10" rx="1" fill="#107C41" />
            <path d="M5.2 14.8l1.8-2.9-1.7-2.7h1.6l1 1.8 1-1.8h1.5l-1.7 2.7 1.8 2.9H8.9l-1.1-2-1.1 2z" fill="#fff" />
        </svg>
    );
    
    // Fetch assignments
    const fetchAssignments = async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:5000/api/quiz-assignments', {
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
        if (initialTab === 'overview') {
            setViewMode('overview');
            setSelectedAssignment(null);
            setAssignmentDetails(null);
        }
    }, [initialTab]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
                setFilterDropdownOpen({ department: false, role: false, grade: false });
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
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
        setAssignmentForm(prev => ({
            ...prev,
            [name]: value,
            ...(name === 'period_type' && value !== 'once' ? { expiry_date: '' } : {})
        }));
    };
    
    // Create assignment
    const handleCreateAssignment = async (e) => {
        e.preventDefault();
        
        if (!assignmentForm.quiz_id || !assignmentForm.assignment_name) {
            setMessage({ type: 'error', text: 'Please fill in all required fields' });
            return;
        }

        if (assignmentForm.period_type === 'once' && !assignmentForm.expiry_date) {
            setMessage({ type: 'error', text: 'Expiry date is required for one-time assignment' });
            return;
        }

        if (assignmentForm.expiry_date && assignmentForm.expiry_date < assignmentForm.period_start_date) {
            setMessage({ type: 'error', text: 'Expiry date cannot be earlier than start date' });
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
            period_start_date: new Date().toISOString().split('T')[0],
            expiry_date: ''
        });
        setEligibleEmployees([]);
    };

    const exportAttemptsToExcel = () => {
        if (!assignmentDetails?.attempts?.length) return;

        const rows = assignmentDetails.attempts.map(attempt => ({
            EmployeeName: attempt.employee_name,
            EmployeeId: attempt.employee_id,
            Department: attempt.functional_department,
            Role: attempt.functional_role,
            Grade: attempt.grade,
            Status: attempt.status,
            ScorePercentage: attempt.percentage !== null ? `${attempt.percentage}%` : '',
            CompletedAt: attempt.completed_at ? new Date(attempt.completed_at).toLocaleString() : ''
        }));

        const headers = Object.keys(rows[0]);
        const csvLines = [
            headers.join(','),
            ...rows.map(row => headers.map(header => `"${String(row[header] ?? '').replace(/"/g, '""')}"`).join(','))
        ];

        const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${assignmentDetails.assignment.assignment_name.replace(/\s+/g, '_')}_attempts.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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

    const getAssignmentStatus = (assignment) => {
        if (!assignment.total_employees || assignment.total_employees === 0) return 'pending';
        if (assignment.completed_count >= assignment.total_employees) return 'completed';
        if (assignment.completed_count > 0) return 'in_progress';
        return 'pending';
    };

    const activeAssignments = assignments.filter((assignment) => assignment.is_active);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const inactiveAssignmentsWithExpiry = assignments.filter(
        (assignment) => !assignment.is_active && assignment.period_end_date
    );

    const expiryYearsFromData = Array.from(
        new Set(
            inactiveAssignmentsWithExpiry
                .map((assignment) => new Date(assignment.period_end_date).getFullYear())
                .filter((year) => !Number.isNaN(year))
        )
    ).sort((a, b) => b - a);

    const currentYear = new Date().getFullYear();
    const fallbackExpiryYears = Array.from({ length: 6 }, (_, index) => currentYear - index);
    const inactiveExpiryYears = expiryYearsFromData.length > 0 ? expiryYearsFromData : fallbackExpiryYears;

    const inactiveExpiryMonths = Array.from({ length: 12 }, (_, index) => index + 1);

    const filteredOverviewAssignments = assignments.filter((assignment) => {
        const activeMatch = overviewFilters.active === 'all'
            || (overviewFilters.active === 'active' && assignment.is_active)
            || (overviewFilters.active === 'inactive' && !assignment.is_active);

        const assignmentExpiryYear = assignment.period_end_date
            ? new Date(assignment.period_end_date).getFullYear().toString()
            : '';
        const assignmentExpiryMonth = assignment.period_end_date
            ? String(new Date(assignment.period_end_date).getMonth() + 1)
            : '';
        const expiredYearMatch = overviewFilters.active !== 'inactive'
            || overviewFilters.expiredYear === 'all'
            || assignmentExpiryYear === overviewFilters.expiredYear;
        const expiredMonthMatch = overviewFilters.active !== 'inactive'
            || overviewFilters.expiredMonth === 'all'
            || assignmentExpiryMonth === overviewFilters.expiredMonth;

        const quizMatch = overviewFilters.quiz_id === 'all'
            || String(assignment.quiz_id) === String(overviewFilters.quiz_id);

        const status = getAssignmentStatus(assignment);
        const statusMatch = overviewFilters.status === 'all' || overviewFilters.status === status;

        const searchText = overviewFilters.search.trim().toLowerCase();
        const searchable = [
            assignment.assignment_name,
            assignment.quiz_title,
            assignment.filter_department,
            assignment.filter_role,
            assignment.filter_grade
        ].filter(Boolean).join(' ').toLowerCase();
        const searchMatch = !searchText || searchable.includes(searchText);

        return activeMatch && quizMatch && statusMatch && searchMatch && expiredYearMatch && expiredMonthMatch;
    });

    const exportOverviewToExcel = () => {
        if (!filteredOverviewAssignments.length) {
            setMessage({ type: 'error', text: 'No rows available for export' });
            return;
        }

        const rows = filteredOverviewAssignments.map((assignment) => ({
            AssignmentID: assignment.id,
            AssignmentName: assignment.assignment_name,
            Quiz: assignment.quiz_title,
            Active: assignment.is_active ? 'Yes' : 'No',
            Status: getAssignmentStatus(assignment),
            AssignedDepartment: assignment.filter_department || 'All',
            AssignedRole: assignment.filter_role || 'All',
            AssignedGrade: assignment.filter_grade || 'All',
            AssignedAt: assignment.assigned_at ? new Date(assignment.assigned_at).toLocaleString() : '',
            StartDate: assignment.period_start_date ? new Date(assignment.period_start_date).toLocaleDateString() : '',
            ExpiryDate: assignment.period_end_date ? new Date(assignment.period_end_date).toLocaleDateString() : '',
            TotalEmployees: assignment.total_employees ?? 0,
            Completed: assignment.completed_count ?? 0,
            Pending: assignment.pending_count ?? 0,
            CompletionPercent: `${getCompletionPercentage(assignment)}%`
        }));

        const headers = Object.keys(rows[0]);
        const csvLines = [
            headers.join(','),
            ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? '').replace(/"/g, '""')}"`).join(','))
        ];

        const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'quiz_assignments_overview.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const isOverviewMode = isOverviewEntry || viewMode === 'overview';
    const pageHeading = isOverviewMode ? 'Quiz Overview' : 'Quiz Assignment Management';
    const pageSubheading = isOverviewMode
        ? 'View all quiz assignments, statuses, targets, and export data'
        : 'Assign quizzes to employees based on department, role, or grade';
    
    return (
        <div className="quiz-assignment-container">
            <PageHeader />
            <div className="quiz-assignment-header">
                <h1>{pageHeading}</h1>
                <p>{pageSubheading}</p>
            </div>
            
            {message.text && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}
            
            {!isOverviewEntry && (
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
                    <button
                        className={`tab-btn ${viewMode === 'overview' ? 'active' : ''}`}
                        onClick={() => { setViewMode('overview'); setSelectedAssignment(null); }}
                    >
                        Overview
                    </button>
                </div>
            )}
            
            {/* Assignments List View */}
            {viewMode === 'assignments' && !selectedAssignment && (
                <div className="assignments-list-section">
                    {loading ? (
                        <div className="loading">Loading...</div>
                    ) : activeAssignments.length === 0 ? (
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
                            {activeAssignments.map(assignment => (
                                <div key={assignment.id} className="assignment-card">
                                    <div className="assignment-card-header">
                                        <h3>{assignment.assignment_name}</h3>
                                        <span className="period-badge">{assignment.period_type}</span>
                                    </div>
                                    
                                    <div className="assignment-card-body">
                                        <p><strong>Quiz:</strong> {assignment.quiz_title}</p>
                                        <p><strong>Start Date:</strong> {new Date(assignment.period_start_date).toLocaleDateString()}</p>
                                        <p><strong>Expiry Date:</strong> {assignment.period_end_date ? new Date(assignment.period_end_date).toLocaleDateString() : 'Not set'}</p>
                                        
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

            {viewMode === 'overview' && !selectedAssignment && (
                <div className="assignment-details-section">
                    <div className="overview-header-row">
                        <h2>All Quiz Assignments</h2>
                        <button
                            className="export-icon-btn"
                            title="Download Excel (CSV)"
                            aria-label="Download Excel overview"
                            onClick={exportOverviewToExcel}
                        ><ExcelIcon /></button>
                    </div>

                    <div className="overview-filters">
                        <select
                            value={overviewFilters.active}
                            onChange={(e) => setOverviewFilters(prev => ({
                                ...prev,
                                active: e.target.value,
                                expiredYear: e.target.value === 'inactive' ? prev.expiredYear : 'all',
                                expiredMonth: e.target.value === 'inactive' ? prev.expiredMonth : 'all'
                            }))}
                            className="form-select"
                        >
                            <option value="all">All Active States</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>

                        <select
                            value={overviewFilters.expiredYear}
                            onChange={(e) => setOverviewFilters(prev => ({ ...prev, expiredYear: e.target.value, expiredMonth: 'all' }))}
                            className="form-select"
                            disabled={overviewFilters.active !== 'inactive'}
                            title={overviewFilters.active !== 'inactive' ? 'Select Active State = Inactive to enable' : 'Filter by expired year'}
                        >
                            <option value="all">All Expired Years</option>
                            {inactiveExpiryYears.map((year) => (
                                <option key={year} value={String(year)}>{year}</option>
                            ))}
                        </select>

                        <select
                            value={overviewFilters.expiredMonth}
                            onChange={(e) => setOverviewFilters(prev => ({ ...prev, expiredMonth: e.target.value }))}
                            className="form-select"
                            disabled={overviewFilters.active !== 'inactive'}
                            title={overviewFilters.active !== 'inactive' ? 'Select Active State = Inactive to enable' : 'Filter by expired month'}
                        >
                            <option value="all">All Expired Months</option>
                            {inactiveExpiryMonths.map((month) => (
                                <option key={month} value={String(month)}>{monthNames[month - 1]}</option>
                            ))}
                        </select>

                        <select
                            value={overviewFilters.quiz_id}
                            onChange={(e) => setOverviewFilters(prev => ({ ...prev, quiz_id: e.target.value }))}
                            className="form-select"
                        >
                            <option value="all">All Quizzes</option>
                            {quizzes.map((quiz) => (
                                <option key={quiz.quiz_id} value={quiz.quiz_id}>{quiz.subject}</option>
                            ))}
                        </select>

                        <select
                            value={overviewFilters.status}
                            onChange={(e) => setOverviewFilters(prev => ({ ...prev, status: e.target.value }))}
                            className="form-select"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                        </select>

                        <input
                            type="text"
                            className="form-input"
                            placeholder="Search assignment/quiz/department..."
                            value={overviewFilters.search}
                            onChange={(e) => setOverviewFilters(prev => ({ ...prev, search: e.target.value }))}
                        />
                    </div>

                    <div className="attempts-table-wrapper">
                        <table className="attempts-table">
                            <thead>
                                <tr>
                                    <th>Assignment</th>
                                    <th>Quiz</th>
                                    <th>Active</th>
                                    <th>Status</th>
                                    <th>Assigned To</th>
                                    <th>Start</th>
                                    <th>Expiry Date</th>
                                    <th>Completion</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOverviewAssignments.map((assignment) => (
                                    <tr
                                        key={`overview-${assignment.id}`}
                                        className="overview-row-clickable"
                                        onClick={() => fetchAssignmentDetails(assignment.id)}
                                    >
                                        <td>{assignment.assignment_name}</td>
                                        <td>{assignment.quiz_title}</td>
                                        <td>{assignment.is_active ? 'Active' : 'Inactive'}</td>
                                        <td>{getAssignmentStatus(assignment).replace('_', ' ')}</td>
                                        <td>
                                            {[
                                                assignment.filter_department,
                                                assignment.filter_role,
                                                assignment.filter_grade
                                            ].filter(Boolean).join(' | ') || 'All Employees'}
                                        </td>
                                        <td>{assignment.period_start_date ? new Date(assignment.period_start_date).toLocaleDateString() : '-'}</td>
                                        <td>{assignment.period_end_date ? new Date(assignment.period_end_date).toLocaleDateString() : '-'}</td>
                                        <td>{assignment.completed_count}/{assignment.total_employees} ({getCompletionPercentage(assignment)}%)</td>
                                    </tr>
                                ))}
                                {filteredOverviewAssignments.length === 0 && (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center' }}>No records match selected filters</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {/* Assignment Details View */}
            {(viewMode === 'assignments' || viewMode === 'overview') && selectedAssignment && assignmentDetails && (
                <div className="assignment-details-section">
                    <button 
                        className="btn-back"
                        onClick={() => { setSelectedAssignment(null); setAssignmentDetails(null); }}
                    >
                        ← Back
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
                            <strong>Expiry Date:</strong> {assignmentDetails.assignment.period_end_date ? new Date(assignmentDetails.assignment.period_end_date).toLocaleDateString() : 'Not set'}
                        </div>
                        <div className="info-item">
                            <strong>Assigned By:</strong> {assignmentDetails.assignment.assigned_by_username}
                        </div>
                    </div>
                    
                    <h3>Employee Attempts ({assignmentDetails.attempts.length})</h3>
                    <div style={{ marginBottom: '12px' }}>
                        <button
                            className="export-icon-btn"
                            title="Download Excel (CSV)"
                            aria-label="Download Excel attempts"
                            onClick={exportAttemptsToExcel}
                        ><ExcelIcon /></button>
                    </div>
                    
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
                                                ? `${attempt.percentage}%`
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
                        
                        <div className="filters-section" ref={filterDropdownRef}>
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
                                        {assignmentForm.period_type === 'monthly' && 'Recurrent: expiry auto-set to month end'}
                                        {assignmentForm.period_type === 'quarterly' && 'Recurrent: expiry auto-set to quarter end'}
                                        {assignmentForm.period_type === 'half-yearly' && 'Recurrent: expiry auto-set to half-year end'}
                                        {assignmentForm.period_type === 'yearly' && 'Recurrent: expiry auto-set to year end'}
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

                                {assignmentForm.period_type === 'once' && (
                                    <div className="form-group">
                                        <label>Expiry Date *</label>
                                        <input
                                            type="date"
                                            name="expiry_date"
                                            value={assignmentForm.expiry_date}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            min={assignmentForm.period_start_date}
                                            required
                                        />
                                    </div>
                                )}
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
