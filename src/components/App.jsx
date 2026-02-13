import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './Login'
import Home from './Home'
import DataManager from './DataManager'
import EntryModule from './EntryModule'
import PMSFForm from './PMSFForm'
import ViewModule from './ViewModule'
import QuizCreator from './QuizCreator'
import QuizAttempt from './QuizAttempt'

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
            path="/home" 
            element={
              isAuthenticated ? <Home onLogout={handleLogout} username={username} /> : <Navigate to="/" />
            } 
          />
          <Route 
            path="/data-manager" 
            element={
              isAuthenticated ? <DataManager /> : <Navigate to="/" />
            } 
          />
          <Route 
            path="/entry-module" 
            element={
              isAuthenticated ? <EntryModule /> : <Navigate to="/" />
            } 
          />
          <Route 
            path="/pmsf-form" 
            element={
              isAuthenticated ? <PMSFForm /> : <Navigate to="/" />
            } 
          />
          <Route 
            path="/view-module" 
            element={
              isAuthenticated ? <ViewModule /> : <Navigate to="/" />
            } 
          />
          <Route 
            path="/quiz-creator" 
            element={
              isAuthenticated ? <QuizCreator /> : <Navigate to="/" />
            } 
          />
          <Route 
            path="/quiz-attempt" 
            element={
              isAuthenticated ? <QuizAttempt /> : <Navigate to="/" />
            } 
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App
