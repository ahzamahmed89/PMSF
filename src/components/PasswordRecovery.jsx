import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Button from './Button';
import FormInput from './FormInput';
import ErrorMessage from './ErrorMessage';
import SuccessMessage from './ErrorMessage';
import logo2 from '../Img/logo2.png';
import { API_URL } from '../config/api';
import '../styles/Login.css';

export default function PasswordRecovery() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetCode, setResetCode] = useState('');

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/request-password-reset`, {
        username: username.trim()
      });

      if (response.data.success) {
        setSuccess(response.data.message);
        // Show the reset code (for testing/development)
        if (response.data.resetCode) {
          setResetCode(response.data.resetCode);
        }
        // Redirect to reset password page after 2 seconds
        setTimeout(() => {
          navigate('/reset-password', { state: { username: username.trim() } });
        }, 2000);
      } else {
        setError(response.data.error || 'Failed to request password reset');
      }
    } catch (error) {
      console.error('Password reset request error:', error);
      let errorMsg = 'Failed to request password reset. Please try again.';
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
            <h2 className="login-main-title">Password Recovery</h2>
            <p className="login-subtitle">Enter your username to recover your password</p>
          </div>

          <form className="login-form" onSubmit={handleRequestReset}>
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

            {/* ========== DEVELOPMENT ONLY - REMOVE IN PRODUCTION ========== */}
            {resetCode && (
              <div style={{
                padding: '20px',
                marginBottom: '20px',
                backgroundColor: '#fff3cd',
                color: '#856404',
                borderRadius: '8px',
                fontSize: '14px',
                border: '3px solid #ffc107',
                textAlign: 'center'
              }}>
                <div style={{ 
                  backgroundColor: '#ff9800', 
                  color: 'white', 
                  padding: '8px', 
                  marginBottom: '15px',
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  fontSize: '12px',
                  letterSpacing: '1px'
                }}>
                  ⚠️ DEVELOPMENT MODE ONLY ⚠️
                </div>
                <div style={{ fontSize: '16px', marginBottom: '10px', fontWeight: 'bold' }}>
                  Your Password Reset Code:
                </div>
                <div style={{ 
                  backgroundColor: '#ffffff', 
                  padding: '15px', 
                  borderRadius: '6px',
                  border: '2px dashed #ffc107',
                  marginBottom: '10px'
                }}>
                  <code style={{ 
                    fontSize: '32px', 
                    fontWeight: 'bold', 
                    letterSpacing: '8px',
                    color: '#d9534f',
                    fontFamily: 'monospace'
                  }}>
                    {resetCode}
                  </code>
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: '13px', fontWeight: '500' }}>
                  ⏱️ Valid for 15 minutes
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '11px', fontStyle: 'italic', opacity: 0.8 }}>
                  In production, this code will be sent via email only
                </p>
              </div>
            )}
            {/* ========== END DEVELOPMENT ONLY ========== */}

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

            <p style={{
              fontSize: '13px',
              color: '#666',
              marginTop: '15px',
              marginBottom: '20px'
            }}>
              A password reset code will be sent to your registered email and displayed here. The code will expire in 15 minutes.
            </p>

            <div className="form-actions" style={{ display: 'flex', gap: '10px' }}>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="login-button"
                style={{ flex: 1 }}
              >
                {loading ? 'Requesting...' : 'Request Reset Code'}
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
