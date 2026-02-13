import React from 'react';
import FormSelect from './FormSelect';
import '../styles/PeriodSelector.css';

export default function PeriodSelector({
  year,
  quarter,
  onYearChange,
  onQuarterChange,
  minYear = 2020,
  maxYear = new Date().getFullYear() + 1,
  showMonth = false,
  month,
  onMonthChange,
  disabled = false,
  className = ''
}) {
  // Generate year options
  const yearOptions = [];
  for (let y = maxYear; y >= minYear; y--) {
    yearOptions.push(y);
  }

  // Quarter options
  const quarterOptions = [
    { value: 1, label: 'Q1 (Jan-Mar)' },
    { value: 2, label: 'Q2 (Apr-Jun)' },
    { value: 3, label: 'Q3 (Jul-Sep)' },
    { value: 4, label: 'Q4 (Oct-Dec)' }
  ];

  // Month options
  const monthOptions = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  return (
    <div className={`period-selector ${className}`}>
      <FormSelect
        label="Year"
        value={year}
        onChange={onYearChange}
        options={yearOptions}
        disabled={disabled}
        className="period-year"
      />
      
      {!showMonth && (
        <FormSelect
          label="Quarter"
          value={quarter}
          onChange={onQuarterChange}
          options={quarterOptions}
          disabled={disabled}
          className="period-quarter"
        />
      )}

      {showMonth && (
        <FormSelect
          label="Month"
          value={month}
          onChange={onMonthChange}
          options={monthOptions}
          disabled={disabled}
          className="period-month"
        />
      )}
    </div>
  );
}
