import React from 'react';
import { clsx } from 'clsx';

/**
 * Spinner component for loading states
 * 
 * @param {Object} props
 * @param {string} [props.size='md'] - Size of the spinner (sm, md, lg)
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.variant='primary'] - Variant of the spinner (primary, secondary, white)
 * @returns {JSX.Element} Spinner component
 */
export function Spinner({ 
  size = 'md', 
  className = '', 
  variant = 'primary',
  ...props 
}) {
  // Size classes
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-3'
  };

  // Variant classes (color)
  const variantClasses = {
    primary: 'border-primary border-t-transparent',
    secondary: 'border-secondary border-t-transparent',
    white: 'border-white border-t-transparent'
  };

  return (
    <div 
      className={clsx(
        'inline-block animate-spin rounded-full', 
        sizeClasses[size] || sizeClasses.md,
        variantClasses[variant] || variantClasses.primary,
        className
      )} 
      role="status"
      aria-label="Loading"
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
} 