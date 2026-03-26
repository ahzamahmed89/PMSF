import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './Login'
import PasswordRecovery from './PasswordRecovery'
import ResetPassword from './ResetPassword'
import Home from './Home'
import DataManager from './DataManager'
import EntryModule from './EntryModule'
import PMSFForm from './PMSFForm'
import ViewModule from './ViewModule'
import QuizCreator from './QuizCreator'
import QuizAttempt from './QuizAttempt'
import AdminPanel from './AdminPanel'
import EmployeeManager from './EmployeeManager'
import QuizAssignment from './QuizAssignment'
import ChecklistManager from './ChecklistManager'
import ChecklistEntry from './ChecklistEntry'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    // Check if user is already logged in
    const auth = localStorage.getItem('isAuthenticated');
    const savedUsername = localStorage.getItem('username');
    if (auth === 'true' && savedUsername) {
      setIsAuthenticated(true);
      setUsername(savedUsername);
    }
  }, []);

  const handleLogin = (user) => {
    setIsAuthenticated(true);
    setUsername(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userFullName');
    localStorage.removeItem('userRoles');
    localStorage.removeItem('userPermissions');
    setIsAuthenticated(false);
    setUsername('');
  };

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route 
            path="/" 
            element={
              isAuthenticated ? <Navigate to="/home" /> : <Login onLogin={handleLogin} />
            } 
          />
          <Route 
            path="/login" 
            element={<Login onLogin={handleLogin} />}
          />
          <Route 
            path="/password-recovery" 
            element={<PasswordRecovery />}
          />
          <Route 
            path="/reset-password" 
            element={<ResetPassword />}
          />
          <Route 
            path="/home" 
            element={
              isAuthenticated ? <Home onLogout={handleLogout} username={username} /> : <Navigate to="/" />
            } 
          />
          <Route 
            path="/data-manager" 
            element={
              isAuthenticated ? <DataManager onLogout={handleLogout} /> : <Navigate to="/" />
            } 
          />
          <Route 
            path="/entry-module" 
            element={
              isAuthenticated ? <EntryModule onLogout={handleLogout} /> : <Navigate to="/" />
            } 
          />
          <Route 
            path="/pmsf-form" 
            element={
              isAuthenticated ? <PMSFForm onLogout={handleLogout} /> : <Navigate to="/" />
            } 
          />
          <Route 
            path="/view-module" 
            element={
              isAuthenticated ? <ViewModule onLogout={handleLogout} /> : <Navigate to="/" />
            } 
          />
          <Route 
            path="/quiz-creator" 
            element={
              isAuthenticated ? <QuizCreator onLogout={handleLogout} /> : <Navigate to="/" />
            } 
          />
          <Route 
            path="/quiz-attempt" 
            element={
              isAuthenticated ? <QuizAttempt onLogout={handleLogout} /> : <Navigate to="/" />
            } 
          />
          <Route 
            path="/admin" 
            element={
              isAuthenticated ? <AdminPanel onLogout={handleLogout} /> : <Navigate to="/" />
            } 
          />
          <Route 
            path="/employees" 
            element={
              isAuthenticated ? <EmployeeManager onLogout={handleLogout} /> : <Navigate to="/" />
            } 
          />
          <Route 
            path="/quiz-assignments" 
            element={
              isAuthenticated ? <QuizAssignment onLogout={handleLogout} /> : <Navigate to="/" />
            } 
          />
          <Route
            path="/checklist-manager"
            element={
              isAuthenticated ? <ChecklistManager onLogout={handleLogout} /> : <Navigate to="/" />
            }
          />
          <Route
            path="/checklist-entry"
            element={
              isAuthenticated ? <ChecklistEntry onLogout={handleLogout} /> : <Navigate to="/" />
            }
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App
