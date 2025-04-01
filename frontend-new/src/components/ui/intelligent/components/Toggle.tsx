import React from 'react';
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

/**
 * Define Toggle capabilities
 */
const toggleCapabilities: ComponentCapability[] = [
  {
    id: 'interaction',
    name: 'User Interaction',
    description: 'Capabilities related to user interactions with the toggle',
    connectionPoints: [
      {
        id: 'change',
        name: 'Change Event',
        description: 'Triggered when the toggle is switched on or off',
        type: DataType.OBJECT,
        direction: 'output'
      }
    ]
  },
  {
    id: 'data',
    name: 'Data Properties',
    description: 'Capabilities related to the toggle data',
    connectionPoints: [
      {
        id: 'checked',
        name: 'Checked State',
        description: 'Whether the toggle is currently on (true) or off (false)',
        type: DataType.BOOLEAN,
        direction: 'input',
        defaultValue: false
      },
      {
        id: 'disabled',
        name: 'Disabled State',
        description: 'Whether the toggle is disabled and cannot be interacted with',
        type: DataType.BOOLEAN,
        direction: 'input',
        defaultValue: false
      }
    ]
  },
  {
    id: 'display',
    name: 'Display Properties',
    description: 'Capabilities related to the toggle appearance',
    connectionPoints: [
      {
        id: 'size',
        name: 'Toggle Size',
        description: 'Size of the toggle component',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'medium'
      },
      {
        id: 'label',
        name: 'Toggle Label',
        description: 'Label text to display next to the toggle',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: ''
      },
      {
        id: 'labelPosition',
        name: 'Label Position',
        description: 'Position of the label relative to the toggle (left, right)',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'right'
      }
    ]
  }
];

// Define Toggle size and label position types
type ToggleSize = 'small' | 'medium' | 'large';
type LabelPosition = 'left' | 'right';

/**
 * Props for the Intelligent Toggle Component
 */
interface IntelligentToggleProps {
  // Component system props
  componentId?: string;
  componentType?: ComponentType;
  sendEvent?: (type: ComponentEventType, connectionId: string, payload: any) => void;
  getConnectionValue?: (connectionId: string) => any;
  connect?: (sourceConnectionId: string, targetComponentId: string, targetConnectionId: string, transform?: (value: any) => any) => any;
  disconnect?: (connectionId: string) => boolean;
  
  // Toggle specific props
  checked?: boolean;
  disabled?: boolean;
  size?: ToggleSize;
  label?: string;
  labelPosition?: LabelPosition;
  className?: string;
  testId?: string;
  onChange?: (checked: boolean) => void;
}

/**
 * Get styles based on toggle size, checked state, and disabled state
 */
const getToggleStyles = (
  size: ToggleSize,
  checked: boolean,
  disabled: boolean,
  labelPosition: LabelPosition
): {
  container: React.CSSProperties;
  switch: React.CSSProperties;
  track: React.CSSProperties;
  thumb: React.CSSProperties;
  label: React.CSSProperties;
} => {
  // Size mappings
  const sizeMappings = {
    small: {
      width: 32,
      height: 16,
      thumbSize: 12,
      fontSize: '0.75rem',
      trackPadding: 2
    },
    medium: {
      width: 44,
      height: 22,
      thumbSize: 16,
      fontSize: '0.875rem',
      trackPadding: 3
    },
    large: {
      width: 56,
      height: 28,
      thumbSize: 20,
      fontSize: '1rem',
      trackPadding: 4
    }
  };
  
  const currentSize = sizeMappings[size];
  
  // Container styles
  const container: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    flexDirection: labelPosition === 'left' ? 'row-reverse' : 'row',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    userSelect: 'none',
    maxWidth: 'fit-content'
  };
  
  // Switch container styles
  const switchStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    width: currentSize.width,
    height: currentSize.height,
    margin: '0 8px'
  };
  
  // Track styles
  const track: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: currentSize.height,
    backgroundColor: checked ? '#1677ff' : '#e2e8f0',
    transition: 'background-color 0.2s',
    padding: currentSize.trackPadding
  };
  
  // Thumb styles
  const thumbPosition = checked 
    ? currentSize.width - currentSize.thumbSize - currentSize.trackPadding * 2 
    : 0;
  
  const thumb: React.CSSProperties = {
    position: 'absolute',
    top: currentSize.trackPadding,
    left: currentSize.trackPadding + thumbPosition,
    width: currentSize.thumbSize,
    height: currentSize.thumbSize,
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
    transition: 'left 0.2s',
    zIndex: 1
  };
  
  // Label styles
  const label: React.CSSProperties = {
    fontSize: currentSize.fontSize,
    marginLeft: labelPosition === 'right' ? 4 : 0,
    marginRight: labelPosition === 'left' ? 4 : 0,
    color: disabled ? '#a1a1aa' : '#18181b'
  };
  
  return { container, switch: switchStyle, track, thumb, label };
};

/**
 * Base Toggle implementation that uses the intelligent component system
 */
const IntelligentToggleBase: React.FC<IntelligentToggleProps> = ({
  componentId,
  componentType,
  sendEvent,
  getConnectionValue,
  connect,
  disconnect,
  checked: propChecked = false,
  disabled: propDisabled = false,
  size: propSize = 'medium',
  label: propLabel = '',
  labelPosition: propLabelPosition = 'right',
  className,
  testId,
  onChange,
  ...rest
}) => {
  // Get values from connections if available
  const connectionChecked = getConnectionValue?.('checked');
  const connectionDisabled = getConnectionValue?.('disabled');
  const connectionSize = getConnectionValue?.('size');
  const connectionLabel = getConnectionValue?.('label');
  const connectionLabelPosition = getConnectionValue?.('labelPosition');
  
  // Use connection values or props
  const checked = typeof connectionChecked === 'boolean' ? connectionChecked : propChecked;
  const disabled = typeof connectionDisabled === 'boolean' ? connectionDisabled : propDisabled;
  const size = (connectionSize || propSize || 'medium') as ToggleSize;
  const label = connectionLabel || propLabel || '';
  const labelPosition = (connectionLabelPosition || propLabelPosition || 'right') as LabelPosition;
  
  // Get styles for the component
  const styles = getToggleStyles(size, checked, disabled, labelPosition);
  
  // Handle toggle change
  const handleChange = () => {
    if (disabled) return;
    
    const newChecked = !checked;
    
    // Send the event through the component system
    if (sendEvent && componentId) {
      sendEvent(ComponentEventType.CHANGE, 'change', {
        checked: newChecked,
        timestamp: new Date().toISOString()
      });
    }
    
    // Call the prop onChange if provided
    if (onChange) {
      onChange(newChecked);
    }
  };
  
  return (
    <div 
      style={styles.container} 
      className={className}
      onClick={handleChange}
      data-testid={testId}
    >
      <div style={styles.switch}>
        <div style={styles.track}></div>
        <div style={styles.thumb}></div>
      </div>
      {label && <div style={styles.label}>{label}</div>}
    </div>
  );
};

/**
 * Component definition for the component registry
 */
const toggleComponentDefinition: ComponentDefinition = {
  meta: {
    type: ComponentType.TOGGLE,
    name: 'Toggle',
    description: 'A switch control that toggles between on and off states',
    capabilities: toggleCapabilities,
    defaultProps: {
      checked: false,
      disabled: false,
      size: 'medium',
      label: '',
      labelPosition: 'right'
    }
  },
  initializer: (props: Record<string, any>) => ({
    id: props.id || `toggle-${uuidv4()}`,
    type: ComponentType.TOGGLE,
    properties: {
      checked: typeof props.checked === 'boolean' ? props.checked : false,
      disabled: typeof props.disabled === 'boolean' ? props.disabled : false,
      size: props.size || 'medium',
      label: props.label || '',
      labelPosition: props.labelPosition || 'right'
    }
  }),
  renderer: (instance) => {
    // The actual renderer is provided by the withIntelligentComponent HOC
    return null;
  }
};

// Register component with the registry
componentRegistry.registerComponent(toggleComponentDefinition);

// Export the component wrapped with the intelligent component system
export const IntelligentToggle = withIntelligentComponent<IntelligentToggleProps>(
  IntelligentToggleBase,
  ComponentType.TOGGLE
);

// Export base component for testing purposes
export { IntelligentToggleBase }; 