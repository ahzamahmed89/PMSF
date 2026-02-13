# Quiz Manager - Quick Reference Guide

## Overview
The Quiz Manager now allows you to **create, browse, and edit** product knowledge quizzes with automatic date tracking.

## Three Main Views

### 1. 🎯 Create New Quiz
**Purpose:** Build a brand new quiz from scratch

**Steps:**
1. Click "+ Create New Quiz" tab
2. Fill in quiz settings:
   - Quiz Subject (required)
   - Passing Marks (required)
   - Time Setting: Choose between "Total Time for Quiz" or "Time per Question"
3. Choose how to add questions:
   - **Manually:** Enter questions one by one with correct/wrong answers
   - **CSV Import:** Upload a CSV file with multiple questions
4. Review questions in the list below
5. Click "Create Quiz" to save

**CSV Format:**
```
Question,Correct Answer,Score,Wrong Answer 1,Wrong Answer 2,Wrong Answer 3
"What is..?","Answer",25,"Wrong 1","Wrong 2","Wrong 3"
```

---

### 2. 📋 Browse Quizzes
**Purpose:** View all existing quizzes with details

**What You'll See:**
- Quiz title/subject
- Number of questions
- Passing marks vs total score
- Time configuration
- ✓ **Created Date** (when quiz was first created)
- ✓ **Last Updated** (when quiz was last modified)
- ✓ **Created By** (admin username who created it)

**Actions:**
- Click **"Edit"** button on any quiz card to modify it
- Click **"Create New Quiz"** tab to make a new one

---

### 3. ✎ Edit Quiz
**Purpose:** Modify an existing quiz

**How to Access:**
1. Go to "Browse Quizzes" tab
2. Find the quiz you want to edit
3. Click the "Edit" button on that quiz card
4. You'll automatically switch to edit mode

**What You Can Change:**
- Quiz subject/title
- Passing marks
- Time settings
- Add new questions (manual input only)
- Remove existing questions
- Modify question text, answers, and scores

**What Happens Automatically:**
- ✓ Last Updated date is updated to current time
- ✓ Last Edited By is set to your username
- ✓ Creation date remains unchanged
- ✓ Original creator name is preserved

**Saving Changes:**
1. Make your modifications
2. Click **"Update Quiz"** button
3. Success message will appear
4. Automatically return to Browse view to see updated info

**Cancel Editing:**
- Click **"Cancel"** button to go back without saving

---

## Date Tracking

### What Gets Recorded

| Field | Purpose | When Set |
|-------|---------|----------|
| **Created Date** | When quiz was first created | On creation only |
| **Last Updated** | When quiz was most recently modified | On every save/edit |
| **Created By** | Admin who originally created the quiz | On creation only |
| **Last Edited By** | Admin who most recently edited the quiz | On every edit |

### Example Timeline
```
Created: Feb 13, 2025 10:30 AM by: admin
Last Updated: Feb 13, 2025 02:45 PM by: admin

(After first edit)
Created: Feb 13, 2025 10:30 AM by: admin
Last Updated: Feb 13, 2025 02:45 PM by: admin
```

---

## Tips & Best Practices

### ✅ DO
- ✓ Use descriptive quiz subjects
- ✓ Review all questions before saving
- ✓ Set realistic passing marks (not higher than total score)
- ✓ Use CSV import for bulk question entry (faster)
- ✓ Check the dates to track who made changes and when

### ❌ DON'T
- ✗ Create duplicate quizzes (use Browse to find existing ones)
- ✗ Set passing marks higher than total quiz score
- ✗ Delete all questions (quiz needs at least 1)
- ✗ Use CSV import while editing (add/remove manually instead)

---

## CSV Import Quick Start

### Download Template
1. In "Create New Quiz" tab
2. Select "Import from CSV File" option
3. Click "Download CSV Template"
4. Opens a sample CSV file with proper format

### Create Your Own CSV
1. Use the template as a reference
2. Replace sample questions with your own
3. Keep the header row exactly as is
4. Wrap text containing commas in double quotes
5. Provide at least 1 wrong answer per question

### Upload CSV
1. Save your CSV file
2. Go to "Import from CSV File" section
3. Click "Upload CSV File" button
4. Select your file
5. Success message shows number of questions imported
6. Review questions before saving

---

## Common Scenarios

### Scenario 1: Quick Quiz Update
```
Browse Quizzes → Find quiz → Edit → Change 1-2 questions → Update → Done
```

### Scenario 2: Add Many Questions
```
Create New Quiz → Select "Import from CSV" → Upload file → Review → Create
```

### Scenario 3: Verify Recent Changes
```
Browse Quizzes → Check "Last Updated" column → See who edited and when
```

### Scenario 4: Create Similar Quiz
```
Create New Quiz → Manually add questions based on existing → Create new version
```

---

## Troubleshooting

### Issue: Can't find a quiz in browse view
**Solution:** Scroll through the grid or check if it's inactive (deleted)

### Issue: CSV upload shows error
**Solution:** 
- Make sure CSV has header row
- Check that all required columns are present
- Verify question text and answers are not empty
- Ensure scores are valid numbers

### Issue: "Passing marks cannot exceed total score"
**Solution:** 
- Calculate total score: Sum of all question scores
- Set passing marks lower than total score
- Example: If total = 100, set passing marks ≤ 100

### Issue: Changes not appearing after update
**Solution:**
- Check success message appeared
- Go back to Browse view
- Refresh the page (F5)
- Check database connection

---

## Information Displayed

### In Browse Cards
```
┌─────────────────────────────────────┐
│ Quiz Subject         [5 Questions]   │
├─────────────────────────────────────┤
│ Passing Marks: 70/100               │
│ Time: 30 min                        │
│ Created: Feb 13, 2025 10:30 AM      │
│ Last Updated: Feb 13, 2025 02:45 PM │
│ Created By: admin                   │
├─────────────────────────────────────┤
│            [Edit Button]            │
└─────────────────────────────────────┘
```

---

## Keyboard Shortcuts (Future)
- Coming soon: Tab to navigate between fields
- Coming soon: Ctrl+S to save quiz

---

**Need Help?** Contact your system administrator or check the detailed documentation in the system files.
