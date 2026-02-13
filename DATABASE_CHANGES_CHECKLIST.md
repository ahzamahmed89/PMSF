# Database Changes Required for Quiz Edit Feature

## Summary

✅ **Minimal changes required!** The database mostly has what's needed. Just ensure these columns exist.

---

## Required Changes

### Column: `last_edited_by` (NEW - REQUIRED)

**Table:** `quizzes`

**SQL Command:**
```sql
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_NAME = 'quizzes' AND COLUMN_NAME = 'last_edited_by')
BEGIN
    ALTER TABLE quizzes
    ADD last_edited_by NVARCHAR(100) NULL;
END
```

**Purpose:** Tracks which admin user last modified the quiz  
**Type:** NVARCHAR(100) NULL  
**Auto-Populated:** Yes, by backend on every update

---

## Existing Required Columns (Should Already Exist)

### Column: `created_at`
- **Status:** Should already exist from original schema
- **Type:** DATETIME2
- **Purpose:** Records when quiz was created
- **Auto-Populated:** Yes (GETDATE() on insert)

### Column: `updated_at`
- **Status:** Should already exist from original schema
- **Type:** DATETIME2
- **Purpose:** Records when quiz was last modified
- **Auto-Populated:** Yes (GETDATE() on update)

### Column: `created_by`
- **Status:** Should already exist from original schema
- **Type:** NVARCHAR(100) NULL
- **Purpose:** Records which admin created the quiz
- **Auto-Populated:** Yes (on creation)

---

## How to Apply Changes

### Option 1: Run the Migration Script (RECOMMENDED)

1. Open SQL Server Management Studio or SQL Server Express
2. Open the file: `DATABASE_MIGRATION_EDIT_FEATURE.sql`
3. Connect to your database: **DIB**
4. Execute the script
5. Check output for confirmation

**File Location:**
```
c:\Users\HomePC\Desktop\Empty Folder\DATABASE_MIGRATION_EDIT_FEATURE.sql
```

### Option 2: Manual SQL Commands

Execute in this order:

```sql
-- Add last_edited_by column
ALTER TABLE quizzes
ADD last_edited_by NVARCHAR(100) NULL;

-- Verify the column was added
SELECT COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'quizzes'
ORDER BY ORDINAL_POSITION;
```

### Option 3: In Code (If Needed)

The application will work even without `last_edited_by` initially, but the feature will not track editor information.

---

## Current Database Schema (quizzes table)

```
quiz_id              INT PRIMARY KEY IDENTITY(1,1)
subject              NVARCHAR(255) NOT NULL
passing_marks        DECIMAL(10,2) NOT NULL
total_score          DECIMAL(10,2) NOT NULL
time_type            NVARCHAR(20) NOT NULL DEFAULT 'total'
total_time           INT NULL
time_per_question    INT NULL
created_by           NVARCHAR(100) NULL
created_at           DATETIME2 DEFAULT GETDATE()
updated_at           DATETIME2 DEFAULT GETDATE()
last_edited_by       NVARCHAR(100) NULL  ← ADD THIS
is_active            BIT DEFAULT 1
```

---

## Expected Behavior After Migration

### When Creating a Quiz
```
INSERT quizzes (subject, passing_marks, ..., created_by)
created_at  → automatically set to GETDATE()
updated_at  → automatically set to GETDATE()
created_by  → set from logged-in user
last_edited_by → NULL (no edits yet)
```

### When Editing a Quiz
```
UPDATE quizzes SET subject=..., updated_at=GETDATE(), last_edited_by=...
created_at  → unchanged (original creation time)
updated_at  → updated to current time
created_by  → unchanged (original creator)
last_edited_by → set to editor username
```

---

## Verification Checklist

After running the migration, verify:

```sql
-- Check column exists
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'quizzes'
AND COLUMN_NAME = 'last_edited_by';

-- Should return: last_edited_by, nvarchar, YES (nullable)

-- Check data integrity
SELECT 
    COUNT(*) as total_quizzes,
    COUNT(created_at) as with_created_date,
    COUNT(updated_at) as with_updated_date,
    COUNT(created_by) as with_creator
FROM quizzes;

-- All counts should be equal
```

---

## Quick Reference

| Feature | Column | Current | Required | Action |
|---------|--------|---------|----------|--------|
| Track Creation | `created_at` | ✓ | ✓ | None |
| Track Modifications | `updated_at` | ✓ | ✓ | None |
| Creator Username | `created_by` | ✓ | ✓ | None |
| Editor Username | `last_edited_by` | ❌ | ✓ | **ADD THIS** |

---

## Impact on Existing Quizzes

✅ **NO DATA LOSS** - This is purely additive

- All existing quizzes remain unchanged
- `created_at` and `updated_at` retain their values
- `created_by` retains its value
- `last_edited_by` will be NULL until first edit
- is_active status unchanged

---

## Timeline of Changes

```
Before Migration:
- Created: Jan 15, 2025 10:30 AM → admin
- Last Updated: Jan 15, 2025 10:30 AM

After Migration (no edits yet):
- Created: Jan 15, 2025 10:30 AM → admin
- Last Updated: Jan 15, 2025 10:30 AM
- Last Edited By: NULL

After First Edit:
- Created: Jan 15, 2025 10:30 AM → admin
- Last Updated: Feb 14, 2026 02:45 PM
- Last Edited By: admin
```

---

## Backend Impact

The backend API expects these columns:

**GET /api/quizzes** (Browse)
```json
{
  "quiz_id": 1,
  "subject": "...",
  "passing_marks": 70,
  "total_score": 100,
  "time_type": "total",
  "total_time": 30,
  "time_per_question": null,
  "created_by": "admin",
  "created_at": "2025-01-15T10:30:00.000Z",
  "updated_at": "2025-02-14T02:45:00.000Z",
  "question_count": 5
}
```

**PUT /api/quizzes/:quizId** (Update)
```json
Body sends:
{
  "subject": "...",
  "passingMarks": 70,
  "lastEditedBy": "admin",
  ...
}

Database updates:
- updated_at → GETDATE()
- last_edited_by → "admin"
```

---

## Potential Issues & Solutions

### Issue: "Column 'last_edited_by' does not exist"
**Solution:** Run the migration script or execute the ALTER TABLE command above

### Issue: "Cannot insert NULL into is_active"
**Solution:** This is unrelated to edit feature. Ensure is_active has DEFAULT 1

### Issue: "Quiz times show as NULL in browse view"
**Solution:** This is normal if time_type is 'perQuestion' (time_per_question used instead)

### Issue: "Edit button appears but clicking does nothing"
**Solution:** Check browser console for errors. May indicate API connectivity issue.

---

## Rollback Plan (If Needed)

To remove the new column:
```sql
ALTER TABLE quizzes
DROP COLUMN last_edited_by;
```

However, this will disable the "last edited by" feature. The edit feature will still work without it.

---

## Recommended Execution

**Timing:** Can run anytime (safe, additive change)  
**Downtime:** None required  
**Backup:** Recommended before running  
**Testing:** Run verification queries after execution  

---

## Questions?

Refer to:
- `QUIZ_EDIT_FEATURE.md` - Technical details
- `QUIZ_MANAGER_GUIDE.md` - User guide
- `database_schema_quiz.sql` - Complete schema reference

✅ **That's it!** Once this column is added, the edit feature will be fully functional.
