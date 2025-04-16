import React, { useCallback, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  ComponentType, 
  ComponentCapability, 
  DataType,
  ComponentEventType,
  ComponentDefinition,
  ComponentInstance
} from '../ComponentTypes';
import { componentRegistry } from '../ComponentRegistry';
import { withIntelligentComponent } from '../IntelligentComponent';
import { useTheme } from '../../theme/ThemeProvider';
import './Checkbox.css'; // Import the CSS file with animations

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
      },
      {
        id: 'animation',
        name: 'Animation Type',
        description: 'Type of animation to apply to the checkbox',
        type: DataType.TEXT, 
        direction: 'input',
        defaultValue: 'scale'
      },
      {
        id: 'customColors',
        name: 'Custom Colors',
        description: 'Custom colors for the checkbox',
        type: DataType.OBJECT,
        direction: 'input',
        defaultValue: {}
      }
    ]
  },
  {
    id: 'state',
    name: 'State Management',
    description: 'Capabilities related to checkbox state',
    connectionPoints: [
      {
        id: 'state',
        name: 'Checkbox State',
        description: 'Current state of the checkbox',
        type: DataType.OBJECT,
        direction: 'bidirectional',
        defaultValue: {}
      }
    ]
  }
];

// Define Checkbox variant and size types
type CheckboxVariant = 'default' | 'filled' | 'outlined' | 'custom';
type CheckboxSize = 'small' | 'medium' | 'large' | 'custom';
type CheckboxAnimation = 'none' | 'scale' | 'bounce' | 'slide' | 'custom';

/**
 * Get animation class name based on animation type
 */
const getAnimationClassName = (animation: CheckboxAnimation): string => {
  switch (animation) {
    case 'scale':
      return 'checkbox-scale';
    case 'bounce':
      return 'checkbox-bounce';
    case 'slide':
      return 'checkbox-slide';
    default:
      return '';
  }
};

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
  animation?: CheckboxAnimation;
  
  // Extended customization props
  customColors?: {
    unchecked?: string;
    checked?: string;
    border?: string;
    label?: string;
    checkmark?: string;
    disabled?: string;
    focus?: string;
    hover?: string;
  };
  customStyles?: {
    container?: React.CSSProperties;
    checkbox?: React.CSSProperties;
    label?: React.CSSProperties;
    checkmark?: React.CSSProperties;
  };
  
  // State management props
  initialState?: Record<string, any>;
  onStateChange?: (newState: Record<string, any>) => void;
}

/**
 * Get styles based on checkbox variant and theme
 */
const getCheckboxStyles = (
  variant: CheckboxVariant, 
  size: CheckboxSize,
  checked: boolean,
  disabled: boolean,
  indeterminate: boolean,
  animation: CheckboxAnimation,
  customColors: {
    unchecked?: string;
    checked?: string;
    border?: string;
    label?: string;
    checkmark?: string;
    disabled?: string;
    focus?: string;
    hover?: string;
  } = {},
  customStyles: {
    container?: React.CSSProperties;
    checkbox?: React.CSSProperties;
    label?: React.CSSProperties;
    checkmark?: React.CSSProperties;
  } = {}
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
    },
    custom: {
      checkbox: '20px',
      labelFont: '1rem',
      checkmarkSize: '12px'
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
    border: variant === 'outlined' 
      ? `2px solid ${disabled ? (customColors.disabled || '#94a3b8') : (customColors.border || '#94a3b8')}` 
      : `1px solid ${disabled ? (customColors.disabled || '#cbd5e1') : (customColors.border || '#cbd5e1')}`,
    borderRadius: variant === 'default' ? '4px' : '3px',
    backgroundColor: variant === 'filled' && !checked 
      ? (customColors.unchecked || '#f1f5f9') 
      : 'transparent',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    transition: animation !== 'none' ? 'all 0.2s ease' : 'none',
    boxSizing: 'border-box',
    flexShrink: 0
  };
  
  // Adjust checkbox styles based on checked state
  if (checked || indeterminate) {
    checkbox.backgroundColor = disabled 
      ? (customColors.disabled || '#94a3b8') 
      : (customColors.checked || '#3b82f6');
    checkbox.borderColor = disabled 
      ? (customColors.disabled || '#94a3b8') 
      : (customColors.border || '#3b82f6');
  }
  
  // Label styles
  const label: React.CSSProperties = {
    marginLeft: '0.5rem',
    fontSize: sizeMap[size].labelFont,
    color: disabled 
      ? (customColors.disabled || '#94a3b8') 
      : (customColors.label || '#1e293b'),
    fontFamily: 'sans-serif'
  };
  
  // Checkmark styles (visible when checked)
  const checkmark: React.CSSProperties = {
    display: checked || indeterminate ? 'block' : 'none',
    width: sizeMap[size].checkmarkSize,
    height: indeterminate ? '2px' : sizeMap[size].checkmarkSize,
    backgroundColor: customColors.checkmark || '#ffffff',
    position: indeterminate ? 'absolute' : 'static',
    borderRadius: indeterminate ? '1px' : '0',
    transition: animation !== 'none' ? 'all 0.1s ease' : 'none'
  };
  
  // Apply custom styles if provided
  return {
    container: { ...container, ...customStyles.container },
    checkbox: { ...checkbox, ...customStyles.checkbox },
    label: { ...label, ...customStyles.label },
    checkmark: { ...checkmark, ...customStyles.checkmark }
  };
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
  animation: propAnimation = 'scale',
  customColors: propCustomColors = {},
  customStyles: propCustomStyles = {},
  initialState = {},
  onStateChange,
  ...rest
}) => {
  // Internal state management
  const [internalState, setInternalState] = useState<Record<string, any>>({
    ...initialState,
    checked: propChecked || false,
    toggleCount: 0,
    lastToggleTime: null
  });
  
  // Get values from connections if available
  const connectionChecked = getConnectionValue?.('checked');
  const connectionEnabled = getConnectionValue?.('enabled');
  const connectionValue = getConnectionValue?.('value');
  const connectionLabel = getConnectionValue?.('label');
  const connectionVariant = getConnectionValue?.('variant');
  const connectionSize = getConnectionValue?.('size');
  const connectionAnimation = getConnectionValue?.('animation');
  const connectionCustomColors = getConnectionValue?.('customColors') || {};
  const connectionState = getConnectionValue?.('state') || {};
  
  // Use connection values or props with local state for controlled value
  const isChecked = connectionChecked !== undefined 
    ? connectionChecked 
    : internalState.checked;
  const disabled = connectionEnabled === false || propDisabled === true;
  const value = connectionValue !== undefined ? connectionValue : propValue;
  const label = connectionLabel || propLabel;
  const variant = (connectionVariant || propVariant) as CheckboxVariant;
  const checkboxSize = (connectionSize || size) as CheckboxSize;
  const animation = (connectionAnimation || propAnimation) as CheckboxAnimation;
  const customColors = { ...propCustomColors, ...connectionCustomColors };
  
  // Get animation class name
  const animationClassName = getAnimationClassName(animation);
  
  // Combine class names
  const combinedClassName = [
    className || '',
    animationClassName,
    isChecked ? 'checkbox-checked' : ''
  ].filter(Boolean).join(' ');
  
  // Merge internal state with connection state
  useEffect(() => {
    const newState = { ...internalState, ...connectionState };
    setInternalState(newState);
    if (onStateChange) {
      onStateChange(newState);
    }
  }, [connectionState]);
  
  // Update internal state when prop changes
  useEffect(() => {
    if (propChecked !== undefined && propChecked !== internalState.checked) {
      setInternalState(prev => ({ ...prev, checked: propChecked }));
    }
  }, [propChecked]);
  
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
  
  // Handle checkbox change
  const handleChange = useCallback(() => {
    if (disabled) return;
    
    // Toggle the checked state
    const newChecked = !isChecked;
    
    // Update toggle count in internal state
    const toggleCount = internalState.toggleCount + 1;
    const lastToggleTime = new Date().toISOString();
    
    // Update local state
    updateState({ 
      checked: newChecked, 
      toggleCount, 
      lastToggleTime 
    });
    
    // Send the event through the component system
    if (sendEvent && componentId) {
      // Update bidirectional checked value
      sendEvent(ComponentEventType.CHANGE, 'checked', newChecked);
      
      // Send detailed change event
      sendEvent(ComponentEventType.CHANGE, 'change', {
        checked: newChecked,
        value: value,
        timestamp: new Date().toISOString(),
        toggleCount,
        state: { 
          ...internalState, 
          checked: newChecked, 
          toggleCount,
          lastToggleTime
        }
      });
    }
    
    // Call the prop onChange if provided
    if (onChange) {
      onChange(newChecked, value);
    }
  }, [componentId, disabled, isChecked, onChange, sendEvent, internalState, updateState, value]);
  
  // Calculate styles
  const styles = getCheckboxStyles(
    variant,
    checkboxSize,
    isChecked,
    disabled,
    propIndeterminate,
    animation,
    customColors,
    propCustomStyles
  );
  
  // Get theme for styling (if needed)
  const { theme } = useTheme();
  
  return (
    <div
      style={styles.container}
      className={combinedClassName}
      onClick={handleChange}
      data-testid={testId || `checkbox-${componentId}`}
      data-component-id={componentId}
      data-component-type={componentType}
      data-state={JSON.stringify(internalState)}
      {...rest}
    >
      <div style={styles.checkbox}>
        {isChecked && !propIndeterminate && (
          <svg 
            width={styles.checkmark.width?.toString()} 
            height={styles.checkmark.height?.toString()} 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M5 12L10 17L19 8" 
              stroke={customColors.checkmark || "#FFFFFF"} 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        )}
        {propIndeterminate && (
          <div style={styles.checkmark}></div>
        )}
      </div>
      
      {label && <div style={styles.label}>{label}</div>}
    </div>
  );
};

/**
 * Wrap the base component with the intelligent component HOC
 */
export const IntelligentCheckbox = withIntelligentComponent(
  IntelligentCheckboxBase,
  ComponentType.CHECKBOX
);

/**
 * Component definition for the registry
 */
const checkboxComponentDefinition: ComponentDefinition = {
  meta: {
    type: ComponentType.CHECKBOX,
    name: 'Checkbox',
    description: 'Input component for selecting multiple options',
    capabilities: checkboxCapabilities,
    defaultProps: {
      variant: 'default',
      size: 'medium',
      checked: false,
      disabled: false,
      label: '',
      animation: 'scale'
    }
  },
  initializer: (props) => {
    return {
      id: props.id || uuidv4(),
      type: ComponentType.CHECKBOX,
      properties: {
        ...props,
        variant: props.variant || 'default',
        size: props.size || 'medium',
        animation: props.animation || 'scale',
        customColors: props.customColors || {},
        customStyles: props.customStyles || {}
      },
      state: {
        checked: props.checked || false,
        toggleCount: 0,
        lastToggleTime: null,
        ...props.initialState
      }
    };
  },
  renderer: (instance: ComponentInstance) => {
    const {
      id: componentId,
      type: componentType,
      properties,
      state
    } = instance;
    
    // Handle checkbox toggle with state management
    const handleToggle = (checked: boolean, value: any) => {
      // Update the instance state
      if (instance.state) {
        instance.state.checked = checked;
        
        // Update toggle count
        const toggleCount = (instance.state.toggleCount || 0) + 1;
        const lastToggleTime = new Date().toISOString();
        instance.state.toggleCount = toggleCount;
        instance.state.lastToggleTime = lastToggleTime;
        
        // Emit to output connection points if available
        if (instance.emit && typeof instance.emit === 'function') {
          instance.emit('change', {
            checked,
            value,
            toggleCount,
            lastToggleTime,
            componentId,
            state: { ...state, checked, toggleCount, lastToggleTime }
          });
        }
      }
    };
    
    return (
      <IntelligentCheckbox
        componentId={componentId}
        {...properties}
        checked={state?.checked}
        onChange={handleToggle}
      />
    );
  }
};

// Register the checkbox component
componentRegistry.registerComponent(checkboxComponentDefinition);

export default IntelligentCheckbox; 