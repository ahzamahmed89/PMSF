# Quiz Questions - Bulk Import via CSV

## Overview
You can now bulk import quiz questions using CSV files. The quiz settings (subject, passing marks, time limits) are still filled manually, but all questions with their answers can be imported at once.

## CSV File Format

### Required Columns (in order):
1. **Question** - The question text
2. **Correct Answer** - The correct answer for the question
3. **Score** - Points awarded for correct answer (must be a number)
4. **Wrong Answer 1** - First wrong answer (required)
5. **Wrong Answer 2** - Second wrong answer (optional)
6. **Wrong Answer 3** - Third wrong answer (optional)
7. **Wrong Answer 4** - Fourth wrong answer (optional)
8. **Wrong Answer 5** - Fifth wrong answer (optional)

### Rules:
- ✅ First row must be headers
- ✅ At least 1 wrong answer is required
- ✅ Up to 5 wrong answers supported per question
- ✅ Score must be a positive number
- ✅ Use double quotes for fields containing commas
- ✅ UTF-8 encoding recommended

## CSV Template

Download the template directly from the Quiz Creator page, or create a file with this structure:

```csv
Question,Correct Answer,Score,Wrong Answer 1,Wrong Answer 2,Wrong Answer 3,Wrong Answer 4,Wrong Answer 5
"What is the main feature of our new mobile banking app?","Biometric authentication and instant transfers",25,"Cash withdrawal only","Foreign currency exchange","Loan processing system"
"Which Islamic banking principle does our product follow?","Sharia-compliant profit sharing",25,"Interest-based lending","Fixed deposit returns","Conventional banking methods"
"What is the maximum daily transfer limit for individual accounts?","PKR 500,000",25,"PKR 100,000","PKR 1,000,000","No limit"
"Which document is required for account opening?","CNIC and proof of income",20,"Only CNIC","Passport only","No documents required","Just a phone number"
```

## How to Import Questions

### Step 1: Prepare Your CSV File
1. Create a CSV file in Excel, Google Sheets, or any text editor
2. Ensure first row contains headers
3. Add your questions row by row
4. Save as `.csv` format

### Step 2: Fill Quiz Settings
1. Login to the application
2. Navigate to "Create Quiz"
3. Fill in the quiz settings:
   - Quiz Subject
   - Passing Marks
   - Time Setting (Total or Per Question)
   - Time Duration

### Step 3: Import Questions
1. In the "Add Questions" section, select **"Import from CSV File"**
2. Click **"Download CSV Template"** to see the format (optional)
3. Click **"Upload CSV File"** and select your file
4. Questions will be imported automatically
5. Review the imported questions in the list below
6. Click **"Save Quiz"** to store in database

## Examples

### Example 1: Simple Quiz (2 choices)
```csv
Question,Correct Answer,Score,Wrong Answer 1
"Is DIB an Islamic Bank?","Yes",10,"No"
"Does DIB charge interest?","No",10,"Yes"
```

### Example 2: Multiple Choice (4 choices)
```csv
Question,Correct Answer,Score,Wrong Answer 1,Wrong Answer 2,Wrong Answer 3
"What year was DIB founded?","2002",15,"2000","2005","2010"
"How many branches does DIB have?","50+",15,"10","25","100"
```

### Example 3: Complex Questions with Commas
```csv
Question,Correct Answer,Score,Wrong Answer 1,Wrong Answer 2,Wrong Answer 3
"Which services does DIB offer: savings, loans, and insurance?","All of the above",20,"Only savings","Only loans","Savings and loans, but not insurance"
"What is DIB's tagline?","Service & Quality",20,"Banking Solutions","Your Partner in Growth","Modern Islamic Banking"
```

## Validation Rules

The system validates:
- ✅ Question text is not empty
- ✅ Correct answer is not empty
- ✅ Score is a valid positive number
- ✅ At least 1 wrong answer is provided
- ✅ CSV file has proper format

If validation fails, you'll see an error message with the row number and issue.

## Tips for Best Results

### Excel/Google Sheets:
1. Enter data normally in cells
2. Don't worry about commas - quotes are added automatically
3. Save as "CSV (Comma delimited)" format
4. If special characters appear wrong, save as "CSV UTF-8"

### Text Editor:
1. Use double quotes around fields with commas
2. Escape quotes inside quoted fields by doubling them: `"He said ""Hello"""`
3. Keep one question per line
4. Don't add extra blank lines

### Question Writing:
1. Keep questions clear and concise
2. Ensure only one answer is definitively correct
3. Make wrong answers plausible but clearly incorrect
4. Vary question difficulty by adjusting scores

## Troubleshooting

### "No valid questions found"
- Check if file has data rows (not just headers)
- Ensure CSV format is correct

### "Insufficient columns"
- Verify you have at least 4 columns (Question, Correct Answer, Score, Wrong Answer 1)
- Check for missing commas between fields

### "Invalid score"
- Ensure Score column contains only numbers
- Don't use currency symbols or text
- Use decimal point (.) not comma for decimals

### "At least one wrong answer is required"
- Check that Column 4 (Wrong Answer 1) has data
- Ensure cells aren't empty

### Characters showing incorrectly
- Save CSV as UTF-8 encoding
- Use Notepad++ or similar editor to check encoding

## Manual Entry vs CSV Import

### Use Manual Entry When:
- Creating a small quiz (< 5 questions)
- Questions have varying number of choices
- You want to review each question while adding

### Use CSV Import When:
- Creating large quizzes (10+ questions)
- Questions are already in spreadsheet format
- Bulk importing from existing question banks
- Need to create multiple quizzes with similar structure

## Editing Imported Questions

After importing:
1. Review all imported questions in the preview list
2. To modify a question, remove it and add manually
3. To clear all and start over, click "Clear Imported Questions"
4. Mix manual and CSV: import first, then add more manually

## Database Storage

Imported questions are stored the same way as manually entered questions:
- **quizzes** table - Quiz metadata
- **quiz_questions** table - Question text, correct answer, score
- **question_wrong_answers** table - All wrong answer options

No difference in storage or functionality between manual and CSV questions.

## Limits and Constraints

- Maximum wrong answers per question: 5
- Minimum wrong answers per question: 1
- Maximum score per question: No limit (DECIMAL 10,2)
- Maximum question text length: Unlimited (NVARCHAR MAX)
- Maximum answer text length: 500 characters (NVARCHAR 500)
- Maximum questions per quiz: No technical limit

## Sample Use Cases

### 1. Product Knowledge Quiz
Import 50 questions about bank products, features, and policies from HR's existing spreadsheet.

### 2. Compliance Training
Import 30 regulatory questions with 4 choices each for quarterly certification.

### 3. Onboarding Assessment
Import 20 questions about company culture, values, and procedures.

### 4. Monthly Knowledge Check
Quickly create monthly quizzes by importing from rotating question bank CSV files.

## Security Notes

- CSV files are processed client-side (in browser)
- No file is uploaded to server until quiz is saved
- Only quiz data (questions and answers) is sent to database
- Original CSV file is not stored

## Need Help?

If you encounter issues:
1. Download the template and verify your format matches
2. Check error messages for specific row numbers
3. Try with a small test file first (2-3 questions)
4. Ensure CSV is comma-delimited (not semicolon or tab)
5. Contact your administrator if problems persist
