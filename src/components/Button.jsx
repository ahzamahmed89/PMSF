import React from 'react';
import '../styles/Button.css';

export default function Button({
  children,
  variant = 'primary',
  type = 'button',
  onClick,
  disabled = false,
  className = '',
  icon,
  iconPosition = 'left',
  size = 'medium',
  fullWidth = false,
  loading = false,
  title,
  ...rest
}) {
  const variantClass = `btn-${variant}`;
  const sizeClass = size !== 'medium' ? `btn-${size}` : '';
  const widthClass = fullWidth ? 'btn-full-width' : '';
  const loadingClass = loading ? 'btn-loading' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`btn ${variantClass} ${sizeClass} ${widthClass} ${loadingClass} ${className}`.trim()}
      title={title}
      {...rest}
    >
      {loading && <span className="btn-spinner"></span>}
      {!loading && icon && iconPosition === 'left' && <span className="btn-icon-left">{icon}</span>}
      <span className="btn-content">{children}</span>
      {!loading && icon && iconPosition === 'right' && <span className="btn-icon-right">{icon}</span>}
    </button>
  );
}
