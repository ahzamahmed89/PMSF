import React from 'react';
import '../styles/BackButton.css';

const BackButton = ({ onClick, top = '76px', left = '20px', title = 'Go back' }) => {
  return (
    <button
      className="app-back-btn"
      onClick={onClick}
      title={title}
      style={{ top, left }}
      type="button"
    >
      ←
    </button>
  );
};

export default BackButton;
