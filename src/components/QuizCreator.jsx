import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/QuizCreator.css';
import Button from './Button';
import { API_URL } from '../config/api';

const QuizCreator = () => {
  const navigate = useNavigate();
  // View management
  const [viewMode, setViewMode] = useState('create'); // 'create', 'browse', or 'edit'
  const [editingQuizId, setEditingQuizId] = useState(null);
  const [editTab, setEditTab] = useState('properties'); // 'properties' or 'assignments'
  const fileInputRef = useRef(null);
  const studyMaterialInputRef = useRef(null);
  const assignmentDropdownRef = useRef(null);
  
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/home');
    }
  };
  
  // Assignment management
  const [quizAssignments, setQuizAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [grades, setGrades] = useState([]);
  const [assignmentFilterDropdownOpen, setAssignmentFilterDropdownOpen] = useState({
    department: false,
    role: false,
    grade: false
  });
  const [eligibleCount, setEligibleCount] = useState(0);
  const [eligibleEmployees, setEligibleEmployees] = useState([]);
  const [assignmentForm, setAssignmentForm] = useState({
    assignment_name: '',
    filter_department: [],
    filter_role: [],
    filter_grade: [],
    period_type: 'monthly',
    period_start_date: new Date().toISOString().split('T')[0],
    expiry_date: ''
  });

  // Quizzes list
  const [allQuizzes, setAllQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [browseFilters, setBrowseFilters] = useState({
    assignmentStatus: 'all',
    createdFrom: '',
    createdTo: '',
    regulatory: 'all',
    departmentName: ''
  });

  // Quiz data
  const [quizData, setQuizData] = useState({
    subject: '',
    passingMarks: '',
    timeType: 'total',
    totalTime: '',
    timePerQuestion: '',
    totalQuestionsToShow: '',
    questions: [],
    departmentName: '',
    isRegulatory: false,
    maxAttempts: '',
    studyMaterialName: '',
    studyMaterialUrl: ''
  });

  const [currentQuestion, setCurrentQuestion] = useState({
    questionText: '',
    numberOfChoices: 4,
    correctAnswer: '',
    wrongAnswers: ['', '', ''],
    score: '',
    timeSeconds: '' // Time for this specific question in seconds
  });

  const [savedQuizzes, setSavedQuizzes] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [importMode, setImportMode] = useState('manual');
  const [csvFile, setCsvFile] = useState(null);
  const [csvError, setCsvError] = useState('');

  // Fetch quizzes when browse mode is activated
  useEffect(() => {
    if (viewMode === 'browse') {
      fetchAllQuizzes();
    }
  }, [viewMode, browseFilters]);

  const fetchAllQuizzes = async () => {
    setLoadingQuizzes(true);
    try {
      const response = await axios.get(`${API_URL}/quizzes`, {
        params: {
          include_all: 1,
          assignment_status: browseFilters.assignmentStatus,
          created_from: browseFilters.createdFrom || undefined,
          created_to: browseFilters.createdTo || undefined,
          regulatory: browseFilters.regulatory === 'all' ? undefined : browseFilters.regulatory,
          department_name: browseFilters.departmentName || undefined
        }
      });
      setAllQuizzes(response.data);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      alert('Failed to fetch quizzes');
    } finally {
      setLoadingQuizzes(false);
    }
  };

  const loadQuizForEdit = async (quizId) => {
    try {
      const response = await axios.get(`${API_URL}/quizzes/${quizId}`);
      const quiz = response.data;

      setEditingQuizId(quizId);
      setQuizData({
        subject: quiz.subject,
        passingMarks: quiz.passing_marks,
        timeType: quiz.time_type,
        totalTime: quiz.total_time || '',
        timePerQuestion: quiz.time_per_question || '',
        totalQuestionsToShow: quiz.total_questions_to_show || '',
        departmentName: quiz.department_name || '',
        isRegulatory: !!quiz.is_regulatory,
        maxAttempts: quiz.max_attempts ?? '',
        studyMaterialName: quiz.study_material_name || '',
        studyMaterialUrl: quiz.study_material_url || '',
        questions: quiz.questions.map(q => ({
          id: q.question_id,
          questionText: q.question_text,
          numberOfChoices: q.number_of_choices,
          correctAnswer: q.correct_answer,
          wrongAnswers: Array.isArray(q.wrongAnswers) 
            ? q.wrongAnswers 
            : (q.wrong_answers ? q.wrong_answers.map(wa => wa.wrong_answer_text) : []),
          score: q.score,
          timeSeconds: q.time_seconds || ''
        }))
      });

      setViewMode('edit');
      setEditTab('properties');
      fetchQuizAssignments(quizId);
      fetchFilterOptions();
    } catch (error) {
      console.error('Error loading quiz:', error);
      alert('Failed to load quiz for editing: ' + (error.response?.data?.error || error.message));
    }
  };

  const fetchQuizAssignments = async (quizId) => {
    try {
      setLoadingAssignments(true);
      const response = await axios.get(`http://localhost:5000/api/quiz-assignments?quiz_id=${quizId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setQuizAssignments(response.data.assignments);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [deptRes, roleRes, gradeRes] = await Promise.all([
        fetch('http://localhost:5000/api/employees/departments', { headers }),
        fetch('http://localhost:5000/api/employees/roles', { headers }),
        fetch('http://localhost:5000/api/employees/grades', { headers })
      ]);
      const [deptData, roleData, gradeData] = await Promise.all([
        deptRes.json(), roleRes.json(), gradeRes.json()
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
    }
  };

  const fetchEligibleCount = async () => {
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
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/employees/eligible?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setEligibleCount(data.count);
        setEligibleEmployees(data.employees || []);
      } else {
        console.error('API returned success=false:', data);
      }
    } catch (error) {
      console.error('Error fetching eligible count:', error);
    }
  };

  useEffect(() => {
    if (showAssignmentForm && editingQuizId) {
      fetchEligibleCount();
    }
  }, [assignmentForm.filter_department, assignmentForm.filter_role, assignmentForm.filter_grade, showAssignmentForm]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (assignmentDropdownRef.current && !assignmentDropdownRef.current.contains(event.target)) {
        setAssignmentFilterDropdownOpen({
          department: false,
          role: false,
          grade: false
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (eligibleCount === 0) {
      alert('No employees match the selected filters!');
      return;
    }
    if (assignmentForm.period_type === 'once' && !assignmentForm.expiry_date) {
      alert('Expiry date is required for one-time assignments');
      return;
    }
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/quiz-assignments', {
        quiz_id: editingQuizId,
        ...assignmentForm
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        alert(`Assignment created for ${response.data.employees_assigned} employees!`);
        setShowAssignmentForm(false);
        setAssignmentForm({
          assignment_name: '',
          filter_department: [],
          filter_role: [],
          filter_grade: [],
          period_type: 'monthly',
          period_start_date: new Date().toISOString().split('T')[0],
          expiry_date: ''
        });
        fetchQuizAssignments(editingQuizId);
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
      alert('Failed to create assignment');
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;
    try {
      const response = await axios.delete(`http://localhost:5000/api/quiz-assignments/${assignmentId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        alert('Assignment deleted successfully');
        fetchQuizAssignments(editingQuizId);
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert(error.response?.data?.message || 'Failed to delete assignment');
    }
  };

  const handleQuizDataChange = (field, value) => {
    setQuizData({ ...quizData, [field]: value });
  };

  const handleQuestionChange = (field, value) => {
    setCurrentQuestion({ ...currentQuestion, [field]: value });
  };

  const handleStudyMaterialUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('materialFile', file);

    try {
      const response = await axios.post(`${API_URL}/quizzes/upload-study-material`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setQuizData((prev) => ({
        ...prev,
        studyMaterialName: response.data.fileName,
        studyMaterialUrl: response.data.fileUrl
      }));

      if (studyMaterialInputRef.current) {
        studyMaterialInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to upload study material:', error);
      alert(error.response?.data?.error || 'Failed to upload study material');
    }
  };

  const handleRemoveStudyMaterial = () => {
    setQuizData((prev) => ({
      ...prev,
      studyMaterialName: '',
      studyMaterialUrl: ''
    }));

    if (studyMaterialInputRef.current) {
      studyMaterialInputRef.current.value = '';
    }
  };

  const handleWrongAnswerChange = (index, value) => {
    const newWrongAnswers = [...currentQuestion.wrongAnswers];
    newWrongAnswers[index] = value;
    setCurrentQuestion({ ...currentQuestion, wrongAnswers: newWrongAnswers });
  };

  const handleChoicesChange = (value) => {
    const numChoices = parseInt(value);
    const wrongAnswersNeeded = numChoices - 1;
    const currentWrongAnswers = currentQuestion.wrongAnswers;

    let newWrongAnswers;
    if (wrongAnswersNeeded > currentWrongAnswers.length) {
      newWrongAnswers = [...currentWrongAnswers, ...Array(wrongAnswersNeeded - currentWrongAnswers.length).fill('')];
    } else {
      newWrongAnswers = currentWrongAnswers.slice(0, wrongAnswersNeeded);
    }

    setCurrentQuestion({
      ...currentQuestion,
      numberOfChoices: numChoices,
      wrongAnswers: newWrongAnswers
    });
  };

  const addQuestion = () => {
    if (!currentQuestion.questionText.trim()) {
      alert('Please enter question text');
      return;
    }
    if (!currentQuestion.correctAnswer.trim()) {
      alert('Please enter the correct answer');
      return;
    }

    const filledWrongAnswers = currentQuestion.wrongAnswers.filter(ans => ans.trim() !== '');
    if (filledWrongAnswers.length < currentQuestion.numberOfChoices - 1) {
      alert(`Please provide at least ${currentQuestion.numberOfChoices - 1} wrong answers`);
      return;
    }

    if (!currentQuestion.score || parseFloat(currentQuestion.score) <= 0) {
      alert('Please enter a valid score');
      return;
    }

    const newQuestion = {
      id: Date.now(),
      questionText: currentQuestion.questionText,
      numberOfChoices: currentQuestion.numberOfChoices,
      correctAnswer: currentQuestion.correctAnswer,
      wrongAnswers: currentQuestion.wrongAnswers.filter(ans => ans.trim() !== ''),
      score: parseFloat(currentQuestion.score),
      timeSeconds: quizData.timeType === 'perQuestion' && currentQuestion.timeSeconds ? parseInt(currentQuestion.timeSeconds) : null
    };

    setQuizData({
      ...quizData,
      questions: [...quizData.questions, newQuestion]
    });

    setCurrentQuestion({
      questionText: '',
      numberOfChoices: 4,
      correctAnswer: '',
      wrongAnswers: ['', '', ''],
      score: ''
    });
  };

  const removeQuestion = (questionId) => {
    setQuizData({
      ...quizData,
      questions: quizData.questions.filter(q => q.id !== questionId)
    });
  };

  const saveQuiz = async () => {
    if (!quizData.subject.trim()) {
      alert('Please enter quiz subject');
      return;
    }
    if (!quizData.departmentName.trim()) {
      alert('Please enter initiating department name');
      return;
    }
    if (!quizData.totalQuestionsToShow || parseInt(quizData.totalQuestionsToShow) <= 0) {
      alert('Please enter the total number of questions to show in quiz');
      return;
    }
    if (quizData.questions.length === 0) {
      alert('Please add at least one question');
      return;
    }
    if (quizData.questions.length < parseInt(quizData.totalQuestionsToShow)) {
      alert(`You must add at least ${quizData.totalQuestionsToShow} questions. Currently added: ${quizData.questions.length}`);
      return;
    }
    if (!quizData.passingMarks || parseFloat(quizData.passingMarks) <= 0) {
      alert('Please enter valid passing marks');
      return;
    }
    if (quizData.timeType === 'total' && (!quizData.totalTime || parseInt(quizData.totalTime) <= 0)) {
      alert('Please enter valid total time in minutes');
      return;
    }
    if (quizData.timeType === 'perQuestion' && (!quizData.timePerQuestion || parseInt(quizData.timePerQuestion) <= 0)) {
      alert('Please enter valid time per question in seconds');
      return;
    }
    if (quizData.maxAttempts !== '' && parseInt(quizData.maxAttempts) <= 0) {
      alert('Max attempts must be greater than 0, or set attempt limit to unlimited');
      return;
    }

    const totalScore = quizData.questions.reduce((sum, q) => sum + q.score, 0);
    if (parseFloat(quizData.passingMarks) > totalScore) {
      alert(`Passing marks cannot exceed total score (${totalScore})`);
      return;
    }

    try {
      const username = localStorage.getItem('username') || 'admin';

      const quizPayload = {
        subject: quizData.subject,
        passingMarks: parseFloat(quizData.passingMarks),
        timeType: quizData.timeType,
        totalTime: quizData.timeType === 'total' ? parseInt(quizData.totalTime) : null,
        timePerQuestion: quizData.timeType === 'perQuestion' ? parseInt(quizData.timePerQuestion) : null,
        totalQuestionsToShow: parseInt(quizData.totalQuestionsToShow),
        departmentName: quizData.departmentName,
        isRegulatory: !!quizData.isRegulatory,
        maxAttempts: quizData.maxAttempts === '' ? null : parseInt(quizData.maxAttempts),
        studyMaterialName: quizData.studyMaterialName || null,
        studyMaterialUrl: quizData.studyMaterialUrl || null,
        createdBy: username,
        lastEditedBy: username,
        questions: quizData.questions.map(q => ({
          questionText: q.questionText,
          numberOfChoices: q.numberOfChoices,
          correctAnswer: q.correctAnswer,
          wrongAnswers: q.wrongAnswers,
          score: q.score,
          timeSeconds: q.timeSeconds || null
        }))
      };

      if (editingQuizId) {
        // Update existing quiz
        await axios.put(`${API_URL}/quizzes/${editingQuizId}`, quizPayload);
        setSuccessMessage('Quiz updated successfully!');
      } else {
        // Create new quiz
        await axios.post(`${API_URL}/quizzes`, quizPayload);
        setSuccessMessage('Quiz created successfully!');
      }

      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        resetForm();
        setViewMode('browse');
        fetchAllQuizzes();
      }, 2000);
    } catch (error) {
      console.error('Error saving quiz:', error);
      alert('Failed to save quiz. Please try again.');
    }
  };

  const resetForm = () => {
    setEditingQuizId(null);
    setEditTab('properties');
    setQuizData({
      subject: '',
      passingMarks: '',
      timeType: 'total',
      totalTime: '',
      timePerQuestion: '',
      totalQuestionsToShow: '',
      questions: [],
      departmentName: '',
      isRegulatory: false,
      maxAttempts: '',
      studyMaterialName: '',
      studyMaterialUrl: ''
    });
    setCurrentQuestion({
      questionText: '',
      numberOfChoices: 4,
      correctAnswer: '',
      wrongAnswers: ['', '', ''],
      score: ''
    });
    setCsvFile(null);
    setCsvError('');
    setQuizAssignments([]);
    setShowAssignmentForm(false);
    setAssignmentForm({
      assignment_name: '',
      filter_department: [],
      filter_role: [],
      filter_grade: [],
      period_type: 'monthly',
      period_start_date: new Date().toISOString().split('T')[0],
      expiry_date: ''
    });
    setEligibleCount(0);
    setEligibleEmployees([]);
  };

  const toggleAssignmentFilterDropdown = (filterKey) => {
    setAssignmentFilterDropdownOpen(prev => ({ ...prev, [filterKey]: !prev[filterKey] }));
  };

  const toggleAssignmentFilterValue = (filterType, value) => {
    setAssignmentForm(prev => {
      const currentValues = prev[filterType] || [];
      const updatedValues = currentValues.includes(value)
        ? currentValues.filter(item => item !== value)
        : [...currentValues, value];
      return { ...prev, [filterType]: updatedValues };
    });
  };

  const getAssignmentSelectedLabel = (values, label) => {
    if (!values || values.length === 0) return `All ${label}`;
    if (values.length === 1) return values[0];
    return `${values.length} selected`;
  };

  const getTotalScore = () => {
    return quizData.questions.reduce((sum, q) => sum + q.score, 0);
  };

  const handleCsvUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setCsvFile(file);
    setCsvError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const questions = parseCSV(text);

        if (questions.length === 0) {
          setCsvError('No valid questions found in CSV file');
          return;
        }

        setQuizData({
          ...quizData,
          questions: questions
        });

        alert(`Successfully imported ${questions.length} questions from CSV`);
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

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');

    if (lines.length < 2) {
      throw new Error('CSV file must contain a header row and at least one question');
    }

    // Parse header to detect if Time column exists
    const headerFields = parseCSVLine(lines[0]);
    const hasTimeColumn = headerFields.some(h => h.toLowerCase().includes('time'));
    const timeColumnIndex = hasTimeColumn ? headerFields.findIndex(h => h.toLowerCase().includes('time')) : -1;

    const dataLines = lines.slice(1);
    const questions = [];

    dataLines.forEach((line, index) => {
      try {
        const fields = parseCSVLine(line);

        if (fields.length < 3) {
          throw new Error(`Row ${index + 2}: Insufficient columns. Expected at least 3 columns (Question, Correct Answer, Score)`);
        }

        const questionText = fields[0].trim();
        const correctAnswer = fields[1].trim();
        const score = parseFloat(fields[2]);
        
        // Extract time if present (typically column 3)
        let timeSeconds = null;
        let wrongAnswersStartIndex = 3;
        
        if (hasTimeColumn && fields.length > 3) {
          const timeValue = fields[3].trim();
          if (timeValue && !isNaN(parseInt(timeValue))) {
            timeSeconds = parseInt(timeValue);
            wrongAnswersStartIndex = 4; // Wrong answers start after time column
          }
        }

        const wrongAnswers = fields.slice(wrongAnswersStartIndex)
          .map(ans => ans.trim())
          .filter(ans => ans !== '');

        if (!questionText) {
          throw new Error(`Row ${index + 2}: Question text is empty`);
        }
        if (!correctAnswer) {
          throw new Error(`Row ${index + 2}: Correct answer is empty`);
        }
        if (isNaN(score) || score <= 0) {
          throw new Error(`Row ${index + 2}: Invalid score "${fields[2]}". Must be a positive number`);
        }
        if (wrongAnswers.length < 1) {
          throw new Error(`Row ${index + 2}: At least one wrong answer is required`);
        }

        questions.push({
          id: Date.now() + index,
          questionText: questionText,
          numberOfChoices: wrongAnswers.length + 1,
          correctAnswer: correctAnswer,
          wrongAnswers: wrongAnswers,
          score: score,
          timeSeconds: timeSeconds
        });
      } catch (error) {
        throw new Error(`Error parsing row ${index + 2}: ${error.message}`);
      }
    });

    return questions;
  };

  const parseCSVLine = (line) => {
    const fields = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(field);
        field = '';
      } else {
        field += char;
      }
    }

    fields.push(field);
    return fields.map(f => f.trim());
  };

  const downloadCSVTemplate = () => {
    // Generate template with Time column if time type is perQuestion
    const includeTime = quizData.timeType === 'perQuestion';
    
    const headers = includeTime 
      ? `Question,Correct Answer,Score,Time (seconds),Wrong Answer 1,Wrong Answer 2,Wrong Answer 3,Wrong Answer 4,Wrong Answer 5`
      : `Question,Correct Answer,Score,Wrong Answer 1,Wrong Answer 2,Wrong Answer 3,Wrong Answer 4,Wrong Answer 5`;
    
    const row1 = includeTime
      ? `"What is the main feature of our new mobile banking app?","Biometric authentication and instant transfers",25,30,"Cash withdrawal only","Foreign currency exchange","Loan processing system"`
      : `"What is the main feature of our new mobile banking app?","Biometric authentication and instant transfers",25,"Cash withdrawal only","Foreign currency exchange","Loan processing system"`;
    
    const row2 = includeTime
      ? `"Which Islamic banking principle does our product follow?","Sharia-compliant profit sharing",25,45,"Interest-based lending","Fixed deposit returns","Conventional banking methods"`
      : `"Which Islamic banking principle does our product follow?","Sharia-compliant profit sharing",25,"Interest-based lending","Fixed deposit returns","Conventional banking methods"`;
    
    const row3 = includeTime
      ? `"What is the maximum daily transfer limit for individual accounts?","PKR 500,000",25,30,"PKR 100,000","PKR 1,000,000","No limit"`
      : `"What is the maximum daily transfer limit for individual accounts?","PKR 500,000",25,"PKR 100,000","PKR 1,000,000","No limit"`;
    
    const template = `${headers}\n${row1}\n${row2}\n${row3}`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quiz_questions_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const clearImportedQuestions = () => {
    setQuizData({
      ...quizData,
      questions: []
    });
    setCsvFile(null);
    setCsvError('');
    // Reset file input to allow re-uploading
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  const handleAssignQuiz = (quiz) => {
    // Navigate to quiz assignment page with pre-selected quiz
    navigate('/quiz-assignments', { state: { selectedQuiz: quiz } });
  };

  return (
    <div className="quiz-creator-container">
      <button className="back-btn" onClick={handleBack} title="Go back">
        ←
      </button>
      <div className="quiz-creator-header">
        <h1>Quiz Manager</h1>
        <p>Create, browse, and edit product knowledge quizzes</p>
      </div>

      {/* View Mode Tabs */}
      <div className="view-mode-tabs">
        <button
          className={`tab-btn ${viewMode === 'create' ? 'active' : ''}`}
          onClick={() => {
            setViewMode('create');
            resetForm();
          }}
        >
          + Create New Quiz
        </button>
        <button
          className={`tab-btn ${viewMode === 'browse' ? 'active' : ''}`}
          onClick={() => setViewMode('browse')}
        >
          📋 Browse Quizzes
        </button>
        {editingQuizId && (
          <button className="tab-btn active">
            ✎ Editing Quiz
          </button>
        )}
      </div>

      {showSuccess && (
        <div className="success-message">
          ✓ {successMessage}
        </div>
      )}

      {/* Browse Mode */}
      {viewMode === 'browse' && (
        <div className="quiz-browse-section">
          <h2>Existing Quizzes</h2>
          <div className="overview-filters" style={{ marginBottom: '16px' }}>
            <select
              className="quiz-select"
              value={browseFilters.assignmentStatus}
              onChange={(e) => setBrowseFilters((prev) => ({ ...prev, assignmentStatus: e.target.value }))}
            >
              <option value="all">All Assignment States</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Not Assigned</option>
            </select>

            <select
              className="quiz-select"
              value={browseFilters.regulatory}
              onChange={(e) => setBrowseFilters((prev) => ({ ...prev, regulatory: e.target.value }))}
            >
              <option value="all">All Regulatory Types</option>
              <option value="true">Regulatory</option>
              <option value="false">Non-Regulatory</option>
            </select>

            <input
              type="date"
              className="quiz-input"
              value={browseFilters.createdFrom}
              onChange={(e) => setBrowseFilters((prev) => ({ ...prev, createdFrom: e.target.value }))}
            />

            <input
              type="date"
              className="quiz-input"
              value={browseFilters.createdTo}
              onChange={(e) => setBrowseFilters((prev) => ({ ...prev, createdTo: e.target.value }))}
            />

            <input
              type="text"
              className="quiz-input"
              placeholder="Filter by department..."
              value={browseFilters.departmentName}
              onChange={(e) => setBrowseFilters((prev) => ({ ...prev, departmentName: e.target.value }))}
            />

            <Button
              onClick={() => setBrowseFilters({
                assignmentStatus: 'all',
                createdFrom: '',
                createdTo: '',
                regulatory: 'all',
                departmentName: ''
              })}
              variant="outline"
            >
              Clear Filters
            </Button>
          </div>
          {loadingQuizzes ? (
            <div className="loading">Loading quizzes...</div>
          ) : allQuizzes.length === 0 ? (
            <div className="empty-state">
              <p>No quizzes created yet.</p>
              <Button onClick={() => setViewMode('create')}>Create First Quiz</Button>
            </div>
          ) : (
            <div className="quizzes-grid">
              {allQuizzes.map(quiz => (
                <div key={quiz.quiz_id} className="quiz-card">
                  <div className="quiz-card-header">
                    <h3>{quiz.subject}</h3>
                    <div className="quiz-card-badges">
                      <span className="question-count">{quiz.question_count} Questions</span>
                      <span className={`status-badge ${quiz.is_active ? 'badge-active' : 'badge-inactive'}`}>
                        {quiz.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="quiz-card-details">
                    <p><strong>Passing Marks:</strong> {quiz.passing_marks}/{quiz.total_score}</p>
                    <p><strong>Time:</strong> {quiz.time_type === 'total' ? `${quiz.total_time} min` : `${quiz.time_per_question} sec per Q`}</p>
                    <p><strong>Initiating Department:</strong> {quiz.department_name || '-'}</p>
                    <p><strong>Regulatory:</strong> {quiz.is_regulatory ? 'Yes' : 'No'}</p>
                    <p><strong>Assigned:</strong> {(quiz.assignment_count || 0) > 0 ? 'Yes' : 'No'} ({quiz.assignment_count || 0})</p>
                    <p><strong>Created:</strong> {formatDate(quiz.created_at)}</p>
                    <p><strong>Last Updated:</strong> {formatDate(quiz.updated_at)}</p>
                    {quiz.created_by && <p><strong>Created By:</strong> {quiz.created_by}</p>}
                  </div>
                  <div className="quiz-card-actions">
                    <Button
                      onClick={() => loadQuizForEdit(quiz.quiz_id)}
                      className="edit-btn"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleAssignQuiz(quiz)}
                      className="assign-btn"
                    >
                      Assign
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Mode */}
      {(viewMode === 'create' || viewMode === 'edit') && (
        <div className="quiz-creator-content">
          {/* Tab Navigation for Edit Mode */}
          {editingQuizId && (
            <div className="edit-tabs">
              <button
                className={`tab-button ${editTab === 'properties' ? 'active' : ''}`}
                onClick={() => setEditTab('properties')}
              >
                Properties
              </button>
              <button
                className={`tab-button ${editTab === 'assignments' ? 'active' : ''}`}
                onClick={() => setEditTab('assignments')}
              >
                Assignments
              </button>
            </div>
          )}

          {/* Properties Tab Content */}
          {(!editingQuizId || editTab === 'properties') && (
            <>
          {/* Quiz Settings Section */}
          <div className="quiz-settings-section">
            <h2>{editingQuizId ? 'Edit Quiz Settings' : 'Quiz Settings'}</h2>

            <div className="form-group">
              <label>Quiz Subject *</label>
              <input
                type="text"
                placeholder="e.g., Product Features Q1 2026"
                value={quizData.subject}
                onChange={(e) => handleQuizDataChange('subject', e.target.value)}
                className="quiz-input"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Initiating Department *</label>
                <input
                  type="text"
                  value={quizData.departmentName}
                  onChange={(e) => handleQuizDataChange('departmentName', e.target.value)}
                  className="quiz-input"
                  placeholder="e.g., Retail Banking"
                />
                <span className="helper-text">Department initiating this quiz</span>
              </div>

            <div className="form-row">
              <div className="form-group">
                <label>Attempt Limit</label>
                <select
                  value={quizData.maxAttempts === '' ? 'unlimited' : 'limited'}
                  onChange={(e) => {
                    if (e.target.value === 'unlimited') {
                      handleQuizDataChange('maxAttempts', '');
                    } else if (quizData.maxAttempts === '') {
                      handleQuizDataChange('maxAttempts', '2');
                    }
                  }}
                  className="quiz-select"
                >
                  <option value="unlimited">Unlimited attempts</option>
                  <option value="limited">Restrict attempts</option>
                </select>
                <span className="helper-text">Example: set to 2 to allow only 2 attempts per user</span>
              </div>

              {quizData.maxAttempts !== '' && (
                <div className="form-group">
                  <label>Max Attempts</label>
                  <input
                    type="number"
                    value={quizData.maxAttempts}
                    onChange={(e) => handleQuizDataChange('maxAttempts', e.target.value)}
                    className="quiz-input"
                    min="1"
                    placeholder="e.g., 2"
                  />
                </div>
              )}
            </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={quizData.isRegulatory}
                    onChange={(e) => handleQuizDataChange('isRegulatory', e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  Regulatory/Compliance Requirement
                </label>
                <span className="helper-text">Mark this quiz as regulatory/compliance-related</span>
              </div>
            </div>



            <div className="form-group">
              <label>Study Material (PDF/Word/PowerPoint)</label>
              <input
                ref={studyMaterialInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                onChange={handleStudyMaterialUpload}
                className="hidden-file-input"
              />

              <div className="study-material-actions">
                <Button
                  type="button"
                  className="study-material-btn"
                  onClick={() => studyMaterialInputRef.current?.click()}
                >
                  {quizData.studyMaterialUrl ? 'Change Material' : 'Upload Material'}
                </Button>

                {quizData.studyMaterialUrl && (
                  <Button
                    type="button"
                    className="study-material-remove-btn"
                    onClick={handleRemoveStudyMaterial}
                  >
                    Remove
                  </Button>
                )}
              </div>

              {quizData.studyMaterialName && quizData.studyMaterialUrl && (
                <div className="study-material-info">
                  <span className="success-text">✓ Uploaded: {quizData.studyMaterialName}</span>
                  <a
                    href={`http://${window.location.hostname}:5000${quizData.studyMaterialUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="study-material-link"
                  >
                    Open Material
                  </a>
                </div>
              )}
              <span className="helper-text">Users can open this document before attempting the quiz.</span>
            </div>

            <div className="form-group">
              <label>Passing Marks *</label>
              <input
                type="number"
                placeholder="Minimum score to pass"
                value={quizData.passingMarks}
                onChange={(e) => handleQuizDataChange('passingMarks', e.target.value)}
                className="quiz-input"
                min="0"
              />
              {quizData.questions.length > 0 && (
                <span className="helper-text">Total Score: {getTotalScore()}</span>
              )}
            </div>

            <div className="form-group">
              <label>Time Setting *</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    value="total"
                    checked={quizData.timeType === 'total'}
                    onChange={(e) => handleQuizDataChange('timeType', e.target.value)}
                  />
                  Total Time for Quiz
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    value="perQuestion"
                    checked={quizData.timeType === 'perQuestion'}
                    onChange={(e) => handleQuizDataChange('timeType', e.target.value)}
                  />
                  Time per Question
                </label>
              </div>
            </div>

            <div className="form-row">
              {quizData.timeType === 'total' ? (
                <div className="form-group">
                  <label>Total Time (minutes) *</label>
                  <input
                    type="number"
                    placeholder="Total time for entire quiz"
                    value={quizData.totalTime}
                    onChange={(e) => handleQuizDataChange('totalTime', e.target.value)}
                    className="quiz-input"
                    min="1"
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label>Time per Question (seconds) *</label>
                  <input
                    type="number"
                    placeholder="Time allowed per question"
                    value={quizData.timePerQuestion}
                    onChange={(e) => handleQuizDataChange('timePerQuestion', e.target.value)}
                    className="quiz-input"
                    min="1"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Total Questions to Show in Quiz *</label>
                <input
                  type="number"
                  placeholder="e.g., 10 (system will show 10 random questions from all questions added)"
                  value={quizData.totalQuestionsToShow}
                  onChange={(e) => handleQuizDataChange('totalQuestionsToShow', e.target.value)}
                  className="quiz-input"
                  min="1"
                />
                {quizData.totalQuestionsToShow && quizData.questions.length > 0 && (
                  <span className={`helper-text ${quizData.questions.length < parseInt(quizData.totalQuestionsToShow) ? 'error' : 'success'}`}>
                    {quizData.questions.length >= parseInt(quizData.totalQuestionsToShow)
                      ? `✓ You have ${quizData.questions.length} questions (need ${quizData.totalQuestionsToShow})`
                      : `✗ You have ${quizData.questions.length} questions (need ${quizData.totalQuestionsToShow})`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Question Builder Section */}
          <div className="question-builder-section">
            <h2>Add Questions</h2>

            {!editingQuizId && (
              <div className="import-mode-selector">
                <label className="radio-label">
                  <input
                    type="radio"
                    value="manual"
                    checked={importMode === 'manual'}
                    onChange={(e) => setImportMode(e.target.value)}
                  />
                  Add Questions Manually
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    value="csv"
                    checked={importMode === 'csv'}
                    onChange={(e) => setImportMode(e.target.value)}
                  />
                  Import from CSV File
                </label>
              </div>
            )}

            {importMode === 'csv' && !editingQuizId ? (
              <div className="csv-import-section">
                <div className="csv-instructions">
                  <p><strong>CSV File Format:</strong></p>
                  <ul>
                    <li>Column 1: Question text</li>
                    <li>Column 2: Correct answer</li>
                    <li>Column 3: Score (numeric)</li>
                    {quizData.timeType === 'perQuestion' && (
                      <li>Column 4: Time (seconds) - Optional, leave blank to use default</li>
                    )}
                    <li>Column {quizData.timeType === 'perQuestion' ? '5' : '4'}+: Wrong answers (at least 1 required, up to 5 supported)</li>
                  </ul>
                  <p>First row should be headers. Use quotes for fields containing commas.</p>
                  <Button onClick={downloadCSVTemplate} className="download-template-btn">
                    Download CSV Template
                  </Button>
                </div>

                <div className="form-group">
                  <label>Upload CSV File</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="csv-file-input"
                  />
                  {csvError && <span className="error-text">{csvError}</span>}
                  {csvFile && !csvError && (
                    <span className="success-text">✓ File uploaded: {csvFile.name}</span>
                  )}
                </div>

                {quizData.questions.length > 0 && (
                  <div className="csv-actions">
                    <Button onClick={clearImportedQuestions} variant="outline">
                      Clear Imported Questions
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="manual-input-section">
                <div className="form-group">
                  <label>Question Text *</label>
                  <textarea
                    placeholder="Enter your question here"
                    value={currentQuestion.questionText}
                    onChange={(e) => handleQuestionChange('questionText', e.target.value)}
                    className="quiz-textarea"
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>Number of Choices *</label>
                  <select
                    value={currentQuestion.numberOfChoices}
                    onChange={(e) => handleChoicesChange(e.target.value)}
                    className="quiz-select"
                  >
                    <option value="2">2 Choices</option>
                    <option value="3">3 Choices</option>
                    <option value="4">4 Choices</option>
                    <option value="5">5 Choices</option>
                    <option value="6">6 Choices</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Correct Answer *</label>
                  <input
                    type="text"
                    placeholder="Enter the correct answer"
                    value={currentQuestion.correctAnswer}
                    onChange={(e) => handleQuestionChange('correctAnswer', e.target.value)}
                    className="quiz-input correct-answer"
                  />
                </div>

                <div className="form-group">
                  <label>Wrong Answers * (at least {currentQuestion.numberOfChoices - 1} required)</label>
                  {currentQuestion.wrongAnswers.map((answer, index) => (
                    <input
                      key={index}
                      type="text"
                      placeholder={`Wrong answer ${index + 1}`}
                      value={answer}
                      onChange={(e) => handleWrongAnswerChange(index, e.target.value)}
                      className="quiz-input wrong-answer"
                    />
                  ))}
                </div>

                <div className="form-group">
                  <label>Score for this Question *</label>
                  <input
                    type="number"
                    placeholder="Points for correct answer"
                    value={currentQuestion.score}
                    onChange={(e) => handleQuestionChange('score', e.target.value)}
                    className="quiz-input"
                    min="0"
                    step="0.5"
                  />
                </div>

                {quizData.timeType === 'perQuestion' && (
                  <div className="form-group">
                    <label>Time for this Question (seconds)</label>
                    <input
                      type="number"
                      placeholder="Time allowed for this question"
                      value={currentQuestion.timeSeconds}
                      onChange={(e) => handleQuestionChange('timeSeconds', e.target.value)}
                      className="quiz-input"
                      min="1"
                    />
                    <span className="helper-text">
                      Leave blank to use default time ({quizData.timePerQuestion || '30'} seconds)
                    </span>
                  </div>
                )}

                <Button onClick={addQuestion}>
                  Add Question to Quiz
                </Button>
              </div>
            )}
          </div>

          {/* Questions List Section */}
          {quizData.questions.length > 0 && (
            <div className="questions-list-section">
              <h2>Questions Added ({quizData.questions.length})</h2>
              <div className="questions-list">
                {quizData.questions.map((question, index) => (
                  <div key={question.id} className="question-card">
                    <div className="question-header">
                      <span className="question-number">Q{index + 1}</span>
                      <span className="question-score">{question.score} pts</span>
                      {quizData.timeType === 'perQuestion' && question.timeSeconds && (
                        <span className="question-time">⏱ {question.timeSeconds}s</span>
                      )}
                      <button
                        className="remove-btn"
                        onClick={() => removeQuestion(question.id)}
                      >
                        ✕
                      </button>
                    </div>
                    <p className="question-text">{question.questionText}</p>
                    <div className="answers-preview">
                      <div className="correct-preview">✓ {question.correctAnswer}</div>
                      {question.wrongAnswers.map((ans, idx) => (
                        <div key={idx} className="wrong-preview">✗ {ans}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="quiz-summary">
                <p>Total Questions: {quizData.questions.length}</p>
                <p>Total Score: {getTotalScore()}</p>
              </div>
            </div>
          )}

          {/* Save Quiz Button */}
          {quizData.questions.length > 0 && (
            <div className="save-quiz-section">
              <Button onClick={saveQuiz} className="save-quiz-btn">
                {editingQuizId ? 'Update Quiz' : 'Create Quiz'}
              </Button>
              {editingQuizId && (
                <Button
                  onClick={() => {
                    setViewMode('browse');
                    resetForm();
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </Button>
              )}
            </div>
          )}
            </>
          )}

          {/* Assignments Tab Content */}
          {editingQuizId && editTab === 'assignments' && (
            <div className="assignments-tab-content">
              <div className="assignments-header">
                <h2>Quiz Assignments</h2>
                <Button onClick={() => setShowAssignmentForm(!showAssignmentForm)}>
                  {showAssignmentForm ? 'Cancel' : 'Create New Assignment'}
                </Button>
              </div>

              {/* Assignment Form */}
              {showAssignmentForm && (
                <div className="assignment-form-section">
                  <h3>Create Assignment</h3>
                  <form onSubmit={handleCreateAssignment}>
                    <div className="form-group">
                      <label>Assignment Name *</label>
                      <input
                        type="text"
                        placeholder="e.g., Q1 2024 Product Quiz"
                        value={assignmentForm.assignment_name}
                        onChange={(e) => setAssignmentForm({...assignmentForm, assignment_name: e.target.value})}
                        className="quiz-input"
                        required
                      />
                    </div>

                    <div className="form-row" ref={assignmentDropdownRef}>
                      <div className="form-group">
                        <label>Departments (Select multiple)</label>
                        <div className="multi-dropdown">
                          <button
                            type="button"
                            className="multi-dropdown-trigger"
                            onClick={() => toggleAssignmentFilterDropdown('department')}
                          >
                            {getAssignmentSelectedLabel(assignmentForm.filter_department, 'Departments')}
                          </button>
                          {assignmentFilterDropdownOpen.department && (
                            <div className="multi-dropdown-menu">
                              {departments.map(dept => (
                                <label key={dept} className="multi-dropdown-item">
                                  <input
                                    type="checkbox"
                                    checked={assignmentForm.filter_department.includes(dept)}
                                    onChange={() => toggleAssignmentFilterValue('filter_department', dept)}
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
                            onClick={() => toggleAssignmentFilterDropdown('role')}
                          >
                            {getAssignmentSelectedLabel(assignmentForm.filter_role, 'Roles')}
                          </button>
                          {assignmentFilterDropdownOpen.role && (
                            <div className="multi-dropdown-menu">
                              {roles.map(role => (
                                <label key={role} className="multi-dropdown-item">
                                  <input
                                    type="checkbox"
                                    checked={assignmentForm.filter_role.includes(role)}
                                    onChange={() => toggleAssignmentFilterValue('filter_role', role)}
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
                            onClick={() => toggleAssignmentFilterDropdown('grade')}
                          >
                            {getAssignmentSelectedLabel(assignmentForm.filter_grade, 'Grades')}
                          </button>
                          {assignmentFilterDropdownOpen.grade && (
                            <div className="multi-dropdown-menu">
                              {grades.map(grade => (
                                <label key={grade} className="multi-dropdown-item">
                                  <input
                                    type="checkbox"
                                    checked={assignmentForm.filter_grade.includes(grade)}
                                    onChange={() => toggleAssignmentFilterValue('filter_grade', grade)}
                                  />
                                  <span>{grade}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Period Type *</label>
                        <select
                          value={assignmentForm.period_type}
                          onChange={(e) => setAssignmentForm({...assignmentForm, period_type: e.target.value, expiry_date: e.target.value === 'once' ? assignmentForm.expiry_date : ''})}
                          className="quiz-select"
                          required
                        >
                          <option value="once">One-Time</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="half-yearly">Half-Yearly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Period Start Date *</label>
                        <input
                          type="date"
                          value={assignmentForm.period_start_date}
                          onChange={(e) => setAssignmentForm({...assignmentForm, period_start_date: e.target.value})}
                          className="quiz-input"
                          required
                        />
                      </div>

                      {assignmentForm.period_type === 'once' && (
                        <div className="form-group">
                          <label>Expiry Date *</label>
                          <input
                            type="date"
                            value={assignmentForm.expiry_date}
                            onChange={(e) => setAssignmentForm({...assignmentForm, expiry_date: e.target.value})}
                            className="quiz-input"
                            min={assignmentForm.period_start_date}
                            required
                          />
                        </div>
                      )}
                    </div>

                    <span className="helper-text">
                      {assignmentForm.period_type === 'once'
                        ? 'One-time assignments require explicit expiry date.'
                        : 'Recurring assignments auto-expire at the end of selected period.'}
                    </span>

                    {showAssignmentForm && (
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
                        <div className="eligible-count-display" style={{background: '#fff3cd', borderColor: '#ffc107', color: '#856404'}}>
                          <strong>0</strong> employee(s) match the selected filters. Adjust filters or leave empty for all active employees.
                        </div>
                      )
                    )}

                    <Button type="submit" className="save-quiz-btn" disabled={eligibleEmployees.length === 0}>
                      Create Assignment
                    </Button>
                  </form>
                </div>
              )}

              {/* Assignments List */}
              <div className="assignments-list-section">
                <h3>Existing Assignments</h3>
                {loadingAssignments ? (
                  <p>Loading assignments...</p>
                ) : quizAssignments.length === 0 ? (
                  <p className="no-data">No assignments for this quiz yet.</p>
                ) : (
                  <div className="assignments-grid">
                    {quizAssignments.map(assignment => (
                      <div key={assignment.assignment_id} className="assignment-card">
                        <div className="assignment-header">
                          <h4>{assignment.assignment_name}</h4>
                          <button
                            className="delete-assignment-btn"
                            onClick={() => handleDeleteAssignment(assignment.assignment_id)}
                          >
                            Delete
                          </button>
                        </div>
                        <div className="assignment-details">
                          <p><strong>Period:</strong> {assignment.period_type}</p>
                          <p><strong>Start Date:</strong> {new Date(assignment.period_start_date).toLocaleDateString()}</p>
                          <p><strong>Expiry Date:</strong> {assignment.period_end_date ? new Date(assignment.period_end_date).toLocaleDateString() : 'Recurrent'}</p>
                          {assignment.filter_department && <p><strong>Department:</strong> {assignment.filter_department}</p>}
                          {assignment.filter_role && <p><strong>Role:</strong> {assignment.filter_role}</p>}
                          {assignment.filter_grade && <p><strong>Grade:</strong> {assignment.filter_grade}</p>}
                          <p><strong>Employees:</strong> {assignment.employee_count || 'N/A'}</p>
                          <p className="assignment-date">Created: {new Date(assignment.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuizCreator;
