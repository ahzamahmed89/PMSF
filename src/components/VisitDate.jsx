import React from 'react';
import FormInput from './FormInput';

export default function VisitDate({ visitDate, onDateChange }) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <FormInput
      type="date"
      label="Visit Date"
      id="visitDate"
      value={visitDate || today}
      onChange={(e) => onDateChange && onDateChange(e.target.value)}
    />
  );
}
