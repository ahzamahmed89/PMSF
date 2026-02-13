import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/QuizAttempt.css';
import Button from './Button';
import Modal from './Modal';

const API_URL = 'http://localhost:5000/api';

const QuizAttempt = () => {
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

  // Load quizzes from API
  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/quizzes`);
      
      // Transform the data to match the component's expected format
      const transformedQuizzes = response.data.map(quiz => ({
        id: quiz.quiz_id,
        subject: quiz.subject,
        passingMarks: quiz.passing_marks,
        totalScore: quiz.total_score,
        timeType: quiz.time_type,
        totalTime: quiz.total_time,
        timePerQuestion: quiz.time_per_question,
        questions: [] // Will be loaded when quiz is started
      }));
      
      setQuizzes(transformedQuizzes);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      alert('Failed to load quizzes. Please try again.');
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
    setShowTimeUpModal(true);
    setTimeout(() => {
      setShowTimeUpModal(false);
      submitQuiz();
    }, 3000);
  };

  const startQuiz = async (quiz) => {
    try {
      setLoading(true);
      // Fetch full quiz details including questions
      const response = await axios.get(`${API_URL}/quizzes/${quiz.id}`);
      
      const fullQuiz = {
        id: response.data.quiz_id,
        subject: response.data.subject,
        passingMarks: response.data.passing_marks,
        totalScore: response.data.total_score,
        timeType: response.data.time_type,
        totalTime: response.data.total_time,
        timePerQuestion: response.data.time_per_question,
        questions: response.data.questions.map(q => ({
          id: q.question_id,
          questionText: q.question_text,
          correctAnswer: q.correct_answer,
          wrongAnswers: q.wrongAnswers,
          score: q.score,
          numberOfChoices: q.number_of_choices
        }))
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
        setTimeLeft(fullQuiz.timePerQuestion);
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

  const shuffleAnswersForQuestion = (question) => {
    const allAnswers = [
      { text: question.correctAnswer, isCorrect: true },
      ...question.wrongAnswers.slice(0, question.numberOfChoices - 1).map(ans => ({ 
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
        setTimeLeft(selectedQuiz.timePerQuestion);
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
        setTimeLeft(selectedQuiz.timePerQuestion);
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

    // Save attempt to database
    try {
      const username = localStorage.getItem('username') || 'guest';
      
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
    } catch (error) {
      console.error('Error saving quiz attempt:', error);
      // Don't alert the user as the quiz is already completed
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
          <div className="quiz-list">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="quiz-card">
                <div className="quiz-card-header">
                  <h3>{quiz.subject}</h3>
                  <span className="quiz-badge">{quiz.question_count || 'Multiple'} Questions</span>
                </div>
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
                </div>
                <Button onClick={() => startQuiz(quiz)} className="start-quiz-btn">
                  Start Quiz
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Results Screen
  if (quizCompleted && results) {
    return (
      <div className="quiz-attempt-container">
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
          <span className="question-score">{currentQuestion.score} points</span>
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
            <p>Your quiz is being submitted automatically...</p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default QuizAttempt;
