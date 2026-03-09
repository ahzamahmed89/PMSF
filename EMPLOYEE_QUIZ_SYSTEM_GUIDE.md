# Employee & Quiz Assignment System

## Overview

This system allows administrators to manage employees and assign quizzes to them based on various criteria such as department, functional role, or grade. The system supports recurring quiz assignments with different period types (monthly, quarterly, half-yearly, yearly, or one-time).

## Features

### Employee Management
- ✅ Create, Read, Update, Delete employee records
- ✅ Employee fields: Code (5 digits), Name, Employee ID, Department, Role, Grade
- ✅ Filter employees by department, role, grade, or search
- ✅ Active/inactive employee status
- ✅ Bulk import capability

### Quiz Assignment
- ✅ Assign quizzes to employees based on filters (department, role, grade, or combinations)
- ✅ Multi-filter support for targeted assignments
- ✅ Period-based assignments:
  - **Once**: One-time assignment
  - **Monthly**: Recurring monthly
  - **Quarterly**: Every 3 months
  - **Half-Yearly**: Twice per year
  - **Yearly**: Once per year
- ✅ Track assignment progress and completion rates
- ✅ View detailed employee attempt records
- ✅ Automatic period refresh for recurring assignments

### Quiz Attempt Tracking
- ✅ Individual employee attempt records
- ✅ Period-based tracking (e.g., 2026-Q1, 2026-03, 2026)
- ✅ Automatic status management (not_started, in_progress, completed, expired)
- ✅ Score and percentage tracking
- ✅ Time tracking

## Database Schema

### Tables Created

1. **employees**
   - Employee master data with code, name, ID, department, role, grade
   - Indexed for fast filtering

2. **quiz_assignments**
   - Assignment configuration with filters and period settings
   - Links quizzes to employee groups

3. **employee_quiz_attempts**
   - Individual attempt records for each employee
   - Tracks attempt number, period identifier, scores, and timestamps

4. **quiz_assignment_notifications** (optional)
   - Notification tracking for upcoming/overdue quizzes

### Stored Procedures

1. **sp_GetEligibleEmployees**
   - Returns employees matching filter criteria

2. **sp_CreateQuizAssignment**
   - Creates assignment and generates attempt records for all eligible employees

3. **sp_RefreshPeriodAttempts**
   - Creates new period attempts for recurring assignments

### Views

1. **vw_EmployeeQuizDashboard**
   - Comprehensive view of employee quiz status

## Installation & Setup

### Step 1: Database Setup

Run the SQL migration script:

```bash
# Connect to SQL Server
sqlcmd -S localhost -U sa -P YourPassword -d YourDatabase

# Run the migration
sqlcmd -S localhost -U sa -P YourPassword -d YourDatabase -i EMPLOYEE_QUIZ_ASSIGNMENT_SCHEMA.sql
```

Or manually execute the SQL file in SQL Server Management Studio.

### Step 2: Backend Setup

The routes are already integrated into `server/server.js`:

```javascript
// Routes are available at:
// http://localhost:5000/api/employees
// http://localhost:5000/api/quiz-assignments
```

### Step 3: Frontend Setup

Import the components in your React app:

```javascript
import EmployeeManager from './components/EmployeeManager';
import QuizAssignment from './components/QuizAssignment';

// Add routes
<Route path="/employees" element={<EmployeeManager />} />
<Route path="/quiz-assignments" element={<QuizAssignment />} />
```

## API Endpoints

### Employee Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/employees` | Get all employees with filters | Required |
| GET | `/api/employees/:id` | Get single employee | Required |
| GET | `/api/employees/departments` | Get unique departments | Required |
| GET | `/api/employees/roles` | Get unique roles | Required |
| GET | `/api/employees/grades` | Get unique grades | Required |
| GET | `/api/employees/eligible` | Get eligible employees for assignment | Required |
| POST | `/api/employees` | Create new employee | Admin/Editor |
| POST | `/api/employees/bulk-import` | Bulk import employees | Admin/Editor |
| PUT | `/api/employees/:id` | Update employee | Admin/Editor |
| DELETE | `/api/employees/:id` | Delete employee | Admin |

### Quiz Assignment Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/quiz-assignments` | Get all assignments | Required |
| GET | `/api/quiz-assignments/:id` | Get assignment details with attempts | Required |
| GET | `/api/quiz-assignments/:id/statistics` | Get assignment statistics | Required |
| GET | `/api/quiz-assignments/dashboard` | Get employee dashboard view | Required |
| GET | `/api/quiz-assignments/my-quizzes` | Get my assigned quizzes (employee view) | Required |
| POST | `/api/quiz-assignments` | Create new assignment | Admin/Editor |
| POST | `/api/quiz-assignments/refresh-period` | Refresh period for recurring assignment | Admin/Editor |
| PUT | `/api/quiz-assignments/:id` | Update assignment (deactivate) | Admin/Editor |
| DELETE | `/api/quiz-assignments/:id` | Delete assignment | Admin |

## Usage Examples

### Creating an Employee

```javascript
// POST /api/employees
{
  "employee_code": "00001",
  "employee_name": "Ahzam Ahmed",
  "employee_id": "ahzam.ahmed",
  "functional_department": "IT",
  "functional_role": "Software Engineer",
  "grade": "G5"
}
```

### Creating a Quiz Assignment

```javascript
// POST /api/quiz-assignments
{
  "quiz_id": 1,
  "assignment_name": "Q1 2026 IT Department Safety Quiz",
  "filter_department": "IT",
  "filter_role": null,  // Optional: filter by role
  "filter_grade": null,  // Optional: filter by grade
  "period_type": "quarterly",
  "period_start_date": "2026-01-01"
}
```

### Multi-Filter Assignment

Assign quiz to Senior Engineers (G6 grade) in IT department:

```javascript
{
  "quiz_id": 2,
  "assignment_name": "Senior IT Staff Advanced Training",
  "filter_department": "IT",
  "filter_role": "Software Engineer",
  "filter_grade": "G6",
  "period_type": "monthly",
  "period_start_date": "2026-03-01"
}
```

### Getting Eligible Employees

```javascript
// GET /api/employees/eligible?department=IT&role=Software Engineer&grade=G5
// Returns all active employees matching the criteria
```

### Refreshing Period Attempts

For recurring assignments, manually trigger new period creation:

```javascript
// POST /api/quiz-assignments/refresh-period
{
  "assignment_id": 5,
  "new_period_identifier": "2026-Q2"  // or "2026-07" for monthly
}
```

## Frontend Components

### EmployeeManager Component

**Location**: `src/components/EmployeeManager.jsx`

**Features**:
- Employee list with filters (department, role, grade, search)
- Create/Edit employee form
- Delete confirmation modal
- Active/inactive status toggle
- Responsive table layout
- Auto-complete suggestions for department/role/grade

**Props**: None (self-contained)

### QuizAssignment Component

**Location**: `src/components/QuizAssignment.jsx`

**Features**:
- List all active assignments with progress
- Create new assignment with filters
- View detailed assignment attempts per employee
- Deactivate assignments
- Real-time eligible employee count
- Period type selection with descriptions

**Props**: None (self-contained)

## Period Identifier Format

The system automatically generates period identifiers based on the period type:

- **Yearly**: `2026`
- **Half-Yearly**: `2026-H1`, `2026-H2`
- **Quarterly**: `2026-Q1`, `2026-Q2`, `2026-Q3`, `2026-Q4`
- **Monthly**: `2026-01`, `2026-02`, etc.
- **Once**: `once`

## Recurring Assignment Workflow

1. **Initial Assignment**: Create assignment with period type
2. **Automatic Attempt Creation**: System creates attempt records for all eligible employees
3. **Employee Completion**: Employees complete quizzes, status updates to "completed"
4. **Period Refresh**: At period end, system can create new attempts for next period
5. **Repeat**: New attempts created with incremented period identifier

## Admin Workflow

### Setting Up Employees

1. Navigate to Employee Management
2. Add employees individually or use bulk import
3. Ensure all employees have correct department, role, and grade

### Assigning Quizzes

1. Navigate to Quiz Assignment
2. Click "Create New Assignment"
3. Select quiz from dropdown
4. Choose filters (department/role/grade or leave empty for all)
5. See eligible employee count
6. Select period type and start date
7. Create assignment

### Monitoring Progress

1. View assignments list to see completion percentages
2. Click "View Details" on any assignment
3. See individual employee attempts with scores
4. Filter by status (completed, pending, expired)

### Managing Recurring Quizzes

1. Assignments marked as recurring will need period refresh
2. Use "Refresh Period" API or implement automatic refresh
3. System creates new attempt records for next period
4. Previous period data is preserved

## Employee Workflow

### Viewing Assigned Quizzes

```javascript
// GET /api/quiz-assignments/my-quizzes?employee_id=ahzam.ahmed
// Returns all quizzes assigned to the employee
```

Employee sees:
- Quiz title and description
- Assignment period
- Due date (if applicable)
- Current status (pending/in progress/completed)
- Score (if completed)

## Security & Permissions

### Role-Based Access Control

**Admin**:
- Full access to all features
- Can delete employees and assignments
- Can modify all records

**Editor**:
- Can create/edit employees
- Can create/edit assignments
- Cannot delete records

**Employee**:
- Can only view their assigned quizzes
- Can take assigned quizzes
- Cannot access employee/assignment management

## Best Practices

1. **Employee Data**:
   - Use consistent naming conventions for departments, roles, and grades
   - Keep employee IDs unique and lowercase (e.g., firstname.lastname)
   - Deactivate employees instead of deleting (preserves history)

2. **Quiz Assignments**:
   - Use descriptive assignment names with period info
   - Test filters with "eligible employees" count before creating
   - Set reasonable start dates for period-based assignments
   - Monitor completion rates regularly

3. **Period Management**:
   - Plan period refreshes in advance
   - Consider time zones if employees are distributed
   - Archive completed periods for reporting

4. **Performance**:
   - All filter fields are indexed for fast queries
   - Use specific filters instead of retrieving all data
   - Implement pagination for large employee lists

## Troubleshooting

### Common Issues

**Issue**: No eligible employees for assignment
- **Solution**: Check if employees exist with matching filters
- **Solution**: Verify employees are marked as active

**Issue**: Assignment not showing in employee view
- **Solution**: Confirm assignment is active (is_active = 1)
- **Solution**: Verify employee matches assignment filters
- **Solution**: Check employee_id is correctly spelled

**Issue**: Period refresh not creating new attempts
- **Solution**: Ensure new period identifier is unique
- **Solution**: Verify assignment is still active
- **Solution**: Check if employees still match filters

**Issue**: Duplicate employee_code or employee_id error
- **Solution**: Check for existing employees with same code/ID
- **Solution**: Use different values or update existing employee

## Future Enhancements

Potential improvements to consider:

1. **Notifications**:
   - Email notifications for new assignments
   - Reminder emails for pending quizzes
   - Due date alerts

2. **Reporting**:
   - Department-wise completion reports
   - Grade-wise performance analysis
   - Time-based trends

3. **Automation**:
   - Automatic period refresh at period end
   - Auto-assignment for new employees matching filters
   - Scheduled reminder notifications

4. **Advanced Features**:
   - Quiz prerequisite chains
   - Certification upon completion
   - Leaderboards by department/role
   - Export reports to PDF/Excel

## Support & Maintenance

### Database Maintenance

```sql
-- Clean up old expired attempts (older than 2 years)
DELETE FROM employee_quiz_attempts 
WHERE status = 'expired' 
  AND completed_at < DATEADD(year, -2, GETDATE());

-- Archive old assignments
UPDATE quiz_assignments 
SET is_active = 0 
WHERE period_end_date < DATEADD(year, -1, GETDATE());
```

### Health Checks

Monitor these metrics:
- Active assignments count
- Pending vs. completed attempt ratio
- Average completion time
- Employee participation rate

## Conclusion

This system provides a comprehensive solution for managing employees and assigning quizzes with flexible filtering and period-based recurring assignments. The modular design allows for easy extension and customization based on organizational needs.

For questions or issues, contact the development team.
