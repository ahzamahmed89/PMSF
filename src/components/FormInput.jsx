import React from 'react';
import '../styles/FormInput.css';

export default function FormInput({
  label,
  type = 'text',
  id,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  readOnly = false,
  className = '',
  inputClassName = '',
  labelClassName = '',
  min,
  max,
  step,
  autoComplete
}) {
  const inputId = id || name || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label 
          htmlFor={inputId}
          className={labelClassName}
        >
          {label}
          {required && <span className="required-mark">*</span>}
        </label>
      )}
      <input
        type={type}
        id={inputId}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        className={`form-input ${inputClassName}`}
        min={min}
        max={max}
        step={step}
        autoComplete={autoComplete}
      />
    </div>
  );
}
