import React from 'react';

export default function VisitDate({ visitDate, onDateChange }) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="form-group">
      <label htmlFor="visitDate">Visit Date</label>
      <input
        type="date"
        id="visitDate"
        value={visitDate || today}
        onChange={(e) => onDateChange && onDateChange(e.target.value)}
        className="form-input"
      />
    </div>
  );
}
