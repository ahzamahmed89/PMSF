import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/QuizCreator.css';
import Button from './Button';
import { API_URL } from '../config/api';

const QuizCreator = () => {
  // View management
  const [viewMode, setViewMode] = useState('create'); // 'create', 'browse', or 'edit'
  const [editingQuizId, setEditingQuizId] = useState(null);

  // Quizzes list
  const [allQuizzes, setAllQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);

  // Quiz data
  const [quizData, setQuizData] = useState({
    subject: '',
    passingMarks: '',
    timeType: 'total',
    totalTime: '',
    timePerQuestion: '',
    questions: []
  });

  const [currentQuestion, setCurrentQuestion] = useState({
    questionText: '',
    numberOfChoices: 4,
    correctAnswer: '',
    wrongAnswers: ['', '', ''],
    score: ''
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
  }, [viewMode]);

  const fetchAllQuizzes = async () => {
    setLoadingQuizzes(true);
    try {
      const response = await axios.get(`${API_URL}/quizzes`);
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
        questions: quiz.questions.map(q => ({
          id: q.question_id,
          questionText: q.question_text,
          numberOfChoices: q.number_of_choices,
          correctAnswer: q.correct_answer,
          wrongAnswers: Array.isArray(q.wrongAnswers) 
            ? q.wrongAnswers 
            : (q.wrong_answers ? q.wrong_answers.map(wa => wa.wrong_answer_text) : []),
          score: q.score
        }))
      });

      setViewMode('edit');
    } catch (error) {
      console.error('Error loading quiz:', error);
      alert('Failed to load quiz for editing: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleQuizDataChange = (field, value) => {
    setQuizData({ ...quizData, [field]: value });
  };

  const handleQuestionChange = (field, value) => {
    setCurrentQuestion({ ...currentQuestion, [field]: value });
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
      score: parseFloat(currentQuestion.score)
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
    if (quizData.questions.length === 0) {
      alert('Please add at least one question');
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
        createdBy: username,
        lastEditedBy: username,
        questions: quizData.questions.map(q => ({
          questionText: q.questionText,
          numberOfChoices: q.numberOfChoices,
          correctAnswer: q.correctAnswer,
          wrongAnswers: q.wrongAnswers,
          score: q.score
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
    setQuizData({
      subject: '',
      passingMarks: '',
      timeType: 'total',
      totalTime: '',
      timePerQuestion: '',
      questions: []
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

        const wrongAnswers = fields.slice(3)
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
          score: score
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
    const template = `Question,Correct Answer,Score,Wrong Answer 1,Wrong Answer 2,Wrong Answer 3,Wrong Answer 4,Wrong Answer 5
"What is the main feature of our new mobile banking app?","Biometric authentication and instant transfers",25,"Cash withdrawal only","Foreign currency exchange","Loan processing system"
"Which Islamic banking principle does our product follow?","Sharia-compliant profit sharing",25,"Interest-based lending","Fixed deposit returns","Conventional banking methods"
"What is the maximum daily transfer limit for individual accounts?","PKR 500,000",25,"PKR 100,000","PKR 1,000,000","No limit"`;

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
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="quiz-creator-container">
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
                    <span className="question-count">{quiz.question_count} Questions</span>
                  </div>
                  <div className="quiz-card-details">
                    <p><strong>Passing Marks:</strong> {quiz.passing_marks}/{quiz.total_score}</p>
                    <p><strong>Time:</strong> {quiz.time_type === 'total' ? `${quiz.total_time} min` : `${quiz.time_per_question} sec per Q`}</p>
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
                    <li>Column 4+: Wrong answers (at least 1 required, up to 5 supported)</li>
                  </ul>
                  <p>First row should be headers. Use quotes for fields containing commas.</p>
                  <Button onClick={downloadCSVTemplate} className="download-template-btn">
                    Download CSV Template
                  </Button>
                </div>

                <div className="form-group">
                  <label>Upload CSV File</label>
                  <input
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
        </div>
      )}
    </div>
  );
};

export default QuizCreator;
