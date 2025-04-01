import React, { useState, useEffect } from 'react';
import { TextField } from '@mui/material';
import { BaseComponentProps, FormElementProps } from '../types';

/**
 * TextInput variants
 */
export type TextInputVariant = 
  | 'outlined' 
  | 'filled'
  | 'standard';

/**
 * TextInput sizes
 */
export type TextInputSize = 
  | 'small'
  | 'medium'
  | 'large';

/**
 * TextInput types
 */
export type TextInputType = 
  | 'text'
  | 'password'
  | 'email'
  | 'number'
  | 'search'
  | 'tel'
  | 'url';

/**
 * TextInput component props
 */
export interface TextInputProps extends BaseComponentProps, Omit<FormElementProps, 'onChange' | 'onBlur' | 'onFocus'> {
  /** Input variant */
  variant?: TextInputVariant;
  /** Input size */
  size?: TextInputSize;
  /** HTML input type */
  type?: TextInputType;
  /** Input label */
  label?: React.ReactNode;
  /** Input placeholder */
  placeholder?: string;
  /** Helper text displayed below the input */
  helperText?: React.ReactNode;
  /** Error message displayed below the input */
  error?: boolean | string;
  /** Default value */
  defaultValue?: string;
  /** Input value */
  value?: string;
  /** Whether the input is required */
  required?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether the input is read only */
  readOnly?: boolean;
  /** Whether the input should take full width of container */
  fullWidth?: boolean;
  /** Maximum length of input */
  maxLength?: number;
  /** Minimum length of input */
  minLength?: number;
  /** Input name */
  name?: string;
  /** Prefix - content displayed before the input */
  prefix?: React.ReactNode;
  /** Suffix - content displayed after the input */
  suffix?: React.ReactNode;
  /** Icon displayed on the left side */
  startIcon?: React.ReactNode;
  /** Icon displayed on the right side */
  endIcon?: React.ReactNode;
  /** Custom class name */
  className?: string;
  /** onChange handler */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** onFocus handler */
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** onBlur handler */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** onKeyDown handler */
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  /** onKeyUp handler */
  onKeyUp?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  /** onInput handler */
  onInput?: (event: React.FormEvent<HTMLInputElement>) => void;
  /** handleEvent handler */
  handleEvent?: (type: string, payload: any) => void;
}

/**
 * TextInput component using a basic HTML input with Material UI styling
 */
export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      variant = 'outlined',
      size = 'medium',
      type = 'text',
      label,
      placeholder,
      helperText,
      error,
      value,
      defaultValue,
      required = false,
      disabled = false,
      readOnly = false,
      fullWidth = true,
      maxLength,
      minLength,
      name,
      startIcon,
      endIcon,
      className,
      onChange,
      onFocus,
      onBlur,
      onKeyDown,
      onKeyUp,
      onInput,
      testId,
      id,
      style,
      handleEvent,
      ...rest
    },
    ref
  ) => {
    // Use internal state for uncontrolled component
    const [internalValue, setInternalValue] = useState(defaultValue || '');
    
    // When external value changes, update internal value
    useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value);
      }
    }, [value]);
    
    // Determine if we're in controlled or uncontrolled mode
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;
    
    // Handle all changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      
      // If we're uncontrolled, update our internal state
      if (!isControlled) {
        setInternalValue(newValue);
      }
      
      // Always call provided onChange handler
      if (onChange) {
        onChange(e);
      }
      
      // Always notify parent via handleEvent if provided
      if (handleEvent) {
        handleEvent('onChange', { 
          name: id || name,
          value: newValue
        });
      }
    };

    return (
      <div className={`text-input-container ${className || ''}`} style={{ width: fullWidth ? '100%' : 'auto' }}>
        {label && (
          <label 
            htmlFor={id || name}
            style={{ 
              display: 'block', 
              marginBottom: '8px',
              color: error ? '#f44336' : 'inherit'
            }}
          >
            {label}
            {required && <span style={{ color: '#f44336' }}>*</span>}
          </label>
        )}
        
        <div 
          style={{ 
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            border: `1px solid ${error ? '#f44336' : '#ccc'}`,
            borderRadius: '4px',
            padding: '0 8px',
            backgroundColor: 'white'
          }}
        >
          {startIcon && (
            <div style={{ marginRight: '8px' }}>
              {startIcon}
            </div>
          )}
          
          <input
            ref={ref}
            id={id || name}
            name={name}
            type={type}
            value={currentValue}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            maxLength={maxLength}
            minLength={minLength}
            data-testid={testId}
            style={{
              border: 'none',
              outline: 'none',
              width: '100%',
              padding: '10px 0',
              fontSize: '16px',
              ...style
            }}
            onChange={handleInputChange}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
            onInput={onInput}
          />
          
          {endIcon && (
            <div style={{ marginLeft: '8px' }}>
              {endIcon}
            </div>
          )}
        </div>
        
        {(helperText || (typeof error === 'string' && error)) && (
          <div 
            style={{ 
              fontSize: '12px',
              marginTop: '4px',
              color: error ? '#f44336' : '#666'
            }}
          >
            {typeof error === 'string' ? error : helperText}
          </div>
        )}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';

export default TextInput; 