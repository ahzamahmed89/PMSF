-- ============================================
-- Product Knowledge Quiz System - Database Schema
-- SQL Server (T-SQL) Compatible Version
-- ============================================

-- Table 1: Quizzes (Main Quiz Information)
-- Stores the basic quiz configuration and settings
-- ============================================
CREATE TABLE quizzes (
    quiz_id INT PRIMARY KEY IDENTITY(1,1),
    subject NVARCHAR(255) NOT NULL,
    passing_marks DECIMAL(10, 2) NOT NULL,
    total_score DECIMAL(10, 2) NOT NULL,
    time_type NVARCHAR(20) NOT NULL DEFAULT 'total' CHECK (time_type IN ('total', 'perQuestion')),
    total_time INT NULL, -- Total time in minutes (if time_type = total)
    time_per_question INT NULL, -- Time per question in seconds (if time_type = perQuestion)
    created_by NVARCHAR(100) NULL, -- Admin username who created the quiz
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    last_edited_by NVARCHAR(100) NULL, -- Admin username who last edited the quiz
    is_active BIT DEFAULT 1 -- 1 = Active, 0 = Inactive
);

-- Indexes for quizzes table
CREATE INDEX idx_subject ON quizzes(subject);
CREATE INDEX idx_created_at ON quizzes(created_at);
CREATE INDEX idx_is_active ON quizzes(is_active);


-- Table 2: Quiz Questions
-- Stores all questions for each quiz
-- ============================================
CREATE TABLE quiz_questions (
    question_id INT PRIMARY KEY IDENTITY(1,1),
    quiz_id INT NOT NULL,
    question_text NVARCHAR(MAX) NOT NULL,
    number_of_choices INT NOT NULL DEFAULT 4, -- Number of answer choices (2-6)
    correct_answer NVARCHAR(500) NOT NULL,
    score DECIMAL(10, 2) NOT NULL, -- Points awarded for correct answer
    question_order INT NOT NULL DEFAULT 0, -- Display order of questions
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE
);

-- Indexes for quiz_questions table
CREATE INDEX idx_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX idx_question_order ON quiz_questions(question_order);


-- Table 3: Question Wrong Answers
-- Stores wrong answer options for each question
-- ============================================
CREATE TABLE question_wrong_answers (
    wrong_answer_id INT PRIMARY KEY IDENTITY(1,1),
    question_id INT NOT NULL,
    wrong_answer_text NVARCHAR(500) NOT NULL,
    answer_order INT NOT NULL DEFAULT 0, -- Order of wrong answer
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (question_id) REFERENCES quiz_questions(question_id) ON DELETE CASCADE
);

-- Indexes for question_wrong_answers table
CREATE INDEX idx_question_id_wa ON question_wrong_answers(question_id);


-- Table 4: Quiz Attempts
-- Stores information about each user's quiz attempt
-- ============================================
CREATE TABLE quiz_attempts (
    attempt_id INT PRIMARY KEY IDENTITY(1,1),
    quiz_id INT NOT NULL,
    user_id NVARCHAR(100) NOT NULL, -- Username of the person taking quiz
    score_obtained DECIMAL(10, 2) NOT NULL,
    total_score DECIMAL(10, 2) NOT NULL,
    passing_marks DECIMAL(10, 2) NOT NULL,
    passed BIT NOT NULL, -- 1 = Passed, 0 = Failed
    questions_answered INT NOT NULL,
    total_questions INT NOT NULL,
    time_taken INT NULL, -- Time taken in seconds
    attempt_date DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE
);

-- Indexes for quiz_attempts table
CREATE INDEX idx_quiz_id_qa ON quiz_attempts(quiz_id);
CREATE INDEX idx_user_id ON quiz_attempts(user_id);
CREATE INDEX idx_attempt_date ON quiz_attempts(attempt_date);
CREATE INDEX idx_passed ON quiz_attempts(passed);


-- Table 5: Attempt Answers
-- Stores individual answers for each question in an attempt
-- ============================================
CREATE TABLE attempt_answers (
    answer_id INT PRIMARY KEY IDENTITY(1,1),
    attempt_id INT NOT NULL,
    question_id INT NOT NULL,
    user_answer NVARCHAR(500) NULL, -- User selected answer (NULL if not answered)
    correct_answer NVARCHAR(500) NOT NULL,
    is_correct BIT NOT NULL, -- 1 = Correct, 0 = Incorrect
    score_awarded DECIMAL(10, 2) NOT NULL DEFAULT 0,
    answered_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(attempt_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES quiz_questions(question_id) ON DELETE NO ACTION
);

-- Indexes for attempt_answers table
CREATE INDEX idx_attempt_id ON attempt_answers(attempt_id);
CREATE INDEX idx_question_id_aa ON attempt_answers(question_id);
CREATE INDEX idx_is_correct ON attempt_answers(is_correct);


-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Sample Quiz
SET IDENTITY_INSERT quizzes ON;
INSERT INTO quizzes (quiz_id, subject, passing_marks, total_score, time_type, total_time, created_by, is_active)
VALUES (1, 'Product Features Q1 2026', 70, 100, 'total', 30, 'admin', 1);
SET IDENTITY_INSERT quizzes OFF;

-- Sample Questions for the quiz (quiz_id = 1)
SET IDENTITY_INSERT quiz_questions ON;
INSERT INTO quiz_questions (question_id, quiz_id, question_text, number_of_choices, correct_answer, score, question_order)
VALUES 
(1, 1, 'What is the main feature of our new mobile banking app?', 4, 'Biometric authentication and instant transfers', 25, 1),
(2, 1, 'Which Islamic banking principle does our product follow?', 4, 'Sharia-compliant profit sharing', 25, 2),
(3, 1, 'What is the maximum daily transfer limit for individual accounts?', 4, 'PKR 500,000', 25, 3),
(4, 1, 'Which document is required for account opening?', 4, 'CNIC and proof of income', 25, 4);
SET IDENTITY_INSERT quiz_questions OFF;

-- Sample Wrong Answers for Question 1 (question_id = 1)
INSERT INTO question_wrong_answers (question_id, wrong_answer_text, answer_order)
VALUES 
(1, 'Cash withdrawal only', 1),
(1, 'Foreign currency exchange', 2),
(1, 'Loan processing system', 3);

-- Sample Wrong Answers for Question 2 (question_id = 2)
INSERT INTO question_wrong_answers (question_id, wrong_answer_text, answer_order)
VALUES 
(2, 'Interest-based lending', 1),
(2, 'Fixed deposit returns', 2),
(2, 'Conventional banking methods', 3);

-- Sample Wrong Answers for Question 3 (question_id = 3)
INSERT INTO question_wrong_answers (question_id, wrong_answer_text, answer_order)
VALUES 
(3, 'PKR 100,000', 1),
(3, 'PKR 1,000,000', 2),
(3, 'No limit', 3);

-- Sample Wrong Answers for Question 4 (question_id = 4)
INSERT INTO question_wrong_answers (question_id, wrong_answer_text, answer_order)
VALUES 
(4, 'Only CNIC', 1),
(4, 'Passport only', 2),
(4, 'No documents required', 3);


-- ============================================
-- USEFUL QUERIES
-- ============================================

-- Query 1: Get all active quizzes with question count
-- SELECT 
--     q.quiz_id,
--     q.subject,
--     q.passing_marks,
--     q.total_score,
--     q.time_type,
--     q.total_time,
--     q.time_per_question,
--     COUNT(qq.question_id) as question_count,
--     q.created_at
-- FROM quizzes q
-- LEFT JOIN quiz_questions qq ON q.quiz_id = qq.quiz_id
-- WHERE q.is_active = 1
-- GROUP BY q.quiz_id
-- ORDER BY q.created_at DESC;


-- Query 2: Get complete quiz with all questions and answers
-- SELECT 
--     q.quiz_id,
--     q.subject,
--     qq.question_id,
--     qq.question_text,
--     qq.correct_answer,
--     qq.score,
--     qwa.wrong_answer_text
-- FROM quizzes q
-- INNER JOIN quiz_questions qq ON q.quiz_id = qq.quiz_id
-- LEFT JOIN question_wrong_answers qwa ON qq.question_id = qwa.question_id
-- WHERE q.quiz_id = 1
-- ORDER BY qq.question_order, qwa.answer_order;


-- Query 3: Get user's quiz attempt history
-- SELECT 
--     qa.attempt_id,
--     q.subject,
--     qa.score_obtained,
--     qa.total_score,
--     qa.passed,
--     qa.questions_answered,
--     qa.total_questions,
--     qa.attempt_date
-- FROM quiz_attempts qa
-- INNER JOIN quizzes q ON qa.quiz_id = q.quiz_id
-- WHERE qa.user_id = 'john_doe'
-- ORDER BY qa.attempt_date DESC;


-- Query 4: Get detailed results of a specific attempt
-- SELECT 
--     aa.answer_id,
--     qq.question_text,
--     aa.user_answer,
--     aa.correct_answer,
--     aa.is_correct,
--     aa.score_awarded,
--     qq.score as max_score
-- FROM attempt_answers aa
-- INNER JOIN quiz_questions qq ON aa.question_id = qq.question_id
-- WHERE aa.attempt_id = 1
-- ORDER BY qq.question_order;


-- Query 5: Get quiz statistics (pass rate, average score)
-- SELECT 
--     q.quiz_id,
--     q.subject,
--     COUNT(qa.attempt_id) as total_attempts,
--     SUM(CASE WHEN qa.passed = 1 THEN 1 ELSE 0 END) as passed_count,
--     ROUND(AVG(qa.score_obtained), 2) as avg_score,
--     ROUND((SUM(CASE WHEN qa.passed = 1 THEN 1 ELSE 0 END) / COUNT(qa.attempt_id) * 100), 2) as pass_rate_percentage
-- FROM quizzes q
-- LEFT JOIN quiz_attempts qa ON q.quiz_id = qa.quiz_id
-- GROUP BY q.quiz_id, q.subject;


-- ============================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================
-- Already included in table definitions above
-- Additional composite indexes can be added based on query patterns:

CREATE INDEX idx_user_quiz ON quiz_attempts(user_id, quiz_id);
CREATE INDEX idx_quiz_active ON quizzes(is_active, created_at);
