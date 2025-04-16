import React, { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  ComponentType, 
  ComponentCapability, 
  DataType,
  ComponentEventType,
  ComponentDefinition
} from '../ComponentTypes';
import { componentRegistry } from '../ComponentRegistry';
import { withIntelligentComponent } from '../IntelligentComponent';
import TextInput, { TextInputType } from '../../components/basic/TextInput';

/**
 * Define TextInput capabilities
 */
const textInputCapabilities: ComponentCapability[] = [
  {
    id: 'interaction',
    name: 'User Interaction',
    description: 'Capabilities related to user interactions with the text input',
    connectionPoints: [
      {
        id: 'change',
        name: 'Value Change Event',
        description: 'Triggered when the input value changes',
        type: DataType.TEXT,
        direction: 'output'
      },
      {
        id: 'focus',
        name: 'Focus Event',
        description: 'Triggered when the input receives focus',
        type: DataType.OBJECT,
        direction: 'output'
      },
      {
        id: 'blur',
        name: 'Blur Event',
        description: 'Triggered when the input loses focus',
        type: DataType.OBJECT,
        direction: 'output'
      },
      {
        id: 'enabled',
        name: 'Input Enabled State',
        description: 'Controls whether the input is enabled or disabled',
        type: DataType.BOOLEAN,
        direction: 'input',
        defaultValue: true
      },
      {
        id: 'readonly',
        name: 'Read Only State',
        description: 'Controls whether the input is read-only',
        type: DataType.BOOLEAN,
        direction: 'input',
        defaultValue: false
      }
    ]
  },
  {
    id: 'display',
    name: 'Display Properties',
    description: 'Capabilities related to the input appearance',
    connectionPoints: [
      {
        id: 'label',
        name: 'Input Label',
        description: 'Text to display as the input label',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'Input'
      },
      {
        id: 'placeholder',
        name: 'Input Placeholder',
        description: 'Placeholder text to display when empty',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: ''
      },
      {
        id: 'error',
        name: 'Error Message',
        description: 'Error message to display below the input',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: ''
      },
      {
        id: 'customStyles',
        name: 'Custom Styles',
        description: 'Custom styles for the input element and container',
        type: DataType.OBJECT,
        direction: 'input',
        defaultValue: {}
      }
    ]
  },
  {
    id: 'animation',
    name: 'Animation Properties',
    description: 'Capabilities related to input animations and transitions',
    connectionPoints: [
      {
        id: 'transition',
        name: 'Transition Style',
        description: 'CSS transition style for the input',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'all 0.2s ease-in-out'
      },
      {
        id: 'transform',
        name: 'Transform Style',
        description: 'CSS transform to apply to the input',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: ''
      },
      {
        id: 'focusAnimation',
        name: 'Focus Animation',
        description: 'Animation to play when the input is focused',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'none'
      }
    ]
  },
  {
    id: 'data',
    name: 'Data Value',
    description: 'Capabilities related to the input value',
    connectionPoints: [
      {
        id: 'value',
        name: 'Input Value',
        description: 'Current value of the input field',
        type: DataType.TEXT,
        direction: 'bidirectional',
        defaultValue: ''
      },
      {
        id: 'validation',
        name: 'Validation Rules',
        description: 'Rules for validating the input value',
        type: DataType.OBJECT,
        direction: 'input',
        defaultValue: {}
      },
      {
        id: 'state',
        name: 'Input State',
        description: 'Internal state of the input field',
        type: DataType.OBJECT,
        direction: 'bidirectional',
        defaultValue: {}
      }
    ]
  }
];

// Input validation types
type ValidationRule = {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message?: string;
  validate?: (value: string) => boolean | string;
};

type ValidationRules = {
  rules: ValidationRule[];
};

/**
 * Props for the Intelligent TextInput Component
 */
interface IntelligentTextInputProps {
  // Component system props
  componentId?: string;
  componentType?: ComponentType;
  sendEvent?: (type: ComponentEventType, connectionId: string, payload: any) => void;
  getConnectionValue?: (connectionId: string) => any;
  
  // TextInput specific props
  label?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string | boolean;
  required?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  fullWidth?: boolean;
  className?: string;
  type?: TextInputType;
  
  // Extended customization props
  customStyles?: {
    container?: React.CSSProperties;
    input?: React.CSSProperties;
    label?: React.CSSProperties;
    error?: React.CSSProperties;
  };
  transition?: string;
  transform?: string;
  focusAnimation?: 'none' | 'glow' | 'expand' | 'custom';
  
  // Validation
  validation?: ValidationRules;
  
  // State management props
  initialState?: Record<string, any>;
  onStateChange?: (newState: Record<string, any>) => void;
}

/**
 * Base TextInput implementation that uses the intelligent component system
 */
const IntelligentTextInputBase: React.FC<IntelligentTextInputProps> = ({
  componentId,
  componentType,
  sendEvent,
  getConnectionValue,
  label: propLabel,
  placeholder: propPlaceholder,
  value: propValue,
  defaultValue,
  disabled: propDisabled,
  readOnly: propReadOnly,
  error: propError,
  required,
  onChange,
  onFocus,
  onBlur,
  fullWidth,
  className,
  type = 'text',
  customStyles: propCustomStyles,
  transition: propTransition,
  transform: propTransform,
  focusAnimation: propFocusAnimation,
  validation: propValidation,
  initialState = {},
  onStateChange,
  ...rest
}) => {
  // Internal state management
  const [internalState, setInternalState] = useState<Record<string, any>>({
    ...initialState,
    isFocused: false,
    isValid: true,
    validationMessage: '',
    changeCount: 0,
    lastChangeTime: null
  });
  
  // Get values from connections if available
  const connectionLabel = getConnectionValue?.('label');
  const connectionPlaceholder = getConnectionValue?.('placeholder');
  const connectionValue = getConnectionValue?.('value');
  const connectionEnabled = getConnectionValue?.('enabled');
  const connectionReadOnly = getConnectionValue?.('readonly');
  const connectionError = getConnectionValue?.('error');
  const connectionStyles = getConnectionValue?.('customStyles') || {};
  const connectionTransition = getConnectionValue?.('transition');
  const connectionTransform = getConnectionValue?.('transform');
  const connectionFocusAnimation = getConnectionValue?.('focusAnimation');
  const connectionValidation = getConnectionValue?.('validation');
  const connectionState = getConnectionValue?.('state') || {};
  
  // Add state for current value
  const [currValue, setCurrValue] = useState(propValue || connectionValue || defaultValue || '');
  
  // Use connection values or props
  const label = connectionLabel || propLabel;
  const placeholder = connectionPlaceholder || propPlaceholder || '';
  
  // Use currValue for the rendered value to ensure the input updates properly
  const displayValue = currValue;
  
  const disabled = connectionEnabled === false || propDisabled === true;
  const readOnly = connectionReadOnly === true || propReadOnly === true;
  const error = connectionError || propError || internalState.validationMessage;
  
  // Styling and animation properties
  const customStyles = { ...propCustomStyles, ...connectionStyles };
  const transition = connectionTransition || propTransition || 'all 0.2s ease-in-out';
  const transform = connectionTransform || propTransform || '';
  const focusAnimation = connectionFocusAnimation || propFocusAnimation || 'none';
  
  // Validation rules
  const validation = connectionValidation || propValidation;
  
  // Merge internal state with connection state
  useEffect(() => {
    const newState = { ...internalState, ...connectionState };
    setInternalState(newState);
    if (onStateChange) {
      onStateChange(newState);
    }
  }, [connectionState]);
  
  // Add Debug output when value updates from connections
  useEffect(() => {
    if (connectionValue !== undefined) {
      setCurrValue(connectionValue);
      validateValue(connectionValue);
    }
  }, [connectionValue, componentId]);
  
  // Also track prop value changes more robustly
  useEffect(() => {
    if (propValue !== undefined) {
      setCurrValue(propValue);
      validateValue(propValue);
    }
  }, [propValue, componentId]);
  
  // Validate the current value based on validation rules
  const validateValue = (value: string): boolean => {
    if (!validation || !validation.rules || validation.rules.length === 0) {
      // No validation rules defined
      updateState({ isValid: true, validationMessage: '' });
      return true;
    }
    
    for (const rule of validation.rules) {
      let isValid = true;
      let message = '';
      
      switch (rule.type) {
        case 'required':
          isValid = value.trim() !== '';
          message = rule.message || 'This field is required';
          break;
        case 'minLength':
          isValid = value.length >= (rule.value || 0);
          message = rule.message || `Minimum length is ${rule.value} characters`;
          break;
        case 'maxLength':
          isValid = value.length <= (rule.value || 0);
          message = rule.message || `Maximum length is ${rule.value} characters`;
          break;
        case 'pattern':
          if (rule.value) {
            const pattern = new RegExp(rule.value);
            isValid = pattern.test(value);
            message = rule.message || 'Invalid format';
          }
          break;
        case 'custom':
          if (rule.validate) {
            const result = rule.validate(value);
            isValid = typeof result === 'boolean' ? result : false;
            message = typeof result === 'string' ? result : (rule.message || 'Invalid value');
          }
          break;
      }
      
      if (!isValid) {
        updateState({ isValid, validationMessage: message });
        return false;
      }
    }
    
    updateState({ isValid: true, validationMessage: '' });
    return true;
  };
  
  // Method to update internal state
  const updateState = (updates: Record<string, any>) => {
    const newState = { ...internalState, ...updates };
    setInternalState(newState);
    if (onStateChange) {
      onStateChange(newState);
    }
    // Send state through component system if available
    if (sendEvent && componentId) {
      sendEvent(ComponentEventType.STATE_CHANGE, 'state', newState);
    }
  };
  
  // Handle value change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Update the local state
    setCurrValue(e.target.value);
    
    // Validate the new value
    validateValue(e.target.value);
    
    // Update internal state
    const changeCount = internalState.changeCount + 1;
    const lastChangeTime = new Date().toISOString();
    updateState({ changeCount, lastChangeTime });
    
    // Call the prop onChange if provided
    if (onChange) {
      onChange(e);
    }
    
    // Send the event through the component system
    if (sendEvent && componentId) {
      sendEvent(ComponentEventType.CHANGE, 'change', {
        value: e.target.value,
        timestamp: new Date().toISOString(),
        event: e,
        state: { ...internalState, changeCount, lastChangeTime }
      });
      
      // Also update the value connection
      sendEvent(ComponentEventType.CHANGE, 'value', e.target.value);
    }
  }, [onChange, sendEvent, componentId, internalState, validateValue]);
  
  // Handle focus
  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    // Update internal state
    updateState({ isFocused: true });
    
    // Call the prop onFocus if provided
    if (onFocus) {
      onFocus(e);
    }
    
    // Send the event through the component system
    if (sendEvent && componentId) {
      sendEvent(ComponentEventType.FOCUS, 'focus', {
        value: e.target.value,
        timestamp: new Date().toISOString(),
        event: e,
        state: { ...internalState, isFocused: true }
      });
    }
  }, [onFocus, sendEvent, componentId, internalState]);
  
  // Handle blur
  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    // Update internal state
    updateState({ isFocused: false });
    
    // Validate on blur for a better user experience
    validateValue(e.target.value);
    
    // Call the prop onBlur if provided
    if (onBlur) {
      onBlur(e);
    }
    
    // Send the event through the component system
    if (sendEvent && componentId) {
      sendEvent(ComponentEventType.BLUR, 'blur', {
        value: e.target.value,
        timestamp: new Date().toISOString(),
        event: e,
        state: { ...internalState, isFocused: false }
      });
    }
  }, [onBlur, sendEvent, componentId, internalState, validateValue]);
  
  // Generate custom focus animation styles
  const getFocusAnimationStyles = (): React.CSSProperties => {
    if (internalState.isFocused && focusAnimation !== 'none') {
      switch (focusAnimation) {
        case 'glow':
          return {
            boxShadow: '0 0 5px 2px rgba(66, 153, 225, 0.6)'
          };
        case 'expand':
          return {
            transform: 'scale(1.02)',
            transition: 'transform 0.2s ease-in-out'
          };
        default:
          return {};
      }
    }
    return {};
  };
  
  // Compute container styles
  const containerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: fullWidth ? '100%' : 'auto',
    margin: '8px 0',
    ...customStyles?.container
  };
  
  // Compute label styles
  const labelStyles: React.CSSProperties = {
    fontWeight: 500,
    fontSize: '0.875rem',
    marginBottom: '4px',
    color: error ? '#e53e3e' : '#4a5568',
    ...customStyles?.label
  };
  
  // Compute input styles
  const inputStyles: React.CSSProperties = {
    padding: '8px 12px',
    fontSize: '1rem',
    lineHeight: 1.5,
    borderRadius: '4px',
    border: `1px solid ${error ? '#e53e3e' : (internalState.isFocused ? '#3182ce' : '#cbd5e0')}`,
    transition,
    transform,
    outline: 'none',
    width: '100%',
    backgroundColor: disabled ? '#f7fafc' : '#ffffff',
    opacity: disabled ? 0.7 : 1,
    cursor: disabled ? 'not-allowed' : 'text',
    ...getFocusAnimationStyles(),
    ...customStyles?.input
  };
  
  // Compute error styles
  const errorStyles: React.CSSProperties = {
    color: '#e53e3e',
    fontSize: '0.75rem',
    marginTop: '4px',
    ...customStyles?.error
  };
  
  return (
    <div 
      style={containerStyles} 
      className={className}
      data-component-id={componentId}
      data-component-type={componentType}
      data-testid={`text-input-container-${componentId}`}
    >
      {label && (
        <label 
          htmlFor={`input-${componentId}`}
          style={labelStyles}
        >
          {label}
          {required && <span style={{ color: '#e53e3e', marginLeft: '2px' }}>*</span>}
        </label>
      )}
      
      <input
        id={`input-${componentId}`}
        style={inputStyles}
        type={type}
        value={displayValue}
        placeholder={placeholder}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={Boolean(error)}
        data-state={JSON.stringify(internalState)}
        data-testid={`text-input-${componentId}`}
        {...rest}
      />
      
      {error && (
        <div style={errorStyles}>
          {typeof error === 'string' ? error : internalState.validationMessage || 'Invalid input'}
        </div>
      )}
    </div>
  );
};

/**
 * Wrap the base component with the intelligent component HOC
 */
export const IntelligentTextInput = withIntelligentComponent(
  IntelligentTextInputBase,
  ComponentType.TEXT_INPUT
);

/**
 * Component definition for the registry
 */
const textInputComponentDefinition: ComponentDefinition = {
  meta: {
    type: ComponentType.TEXT_INPUT,
    name: 'TextInput',
    description: 'Input field for text entry with full customization options',
    capabilities: textInputCapabilities,
    defaultProps: {
      label: 'Input',
      placeholder: '',
      type: 'text',
      required: false
    }
  },
  initializer: (props) => {
    return {
      id: props.id || uuidv4(),
      type: ComponentType.TEXT_INPUT,
      properties: {
        ...props,
        customStyles: props.customStyles || {},
        transition: props.transition || 'all 0.2s ease-in-out',
        transform: props.transform || '',
        focusAnimation: props.focusAnimation || 'none',
        validation: props.validation || { rules: [] }
      },
      state: {
        value: props.value || props.defaultValue || '',
        isFocused: false,
        isValid: true,
        validationMessage: '',
        changeCount: 0,
        lastChangeTime: null
      }
    };
  },
  renderer: (instance) => {
    return (
      <IntelligentTextInput
        componentId={instance.id}
        {...instance.properties}
        value={instance.state?.value}
      />
    );
  }
};

// Register the text input component
componentRegistry.registerComponent(textInputComponentDefinition);

export default IntelligentTextInput; 