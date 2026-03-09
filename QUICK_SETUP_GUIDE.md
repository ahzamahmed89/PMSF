# Quick Setup Guide - Employee & Quiz Assignment System

## Prerequisites
- SQL Server running
- Node.js installed
- Yarn package manager installed

## 1. Database Setup (5 minutes)

### Execute the schema file:

```bash
sqlcmd -S localhost -U sa -P Qa@123456 -d testDB -i EMPLOYEE_QUIZ_ASSIGNMENT_SCHEMA.sql
```

Or open `EMPLOYEE_QUIZ_ASSIGNMENT_SCHEMA.sql` in SQL Server Management Studio and execute.

### Verify tables were created:

```sql
-- Check tables
SELECT * FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME IN ('employees', 'quiz_assignments', 'employee_quiz_attempts');

-- Check sample data
SELECT * FROM employees;
```

## 2. Backend Setup (Already Done!)

The routes are already integrated in `server/server.js`:
- ✅ `/api/employees` - Employee management
- ✅ `/api/quiz-assignments` - Quiz assignment management

## 3. Frontend Setup (2 minutes)

### Option A: Add to existing App.jsx

```jsx
import EmployeeManager from './components/EmployeeManager';
import QuizAssignment from './components/QuizAssignment';

// Add these routes to your router
<Route path="/employees" element={<EmployeeManager />} />
<Route path="/quiz-assignments" element={<QuizAssignment />} />
```

### Option B: Add to AdminPanel menu

Edit `src/components/AdminPanel.jsx`:

```jsx
// Add to the navigation menu
<button onClick={() => navigate('/employees')}>
  Manage Employees
</button>
<button onClick={() => navigate('/quiz-assignments')}>
  Assign Quizzes
</button>
```

## 4. Test the System

### 4.1 Start the servers (if not running):

```bash
# Terminal 1 - Backend
node server/server.js

# Terminal 2 - Frontend
yarn dev
```

### 4.2 Access the application:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

### 4.3 Login as Admin:
Use your admin credentials from the users table.

### 4.4 Test Employee Management:

1. Navigate to **Employee Management** (or http://localhost:5173/employees)
2. Click **"Add New Employee"**
3. Fill in the form:
   - Employee Code: 00006
   - Employee Name: Test User
   - Employee ID: test.user
   - Department: IT
   - Role: Tester
   - Grade: G4
4. Click **"Create Employee"**
5. Verify the employee appears in the list

### 4.5 Test Quiz Assignment:

1. Navigate to **Quiz Assignment** (or http://localhost:5173/quiz-assignments)
2. Click **"Create New Assignment"**
3. Fill in the form:
   - Assignment Name: "Test Assignment March 2026"
   - Select any quiz from dropdown
   - Leave filters empty (assigns to ALL employees)
   - Period Type: Monthly
   - Start Date: Today's date
4. Click **"Create Assignment"**
5. Verify you see "Quiz assigned successfully to X employee(s)"
6. Check the assignment in the list with progress bar

## 5. Quick API Test (Optional)

### Test with curl or Postman:

```bash
# Get all employees
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/employees

# Get departments
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/employees/departments

# Get all assignments
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/quiz-assignments
```

## 6. Common First-Time Issues

### Issue: "Cannot find module" errors
**Solution**: 
```bash
yarn install
```

### Issue: Database connection failed
**Solution**: 
Check `server/config/database.js` and update credentials:
```javascript
{
  server: 'localhost',
  database: 'testDB',
  user: 'sa',
  password: 'Qa@123456'
}
```

### Issue: CORS errors
**Solution**: 
Check `server/server.js` CORS configuration:
```javascript
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

### Issue: "Table does not exist" errors
**Solution**: 
Re-run the SQL schema file to create tables.

## 7. Next Steps

Once the system is working:

1. **Import Real Employees**:
   - Use the bulk import feature
   - Or add employees one by one

2. **Create Quiz Assignments**:
   - Assign quizzes to specific departments
   - Set up recurring monthly/quarterly quizzes
   - Monitor completion rates

3. **Test Employee View**:
   - Login as an employee (create employee user account)
   - View assigned quizzes
   - Take a quiz and verify attempt tracking

## 8. Sample Data for Testing

### Sample Employees (Already in schema):

| Code | Name | Employee ID | Department | Role | Grade |
|------|------|-------------|------------|------|-------|
| 00001 | Ahzam Ahmed | ahzam.ahmed | IT | Software Engineer | G5 |
| 00002 | Sarah Khan | sarah.khan | HR | HR Manager | G6 |
| 00003 | Ali Raza | ali.raza | IT | Senior Developer | G6 |
| 00004 | Fatima Malik | fatima.malik | Finance | Accountant | G4 |
| 00005 | Ahmed Hassan | ahmed.hassan | IT | DevOps Engineer | G5 |

### Test Assignment Scenarios:

1. **All IT Department**: Filter by Department = "IT"
2. **Senior Staff Only**: Filter by Grade = "G6"
3. **IT Engineers**: Filter by Department = "IT" + Role = "Software Engineer"
4. **Everyone**: Leave all filters empty

## 9. Verification Checklist

- [ ] Database tables created successfully
- [ ] Sample employees visible in database
- [ ] Backend server running on port 5000
- [ ] Frontend server running on port 5173
- [ ] Can access Employee Management page
- [ ] Can create a new employee
- [ ] Can access Quiz Assignment page
- [ ] Can see list of available quizzes
- [ ] Can create a quiz assignment
- [ ] Assignment shows in the list with progress
- [ ] Can view assignment details

## 10. Support

### Logs to Check:

**Backend logs:**
```bash
# Check console output for:
✓ Connected to MSSQL database
✓ Server running on http://localhost:5000
```

**Database queries:**
```sql
-- Check assignment was created
SELECT * FROM quiz_assignments;

-- Check attempts were created
SELECT * FROM employee_quiz_attempts;

-- Check employee count
SELECT COUNT(*) FROM employees WHERE is_active = 1;
```

### Getting Help:

1. Check browser console for errors (F12)
2. Check backend terminal for error messages
3. Verify database connection
4. Review EMPLOYEE_QUIZ_SYSTEM_GUIDE.md for detailed documentation

## Complete! 🎉

Your Employee & Quiz Assignment System is now ready to use!

**Quick Access URLs:**
- Employee Management: http://localhost:5173/employees
- Quiz Assignments: http://localhost:5173/quiz-assignments
- API Health Check: http://localhost:5000/api/health
