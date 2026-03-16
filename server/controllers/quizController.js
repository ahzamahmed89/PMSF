import { getPool } from '../config/database.js';
import { QUIZ_MATERIALS_PUBLIC_BASE } from '../config/upload.js';

const isMissingQuizColumnError = (error) => {
  if (!error) return false;
  if (error.number === 207) return true;
  if (Array.isArray(error.precedingErrors)) {
    return error.precedingErrors.some((e) => e?.number === 207);
  }
  return false;
};

const insertQuizQuestionWithFallback = async (transaction, {
  quizId,
  questionText,
  numberOfChoices,
  correctAnswer,
  score,
  questionOrder,
  timeSeconds
}) => {
  try {
    return await transaction.request()
      .input('quizId', quizId)
      .input('questionText', questionText)
      .input('numberOfChoices', numberOfChoices)
      .input('correctAnswer', correctAnswer)
      .input('score', score)
      .input('questionOrder', questionOrder)
      .input('timeSeconds', timeSeconds || null)
      .query(`
        INSERT INTO quiz_questions (quiz_id, question_text, number_of_choices, correct_answer, score, question_order, time_seconds)
        OUTPUT INSERTED.question_id
        VALUES (@quizId, @questionText, @numberOfChoices, @correctAnswer, @score, @questionOrder, @timeSeconds)
      `);
  } catch (questionInsertError) {
    if (!isMissingQuizColumnError(questionInsertError)) throw questionInsertError;
    return await transaction.request()
      .input('quizId', quizId)
      .input('questionText', questionText)
      .input('numberOfChoices', numberOfChoices)
      .input('correctAnswer', correctAnswer)
      .input('score', score)
      .input('questionOrder', questionOrder)
      .query(`
        INSERT INTO quiz_questions (quiz_id, question_text, number_of_choices, correct_answer, score, question_order)
        OUTPUT INSERTED.question_id
        VALUES (@quizId, @questionText, @numberOfChoices, @correctAnswer, @score, @questionOrder)
      `);
  }
};

// Get all active quizzes
export const getAllQuizzes = async (req, res) => {
  try {
    const pool = await getPool();
    const {
      include_all,
      assignment_status,
      created_from,
      created_to,
      department_name,
      regulatory
    } = req.query;
    
        // First, auto-expire quizzes that have passed their expiry date
        await pool.request().query(`
          UPDATE quizzes 
          SET is_active = 0 
          WHERE expiry_date IS NOT NULL 
            AND expiry_date < CAST(GETDATE() AS DATE) 
            AND is_active = 1
        `);
    
    const request = pool.request();
    const conditions = [];

    if (include_all !== '1') {
      conditions.push('q.is_active = 1');
    }

    if (assignment_status === 'assigned') {
      conditions.push(`EXISTS (SELECT 1 FROM quiz_assignments qa2 WHERE qa2.quiz_id = q.quiz_id)`);
    } else if (assignment_status === 'unassigned') {
      conditions.push(`NOT EXISTS (SELECT 1 FROM quiz_assignments qa2 WHERE qa2.quiz_id = q.quiz_id)`);
    }

    if (created_from) {
      request.input('created_from', created_from);
      conditions.push('CAST(q.created_at AS DATE) >= @created_from');
    }

    if (created_to) {
      request.input('created_to', created_to);
      conditions.push('CAST(q.created_at AS DATE) <= @created_to');
    }

    const buildQuery = (includeNewColumns) => {
      const safeConditions = [...conditions];
      const requestForQuery = pool.request();

      if (created_from) requestForQuery.input('created_from', created_from);
      if (created_to) requestForQuery.input('created_to', created_to);

      if (includeNewColumns && department_name) {
        requestForQuery.input('department_name', `%${department_name}%`);
        safeConditions.push('q.department_name LIKE @department_name');
      }

      if (includeNewColumns && (regulatory === 'true' || regulatory === 'false')) {
        requestForQuery.input('regulatory', regulatory === 'true' ? 1 : 0);
        safeConditions.push('q.is_regulatory = @regulatory');
      }

      const whereClause = safeConditions.length ? `WHERE ${safeConditions.join(' AND ')}` : '';

      const query = `
      SELECT 
        q.quiz_id,
        q.subject,
        q.passing_marks,
        q.total_score,
        q.time_type,
        q.total_time,
        q.time_per_question,
        q.total_questions_to_show,
        q.expiry_date,
        q.is_active,
        q.max_attempts,
        q.study_material_name,
        q.study_material_url,
        ${includeNewColumns ? 'q.department_name,' : 'CAST(NULL AS NVARCHAR(150)) AS department_name,'}
        ${includeNewColumns ? 'q.is_regulatory,' : 'CAST(0 AS BIT) AS is_regulatory,'}
        q.created_by,
        q.created_at,
        ISNULL(q.updated_at, q.created_at) as updated_at,
        (SELECT COUNT(*) FROM quiz_assignments qa2 WHERE qa2.quiz_id = q.quiz_id) as assignment_count,
        (SELECT MAX(qa2.assigned_at) FROM quiz_assignments qa2 WHERE qa2.quiz_id = q.quiz_id) as last_assigned_at,
        COUNT(qq.question_id) as question_count
      FROM quizzes q
      LEFT JOIN quiz_questions qq ON q.quiz_id = qq.quiz_id AND qq.quiz_id = q.quiz_id
      ${whereClause}
      GROUP BY q.quiz_id, q.subject, q.passing_marks, q.total_score, 
               q.time_type, q.total_time, q.time_per_question, q.total_questions_to_show,
               q.expiry_date, q.is_active, q.max_attempts, q.study_material_name, q.study_material_url,
               ${includeNewColumns ? 'q.department_name, q.is_regulatory,' : ''}
               q.created_by, q.created_at, q.updated_at
      ORDER BY q.created_at DESC
    `;

      return { requestForQuery, query };
    };
    let result;
    try {
      const withNewCols = buildQuery(true);
      result = await withNewCols.requestForQuery.query(withNewCols.query);
    } catch (queryError) {
      if (!isMissingQuizColumnError(queryError)) throw queryError;
      const legacyQuery = buildQuery(false);
      result = await legacyQuery.requestForQuery.query(legacyQuery.query);
    }
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
};

// Get quiz with all questions and answers
export const getQuizById = async (req, res) => {
  try {
    const { quizId } = req.params;
    const pool = await getPool();
    
    // Get quiz details
    const quizResult = await pool.request()
      .input('quizId', quizId)
      .query(`
        SELECT * FROM quizzes WHERE quiz_id = @quizId AND is_active = 1
      `);
    
    if (quizResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    // Get questions
    const questionsResult = await pool.request()
      .input('quizId', quizId)
      .query(`
        SELECT * FROM quiz_questions 
        WHERE quiz_id = @quizId 
        ORDER BY question_order
      `);
    
    // Get wrong answers for each question
    const questions = await Promise.all(
      questionsResult.recordset.map(async (question) => {
        const wrongAnswersResult = await pool.request()
          .input('questionId', question.question_id)
          .query(`
            SELECT wrong_answer_text 
            FROM question_wrong_answers 
            WHERE question_id = @questionId 
            ORDER BY answer_order
          `);
        
        return {
          question_id: question.question_id,
          quiz_id: question.quiz_id,
          question_text: question.question_text,
          number_of_choices: question.number_of_choices,
          correct_answer: question.correct_answer,
          score: question.score,
          question_order: question.question_order,
          time_seconds: question.time_seconds,
          created_at: question.created_at,
          updated_at: question.updated_at,
          wrongAnswers: wrongAnswersResult.recordset.map(wa => wa.wrong_answer_text),
          wrong_answers: wrongAnswersResult.recordset.map(wa => ({ wrong_answer_text: wa.wrong_answer_text }))
        };
      })
    );
    
    const quiz = {
      ...quizResult.recordset[0],
      questions
    };
    
    res.json(quiz);
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ error: 'Failed to fetch quiz details' });
  }
};

// Create new quiz
export const createQuiz = async (req, res) => {
  try {
    const {
      subject,
      passingMarks,
      timeType,
      totalTime,
      timePerQuestion,
      totalQuestionsToShow,
      questions,
      createdBy,
      expiryDate,
      isActive,
      maxAttempts,
      studyMaterialName,
      studyMaterialUrl,
      departmentName,
      isRegulatory
    } = req.body;
    
    const pool = await getPool();
    const transaction = pool.transaction();
    
    await transaction.begin();
    
    try {
      // Calculate total score
      const totalScore = questions.reduce((sum, q) => sum + parseFloat(q.score), 0);
      
      // Insert quiz
      const insertRequest = transaction.request()
        .input('subject', subject)
        .input('passingMarks', passingMarks)
        .input('totalScore', totalScore)
        .input('timeType', timeType)
        .input('totalTime', totalTime)
        .input('timePerQuestion', timePerQuestion)
        .input('totalQuestionsToShow', totalQuestionsToShow)
        .input('createdBy', createdBy)
        .input('expiryDate', expiryDate || null)
        .input('isActive', isActive !== undefined ? isActive : true)
        .input('maxAttempts', maxAttempts === null || maxAttempts === undefined || maxAttempts === '' ? null : parseInt(maxAttempts))
        .input('studyMaterialName', studyMaterialName || null)
        .input('studyMaterialUrl', studyMaterialUrl || null)
        .input('departmentName', departmentName || null)
        .input('isRegulatory', isRegulatory ? 1 : 0);

      let quizResult;
      try {
        quizResult = await insertRequest.query(`
          INSERT INTO quizzes (
            subject, passing_marks, total_score, time_type, total_time, time_per_question,
            total_questions_to_show, created_by, expiry_date, is_active, max_attempts,
            study_material_name, study_material_url, department_name, is_regulatory
          )
          OUTPUT INSERTED.quiz_id
          VALUES (
            @subject, @passingMarks, @totalScore, @timeType, @totalTime, @timePerQuestion,
            @totalQuestionsToShow, @createdBy, @expiryDate, @isActive, @maxAttempts,
            @studyMaterialName, @studyMaterialUrl, @departmentName, @isRegulatory
          )
        `);
      } catch (insertError) {
        if (!isMissingQuizColumnError(insertError)) throw insertError;
        quizResult = await transaction.request()
          .input('subject', subject)
          .input('passingMarks', passingMarks)
          .input('totalScore', totalScore)
          .input('timeType', timeType)
          .input('totalTime', totalTime)
          .input('timePerQuestion', timePerQuestion)
          .input('totalQuestionsToShow', totalQuestionsToShow)
          .input('createdBy', createdBy)
          .input('expiryDate', expiryDate || null)
          .input('isActive', isActive !== undefined ? isActive : true)
          .input('maxAttempts', maxAttempts === null || maxAttempts === undefined || maxAttempts === '' ? null : parseInt(maxAttempts))
          .input('studyMaterialName', studyMaterialName || null)
          .input('studyMaterialUrl', studyMaterialUrl || null)
          .query(`
            INSERT INTO quizzes (
              subject, passing_marks, total_score, time_type, total_time, time_per_question,
              total_questions_to_show, created_by, expiry_date, is_active, max_attempts,
              study_material_name, study_material_url
            )
            OUTPUT INSERTED.quiz_id
            VALUES (
              @subject, @passingMarks, @totalScore, @timeType, @totalTime, @timePerQuestion,
              @totalQuestionsToShow, @createdBy, @expiryDate, @isActive, @maxAttempts,
              @studyMaterialName, @studyMaterialUrl
            )
          `);
      }
      
      const quizId = quizResult.recordset[0].quiz_id;
      
      // Insert questions and wrong answers
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        
        const questionResult = await insertQuizQuestionWithFallback(transaction, {
          quizId,
          questionText: question.questionText,
          numberOfChoices: question.numberOfChoices,
          correctAnswer: question.correctAnswer,
          score: question.score,
          questionOrder: i + 1,
          timeSeconds: question.timeSeconds
        });
        
        const questionId = questionResult.recordset[0].question_id;
        
        // Insert wrong answers
        for (let j = 0; j < question.wrongAnswers.length; j++) {
          await transaction.request()
            .input('questionId', questionId)
            .input('wrongAnswerText', question.wrongAnswers[j])
            .input('answerOrder', j + 1)
            .query(`
              INSERT INTO question_wrong_answers (question_id, wrong_answer_text, answer_order)
              VALUES (@questionId, @wrongAnswerText, @answerOrder)
            `);
        }
      }
      
      await transaction.commit();
      res.json({ message: 'Quiz created successfully', quizId });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
};

// Submit quiz attempt
export const submitQuizAttempt = async (req, res) => {
  try {
    const { quizId, userId, scoreObtained, totalScore, passingMarks, passed, questionsAnswered, totalQuestions, timeTaken, answers } = req.body;
    
    const pool = await getPool();
    const transaction = pool.transaction();
    
    await transaction.begin();
    
    try {
      const quizConfigResult = await transaction.request()
        .input('quizId', quizId)
        .query(`
          SELECT quiz_id, max_attempts
          FROM quizzes
          WHERE quiz_id = @quizId AND is_active = 1
        `);

      if (quizConfigResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Quiz not found or inactive' });
      }

      const quizConfig = quizConfigResult.recordset[0];

      const attemptsCountResult = await transaction.request()
        .input('quizId', quizId)
        .input('userId', userId)
        .query(`
          SELECT COUNT(*) as total_attempts
          FROM quiz_attempts
          WHERE quiz_id = @quizId AND user_id = @userId
        `);

      const previousAttempts = attemptsCountResult.recordset[0]?.total_attempts || 0;
      const attemptLimitReached = quizConfig.max_attempts !== null && previousAttempts >= quizConfig.max_attempts;

      if (attemptLimitReached) {
        await transaction.rollback();
        return res.status(403).json({
          error: 'Maximum quiz attempts reached',
          maxAttempts: quizConfig.max_attempts,
          totalAttempts: previousAttempts,
          remainingAttempts: 0
        });
      }

      // Insert quiz attempt
      const attemptResult = await transaction.request()
        .input('quizId', quizId)
        .input('userId', userId)
        .input('scoreObtained', scoreObtained)
        .input('totalScore', totalScore)
        .input('passingMarks', passingMarks)
        .input('passed', passed ? 1 : 0)
        .input('questionsAnswered', questionsAnswered)
        .input('totalQuestions', totalQuestions)
        .input('timeTaken', timeTaken)
        .query(`
          INSERT INTO quiz_attempts (quiz_id, user_id, score_obtained, total_score, passing_marks, passed, questions_answered, total_questions, time_taken)
          OUTPUT INSERTED.attempt_id
          VALUES (@quizId, @userId, @scoreObtained, @totalScore, @passingMarks, @passed, @questionsAnswered, @totalQuestions, @timeTaken)
        `);
      
      const attemptId = attemptResult.recordset[0].attempt_id;
      
      // Insert individual answers
      for (const answer of answers) {
        await transaction.request()
          .input('attemptId', attemptId)
          .input('questionId', answer.questionId)
          .input('userAnswer', answer.userAnswer)
          .input('correctAnswer', answer.correctAnswer)
          .input('isCorrect', answer.isCorrect ? 1 : 0)
          .input('scoreAwarded', answer.scoreAwarded)
          .query(`
            INSERT INTO attempt_answers (attempt_id, question_id, user_answer, correct_answer, is_correct, score_awarded)
            VALUES (@attemptId, @questionId, @userAnswer, @correctAnswer, @isCorrect, @scoreAwarded)
          `);
      }

      const totalAttemptsAfterSubmit = previousAttempts + 1;
      const remainingAttempts = quizConfig.max_attempts === null
        ? null
        : Math.max(quizConfig.max_attempts - totalAttemptsAfterSubmit, 0);
      
      await transaction.commit();
      res.json({
        message: 'Quiz attempt submitted successfully',
        attemptId,
        totalAttempts: totalAttemptsAfterSubmit,
        maxAttempts: quizConfig.max_attempts,
        remainingAttempts
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error submitting quiz attempt:', error);
    res.status(500).json({ error: 'Failed to submit quiz attempt' });
  }
};

// Get user's quiz attempt history
export const getUserAttempts = async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = await getPool();
    
    const result = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT 
          qa.attempt_id,
          q.subject,
          qa.score_obtained,
          qa.total_score,
          qa.passing_marks,
          qa.passed,
          qa.questions_answered,
          qa.total_questions,
          qa.time_taken,
          qa.attempt_date
        FROM quiz_attempts qa
        INNER JOIN quizzes q ON qa.quiz_id = q.quiz_id
        WHERE qa.user_id = @userId
        ORDER BY qa.attempt_date DESC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching user attempts:', error);
    res.status(500).json({ error: 'Failed to fetch user attempts' });
  }
};

export const getUserAttemptProgress = async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = await getPool();

    const result = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT
          q.quiz_id,
          q.subject,
          q.max_attempts,
          q.study_material_name,
          q.study_material_url,
          COUNT(qa.attempt_id) as total_attempts,
          SUM(CASE WHEN qa.passed = 1 THEN 1 ELSE 0 END) as successful_attempts,
          SUM(CASE WHEN qa.passed = 0 THEN 1 ELSE 0 END) as failed_attempts,
          MAX(qa.attempt_date) as last_attempt_date
        FROM quizzes q
        LEFT JOIN quiz_attempts qa ON q.quiz_id = qa.quiz_id AND qa.user_id = @userId
        WHERE q.is_active = 1
        GROUP BY q.quiz_id, q.subject, q.max_attempts, q.study_material_name, q.study_material_url
        ORDER BY q.subject ASC
      `);

    const progress = result.recordset.map((row) => {
      const maxAttempts = row.max_attempts;
      const totalAttempts = row.total_attempts || 0;
      const remainingAttempts = maxAttempts === null ? null : Math.max(maxAttempts - totalAttempts, 0);

      return {
        ...row,
        remaining_attempts: remainingAttempts,
        can_attempt: maxAttempts === null ? true : totalAttempts < maxAttempts
      };
    });

    res.json(progress);
  } catch (error) {
    console.error('Error fetching user attempt progress:', error);
    res.status(500).json({ error: 'Failed to fetch user attempt progress' });
  }
};

export const uploadQuizStudyMaterial = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const materialUrl = `${QUIZ_MATERIALS_PUBLIC_BASE}/${req.file.filename}`;

    res.json({
      message: 'Study material uploaded successfully',
      fileName: req.file.originalname,
      fileStoredName: req.file.filename,
      fileUrl: materialUrl,
      mimeType: req.file.mimetype,
      size: req.file.size
    });
  } catch (error) {
    console.error('Error uploading quiz study material:', error);
    res.status(500).json({ error: 'Failed to upload quiz study material' });
  }
};

// Get attempt details with answers
export const getAttemptDetails = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const pool = await getPool();
    
    // Get attempt info
    const attemptResult = await pool.request()
      .input('attemptId', attemptId)
      .query(`
        SELECT 
          qa.*,
          q.subject
        FROM quiz_attempts qa
        INNER JOIN quizzes q ON qa.quiz_id = q.quiz_id
        WHERE qa.attempt_id = @attemptId
      `);
    
    if (attemptResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Attempt not found' });
    }
    
    // Get answers
    const answersResult = await pool.request()
      .input('attemptId', attemptId)
      .query(`
        SELECT 
          aa.*,
          qq.question_text,
          qq.score as max_score
        FROM attempt_answers aa
        INNER JOIN quiz_questions qq ON aa.question_id = qq.question_id
        WHERE aa.attempt_id = @attemptId
        ORDER BY qq.question_order
      `);
    
    const attempt = {
      ...attemptResult.recordset[0],
      answers: answersResult.recordset
    };
    
    res.json(attempt);
  } catch (error) {
    console.error('Error fetching attempt details:', error);
    res.status(500).json({ error: 'Failed to fetch attempt details' });
  }
};

// Get quiz statistics
export const getQuizStatistics = async (req, res) => {
  try {
    const { quizId } = req.params;
    const pool = await getPool();
    
    const result = await pool.request()
      .input('quizId', quizId)
      .query(`
        SELECT 
          q.quiz_id,
          q.subject,
          COUNT(qa.attempt_id) as total_attempts,
          SUM(CASE WHEN qa.passed = 1 THEN 1 ELSE 0 END) as passed_count,
          ROUND(AVG(qa.score_obtained), 2) as avg_score,
          CASE 
            WHEN COUNT(qa.attempt_id) > 0 
            THEN ROUND((CAST(SUM(CASE WHEN qa.passed = 1 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(qa.attempt_id) * 100), 2)
            ELSE 0 
          END as pass_rate_percentage
        FROM quizzes q
        LEFT JOIN quiz_attempts qa ON q.quiz_id = qa.quiz_id
        WHERE q.quiz_id = @quizId
        GROUP BY q.quiz_id, q.subject
      `);
    
    res.json(result.recordset[0] || {});
  } catch (error) {
    console.error('Error fetching quiz statistics:', error);
    res.status(500).json({ error: 'Failed to fetch quiz statistics' });
  }
};

// Update existing quiz
export const updateQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const {
      subject,
      passingMarks,
      timeType,
      totalTime,
      timePerQuestion,
      totalQuestionsToShow,
      questions,
      lastEditedBy,
      expiryDate,
      isActive,
      maxAttempts,
      studyMaterialName,
      studyMaterialUrl,
      departmentName,
      isRegulatory
    } = req.body;
    
    const pool = await getPool();
    const transaction = pool.transaction();
    
    await transaction.begin();
    
    try {
      // Calculate total score
      const totalScore = questions.reduce((sum, q) => sum + parseFloat(q.score), 0);
      
      // Update quiz metadata
      const updateRequest = transaction.request()
        .input('quizId', quizId)
        .input('subject', subject)
        .input('passingMarks', passingMarks)
        .input('totalScore', totalScore)
        .input('timeType', timeType)
        .input('totalTime', totalTime)
        .input('timePerQuestion', timePerQuestion)
        .input('totalQuestionsToShow', totalQuestionsToShow)
        .input('lastEditedBy', lastEditedBy)
        .input('expiryDate', expiryDate || null)
        .input('isActive', isActive !== undefined ? isActive : true)
        .input('maxAttempts', maxAttempts === null || maxAttempts === undefined || maxAttempts === '' ? null : parseInt(maxAttempts))
        .input('studyMaterialName', studyMaterialName || null)
        .input('studyMaterialUrl', studyMaterialUrl || null)
        .input('departmentName', departmentName || null)
        .input('isRegulatory', isRegulatory ? 1 : 0);

      try {
        await updateRequest.query(`
          UPDATE quizzes 
          SET subject = @subject, 
              passing_marks = @passingMarks, 
              total_score = @totalScore, 
              time_type = @timeType, 
              total_time = @totalTime, 
              time_per_question = @timePerQuestion,
              total_questions_to_show = @totalQuestionsToShow,
              last_edited_by = @lastEditedBy,
              expiry_date = @expiryDate,
              is_active = @isActive,
              max_attempts = @maxAttempts,
              study_material_name = @studyMaterialName,
              study_material_url = @studyMaterialUrl,
              department_name = @departmentName,
              is_regulatory = @isRegulatory,
              updated_at = GETDATE()
          WHERE quiz_id = @quizId
        `);
      } catch (updateError) {
        if (!isMissingQuizColumnError(updateError)) throw updateError;
        await transaction.request()
          .input('quizId', quizId)
          .input('subject', subject)
          .input('passingMarks', passingMarks)
          .input('totalScore', totalScore)
          .input('timeType', timeType)
          .input('totalTime', totalTime)
          .input('timePerQuestion', timePerQuestion)
          .input('totalQuestionsToShow', totalQuestionsToShow)
          .input('lastEditedBy', lastEditedBy)
          .input('expiryDate', expiryDate || null)
          .input('isActive', isActive !== undefined ? isActive : true)
          .input('maxAttempts', maxAttempts === null || maxAttempts === undefined || maxAttempts === '' ? null : parseInt(maxAttempts))
          .input('studyMaterialName', studyMaterialName || null)
          .input('studyMaterialUrl', studyMaterialUrl || null)
          .query(`
            UPDATE quizzes 
            SET subject = @subject, 
                passing_marks = @passingMarks, 
                total_score = @totalScore, 
                time_type = @timeType, 
                total_time = @totalTime, 
                time_per_question = @timePerQuestion,
                total_questions_to_show = @totalQuestionsToShow,
                last_edited_by = @lastEditedBy,
                expiry_date = @expiryDate,
                is_active = @isActive,
                max_attempts = @maxAttempts,
                study_material_name = @studyMaterialName,
                study_material_url = @studyMaterialUrl,
                updated_at = GETDATE()
            WHERE quiz_id = @quizId
          `);
      }
      
      // Delete existing questions and their answers
      await transaction.request()
        .input('quizId', quizId)
        .query(`
          DELETE FROM question_wrong_answers 
          WHERE question_id IN (
            SELECT question_id FROM quiz_questions WHERE quiz_id = @quizId
          )
        `);
      
      await transaction.request()
        .input('quizId', quizId)
        .query(`
          DELETE FROM quiz_questions WHERE quiz_id = @quizId
        `);
      
      // Insert new questions and wrong answers
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        
        const questionResult = await insertQuizQuestionWithFallback(transaction, {
          quizId,
          questionText: question.questionText,
          numberOfChoices: question.numberOfChoices,
          correctAnswer: question.correctAnswer,
          score: question.score,
          questionOrder: i + 1,
          timeSeconds: question.timeSeconds
        });
        
        const questionId = questionResult.recordset[0].question_id;
        
        // Insert wrong answers
        for (let j = 0; j < question.wrongAnswers.length; j++) {
          await transaction.request()
            .input('questionId', questionId)
            .input('wrongAnswerText', question.wrongAnswers[j])
            .input('answerOrder', j + 1)
            .query(`
              INSERT INTO question_wrong_answers (question_id, wrong_answer_text, answer_order)
              VALUES (@questionId, @wrongAnswerText, @answerOrder)
            `);
        }
      }
      
      await transaction.commit();
      res.json({ message: 'Quiz updated successfully', quizId });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ error: 'Failed to update quiz' });
  }
};

// Delete quiz
export const deleteQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const pool = await getPool();
    
    await pool.request()
      .input('quizId', quizId)
      .query(`
        UPDATE quizzes 
        SET is_active = 0 
        WHERE quiz_id = @quizId
      `);
    
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
};
