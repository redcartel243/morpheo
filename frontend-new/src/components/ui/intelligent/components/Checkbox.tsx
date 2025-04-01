import React, { useCallback } from 'react';
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
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Define Checkbox capabilities
 */
const checkboxCapabilities: ComponentCapability[] = [
  {
    id: 'interaction',
    name: 'User Interaction',
    description: 'Capabilities related to user interactions with the checkbox',
    connectionPoints: [
      {
        id: 'change',
        name: 'Change Event',
        description: 'Triggered when the checkbox is checked or unchecked',
        type: DataType.OBJECT,
        direction: 'output'
      },
      {
        id: 'enabled',
        name: 'Checkbox Enabled State',
        description: 'Controls whether the checkbox is enabled or disabled',
        type: DataType.BOOLEAN,
        direction: 'input',
        defaultValue: true
      }
    ]
  },
  {
    id: 'data',
    name: 'Data Properties',
    description: 'Capabilities related to the checkbox data',
    connectionPoints: [
      {
        id: 'checked',
        name: 'Checked State',
        description: 'The checked state of the checkbox',
        type: DataType.BOOLEAN,
        direction: 'bidirectional',
        defaultValue: false
      },
      {
        id: 'value',
        name: 'Value',
        description: 'The value associated with the checkbox',
        type: DataType.ANY,
        direction: 'input',
        defaultValue: ''
      }
    ]
  },
  {
    id: 'display',
    name: 'Display Properties',
    description: 'Capabilities related to the checkbox appearance',
    connectionPoints: [
      {
        id: 'label',
        name: 'Checkbox Label',
        description: 'Text displayed next to the checkbox',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: ''
      },
      {
        id: 'variant',
        name: 'Checkbox Variant',
        description: 'Visual style variant of the checkbox',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'default'
      },
      {
        id: 'size',
        name: 'Checkbox Size',
        description: 'Size of the checkbox',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'medium'
      }
    ]
  }
];

// Define Checkbox variant and size types
type CheckboxVariant = 'default' | 'filled' | 'outlined';
type CheckboxSize = 'small' | 'medium' | 'large';

/**
 * Props for the Intelligent Checkbox Component
 */
interface IntelligentCheckboxProps {
  // Component system props
  componentId?: string;
  componentType?: ComponentType;
  sendEvent?: (type: ComponentEventType, connectionId: string, payload: any) => void;
  getConnectionValue?: (connectionId: string) => any;
  connect?: (sourceConnectionId: string, targetComponentId: string, targetConnectionId: string, transform?: (value: any) => any) => any;
  disconnect?: (connectionId: string) => boolean;
  
  // Checkbox specific props
  label?: string;
  checked?: boolean;
  value?: any;
  onChange?: (checked: boolean, value: any) => void;
  variant?: CheckboxVariant;
  size?: CheckboxSize;
  disabled?: boolean;
  className?: string;
  indeterminate?: boolean;
  testId?: string;
}

/**
 * Get styles based on checkbox variant and theme
 */
const getCheckboxStyles = (
  variant: CheckboxVariant, 
  size: CheckboxSize,
  checked: boolean,
  disabled: boolean,
  indeterminate: boolean
): {
  container: React.CSSProperties;
  checkbox: React.CSSProperties;
  label: React.CSSProperties;
  checkmark: React.CSSProperties;
} => {
  // Size mappings
  const sizeMap = {
    small: {
      checkbox: '16px',
      labelFont: '0.875rem',
      checkmarkSize: '10px'
    },
    medium: {
      checkbox: '20px',
      labelFont: '1rem',
      checkmarkSize: '12px'
    },
    large: {
      checkbox: '24px',
      labelFont: '1.125rem',
      checkmarkSize: '16px'
    }
  };
  
  // Container styles
  const container: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.7 : 1,
    marginBottom: '0.5rem',
    userSelect: 'none'
  };
  
  // Checkbox styles
  const checkbox: React.CSSProperties = {
    position: 'relative',
    width: sizeMap[size].checkbox,
    height: sizeMap[size].checkbox,
    border: variant === 'outlined' ? '2px solid #94a3b8' : '1px solid #cbd5e1',
    borderRadius: variant === 'default' ? '4px' : '3px',
    backgroundColor: variant === 'filled' && !checked ? '#f1f5f9' : 'transparent',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    flexShrink: 0
  };
  
  // Adjust checkbox styles based on checked state
  if (checked || indeterminate) {
    checkbox.backgroundColor = disabled ? '#94a3b8' : '#3b82f6';
    checkbox.borderColor = disabled ? '#94a3b8' : '#3b82f6';
  }
  
  // Label styles
  const label: React.CSSProperties = {
    marginLeft: '0.5rem',
    fontSize: sizeMap[size].labelFont,
    color: disabled ? '#94a3b8' : '#1e293b',
    fontFamily: 'sans-serif'
  };
  
  // Checkmark styles (visible when checked)
  const checkmark: React.CSSProperties = {
    opacity: checked || indeterminate ? 1 : 0,
    width: sizeMap[size].checkmarkSize,
    height: indeterminate ? '2px' : sizeMap[size].checkmarkSize,
    backgroundColor: indeterminate ? '#ffffff' : 'transparent',
    transition: 'opacity 0.2s ease'
  };
  
  return { container, checkbox, label, checkmark };
};

/**
 * Base Checkbox implementation that uses the intelligent component system
 */
const IntelligentCheckboxBase: React.FC<IntelligentCheckboxProps> = ({
  componentId,
  componentType,
  sendEvent,
  getConnectionValue,
  connect,
  disconnect,
  label: propLabel,
  checked: propChecked,
  value: propValue,
  onChange,
  variant: propVariant = 'default',
  size = 'medium',
  disabled: propDisabled,
  indeterminate: propIndeterminate = false,
  className,
  testId,
  ...rest
}) => {
  // Get values from connections if available
  const connectionLabel = getConnectionValue?.('label');
  const connectionChecked = getConnectionValue?.('checked');
  const connectionValue = getConnectionValue?.('value');
  const connectionVariant = getConnectionValue?.('variant');
  const connectionEnabled = getConnectionValue?.('enabled');
  
  // Use connection values or props
  const label = connectionLabel || propLabel || '';
  const checked = connectionChecked !== undefined ? connectionChecked : propChecked || false;
  const value = connectionValue !== undefined ? connectionValue : propValue;
  const variant = (connectionVariant || propVariant || 'default') as CheckboxVariant;
  const disabled = connectionEnabled === false || propDisabled === true;
  const indeterminate = propIndeterminate;
  
  // Handle checkbox change
  const handleChange = useCallback(() => {
    if (disabled) return;
    
    // Create payload for the event
    const payload = {
      checked: !checked,
      value,
      timestamp: new Date().toISOString()
    };
    
    // Send the event through the component system
    if (sendEvent && componentId) {
      sendEvent(ComponentEventType.CHANGE, 'change', payload);
      sendEvent(ComponentEventType.USER_INTERACTION, 'checked', payload.checked);
    }
    
    // Call the prop onChange if provided
    if (onChange) {
      onChange(!checked, value);
    }
  }, [checked, value, disabled, sendEvent, componentId, onChange]);
  
  // Get styles for the component
  const styles = getCheckboxStyles(variant, size, checked, disabled, indeterminate);
  
  return (
    <div 
      style={styles.container} 
      className={className}
      onClick={handleChange}
      data-testid={testId}
    >
      <div 
        style={styles.checkbox}
        role="checkbox"
        aria-checked={checked}
        aria-disabled={disabled}
      >
        {!indeterminate && checked && (
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="white" 
            strokeWidth="4" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={styles.checkmark}
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        )}
        {indeterminate && (
          <div style={styles.checkmark}></div>
        )}
      </div>
      {label && <span style={styles.label}>{label}</span>}
    </div>
  );
};

/**
 * Component definition for the component registry
 */
const checkboxComponentDefinition: ComponentDefinition = {
  meta: {
    type: ComponentType.CHECKBOX,
    name: 'Checkbox',
    description: 'A checkbox component for binary input (on/off, true/false)',
    capabilities: checkboxCapabilities,
    defaultProps: {
      checked: false,
      variant: 'default',
      size: 'medium'
    }
  },
  initializer: (props: Record<string, any>) => ({
    id: props.id || `checkbox-${uuidv4()}`,
    type: ComponentType.CHECKBOX,
    properties: {
      label: props.label || '',
      checked: props.checked || false,
      value: props.value,
      variant: props.variant || 'default',
      size: props.size || 'medium',
      disabled: props.disabled || false,
      indeterminate: props.indeterminate || false
    }
  }),
  renderer: (instance) => {
    // The actual renderer is provided by the withIntelligentComponent HOC
    return null;
  }
};

// Register component with the registry
componentRegistry.registerComponent(checkboxComponentDefinition);

// Export the component wrapped with the intelligent component system
export const IntelligentCheckbox = withIntelligentComponent<IntelligentCheckboxProps>(
  IntelligentCheckboxBase,
  ComponentType.CHECKBOX
);

// Export base component for testing purposes
export { IntelligentCheckboxBase }; 