import React, { useCallback, useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  ComponentType, 
  ComponentCapability, 
  DataType,
  ComponentEventType,
  ComponentDefinition,
  Connection
} from '../ComponentTypes';
import { componentRegistry } from '../ComponentRegistry';
import { withIntelligentComponent } from '../IntelligentComponent';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Define Select capabilities
 */
const selectCapabilities: ComponentCapability[] = [
  {
    id: 'interaction',
    name: 'User Interaction',
    description: 'Capabilities related to user interactions with the select component',
    connectionPoints: [
      {
        id: 'change',
        name: 'Selection Change Event',
        description: 'Triggered when the selected option changes',
        type: DataType.OBJECT,
        direction: 'output'
      },
      {
        id: 'enabled',
        name: 'Select Enabled State',
        description: 'Controls whether the select is enabled or disabled',
        type: DataType.BOOLEAN,
        direction: 'input',
        defaultValue: true
      }
    ]
  },
  {
    id: 'data',
    name: 'Data Properties',
    description: 'Capabilities related to the select data',
    connectionPoints: [
      {
        id: 'options',
        name: 'Select Options',
        description: 'Array of options to display in the select',
        type: DataType.ARRAY,
        direction: 'input',
        defaultValue: []
      },
      {
        id: 'value',
        name: 'Selected Value',
        description: 'The currently selected value',
        type: DataType.ANY,
        direction: 'bidirectional',
        defaultValue: ''
      },
      {
        id: 'placeholder',
        name: 'Placeholder Text',
        description: 'Text to display when no option is selected',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'Select an option...'
      }
    ]
  },
  {
    id: 'display',
    name: 'Display Properties',
    description: 'Capabilities related to the select appearance',
    connectionPoints: [
      {
        id: 'label',
        name: 'Field Label',
        description: 'Label text displayed above the select',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: ''
      },
      {
        id: 'variant',
        name: 'Select Variant',
        description: 'Visual style variant of the select',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'default'
      },
      {
        id: 'size',
        name: 'Select Size',
        description: 'Size of the select component',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'medium'
      }
    ]
  }
];

// Define Select variant and size types
type SelectVariant = 'default' | 'outlined' | 'filled';
type SelectSize = 'small' | 'medium' | 'large';
type SelectOption = {
  value: string | number;
  label: string;
  disabled?: boolean;
};

/**
 * Props for the Intelligent Select Component
 */
interface IntelligentSelectProps {
  // Component system props
  componentId?: string;
  componentType?: ComponentType;
  sendEvent?: (type: ComponentEventType, connectionId: string, payload: any) => void;
  getConnectionValue?: (connectionId: string) => any;
  connect?: (sourceConnectionId: string, targetComponentId: string, targetConnectionId: string, transform?: (value: any) => any) => any;
  disconnect?: (connectionId: string) => boolean;
  
  // Select specific props
  label?: string;
  options?: SelectOption[];
  value?: any;
  onChange?: (value: any, option?: SelectOption) => void;
  placeholder?: string;
  variant?: SelectVariant;
  size?: SelectSize;
  disabled?: boolean;
  className?: string;
  testId?: string;
}

/**
 * Get styles based on select variant and theme
 */
const getSelectStyles = (
  variant: SelectVariant, 
  size: SelectSize,
  isOpen: boolean,
  disabled: boolean
): {
  container: React.CSSProperties;
  select: React.CSSProperties;
  dropdown: React.CSSProperties;
  option: React.CSSProperties;
  label: React.CSSProperties;
} => {
  const paddingMap = {
    small: '0.5rem',
    medium: '0.75rem',
    large: '1rem'
  };
  
  const fontSizeMap = {
    small: '0.875rem',
    medium: '1rem',
    large: '1.125rem'
  };
  
  const heightMap = {
    small: '2rem',
    medium: '2.5rem',
    large: '3rem'
  };
  
  // Container styles
  const container: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: '20rem',
    fontFamily: 'sans-serif'
  };
  
  // Select input styles
  const select: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    height: heightMap[size],
    padding: `0 ${paddingMap[size]}`,
    fontSize: fontSizeMap[size],
    backgroundColor: variant === 'filled' ? '#f1f5f9' : '#ffffff',
    border: variant === 'default' ? '1px solid #cbd5e1' : variant === 'outlined' ? '2px solid #94a3b8' : 'none',
    borderRadius: '0.25rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.7 : 1,
    position: 'relative',
    boxSizing: 'border-box',
    userSelect: 'none',
    transition: 'all 0.2s ease',
    color: disabled ? '#94a3b8' : '#1e293b'
  };
  
  if (isOpen && !disabled) {
    select.borderColor = '#3b82f6';
    select.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.2)';
  }
  
  // Dropdown styles
  const dropdown: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 0.25rem)',
    left: 0,
    width: '100%',
    maxHeight: '12rem',
    overflowY: 'auto',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '0.25rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    zIndex: 10,
    display: isOpen ? 'block' : 'none'
  };
  
  // Option styles
  const option: React.CSSProperties = {
    padding: paddingMap[size],
    fontSize: fontSizeMap[size],
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    color: '#1e293b'
  };
  
  // Label styles
  const label: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: fontSizeMap[size] === '1.125rem' ? '1rem' : fontSizeMap[size],
    fontWeight: 500,
    color: '#475569'
  };
  
  return { container, select, dropdown, option, label };
};

/**
 * Base Select implementation that uses the intelligent component system
 */
const IntelligentSelectBase: React.FC<IntelligentSelectProps> = ({
  componentId,
  componentType,
  sendEvent,
  getConnectionValue,
  connect,
  disconnect,
  label: propLabel,
  options: propOptions = [],
  value: propValue,
  onChange,
  placeholder: propPlaceholder,
  variant: propVariant = 'default',
  size = 'medium',
  disabled: propDisabled,
  className,
  testId,
  ...rest
}) => {
  // Get values from connections if available
  const connectionLabel = getConnectionValue?.('label');
  const connectionOptions = getConnectionValue?.('options');
  const connectionValue = getConnectionValue?.('value');
  const connectionPlaceholder = getConnectionValue?.('placeholder');
  const connectionVariant = getConnectionValue?.('variant');
  const connectionEnabled = getConnectionValue?.('enabled');
  
  // Use connection values or props
  const label = connectionLabel || propLabel || '';
  const options = connectionOptions || propOptions || [];
  const value = connectionValue !== undefined ? connectionValue : propValue;
  const placeholder = connectionPlaceholder || propPlaceholder || 'Select an option...';
  const variant = (connectionVariant || propVariant || 'default') as SelectVariant;
  const disabled = connectionEnabled === false || propDisabled === true;
  
  // Local state for dropdown open/close
  const [isOpen, setIsOpen] = useState(false);
  // Add hover state tracking
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const selectRef = useRef<HTMLDivElement>(null);
  
  // Find the currently selected option
  const selectedOption = options.find((opt: SelectOption) => opt.value === value);
  
  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Toggle dropdown
  const handleToggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };
  
  // Handle option selection
  const handleSelectOption = (option: SelectOption) => {
    if (option.disabled) return;
    
    // Create payload for the event
    const payload = {
      value: option.value,
      label: option.label,
      timestamp: new Date().toISOString()
    };
    
    // Send the event through the component system
    if (sendEvent && componentId) {
      sendEvent(ComponentEventType.CHANGE, 'change', payload);
      sendEvent(ComponentEventType.USER_INTERACTION, 'value', payload.value);
    }
    
    // Call the prop onChange if provided
    if (onChange) {
      onChange(option.value, option);
    }
    
    // Close the dropdown
    setIsOpen(false);
  };
  
  // Get styles for the component
  const styles = getSelectStyles(variant, size, isOpen, disabled);
  
  // Calculate display text
  const displayText = selectedOption ? selectedOption.label : placeholder;
  
  return (
    <div 
      ref={selectRef}
      style={styles.container} 
      className={className}
      data-testid={testId}
    >
      {label && <label style={styles.label}>{label}</label>}
      
      <div 
        style={styles.select}
        onClick={handleToggleDropdown}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
      >
        <div 
          style={{ 
            flex: 1,
            opacity: selectedOption ? 1 : 0.6
          }}
        >
          {displayText}
        </div>
        
        <div style={{ marginLeft: '0.5rem' }}>
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
      
      <div 
        style={styles.dropdown}
        role="listbox"
      >
        {options.length > 0 ? (
          options.map((option: SelectOption, index: number) => (
            <div
              key={`${option.value}-${index}`}
              style={{
                ...styles.option,
                backgroundColor: option.value === value 
                  ? '#f1f5f9' 
                  : hoveredIndex === index && !option.disabled
                    ? '#f8fafc'
                    : 'transparent',
                color: option.disabled ? '#94a3b8' : '#1e293b',
                cursor: option.disabled ? 'not-allowed' : 'pointer'
              }}
              onClick={() => !option.disabled && handleSelectOption(option)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled}
            >
              {option.label}
            </div>
          ))
        ) : (
          <div style={{ ...styles.option, color: '#94a3b8', cursor: 'default' }}>
            No options available
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Component definition for the component registry
 */
const selectComponentDefinition: ComponentDefinition = {
  meta: {
    type: ComponentType.SELECT,
    name: 'Select',
    description: 'A dropdown select component for selecting from a list of options',
    capabilities: selectCapabilities,
    defaultProps: {
      placeholder: 'Select an option...',
      variant: 'default',
      size: 'medium',
      options: []
    }
  },
  initializer: (props: Record<string, any>) => ({
    id: props.id || `select-${uuidv4()}`,
    type: ComponentType.SELECT,
    properties: {
      label: props.label || '',
      placeholder: props.placeholder || 'Select an option...',
      options: props.options || [],
      variant: props.variant || 'default',
      size: props.size || 'medium',
      disabled: props.disabled || false,
      value: props.value
    }
  }),
  renderer: (instance) => {
    // The actual renderer is provided by the withIntelligentComponent HOC
    return null;
  }
};

// Register component with the registry
componentRegistry.registerComponent(selectComponentDefinition);

// Export the component wrapped with the intelligent component system
export const IntelligentSelect = withIntelligentComponent<IntelligentSelectProps>(
  IntelligentSelectBase,
  ComponentType.SELECT
);

// Export base component for testing purposes
export { IntelligentSelectBase }; 