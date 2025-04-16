import React, { useEffect, useRef, useState } from 'react';

// Define the types for the select component props
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  id?: string;
  options?: SelectOption[];
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
  className?: string;
  defaultValue?: string;
  required?: boolean;
  name?: string;
}

// Select component implementation
const Select: React.FC<SelectProps> = ({
  id,
  options = [],
  value,
  placeholder = 'Select an option',
  disabled = false,
  onChange,
  style = {},
  className = '',
  defaultValue,
  required = false,
  name,
  ...rest
}) => {
  // Convert options to proper format if they're just strings
  const normalizedOptions = options.map(option => 
    typeof option === 'string' 
      ? { value: option, label: option } 
      : option
  );

  // Handle change event
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (onChange) {
      onChange(event.target.value);
    }
  };

  // Default styles for the select
  const defaultStyles: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '0.5rem',
    fontSize: '1rem',
    lineHeight: '1.5',
    color: '#495057',
    backgroundColor: '#fff',
    backgroundClip: 'padding-box',
    border: '1px solid #ced4da',
    borderRadius: '0.25rem',
    transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
  };

  // Merge default styles with custom styles
  const mergedStyles = { ...defaultStyles, ...style };

  return (
    <select
      id={id}
      value={value || defaultValue || ''}
      onChange={handleChange}
      disabled={disabled}
      style={mergedStyles}
      className={className}
      required={required}
      name={name}
      {...rest}
    >
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {normalizedOptions.map((option, index) => (
        <option
          key={index}
          value={option.value}
          disabled={option.disabled}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default Select; 