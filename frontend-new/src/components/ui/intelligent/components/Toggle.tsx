import React, { useState, useCallback, useEffect } from 'react';
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
import './Toggle.css'; // Import the CSS file with animations

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
        direction: 'bidirectional',
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
      },
      {
        id: 'animation',
        name: 'Animation Type',
        description: 'Type of animation to apply when toggling the switch',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'smooth'
      },
      {
        id: 'customColors',
        name: 'Custom Colors',
        description: 'Custom colors for the toggle track and thumb',
        type: DataType.OBJECT,
        direction: 'input',
        defaultValue: {}
      }
    ]
  },
  {
    id: 'state',
    name: 'State Management',
    description: 'Capabilities related to toggle state',
    connectionPoints: [
      {
        id: 'state',
        name: 'Toggle State',
        description: 'Current state of the toggle',
        type: DataType.OBJECT,
        direction: 'bidirectional',
        defaultValue: {}
      }
    ]
  }
];

// Define Toggle size and label position types
type ToggleSize = 'small' | 'medium' | 'large' | 'custom';
type LabelPosition = 'left' | 'right' | 'top' | 'bottom';
type ToggleAnimation = 'smooth' | 'bounce' | 'elastic' | 'none' | 'custom';

/**
 * Get animation class name based on animation type
 */
const getAnimationClassName = (animation: ToggleAnimation): string => {
  switch (animation) {
    case 'bounce':
      return 'toggle-bounce';
    case 'elastic':
      return 'toggle-elastic';
    case 'smooth':
      return 'toggle-smooth';
    default:
      return '';
  }
};

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
  animation?: ToggleAnimation;
  className?: string;
  testId?: string;
  onChange?: (checked: boolean) => void;
  
  // Extended customization props
  customColors?: {
    track?: string;
    trackChecked?: string;
    thumb?: string;
    thumbChecked?: string;
    label?: string;
    disabled?: string;
  };
  customStyles?: {
    container?: React.CSSProperties;
    switch?: React.CSSProperties;
    track?: React.CSSProperties;
    thumb?: React.CSSProperties;
    label?: React.CSSProperties;
  };
  
  // State management props
  initialState?: Record<string, any>;
  onStateChange?: (newState: Record<string, any>) => void;
}

/**
 * Get styles based on toggle size, checked state, and disabled state
 */
const getToggleStyles = (
  size: ToggleSize,
  checked: boolean,
  disabled: boolean,
  labelPosition: LabelPosition,
  animation: ToggleAnimation,
  customColors: {
    track?: string;
    trackChecked?: string;
    thumb?: string;
    thumbChecked?: string;
    label?: string;
    disabled?: string;
  } = {},
  customStyles: {
    container?: React.CSSProperties;
    switch?: React.CSSProperties;
    track?: React.CSSProperties;
    thumb?: React.CSSProperties;
    label?: React.CSSProperties;
  } = {}
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
    },
    custom: {
      width: 44,
      height: 22,
      thumbSize: 16,
      fontSize: '0.875rem',
      trackPadding: 3
    }
  };
  
  const currentSize = sizeMappings[size];
  
  // Determine flex direction based on label position
  let flexDirection: React.CSSProperties['flexDirection'] = 'row';
  switch (labelPosition) {
    case 'left':
      flexDirection = 'row-reverse';
      break;
    case 'top':
      flexDirection = 'column-reverse';
      break;
    case 'bottom':
      flexDirection = 'column';
      break;
    default: // right
      flexDirection = 'row';
  }
  
  // Container styles
  const container: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexDirection: flexDirection,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    userSelect: 'none',
    maxWidth: 'fit-content',
    gap: ['top', 'bottom'].includes(labelPosition) ? '6px' : '8px'
  };
  
  // Switch container styles
  const switchStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    width: currentSize.width,
    height: currentSize.height,
    flexShrink: 0
  };
  
  // Track styles
  const track: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: currentSize.height,
    backgroundColor: disabled 
      ? (customColors.disabled || '#e2e8f0') 
      : (checked 
        ? (customColors.trackChecked || '#1677ff') 
        : (customColors.track || '#e2e8f0')),
    transition: animation !== 'none' ? 'background-color 0.2s' : 'none',
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
    backgroundColor: disabled 
      ? (customColors.disabled || '#cbd5e0') 
      : (checked 
        ? (customColors.thumbChecked || '#ffffff') 
        : (customColors.thumb || '#ffffff')),
    transition: animation !== 'none' ? 'left 0.2s' : 'none',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
  };
  
  // Label styles
  const label: React.CSSProperties = {
    fontSize: currentSize.fontSize,
    color: disabled 
      ? (customColors.disabled || '#94a3b8') 
      : (customColors.label || '#1e293b'),
    cursor: disabled ? 'not-allowed' : 'pointer'
  };
  
  // Apply custom styles if provided
  return {
    container: { ...container, ...customStyles.container },
    switch: { ...switchStyle, ...customStyles.switch },
    track: { ...track, ...customStyles.track },
    thumb: { ...thumb, ...customStyles.thumb },
    label: { ...label, ...customStyles.label }
  };
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
  animation: propAnimation = 'smooth',
  className,
  testId,
  onChange,
  customColors: propCustomColors = {},
  customStyles: propCustomStyles = {},
  initialState = {},
  onStateChange,
  ...rest
}) => {
  // Internal state management
  const [internalState, setInternalState] = useState<Record<string, any>>({
    ...initialState,
    checked: propChecked,
    toggleCount: 0,
    lastToggleTime: null
  });
  
  // Get values from connections if available
  const connectionChecked = getConnectionValue?.('checked');
  const connectionDisabled = getConnectionValue?.('disabled');
  const connectionSize = getConnectionValue?.('size');
  const connectionLabel = getConnectionValue?.('label');
  const connectionLabelPosition = getConnectionValue?.('labelPosition');
  const connectionAnimation = getConnectionValue?.('animation');
  const connectionCustomColors = getConnectionValue?.('customColors') || {};
  const connectionState = getConnectionValue?.('state') || {};
  
  // Use connection values or props with local state for controlled value
  const isChecked = connectionChecked !== undefined 
    ? connectionChecked 
    : internalState.checked;
  const disabled = connectionDisabled || propDisabled;
  const size = (connectionSize || propSize) as ToggleSize;
  const label = connectionLabel || propLabel;
  const labelPosition = (connectionLabelPosition || propLabelPosition) as LabelPosition;
  const animation = (connectionAnimation || propAnimation) as ToggleAnimation;
  const customColors = { ...propCustomColors, ...connectionCustomColors };
  
  // Get animation class name
  const animationClassName = getAnimationClassName(animation);
  
  // Combine class names
  const combinedClassName = [
    className || '',
    animationClassName
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
  
  // Handle toggle change
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
        previousChecked: isChecked,
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
      onChange(newChecked);
    }
  }, [componentId, disabled, isChecked, onChange, sendEvent, internalState, updateState]);
  
  // Generate styles based on props
  const styles = getToggleStyles(
    size, 
    isChecked, 
    disabled, 
    labelPosition, 
    animation,
    customColors,
    propCustomStyles
  );
  
  return (
    <div
      className={combinedClassName}
      style={styles.container}
      onClick={handleChange}
      data-testid={testId || `toggle-${componentId}`}
      data-component-id={componentId}
      data-component-type={componentType}
      data-state={JSON.stringify(internalState)}
      {...rest}
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
 * Wrap the base component with the intelligent component HOC
 */
export const IntelligentToggle = withIntelligentComponent(
  IntelligentToggleBase,
  ComponentType.TOGGLE
);

/**
 * Component definition for the registry
 */
const toggleComponentDefinition: ComponentDefinition = {
  meta: {
    type: ComponentType.TOGGLE,
    name: 'Toggle',
    description: 'Switch component for turning options on or off',
    capabilities: toggleCapabilities,
    defaultProps: {
      checked: false,
      disabled: false,
      size: 'medium',
      label: '',
      labelPosition: 'right'
    }
  },
  initializer: (props) => {
    return {
      id: props.id || uuidv4(),
      type: ComponentType.TOGGLE,
      properties: {
        ...props,
        customColors: props.customColors || {},
        customStyles: props.customStyles || {},
        animation: props.animation || 'smooth'
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
    
    // Handle toggle with state management
    const handleToggle = () => {
      if (properties.disabled) return;
      
      // Update the instance state
      if (instance.state) {
        // Toggle the checked state
        const newChecked = !instance.state.checked;
        instance.state.checked = newChecked;
        
        // Update toggle count
        const toggleCount = (instance.state.toggleCount || 0) + 1;
        const lastToggleTime = new Date().toISOString();
        instance.state.toggleCount = toggleCount;
        instance.state.lastToggleTime = lastToggleTime;
        
        // Emit to output connection points if available
        if (instance.emit && typeof instance.emit === 'function') {
          instance.emit('change', {
            checked: newChecked,
            toggleCount,
            lastToggleTime,
            componentId,
            state: { ...state, checked: newChecked, toggleCount, lastToggleTime }
          });
        }
      }
    };
    
    return (
      <IntelligentToggle
        componentId={componentId}
        {...properties}
        checked={state?.checked}
        onChange={handleToggle}
      />
    );
  }
};

// Register the toggle component
componentRegistry.registerComponent(toggleComponentDefinition);

export default IntelligentToggle; 