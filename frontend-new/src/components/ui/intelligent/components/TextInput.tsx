import React, { useCallback, useEffect } from 'react';
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
      }
    ]
  }
];

/**
 * Props for the Intelligent TextInput Component
 */
interface IntelligentTextInputProps {
  // Component system props
  componentId?: string;
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
}

/**
 * Base TextInput implementation that uses the intelligent component system
 */
const IntelligentTextInputBase: React.FC<IntelligentTextInputProps> = ({
  componentId,
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
  ...rest
}) => {
  // Get values from connections if available
  const connectionLabel = getConnectionValue?.('label');
  const connectionPlaceholder = getConnectionValue?.('placeholder');
  const connectionValue = getConnectionValue?.('value');
  const connectionEnabled = getConnectionValue?.('enabled');
  const connectionReadOnly = getConnectionValue?.('readonly');
  const connectionError = getConnectionValue?.('error');
  
  // Add state for current value
  const [currValue, setCurrValue] = React.useState(propValue || connectionValue || defaultValue || '');
  
  // Use connection values or props
  const label = connectionLabel || propLabel;
  const placeholder = connectionPlaceholder || propPlaceholder || '';
  
  // Use currValue for the rendered value to ensure the input updates properly
  const displayValue = currValue;
  
  const disabled = connectionEnabled === false || propDisabled === true;
  const readOnly = connectionReadOnly === true || propReadOnly === true;
  const error = connectionError || propError;
  
  // Add Debug output when value updates from connections
  useEffect(() => {
    if (connectionValue !== undefined) {
      setCurrValue(connectionValue);
    }
  }, [connectionValue, componentId]);
  
  // Also track prop value changes more robustly
  useEffect(() => {
    if (propValue !== undefined) {
      setCurrValue(propValue);
    }
  }, [propValue, componentId]);
  
  // Handle value change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Update the local state
    setCurrValue(e.target.value);
    
    // Call the prop onChange if provided
    if (onChange) {
      onChange(e);
    }
    
    // Send the change event through the output connection
    if (sendEvent) {
      try {
        sendEvent(ComponentEventType.CHANGE, 'change', {
          value: e.target.value,
          timestamp: Date.now()
        });
        
        // Also update the bidirectional 'value' connection
        sendEvent(ComponentEventType.CHANGE, 'value', e.target.value);
      } catch (error) {
        console.error(`Failed to send TextInput change event:`, error);
      }
    }
  }, [onChange, sendEvent, componentId]);
  
  // Handle input focus
  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    // Call the prop onFocus if provided
    if (onFocus) {
      onFocus(e);
    }
    
    // Send the focus event through the output connection
    if (sendEvent) {
      sendEvent(ComponentEventType.FOCUS, 'focus', {
        timestamp: Date.now(),
        value: e.target.value
      });
    }
  }, [onFocus, sendEvent]);
  
  // Handle input blur
  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    // Call the prop onBlur if provided
    if (onBlur) {
      onBlur(e);
    }
    
    // Send the blur event through the output connection
    if (sendEvent) {
      sendEvent(ComponentEventType.BLUR, 'blur', {
        timestamp: Date.now(),
        value: e.target.value
      });
    }
  }, [onBlur, sendEvent]);
  
  return (
    <TextInput
      label={label}
      placeholder={placeholder}
      value={displayValue}
      defaultValue={defaultValue}
      disabled={disabled}
      readOnly={readOnly}
      error={error}
      required={required}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      fullWidth={fullWidth}
      className={className}
      type={type}
      {...rest}
    />
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
    name: 'Text Input',
    description: 'Input field for text entry',
    capabilities: textInputCapabilities,
    defaultProps: {
      label: 'Input',
      placeholder: '',
      type: 'text'
    }
  },
  initializer: (props) => {
    return {
      id: props.id || uuidv4(),
      type: ComponentType.TEXT_INPUT,
      properties: props,
      connections: [],
      state: {
        label: props.label || 'Input',
        placeholder: props.placeholder || '',
        value: props.value || props.defaultValue || '',
        enabled: props.disabled !== true,
        readonly: props.readOnly === true,
        error: props.error || ''
      }
    };
  },
  renderer: (instance) => {
    return <IntelligentTextInput componentId={instance.id} {...instance.properties} />;
  }
};

// Register the text input component
componentRegistry.registerComponent(textInputComponentDefinition);
console.log('TextInput component registered with ID:', ComponentType.TEXT_INPUT); 