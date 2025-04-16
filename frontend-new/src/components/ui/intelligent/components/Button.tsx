import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  ComponentType, 
  ComponentCapability, 
  DataType,
  ComponentEventType,
  ComponentDefinition,
  Connection,
  ComponentInstance 
} from '../ComponentTypes';
import { componentRegistry } from '../ComponentRegistry';
import { withIntelligentComponent } from '../IntelligentComponent';
import { useTheme } from '../../theme/ThemeProvider';
import { connectionManager } from '../ConnectionManager';
import './Button.css'; // Import the CSS file with animations

// Declare the global window object with our custom properties
declare global {
  interface Window {
    intelligentComponentSystem?: {
      connectionManager?: {
        getOutgoingConnections: (componentId: string) => Connection[];
      };
    };
  }
}

/**
 * Define Button capabilities
 */
const buttonCapabilities: ComponentCapability[] = [
  {
    id: 'interaction',
    name: 'User Interaction',
    description: 'Capabilities related to user interactions with the button',
    connectionPoints: [
      {
        id: 'click',
        name: 'Click Event',
        description: 'Triggered when the button is clicked',
        type: DataType.OBJECT,
        direction: 'output'
      },
      {
        id: 'enabled',
        name: 'Button Enabled State',
        description: 'Controls whether the button is enabled or disabled',
        type: DataType.BOOLEAN,
        direction: 'input',
        defaultValue: true
      }
    ]
  },
  {
    id: 'display',
    name: 'Display Properties',
    description: 'Capabilities related to the button appearance',
    connectionPoints: [
      {
        id: 'label',
        name: 'Button Label',
        description: 'Text to display on the button',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'Button'
      },
      {
        id: 'variant',
        name: 'Button Variant',
        description: 'Visual style variant of the button',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'primary'
      },
      {
        id: 'customStyles',
        name: 'Custom Styles',
        description: 'Custom CSS styles for the button',
        type: DataType.OBJECT,
        direction: 'input',
        defaultValue: {}
      }
    ]
  },
  {
    id: 'animation',
    name: 'Animation Properties',
    description: 'Capabilities related to button animations and transitions',
    connectionPoints: [
      {
        id: 'animation',
        name: 'Animation Type',
        description: 'Type of animation to apply to the button',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'none'
      },
      {
        id: 'transition',
        name: 'Transition Style',
        description: 'CSS transition style for the button',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'all 0.2s ease-in-out'
      },
      {
        id: 'transform',
        name: 'Transform Style',
        description: 'CSS transform to apply to the button',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: ''
      },
      {
        id: 'scale',
        name: 'Scale Factor',
        description: 'Scaling factor to apply to the button (1.0 = normal size)',
        type: DataType.NUMBER,
        direction: 'input',
        defaultValue: 1.0
      }
    ]
  },
  {
    id: 'data',
    name: 'Data Transfer',
    description: 'Capabilities related to data flowing through the button',
    connectionPoints: [
      {
        id: 'payload',
        name: 'Button Payload',
        description: 'Data payload to be sent when button is clicked',
        type: DataType.OBJECT,
        direction: 'bidirectional',
        defaultValue: {}
      },
      {
        id: 'state',
        name: 'Button State',
        description: 'Internal state of the button',
        type: DataType.OBJECT,
        direction: 'bidirectional',
        defaultValue: {}
      }
    ]
  }
];

// Define Button variant and size types
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'custom';
type ButtonSize = 'small' | 'medium' | 'large' | 'custom';
type ButtonAnimation = 'none' | 'pulse' | 'grow' | 'shake' | 'custom';

// Define additional CSS properties for animations
interface ExtendedCSSProperties extends React.CSSProperties {
  animation?: string | number;
  className?: string;
}

/**
 * Get animation class name based on animation type
 */
const getAnimationClassName = (animation: ButtonAnimation): string => {
  switch (animation) {
    case 'grow':
      return 'grow-on-hover';
    case 'shake':
      return 'shake-on-hover';
    case 'pulse':
      return 'pulse';
    default:
      return '';
  }
};

/**
 * Props for the Intelligent Button Component
 */
interface IntelligentButtonProps {
  // Component system props
  componentId?: string;
  componentType?: ComponentType;
  sendEvent?: (type: ComponentEventType, connectionId: string, payload: any) => void;
  getConnectionValue?: (connectionId: string) => any;
  connect?: (sourceConnectionId: string, targetComponentId: string, targetConnectionId: string, transform?: (value: any) => any) => any;
  disconnect?: (connectionId: string) => boolean;
  
  // Button specific props
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  fullWidth?: boolean;
  testId?: string;
  
  // Extended customization props
  customStyles?: React.CSSProperties;
  animation?: ButtonAnimation;
  transition?: string;
  transform?: string;
  scale?: number;
  
  // State management props
  initialState?: Record<string, any>;
  onStateChange?: (newState: Record<string, any>) => void;
}

/**
 * Get styles based on button variant and theme
 */
const getButtonStyles = (
  variant: ButtonVariant, 
  size: ButtonSize,
  customStyles: React.CSSProperties = {},
  animation: ButtonAnimation = 'none',
  transition = 'all 0.2s ease-in-out',
  transform = '',
  scale = 1.0
): ExtendedCSSProperties => {
  const styles: ExtendedCSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: size === 'small' ? '0.5rem 1rem' : size === 'large' ? '1rem 2rem' : '0.75rem 1.5rem',
    fontSize: size === 'small' ? '0.875rem' : size === 'large' ? '1.25rem' : '1rem',
    fontWeight: 500,
    lineHeight: 1.5,
    borderRadius: '0.25rem',
    border: 'none',
    cursor: 'pointer',
    transition,
    transform,
    textTransform: 'none',
    boxSizing: 'border-box',
    userSelect: 'none',
    textDecoration: 'none',
    boxShadow: 'none',
    position: 'relative',
    overflow: 'hidden'
  };
  
  // Default colors
  const colors = {
    primary: {
      main: '#2563eb',
      light: '#3b82f6',
      dark: '#1d4ed8',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#9333ea',
      light: '#a855f7',
      dark: '#7e22ce',
      contrastText: '#ffffff'
    }
  };
  
  if (variant !== 'custom') {
    switch (variant) {
      case 'primary':
        styles.backgroundColor = colors.primary.main;
        styles.color = colors.primary.contrastText;
        break;
      case 'secondary':
        styles.backgroundColor = colors.secondary.main;
        styles.color = colors.secondary.contrastText;
        break;
      case 'outline':
        styles.backgroundColor = 'transparent';
        styles.color = colors.primary.main;
        styles.border = `1px solid ${colors.primary.main}`;
        break;
      case 'text':
        styles.backgroundColor = 'transparent';
        styles.color = colors.primary.main;
        styles.padding = size === 'small' ? '0.25rem' : size === 'large' ? '0.75rem' : '0.5rem';
        break;
      default:
        styles.backgroundColor = colors.primary.main;
        styles.color = colors.primary.contrastText;
    }
  }
  
  // Apply animation styles
  if (animation !== 'none' && animation !== 'custom') {
    switch (animation) {
      case 'pulse':
        styles.animation = 'pulse 2s infinite';
        break;
      case 'grow':
        styles.transition = 'transform 0.3s ease-in-out';
        // Using CSS classes for hover effects instead of direct assignment
        break;
      case 'shake':
        // Using CSS classes for hover effects instead of direct assignment
        break;
    }
  }
  
  // Apply scale if provided
  if (scale !== 1.0) {
    const scaleTransform = `scale(${scale})`;
    styles.transform = transform ? `${transform} ${scaleTransform}` : scaleTransform;
  } else if (transform) {
    styles.transform = transform;
  }
  
  // Apply any custom styles at the end to override defaults
  return { ...styles, ...customStyles };
};

/**
 * Base Button implementation that uses the intelligent component system
 */
const IntelligentButtonBase: React.FC<IntelligentButtonProps> = ({
  componentId,
  componentType,
  sendEvent,
  getConnectionValue,
  connect,
  disconnect,
  label: propLabel,
  variant: propVariant,
  size = 'medium',
  disabled: propDisabled,
  onClick,
  className,
  fullWidth,
  testId,
  customStyles: propCustomStyles,
  animation: propAnimation,
  transition: propTransition,
  transform: propTransform,
  scale: propScale = 1.0,
  initialState = {},
  onStateChange,
  ...rest
}) => {
  // Internal state management
  const [internalState, setInternalState] = useState<Record<string, any>>(initialState);
  
  // Get values from connections if available
  const connectionLabel = getConnectionValue?.('label');
  const connectionVariant = getConnectionValue?.('variant');
  const connectionEnabled = getConnectionValue?.('enabled');
  const connectionPayload = getConnectionValue?.('payload') || {};
  const connectionStyles = getConnectionValue?.('customStyles') || {};
  const connectionAnimation = getConnectionValue?.('animation');
  const connectionTransition = getConnectionValue?.('transition');
  const connectionTransform = getConnectionValue?.('transform');
  const connectionState = getConnectionValue?.('state') || {};
  const connectionScale = getConnectionValue?.('scale');
  
  // Use connection values or props
  const label = connectionLabel || propLabel || 'Button';
  const variant = connectionVariant || propVariant || 'primary';
  const disabled = connectionEnabled === false || propDisabled === true;
  const customStyles = { ...propCustomStyles, ...connectionStyles };
  const animation = connectionAnimation || propAnimation || 'none';
  const transition = connectionTransition || propTransition || 'all 0.2s ease-in-out';
  const transform = connectionTransform || propTransform || '';
  const scale = connectionScale !== undefined ? connectionScale : propScale;
  
  // Get animation class name
  const animationClassName = getAnimationClassName(animation as ButtonAnimation);
  
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
  
  // Access theme for styling
  const { theme } = useTheme();
  
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
  
  // Handle button click
  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    
    // Combine props payload with connection payload and state
    const payload = {
      ...connectionPayload,
      timestamp: new Date().toISOString(),
      event: e,
      state: { ...internalState }
    };
    
    // Send the event through the component system
    if (sendEvent && componentId) {
      sendEvent(ComponentEventType.USER_INTERACTION, 'click', payload);
    }
    
    // Also call the prop onClick if provided
    if (onClick) {
      onClick(e);
    }
    
    // If we have access to the connection manager API through window
    if (window.intelligentComponentSystem?.connectionManager) {
      const outgoingConnections = window.intelligentComponentSystem.connectionManager.getOutgoingConnections(componentId || '');
      outgoingConnections.forEach(connection => {
        // Handle any custom interactions based on connections
        console.log(`Button click propagating to ${connection.targetComponentId}`);
      });
    }
  }, [componentId, disabled, onClick, sendEvent, connectionPayload, internalState]);
  
  // Define the button color scheme
  const colorScheme = {
    primary: {
      bg: '#2563eb',
      text: '#ffffff',
      border: 'none',
      hoverBg: '#1d4ed8'
    },
    secondary: {
      bg: '#9333ea',
      text: '#ffffff',
      border: 'none',
      hoverBg: '#7e22ce'
    },
    outline: {
      bg: 'transparent',
      text: '#2563eb',
      border: '1px solid #2563eb',
      hoverBg: 'rgba(37, 99, 235, 0.1)'
    },
    text: {
      bg: 'transparent',
      text: '#2563eb',
      border: 'none',
      hoverBg: 'rgba(37, 99, 235, 0.1)'
    }
  };
  
  // Apply the selected color scheme
  const colors = variant !== 'custom' 
    ? (colorScheme[variant as keyof typeof colorScheme] || colorScheme.primary)
    : { bg: 'transparent', text: '#000000', border: 'none', hoverBg: 'transparent' };
  
  // Compute button styles based on variant, size, and custom properties
  const buttonStyles = useMemo(() => 
    getButtonStyles(
      variant, 
      size, 
      customStyles, 
      animation, 
      transition, 
      transform,
      scale
    ), 
    [variant, size, customStyles, animation, transition, transform, scale]
  );
  
  // Apply basic styles based on props
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    outline: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontWeight: 500,
    lineHeight: 1.75,
    borderRadius: '4px',
    transition,
    transform,
    backgroundColor: colors.bg,
    color: colors.text,
    border: colors.border,
    opacity: disabled ? 0.6 : 1,
    width: fullWidth ? '100%' : 'auto',
  };
  
  // Apply size styles
  switch (size) {
    case 'small':
      baseStyles.padding = '0.25rem 0.5rem';
      baseStyles.fontSize = '0.875rem';
      break;
    case 'large':
      baseStyles.padding = '0.75rem 1.5rem';
      baseStyles.fontSize = '1.125rem';
      break;
    case 'custom':
      // Allow custom size settings through customStyles
      break;
    default: // medium
      baseStyles.padding = '0.5rem 1rem';
      baseStyles.fontSize = '1rem';
  }
  
  // Merge all styles, with customStyles taking precedence
  const mergedStyles = { ...baseStyles, ...buttonStyles };
  
  return (
    <button
      style={mergedStyles}
      onClick={handleClick}
      disabled={disabled}
      data-testid={testId || `button-${componentId}`}
      data-component-id={componentId}
      data-component-type={componentType}
      className={combinedClassName}
      data-state={JSON.stringify(internalState)}
      {...rest}
    >
      {label}
    </button>
  );
};

/**
 * Wrap the base component with the intelligent component HOC
 */
export const IntelligentButton = withIntelligentComponent(
  IntelligentButtonBase,
  ComponentType.BUTTON
);

/**
 * Component definition for the registry
 */
const buttonComponentDefinition: ComponentDefinition = {
  meta: {
    type: ComponentType.BUTTON,
    name: 'Button',
    description: 'Interactive button that can trigger actions and be fully customized',
    capabilities: buttonCapabilities,
    defaultProps: {
      label: 'Button',
      variant: 'primary',
      size: 'medium',
      animation: 'none',
      transition: 'all 0.2s ease-in-out',
      transform: '',
      customStyles: {}
    }
  },
  initializer: (props) => {
    return {
      id: props.id || uuidv4(),
      type: ComponentType.BUTTON,
      properties: {
        ...props,
        customStyles: props.customStyles || {},
        animation: props.animation || 'none',
        transition: props.transition || 'all 0.2s ease-in-out',
        transform: props.transform || '',
        state: props.state || {}
      },
      state: {
        label: props.label || 'Button',
        variant: props.variant || 'primary',
        enabled: props.disabled !== true,
        payload: props.payload || {},
        clickCount: 0,
        lastClickTime: null
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
    
    const {
      label,
      variant = 'primary',
      size = 'medium',
      disabled = false,
      customStyles = {},
      animation = 'none',
      transition = 'all 0.2s ease-in-out',
      transform = '',
      fullWidth = false,
      className = '',
      testId,
      ...rest
    } = properties;
    
    // Generate styles based on props and theme
    const styles = getButtonStyles(
      variant as ButtonVariant, 
      size as ButtonSize,
      customStyles,
      animation as ButtonAnimation,
      transition,
      transform
    );
    
    // Add full width style if specified
    if (fullWidth) {
      styles.width = '100%';
    }
    
    // Use a regular object instead of useRef to track state
    const stateData = state || { clickCount: 0, lastClickTime: null };
    
    // Handle click event with state management
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      
      // Update internal state
      const clickCount = ((stateData.clickCount || 0) + 1);
      const lastClickTime = new Date().toISOString();
      
      // Update the instance state
      if (instance.state) {
        instance.state.clickCount = clickCount;
        instance.state.lastClickTime = lastClickTime;
      }
      
      // Emit to output connection points if available
      if (instance.emit && typeof instance.emit === 'function') {
        instance.emit('click', {
          clickCount,
          lastClickTime,
          componentId,
          state: { ...stateData, clickCount, lastClickTime }
        });
      }
      
      console.log('Button clicked:', componentId, 'Click count:', clickCount);
    };
    
    // Get animation class name
    const animationClassName = getAnimationClassName(animation as ButtonAnimation);
    
    // Combine class names
    const combinedClassName = [
      className || '',
      animationClassName
    ].filter(Boolean).join(' ');
    
    return (
      <button
        style={styles}
        onClick={handleClick}
        disabled={disabled}
        data-testid={testId || `button-${componentId}`}
        data-component-id={componentId}
        data-component-type={componentType}
        className={combinedClassName}
        data-state={JSON.stringify(state)}
        {...rest}
      >
        {label}
      </button>
    );
  }
};

// Register the button component
componentRegistry.registerComponent(buttonComponentDefinition);

export default IntelligentButton; 