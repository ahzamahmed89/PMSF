import React from 'react';
import '../styles/FormSelect.css';

export default function FormSelect({
  label,
  id,
  name,
  value,
  onChange,
  options = [],
  required = false,
  disabled = false,
  className = '',
  selectClassName = '',
  labelClassName = '',
  placeholder = 'Select an option',
  valueKey = 'value',
  labelKey = 'label'
}) {
  const selectId = id || name || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label 
          htmlFor={selectId}
          className={labelClassName}
        >
          {label}
          {required && <span className="required-mark">*</span>}
        </label>
      )}
      <select
        id={selectId}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`form-select ${selectClassName}`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option, index) => {
          // Handle both array of strings and array of objects
          const optionValue = typeof option === 'object' ? option[valueKey] : option;
          const optionLabel = typeof option === 'object' ? option[labelKey] : option;
          
          return (
            <option key={index} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    </div>
  );
}
