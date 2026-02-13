import React from 'react';
import '../styles/ErrorMessage.css';

export default function ErrorMessage({ 
  message, 
  onDismiss,
  type = 'error',
  className = '' 
}) {
  if (!message) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      case 'error':
      default:
        return '✕';
    }
  };

  return (
    <div className={`error-message error-${type} ${className}`} role="alert">
      <span className="error-icon">{getIcon()}</span>
      <span className="error-text">{message}</span>
      {onDismiss && (
        <button 
          className="error-dismiss" 
          onClick={onDismiss}
          aria-label="Dismiss message"
        >
          ×
        </button>
      )}
    </div>
  );
}
