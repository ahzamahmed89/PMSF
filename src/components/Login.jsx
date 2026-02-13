import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';
import FormInput from './FormInput';
import ErrorMessage from './ErrorMessage';
import logo2 from '../Img/logo2.png';
import '../styles/Login.css';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.username || !formData.password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      // Simple authentication (replace with real API call)
      const username = formData.username.trim().toLowerCase();
      const password = formData.password.trim();
      
      if (username === 'admin' && password === 'admin') {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('username', formData.username);
        if (onLogin) onLogin(formData.username);
        navigate('/home');
      } else {
        setError('Invalid username or password');
      }
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="animated-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
        </div>
      </div>

      <div className="login-content">
        <div className="login-card">
          <div className="login-header">
            <div className="logo-container">
              <div className="logo-icon">
                <img 
                  src={logo2} 
                  alt="Dubai Islamic Bank Pakistan"
                />
              </div>
              <div className="logo-pulse"></div>
            </div>
            <h1 className="login-title">Dubai Islamic Bank Pakistan</h1>
            <h2 className="login-main-title">Service & Quality</h2>
            <p className="login-subtitle">Welcome back! Please login to continue</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <ErrorMessage 
                message={error} 
                type="error"
                onDismiss={() => setError('')}
              />
            )}

            <FormInput
              label="Username"
              type="text"
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Enter your username"
              required
              autoComplete="username"
              className="login-input-group"
            />

            <FormInput
              label="Password"
              type="password"
              id="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              className="login-input-group"
            />

            <div className="login-options">
              <label className="remember-me">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="#" className="forgot-password">Forgot password?</a>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="login-button"
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </div>
          </form>

          <div className="login-footer">
            <p>Default credentials: <strong>admin / admin</strong></p>
          </div>
        </div>

        <div className="login-info">
          <div className="info-card">
            <div className="info-icon">📊</div>
            <h3>Track Performance</h3>
            <p>Monitor and evaluate branch performance</p>
          </div>
          <div className="info-card">
            <div className="info-icon">📝</div>
            <h3>Easy Entry</h3>
            <p>Streamlined data entry process</p>
          </div>
          <div className="info-card">
            <div className="info-icon">🎯</div>
            <h3>Real-time Analysis</h3>
            <p>Get instant insights and reports</p>
          </div>
        </div>
      </div>
    </div>
  );
}
