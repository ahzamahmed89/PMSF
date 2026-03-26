import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/QuizAttempt.css';
import Button from './Button';
import Modal from './Modal';
import PageHeader from './PageHeader';
import BackButton from './BackButton';
import { API_URL } from '../config/api';

const QuizAttempt = ({ onLogout }) => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [shuffledAnswers, setShuffledAnswers] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [attemptProgress, setAttemptProgress] = useState({});
  const [assignmentDetails, setAssignmentDetails] = useState({});
  const [currentAssignmentId, setCurrentAssignmentId] = useState(null);
  const [assignedQuizRows, setAssignedQuizRows] = useState([]);
  const [trainingFilter, setTrainingFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [showAllPending, setShowAllPending] = useState(false);
  const [preStartQuiz, setPreStartQuiz] = useState(null);
  const [timeUpAction, setTimeUpAction] = useState('submit');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleBack = () => {
    if (quizStarted || quizCompleted) {
      // Return to quiz selection within this page
      setQuizStarted(false);
      setQuizCompleted(false);
      setSelectedQuiz(null);
      setResults(null);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
    } else {
      navigate(-1);
    }
  };

  // Load quizzes from API
  useEffect(() => {
    const username = localStorage.getItem('username') || 'guest';
    fetchQuizzes();
    fetchAttemptProgress(username);
  }, []);

  const fetchAttemptProgress = async (userId) => {
    try {
      const response = await axios.get(`${API_URL}/quiz-attempts/progress/${userId}`);
      const progressMap = {};

      response.data.forEach((item) => {
        progressMap[item.quiz_id] = item;
      });

      setAttemptProgress(progressMap);
    } catch (error) {
      console.error('Error fetching attempt progress:', error);
    }
  };

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const username = localStorage.getItem('username') || 'guest';
      
      // Fetch only assigned quizzes for the current user
      const response = await axios.get(`${API_URL}/quiz-assignments/my-quizzes/${username}`, {
        headers: getAuthHeaders()
      });

      const assignedQuizzes = Array.isArray(response.data)
        ? response.data
        : (response.data?.assigned_quizzes || []);
      
      // Map assignment details and quiz data
      const detailsMap = {};
      const transformedQuizzes = assignedQuizzes.map(item => {
        detailsMap[item.quiz_id] = {
          attempt_id: item.attempt_id,
          assignment_id: item.assignment_id,
          assignment_name: item.assignment_name,
          period_type: item.period_type,
          period_start_date: item.period_start_date,
          period_end_date: item.period_end_date,
          status: item.status,
          expires_at: item.expires_at,
          attempts_left: item.remaining_attempts,
          max_attempts: item.max_attempts
        };
        
        return {
          id: item.quiz_id,
          subject: item.quiz_title,
          passingMarks: item.passing_marks,
          totalScore: item.total_score,
          timeType: item.time_type,
          totalTime: item.total_time,
          timePerQuestion: item.time_per_question,
          totalQuestionsToShow: item.total_questions_to_show,
          maxAttempts: item.max_attempts,
          studyMaterialName: item.study_material_name,
          studyMaterialUrl: item.study_material_url,
          questions: []
        };
      });
      
      setAssignmentDetails(detailsMap);
      setAssignedQuizRows(assignedQuizzes);
      setQuizzes(transformedQuizzes);
    } catch (error) {
      console.error('Error fetching assigned quizzes:', error);
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  };

  // Timer effect
  useEffect(() => {
    if (!quizStarted || quizCompleted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, quizCompleted, currentQuestionIndex]);

  const handleTimeUp = () => {
    const isPerQuestion = selectedQuiz?.timeType === 'perQuestion';
    const isLastQuestion = selectedQuiz
      ? currentQuestionIndex >= selectedQuiz.questions.length - 1
      : true;

    if (isPerQuestion && !isLastQuestion) {
      setTimeUpAction('next');
      setShowTimeUpModal(true);
      setTimeout(() => {
        setShowTimeUpModal(false);
        goToNextQuestion();
      }, 1500);
      return;
    }

    setTimeUpAction('submit');
    setShowTimeUpModal(true);
    setTimeout(() => {
      setShowTimeUpModal(false);
      submitQuiz();
    }, 1800);
  };

  const startQuiz = async (quiz) => {
    try {
      const progress = attemptProgress[quiz.id];
      if (progress && progress.can_attempt === false) {
        alert(`Attempt limit reached for this quiz. Max allowed: ${progress.max_attempts}`);
        return;
      }
      
      const assignmentId = assignmentDetails[quiz.id]?.assignment_id;
      setCurrentAssignmentId(assignmentId);

      setLoading(true);
      // Fetch full quiz details including questions
      const response = await axios.get(`${API_URL}/quizzes/${quiz.id}`);
      
      const allQuestions = response.data.questions.map(q => ({
        id: q.question_id,
        questionText: q.question_text,
        correctAnswer: q.correct_answer,
        wrongAnswers: q.wrongAnswers,
        score: q.score,
        numberOfChoices: q.number_of_choices,
        timeSeconds: q.time_seconds // Individual time allocation for this question
      }));

      // Get totalQuestionsToShow - if not specified, use all questions
      const totalQuestionsToShow = response.data.total_questions_to_show || allQuestions.length;
      
      // Randomly select the specified number of questions
      const selectedQuestions = randomlySelectQuestions(allQuestions, totalQuestionsToShow);
      
      const fullQuiz = {
        id: response.data.quiz_id,
        subject: response.data.subject,
        passingMarks: response.data.passing_marks,
        totalScore: response.data.total_score,
        timeType: response.data.time_type,
        totalTime: response.data.total_time,
        timePerQuestion: response.data.time_per_question,
        totalQuestionsToShow: totalQuestionsToShow,
        maxAttempts: response.data.max_attempts,
        studyMaterialName: response.data.study_material_name,
        studyMaterialUrl: response.data.study_material_url,
        questions: selectedQuestions
      };
      
      setSelectedQuiz(fullQuiz);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setQuizCompleted(false);
      setResults(null);
      setStartTime(Date.now());
      
      // Set time based on quiz settings
      if (fullQuiz.timeType === 'total') {
        setTimeLeft(fullQuiz.totalTime * 60); // Convert minutes to seconds
      } else {
        // Use individual question time if available, otherwise use quiz default
        const firstQuestionTime = fullQuiz.questions[0].timeSeconds || fullQuiz.timePerQuestion;
        setTimeLeft(firstQuestionTime);
      }
      
      // Shuffle answers for first question
      shuffleAnswersForQuestion(fullQuiz.questions[0]);
      
      setQuizStarted(true);
    } catch (error) {
      console.error('Error loading quiz:', error);
      alert('Failed to load quiz details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const randomlySelectQuestions = (questions, count) => {
    // Ensure we don't try to select more questions than available
    const selectCount = Math.min(count, questions.length);
    
    // Create a copy of the questions array
    const questionsCopy = [...questions];
    const selectedQuestions = [];
    
    // Fisher-Yates shuffle and select
    for (let i = 0; i < selectCount; i++) {
      const randomIndex = Math.floor(Math.random() * (questionsCopy.length - i)) + i;
      [questionsCopy[i], questionsCopy[randomIndex]] = [questionsCopy[randomIndex], questionsCopy[i]];
      selectedQuestions.push(questionsCopy[i]);
    }
    
    return selectedQuestions;
  };

  const shuffleAnswersForQuestion = (question) => {
    const wrongAnswerPool = Array.isArray(question.wrongAnswers)
      ? [...question.wrongAnswers]
      : [];
    const requiredWrongAnswers = Math.min(wrongAnswerPool.length, 3);
    const wrongAnswersToUse = [];

    while (wrongAnswersToUse.length < requiredWrongAnswers && wrongAnswerPool.length > 0) {
      const randomIndex = Math.floor(Math.random() * wrongAnswerPool.length);
      wrongAnswersToUse.push(wrongAnswerPool.splice(randomIndex, 1)[0]);
    }

    const allAnswers = [
      { text: question.correctAnswer, isCorrect: true },
      ...wrongAnswersToUse.map(ans => ({ 
        text: ans, 
        isCorrect: false 
      }))
    ];
    
    // Fisher-Yates shuffle
    for (let i = allAnswers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allAnswers[i], allAnswers[j]] = [allAnswers[j], allAnswers[i]];
    }
    
    setShuffledAnswers(allAnswers);
  };

  const handleAnswerSelect = (answer) => {
    setUserAnswers({
      ...userAnswers,
      [currentQuestionIndex]: answer
    });
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < selectedQuiz.questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      shuffleAnswersForQuestion(selectedQuiz.questions[nextIndex]);
      
      // If using per-question timer, reset time
      if (selectedQuiz.timeType === 'perQuestion') {
        const nextQuestionTime = selectedQuiz.questions[nextIndex].timeSeconds || selectedQuiz.timePerQuestion;
        setTimeLeft(nextQuestionTime);
      }
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      shuffleAnswersForQuestion(selectedQuiz.questions[prevIndex]);
      
      // If using per-question timer, reset time
      if (selectedQuiz.timeType === 'perQuestion') {
        const prevQuestionTime = selectedQuiz.questions[prevIndex].timeSeconds || selectedQuiz.timePerQuestion;
        setTimeLeft(prevQuestionTime);
      }
    }
  };

  const checkIfAllAnswered = () => {
    return selectedQuiz.questions.every((_, index) => userAnswers[index] !== undefined);
  };

  const handleSubmitClick = () => {
    setShowSubmitModal(true);
  };

  const submitQuiz = async () => {
    setShowSubmitModal(false);
    
    let score = 0;
    const questionResults = selectedQuiz.questions.map((question, index) => {
      const userAnswer = userAnswers[index];
      const isCorrect = userAnswer?.text === question.correctAnswer;
      if (isCorrect) score += question.score;
      
      return {
        questionId: question.id,
        question: question.questionText,
        correctAnswer: question.correctAnswer,
        userAnswer: userAnswer?.text || 'Not Answered',
        isCorrect,
        score: isCorrect ? question.score : 0
      };
    });

    const passed = score >= selectedQuiz.passingMarks;
    const percentage = selectedQuiz.totalScore > 0
      ? Number(((score / selectedQuiz.totalScore) * 100).toFixed(2))
      : 0;
    const timeTaken = startTime ? Math.floor((Date.now() - startTime) / 1000) : null;
    
    const results = {
      score,
      totalScore: selectedQuiz.totalScore,
      passingMarks: selectedQuiz.passingMarks,
      passed,
      questionResults,
      answeredCount: Object.keys(userAnswers).length,
      totalQuestions: selectedQuiz.questions.length
    };
    
    setResults(results);
    setQuizCompleted(true);

    // Save attempt and update assignment status
    try {
      const username = localStorage.getItem('username') || 'guest';
      
      // Save quiz attempt
      await axios.post(`${API_URL}/quiz-attempts`, {
        quizId: selectedQuiz.id,
        userId: username,
        scoreObtained: score,
        totalScore: selectedQuiz.totalScore,
        passingMarks: selectedQuiz.passingMarks,
        passed: passed,
        questionsAnswered: Object.keys(userAnswers).length,
        totalQuestions: selectedQuiz.questions.length,
        timeTaken: timeTaken,
        answers: questionResults.map(result => ({
          questionId: result.questionId,
          userAnswer: result.userAnswer,
          correctAnswer: result.correctAnswer,
          isCorrect: result.isCorrect,
          scoreAwarded: result.score
        }))
      });
      
      // Update assignment status to completed if assigned
      if (currentAssignmentId) {
        try {
          const assignmentStatus = passed ? 'completed' : 'in_progress';
          await axios.put(`${API_URL}/quiz-assignments/${currentAssignmentId}/mark-completed`, {
            quiz_id: selectedQuiz.id,
            employee_id: username,
            status: assignmentStatus,
            score,
            percentage
          }, {
            headers: getAuthHeaders()
          });
        } catch (assignmentError) {
          console.warn('Could not update assignment status:', assignmentError);
        }
      }

      fetchAttemptProgress(username);
      fetchQuizzes();
    } catch (error) {
      console.error('Error saving quiz attempt:', error);
      if (error.response?.status === 403) {
        alert(error.response?.data?.error || 'Attempt limit reached for this quiz.');
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (value) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString();
  };

  const getStudyMaterialHref = (studyMaterialUrl) => {
    if (!studyMaterialUrl) return '';
    if (/^https?:\/\//i.test(studyMaterialUrl)) return studyMaterialUrl;
    if (studyMaterialUrl.startsWith('/')) return `http://${window.location.hostname}:5000${studyMaterialUrl}`;
    return `http://${window.location.hostname}:5000/${studyMaterialUrl}`;
  };

  const handleStartFromPreStart = async () => {
    if (!preStartQuiz) return;
    const quizToStart = preStartQuiz;
    setPreStartQuiz(null);
    await startQuiz(quizToStart);
  };

  const uniqueTrainings = Array.from(
    new Set(assignedQuizRows.map((quiz) => quiz.quiz_title).filter(Boolean))
  );

  const isSuccessfullyAttempted = (quizRow) => {
    const progress = attemptProgress[quizRow.quiz_id];
    if (progress?.successful_attempts > 0) return true;
    if (quizRow.score !== null && quizRow.passing_marks !== null) {
      return quizRow.score >= quizRow.passing_marks;
    }
    return false;
  };

  const filteredRows = assignedQuizRows.filter((quiz) => {
    const matchesTraining = trainingFilter === 'all' || quiz.quiz_title === trainingFilter;
    const mappedStatus = isSuccessfullyAttempted(quiz)
      ? 'completed'
      : 'pending';
    const matchesStatus = statusFilter === 'all' || mappedStatus === statusFilter;
    return matchesTraining && matchesStatus;
  });

  const pendingRows = filteredRows.filter(
    (quiz) => !isSuccessfullyAttempted(quiz)
  );
  const completedRows = filteredRows
    .filter((quiz) => isSuccessfullyAttempted(quiz))
    .sort((a, b) => {
      const first = a.completed_at ? new Date(a.completed_at).getTime() : 0;
      const second = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      return second - first;
    });

  const visibleCompletedRows = showAllCompleted ? completedRows : completedRows.slice(0, 3);
  const visiblePendingRows = showAllPending ? pendingRows : pendingRows.slice(0, 3);

  const restartQuiz = () => {
    setQuizStarted(false);
    setSelectedQuiz(null);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setQuizCompleted(false);
    setResults(null);
  };

  // Quiz Selection Screen
  if (!quizStarted) {
    return (
      <div className="quiz-attempt-container">
        <PageHeader onLogout={onLogout} />
        <BackButton onClick={handleBack} />
        <div className="quiz-selection-header">
          <h1>Product Knowledge Quiz</h1>
          <p>Select a quiz to test your knowledge</p>
        </div>

        {loading ? (
          <div className="no-quizzes">
            <p>Loading quizzes...</p>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="no-quizzes">
            <p>No quizzes available at the moment.</p>
            <p>Please contact your administrator.</p>
          </div>
        ) : (
          <>
            <div className="learning-dashboard">
              <div className="learning-dashboard-header">
                <h2>My Learning Dashboard</h2>
                <div className="learning-dashboard-metrics">
                  <span>Total Assigned: <strong>{assignedQuizRows.length}</strong></span>
                  <span>Pending: <strong>{pendingRows.length}</strong></span>
                  <span>Completed: <strong>{completedRows.length}</strong></span>
                </div>
              </div>

              <div className="learning-dashboard-filters">
                <select value={trainingFilter} onChange={(e) => setTrainingFilter(e.target.value)}>
                  <option value="all">All Trainings</option>
                  {uniqueTrainings.map((title) => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>

                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="learning-dashboard-columns">
                <div className="learning-dashboard-column">
                  <div className="learning-dashboard-column-header">
                    <h3>Last Completed Tests</h3>
                    {completedRows.length > 3 && (
                      <button type="button" onClick={() => setShowAllCompleted(prev => !prev)}>
                        {showAllCompleted ? 'Show Less' : 'See All'}
                      </button>
                    )}
                  </div>
                  {completedRows.length === 0 ? (
                    <p>No completed test yet.</p>
                  ) : (
                    <ul>
                      {visibleCompletedRows.map((quiz) => (
                        <li key={`completed-${quiz.assignment_id}-${quiz.attempt_id}`}>
                          <span>{quiz.quiz_title}</span>
                          <span>{formatDateTime(quiz.completed_at)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="learning-dashboard-column">
                  <div className="learning-dashboard-column-header">
                    <h3>Pending Tests</h3>
                    {pendingRows.length > 3 && (
                      <button type="button" onClick={() => setShowAllPending(prev => !prev)}>
                        {showAllPending ? 'Show Less' : 'See More'}
                      </button>
                    )}
                  </div>
                  {pendingRows.length === 0 ? (
                    <p>No pending test.</p>
                  ) : (
                    <ul>
                      {visiblePendingRows.map((quiz) => (
                        <li key={`pending-${quiz.assignment_id}-${quiz.attempt_id}`}>
                          <span>{quiz.quiz_title}</span>
                          <span>{quiz.expires_at ? `Expiry: ${formatDateTime(quiz.expires_at)}` : 'Expiry: Not set'}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="quiz-list">
            {quizzes
              .filter((quiz) => {
                const detail = assignmentDetails[quiz.id];
                if (!detail) return true;
                const matchingRow = assignedQuizRows.find((row) => row.quiz_id === quiz.id);
                if (matchingRow && isSuccessfullyAttempted(matchingRow)) return false;
                const byTraining = trainingFilter === 'all' || quiz.subject === trainingFilter;
                const detailStatus = matchingRow && isSuccessfullyAttempted(matchingRow) ? 'completed' : 'pending';
                const byStatus = statusFilter === 'all' || detailStatus === statusFilter;
                return byTraining && byStatus;
              })
              .map((quiz) => (
              <div key={quiz.id} className="quiz-card">
                <div className="quiz-card-header">
                  <h3>{quiz.subject}</h3>
                  <span className="quiz-badge">{quiz.question_count || 'Multiple'} Questions</span>
                </div>
                <div className="assignment-status-row">
                  <span className={`status-badge ${(() => {
                    const row = assignedQuizRows.find((item) => item.quiz_id === quiz.id);
                    return row && isSuccessfullyAttempted(row) ? 'attempted' : 'pending';
                  })()}`}>
                    {(() => {
                      const row = assignedQuizRows.find((item) => item.quiz_id === quiz.id);
                      return row && isSuccessfullyAttempted(row) ? 'Attempted' : 'Pending';
                    })()}
                  </span>
                  {assignmentDetails[quiz.id]?.expires_at && (
                    <span className="deadline-info">Due: {formatDateTime(assignmentDetails[quiz.id]?.expires_at)}</span>
                  )}
                </div>
                {(() => {
                  const progress = attemptProgress[quiz.id] || {
                    total_attempts: 0,
                    successful_attempts: 0,
                    failed_attempts: 0,
                    max_attempts: quiz.maxAttempts,
                    remaining_attempts: quiz.maxAttempts === null ? null : quiz.maxAttempts,
                    can_attempt: true
                  };
                  const successRate = progress.total_attempts > 0
                    ? Math.round((progress.successful_attempts / progress.total_attempts) * 100)
                    : 0;

                  return (
                    <div className="quiz-progress-mini">
                      <div className="progress-stats-row">
                        <span>Attempted: <strong>{progress.total_attempts}</strong></span>
                        <span>Successful: <strong>{progress.successful_attempts}</strong></span>
                        <span>Failed: <strong>{progress.failed_attempts}</strong></span>
                      </div>
                      <div className="mini-graph-track">
                        <div className="mini-graph-fill" style={{ width: `${successRate}%` }} />
                      </div>
                      <div className="progress-stats-row">
                        <span>Success Rate: <strong>{successRate}%</strong></span>
                        <span>
                          Attempts Left: <strong>{progress.remaining_attempts === null ? 'Unlimited' : progress.remaining_attempts}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })()}
                <div className="quiz-card-details">
                  <div className="quiz-detail">
                    <span className="detail-label">Total Score:</span>
                    <span className="detail-value">{quiz.totalScore} pts</span>
                  </div>
                  <div className="quiz-detail">
                    <span className="detail-label">Passing Marks:</span>
                    <span className="detail-value">{quiz.passingMarks} pts</span>
                  </div>
                  <div className="quiz-detail">
                    <span className="detail-label">Time Limit:</span>
                    <span className="detail-value">
                      {quiz.timeType === 'total' 
                        ? `${quiz.totalTime} minutes total`
                        : `${quiz.timePerQuestion} sec per question`}
                    </span>
                  </div>
                  {quiz.studyMaterialName && quiz.studyMaterialUrl && (
                    <div className="quiz-detail study-material-row">
                      <span className="detail-label">Material:</span>
                      <a
                        href={getStudyMaterialHref(quiz.studyMaterialUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="material-link"
                      >
                        Read {quiz.studyMaterialName}
                      </a>
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => setPreStartQuiz(quiz)}
                  className="start-quiz-btn"
                  disabled={attemptProgress[quiz.id]?.can_attempt === false}
                >
                  {attemptProgress[quiz.id]?.can_attempt === false ? 'Attempt Limit Reached' : 'Start Quiz'}
                </Button>
              </div>
            ))}
            </div>

            {preStartQuiz && (
              <Modal isOpen={!!preStartQuiz} onClose={() => setPreStartQuiz(null)}>
                <div className="submit-modal" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'left', padding: '16px 20px' }}>
                  <h2 style={{ fontSize: 22, color: '#1a5632', marginBottom: 8 }}>Before You Start</h2>
                  <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{preStartQuiz.subject}</p>
                  {preStartQuiz.studyMaterialName && preStartQuiz.studyMaterialUrl ? (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: '#888' }}>Study Material:&nbsp;</span>
                      <a
                        href={getStudyMaterialHref(preStartQuiz.studyMaterialUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="material-link"
                        style={{ fontSize: 13, color: '#1a5632', fontWeight: 500, textDecoration: 'underline', wordBreak: 'break-all' }}
                      >
                        Open {preStartQuiz.studyMaterialName}
                      </a>
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: '#888' }}>No study material attached for this quiz.</p>
                  )}
                  <div className="modal-actions" style={{ marginTop: 12 }}>
                    <Button onClick={() => setPreStartQuiz(null)} className="cancel-btn">
                      Cancel
                    </Button>
                    <Button onClick={handleStartFromPreStart} className="confirm-btn">
                      Start Quiz
                    </Button>
                  </div>
                </div>
              </Modal>
            )}
          </>
        )}
      </div>
    );
  }

  // Results Screen
  if (quizCompleted && results) {
    return (
      <div className="quiz-attempt-container">
        <PageHeader onLogout={onLogout} />
        <div className="results-container">
          <div className="results-header">
            <h1>{results.passed ? '🎉 Congratulations!' : '📊 Quiz Completed'}</h1>
            <p className={results.passed ? 'passed' : 'failed'}>
              {results.passed ? 'You have passed the quiz!' : 'You did not pass this time.'}
            </p>
          </div>

          <div className="results-summary">
            <div className="result-stat">
              <span className="stat-label">Your Score</span>
              <span className="stat-value">{results.score} / {results.totalScore}</span>
            </div>
            <div className="result-stat">
              <span className="stat-label">Passing Score</span>
              <span className="stat-value">{results.passingMarks}</span>
            </div>
            <div className="result-stat">
              <span className="stat-label">Questions Answered</span>
              <span className="stat-value">{results.answeredCount} / {results.totalQuestions}</span>
            </div>
          </div>

          <div className="results-details">
            <h2>Detailed Results</h2>
            {results.questionResults.map((result, index) => (
              <div key={index} className={`result-item ${result.isCorrect ? 'correct' : 'incorrect'}`}>
                <div className="result-question">
                  <span className="question-num">Q{index + 1}</span>
                  <span>{result.question}</span>
                </div>
                <div className="result-answers">
                  <div className="user-answer">
                    <strong>Your Answer:</strong> {result.userAnswer}
                  </div>
                  {!result.isCorrect && (
                    <div className="correct-answer">
                      <strong>Correct Answer:</strong> {result.correctAnswer}
                    </div>
                  )}
                </div>
                <div className="result-score">
                  {result.score} / {selectedQuiz.questions[index].score} pts
                </div>
              </div>
            ))}
          </div>

          <div className="results-actions">
            <Button onClick={restartQuiz}>Back to Quiz Selection</Button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz Taking Screen
  const currentQuestion = selectedQuiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === selectedQuiz.questions.length - 1;
  const allAnswered = checkIfAllAnswered();

  return (
    <div className="quiz-attempt-container">
      <PageHeader onLogout={onLogout} />
      <BackButton onClick={handleBack} />
      {/* Timer Display */}
      <div className={`timer-display ${timeLeft <= 30 ? 'warning' : ''}`}>
        <span className="timer-icon">⏱</span>
        <span className="timer-text">Time Left: {formatTime(timeLeft)}</span>
      </div>

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-info">
          <span>Question {currentQuestionIndex + 1} of {selectedQuiz.questions.length}</span>
          <span>{Object.keys(userAnswers).length} Answered</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${((currentQuestionIndex + 1) / selectedQuiz.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Display */}
      <div className="question-container">
        <div className="question-header">
          <h2>Question {currentQuestionIndex + 1}</h2>
          <div className="question-meta">
            <span className="question-score">{currentQuestion.score} points</span>
            {selectedQuiz.timeType === 'perQuestion' && currentQuestion.timeSeconds && (
              <span className="question-time">⏱ {currentQuestion.timeSeconds} seconds</span>
            )}
          </div>
        </div>
        <p className="question-text">{currentQuestion.questionText}</p>

        <div className="answers-container">
          {shuffledAnswers.map((answer, index) => (
            <div
              key={index}
              className={`answer-option ${
                userAnswers[currentQuestionIndex]?.text === answer.text ? 'selected' : ''
              }`}
              onClick={() => handleAnswerSelect(answer)}
            >
              <div className="answer-radio">
                {userAnswers[currentQuestionIndex]?.text === answer.text && <div className="radio-dot" />}
              </div>
              <span className="answer-text">{answer.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="quiz-navigation">
        <Button
          onClick={goToPreviousQuestion}
          disabled={currentQuestionIndex === 0}
          className="nav-btn"
        >
          ← Previous
        </Button>

        {!isLastQuestion ? (
          <Button onClick={goToNextQuestion} className="nav-btn">
            Next →
          </Button>
        ) : (
          <Button onClick={handleSubmitClick} className="submit-btn">
            Submit Quiz
          </Button>
        )}
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <Modal isOpen={showSubmitModal} onClose={() => setShowSubmitModal(false)}>
          <div className="submit-modal">
            <h2>Submit Quiz?</h2>
            <p>
              You have answered <strong>{Object.keys(userAnswers).length}</strong> out of{' '}
              <strong>{selectedQuiz.questions.length}</strong> questions.
            </p>
            {!allAnswered && (
              <p className="warning-text">
                ⚠ Some questions are unanswered. They will be marked as incorrect.
              </p>
            )}
            <p>Are you sure you want to submit?</p>
            <div className="modal-actions">
              <Button onClick={() => setShowSubmitModal(false)} className="cancel-btn">
                Cancel
              </Button>
              <Button onClick={submitQuiz} className="confirm-btn">
                Yes, Submit
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Time Up Modal */}
      {showTimeUpModal && (
        <Modal isOpen={showTimeUpModal} onClose={() => {}}>
          <div className="time-up-modal">
            <h2>⏰ Time's Up!</h2>
            <p>
              {timeUpAction === 'next'
                ? 'Moving to the next question...'
                : 'Your quiz is being submitted automatically...'}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default QuizAttempt;
