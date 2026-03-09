# Product Knowledge Quiz - Time Per Question Feature

## Overview
The Product Knowledge Quiz system now supports **individual time limits per question** when using the "Time per Question" mode. This allows you to set different time allowances for questions of varying difficulty.

## Features Added

### 1. **Database Column**
- Added `time_seconds` column to `quiz_questions` table
- Stores individual time limit for each question in seconds
- Nullable field (uses global time setting if not specified)

### 2. **CSV Import with Time Column**
When you select **"Time per Question"** mode:
- CSV template includes a "Time (seconds)" column
- Column 4 becomes the time field (in seconds)
- Wrong answers start from Column 5
- Time column is optional - leave blank to use the global default time

**CSV Format (Time per Question mode):**
```csv
Question,Correct Answer,Score,Time (seconds),Wrong Answer 1,Wrong Answer 2,Wrong Answer 3
"What is 2+2?","4",10,30,"3","5","6"
"What is the capital of France?","Paris",15,45,"London","Berlin","Madrid"
```

### 3. **Manual Question Entry**
When adding questions manually in "Time per Question" mode:
- New input field: **"Time for this Question (seconds)"**
- Optional field - leave blank to use default time
- Appears below the Score field

### 4. **Dynamic CSV Template**
- Download template button generates CSV with appropriate columns
- Automatically includes Time column when in "Time per Question" mode
- Template shows example times for reference

## Installation Steps

### Step 1: Run Database Migration
Execute the migration to add the time_seconds column:

```bash
node run_question_time_migration.js
```

This will:
- Connect to the DIB database
- Add `time_seconds INT NULL` column to `quiz_questions`
- Add column description
- Complete successfully with confirmation message

### Step 2: Restart Backend Server
```bash
# If server is running, stop it first (Ctrl+C)
node server/server.js
```

The backend is already updated to handle the new time_seconds field.

### Step 3: Refresh Frontend
If the frontend is running, simply refresh your browser. The React app will load the updated component automatically.

## How to Use

### Creating a Quiz with Individual Times

1. **Go to Quiz Manager** → Create New Quiz
2. **Select Time Setting** → Choose "Time per Question"
3. **Set Default Time** → Enter default time (e.g., 30 seconds)
   - This is used for questions without individual time settings

4. **Add Questions:**

   **Option A: Manual Entry**
   - Fill in question details
   - Optionally set **"Time for this Question"** field
   - Leave blank to use default (30 seconds from step 3)
   
   **Option B: CSV Import**
   - Click "Download CSV Template"
   - Fill in the CSV with Time column (Column 4)
   - Upload the completed CSV file

5. **Save Quiz** → Questions will be saved with their individual times

### CSV Example with Time Column

```csv
Question,Correct Answer,Score,Time (seconds),Wrong Answer 1,Wrong Answer 2,Wrong Answer 3
"Easy question: What is 2+2?","4",10,20,"3","5","6"
"Medium question: Capital of France?","Paris",15,30,"London","Berlin","Madrid"
"Hard question: Square root of 144?","12",20,45,"11","13","14"
"Use default time","Answer",10,,"Wrong1","Wrong2","Wrong3"
```

Note: The last question has an empty time field, so it will use the quiz's default time.

### Editing Existing Quizzes

1. **Browse Quizzes** → Select quiz to edit
2. Questions retain their individual times
3. Can modify times by editing manually
4. Cannot re-import CSV for existing quizzes (by design)

## Technical Details

### Database Schema
```sql
ALTER TABLE quiz_questions
ADD time_seconds INT NULL;
```

### API Changes
**Request Payload (Create/Update Quiz):**
```json
{
  "subject": "Product Features Q1 2026",
  "passingMarks": 60,
  "timeType": "perQuestion",
  "timePerQuestion": 30,
  "questions": [
    {
      "questionText": "What is...?",
      "score": 10,
      "timeSeconds": 45,  // Individual time
      "correctAnswer": "Answer",
      "wrongAnswers": ["Wrong1", "Wrong2"]
    }
  ]
}
```

**Response (Get Quiz):**
```json
{
  "questions": [
    {
      "question_id": 1,
      "time_seconds": 45,  // Individual time or null
      "score": 10,
      ...
    }
  ]
}
```

### Frontend State
```javascript
const [currentQuestion, setCurrentQuestion] = useState({
  questionText: '',
  score: '',
  timeSeconds: '',  // New field
  correctAnswer: '',
  wrongAnswers: []
});
```

## Benefits

1. **Flexibility**: Different questions can have different time limits
2. **Fairness**: Complex questions get more time
3. **Backward Compatible**: Existing quizzes work without modification
4. **Optional**: Time field is not required - defaults work fine

## Files Modified

- `add_question_time_column.sql` - Migration script
- `run_question_time_migration.js` - Migration runner
- `src/components/QuizCreator.jsx` - UI and CSV handling
- `server/controllers/quizController.js` - API endpoints
- `quiz_questions_template.csv` - Updated template

## Notes

- Time is stored in **seconds** in the database
- CSV time column is also in **seconds**
- Default time (global setting) is still required when using "Time per Question" mode
- Individual times override the default for specific questions
- If time_seconds is NULL, the quiz's global timePerQuestion is used

## Support

If you encounter issues:
1. Verify migration ran successfully
2. Check backend logs for errors
3. Ensure CSV format matches the template exactly
4. Verify time values are positive integers
