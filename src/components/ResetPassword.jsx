import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Button from './Button';
import FormInput from './FormInput';
import ErrorMessage from './ErrorMessage';
import logo2 from '../Img/logo2.png';
import { API_URL } from '../config/api';
import '../styles/Login.css';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');

  useEffect(() => {
    // If coming from password recovery page, get username
    if (location.state?.username) {
      setUsername(location.state.username);
    }
  }, [location]);

  const checkPasswordStrength = (pwd) => {
    if (pwd.length < 8) return 'weak';
    if (!/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd) || !/[!@#$%^&*]/.test(pwd)) return 'fair';
    return 'strong';
  };

  const handlePasswordChange = (pwd) => {
    setNewPassword(pwd);
    setPasswordStrength(checkPasswordStrength(pwd));
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim() || !resetCode.trim() || !newPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/reset-password`, {
        username: username.trim(),
        resetCode: resetCode.trim(),
        newPassword: newPassword
      });

      if (response.data.success) {
        setSuccess(response.data.message);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(response.data.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      let errorMsg = 'Failed to reset password. Please try again.';
      if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
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
            <h2 className="login-main-title">Reset Password</h2>
            <p className="login-subtitle">Enter your reset code and new password</p>
          </div>

          <form className="login-form" onSubmit={handleResetPassword}>
            {error && (
              <ErrorMessage 
                message={error} 
                type="error"
                onDismiss={() => setError('')}
              />
            )}

            {success && (
              <div style={{
                padding: '12px',
                marginBottom: '20px',
                backgroundColor: '#d4edda',
                color: '#155724',
                borderRadius: '4px',
                fontSize: '14px',
                border: '1px solid #c3e6cb'
              }}>
                {success}
              </div>
            )}

            <FormInput
              label="Username"
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoComplete="username"
              className="login-input-group"
            />

            <FormInput
              label="Reset Code"
              type="text"
              id="resetCode"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value.toUpperCase())}
              placeholder="Enter the 6-digit code"
              required
              className="login-input-group"
              maxLength="50"
            />

            <FormInput
              label="New Password"
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="Enter new password (minimum 8 characters)"
              required
              autoComplete="new-password"
              className="login-input-group"
            />

            {newPassword && (
              <div style={{
                fontSize: '12px',
                marginTop: '-12px',
                marginBottom: '12px',
                color: passwordStrength === 'weak' ? '#856404' : passwordStrength === 'fair' ? '#004085' : '#155724'
              }}>
                Password Strength: <strong>{passwordStrength.toUpperCase()}</strong>
                {passwordStrength !== 'strong' && (
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px' }}>
                    {passwordStrength === 'weak' && 'Must include uppercase, number, and special character'}
                    {passwordStrength === 'fair' && 'Consider adding a special character'}
                  </p>
                )}
              </div>
            )}

            <FormInput
              label="Confirm Password"
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
              required
              autoComplete="new-password"
              className="login-input-group"
            />

            <div className="form-actions" style={{ display: 'flex', gap: '10px' }}>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="login-button"
                style={{ flex: 1 }}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/login')}
                className="login-button"
                style={{ flex: 1 }}
              >
                Back to Login
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
