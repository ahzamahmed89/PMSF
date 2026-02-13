import React from 'react';
import '../styles/LoadingSpinner.css';

export default function LoadingSpinner({ 
  text = 'Loading...', 
  size = 'medium',
  fullPage = false,
  className = '' 
}) {
  const spinnerContent = (
    <div className={`loading-spinner-container ${fullPage ? 'loading-full-page' : ''} ${className}`}>
      <div className={`spinner spinner-${size}`}></div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="loading-overlay">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
}
