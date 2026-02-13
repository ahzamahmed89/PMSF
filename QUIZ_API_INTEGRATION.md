# Quiz System - API Integration Guide

## Database Connection
✅ **Server Status:** Connected to SQL Server database
✅ **Server URL:** http://localhost:5000
✅ **Database:** DIB (your existing database)

## API Endpoints

### Quiz Management

#### 1. Get All Active Quizzes
```
GET http://localhost:5000/api/quizzes
```
Returns list of all active quizzes with question count.

#### 2. Get Quiz Details
```
GET http://localhost:5000/api/quizzes/:quizId
```
Returns complete quiz with all questions and answer options.

#### 3. Create New Quiz
```
POST http://localhost:5000/api/quizzes
```
**Request Body:**
```json
{
  "subject": "Product Features Q1 2026",
  "passingMarks": 70,
  "timeType": "total",
  "totalTime": 30,
  "timePerQuestion": null,
  "createdBy": "admin",
  "questions": [
    {
      "questionText": "What is the main feature?",
      "numberOfChoices": 4,
      "correctAnswer": "Correct answer here",
      "wrongAnswers": ["Wrong 1", "Wrong 2", "Wrong 3"],
      "score": 25
    }
  ]
}
```

#### 4. Delete Quiz (Soft Delete)
```
DELETE http://localhost:5000/api/quizzes/:quizId
```

### Quiz Attempts

#### 5. Submit Quiz Attempt
```
POST http://localhost:5000/api/quiz-attempts
```
**Request Body:**
```json
{
  "quizId": 1,
  "userId": "john_doe",
  "scoreObtained": 75,
  "totalScore": 100,
  "passingMarks": 70,
  "passed": true,
  "questionsAnswered": 4,
  "totalQuestions": 4,
  "timeTaken": 1200,
  "answers": [
    {
      "questionId": 1,
      "userAnswer": "Selected answer",
      "correctAnswer": "Correct answer",
      "isCorrect": true,
      "scoreAwarded": 25
    }
  ]
}
```

#### 6. Get User's Quiz History
```
GET http://localhost:5000/api/quiz-attempts/user/:userId
```
Returns all quiz attempts by a specific user.

#### 7. Get Attempt Details
```
GET http://localhost:5000/api/quiz-attempts/:attemptId
```
Returns detailed results of a specific quiz attempt.

#### 8. Get Quiz Statistics
```
GET http://localhost:5000/api/quizzes/:quizId/statistics
```
Returns pass rate, average score, and attempt count for a quiz.

## React Components Updated

### 1. QuizCreator.jsx
- ✅ Now saves quizzes to database via API
- ✅ Uses axios for HTTP requests
- ✅ Includes username from localStorage

### 2. QuizAttempt.jsx
- ✅ Fetches quizzes from database
- ✅ Loads full quiz details when starting
- ✅ Submits attempts to database
- ✅ Tracks time taken for each attempt

## Testing the Integration

### Step 1: Start Backend Server
```bash
npm run server
```
Server will run on: http://localhost:5000

### Step 2: Start Frontend Dev Server
```bash
npm run dev
```
Frontend will run on: https://localhost:5173

### Step 3: Test Quiz Creation
1. Login with admin/admin
2. Navigate to "Create Quiz"
3. Create a new quiz with questions
4. Quiz will be saved to database tables

### Step 4: Test Quiz Attempt
1. Navigate to "Take Quiz"
2. Select a quiz from the list
3. Answer questions
4. Submit quiz
5. Results and attempt will be saved to database

## Database Tables Being Used

1. **quizzes** - Main quiz information
2. **quiz_questions** - Questions for each quiz
3. **question_wrong_answers** - Wrong answer options
4. **quiz_attempts** - User quiz attempts
5. **attempt_answers** - Individual answers per attempt

## Configuration

### Database Connection (server/config/database.js)
```javascript
{
  server: 'PC',
  database: 'DIB',
  user: 'appuser',
  password: 'App@12345',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
}
```

### API Base URL (in React components)
```javascript
const API_URL = 'http://localhost:5000/api';
```

## Notes

- ✅ All quiz data now stored in SQL Server database
- ✅ LocalStorage no longer used for quiz storage
- ✅ Username from localStorage used for tracking who created/attempted quizzes
- ✅ Transactions ensure data integrity when creating quizzes
- ✅ Foreign keys maintain referential integrity
- ✅ Soft delete (is_active flag) preserves quiz history

## Troubleshooting

### If server doesn't start:
1. Check database connection settings
2. Ensure SQL Server is running
3. Verify database 'DIB' exists
4. Check tables were created successfully

### If frontend can't connect:
1. Ensure backend server is running on port 5000
2. Check CORS is enabled in server
3. Verify API_URL in React components matches server URL
