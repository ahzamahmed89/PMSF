import React, { useState } from 'react';
import '../styles/IconPicker.css';

const ICON_LIST = [
  '🔄', '📊', '✅', '🎯', '📝', '👁️', '📋', '✏️',
  '📖', '⚙️', '🚀', '💡', '⭐', '🎉', '📢', '🔔',
  '⚠️', '❌', '✔️', '🔐', '🔓', '📌', '📍', '🗂️',
  '💼', '📁', '�', '🎪', '🎭', '🎨', '🔧', '🎁',
  '🛠️', '⚡', '🌟', '💎', '🔥', '💪', '👍', '❤️'
];

const IconPicker = ({ value, onChange, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredIcons = ICON_LIST.filter(icon => {
    // Simple filter - if no search, show all; if search exists, match any icon
    return !searchTerm || icon.includes(searchTerm) || searchTerm.length === 0;
  });

  return (
    <div className="icon-picker-wrapper">
      <div className="icon-picker-search">
        <input
          type="text"
          className="icon-search-input"
          placeholder="Search or type emoji..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength="10"
          autoFocus
        />
      </div>
      
      <div className="icon-picker-grid">
        {filteredIcons.map((icon) => (
          <button
            key={icon}
            className={`icon-option ${value === icon ? 'selected' : ''}`}
            onClick={() => {
              onChange(icon);
              onClose();
            }}
            title={icon}
          >
            {icon}
          </button>
        ))}
      </div>
      
      <div className="icon-picker-actions">
        <button className="icon-clear-btn" onClick={() => onChange('')}>
          Clear
        </button>
        <button className="icon-close-btn" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
};

export default IconPicker;
