import React, { useCallback } from 'react';
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
      }
    ]
  }
];

// Define Button variant and size types
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text';
type ButtonSize = 'small' | 'medium' | 'large';

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
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  fullWidth?: boolean;
  testId?: string;
}

/**
 * Get styles based on button variant and theme
 */
const getButtonStyles = (
  variant: ButtonVariant, 
  size: ButtonSize
): React.CSSProperties => {
  const styles: React.CSSProperties = {
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
    transition: 'all 0.2s ease-in-out',
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
  
  return styles;
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
  ...rest
}) => {
  // Get values from connections if available
  const connectionLabel = getConnectionValue?.('label');
  const connectionVariant = getConnectionValue?.('variant');
  const connectionEnabled = getConnectionValue?.('enabled');
  const connectionPayload = getConnectionValue?.('payload') || {};
  
  // Use connection values or props
  const label = connectionLabel || propLabel || 'Button';
  const variant = connectionVariant || propVariant || 'primary';
  const disabled = connectionEnabled === false || propDisabled === true;
  
  // Access theme for styling
  const { theme } = useTheme();
  
  // Handle button click
  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    
    // Combine props payload with connection payload
    const payload = {
      ...connectionPayload,
      timestamp: new Date().toISOString(),
      event: e
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
  }, [componentId, disabled, onClick, sendEvent, connectionPayload]);
  
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
  const colors = colorScheme[variant as keyof typeof colorScheme] || colorScheme.primary;
  
  // Compute button styles based on variant and size
  const buttonStyles: React.CSSProperties = {
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
    transition: 'all 0.2s ease-in-out',
    backgroundColor: colors.bg,
    color: colors.text,
    border: colors.border,
    opacity: disabled ? 0.6 : 1,
    width: fullWidth ? '100%' : 'auto',
  };
  
  // Apply size styles
  switch (size) {
    case 'small':
      buttonStyles.padding = '0.25rem 0.5rem';
      buttonStyles.fontSize = '0.875rem';
      break;
    case 'large':
      buttonStyles.padding = '0.75rem 1.5rem';
      buttonStyles.fontSize = '1.125rem';
      break;
    default: // medium
      buttonStyles.padding = '0.5rem 1rem';
      buttonStyles.fontSize = '1rem';
  }
  
  return (
    <button
      style={buttonStyles}
      onClick={handleClick}
      disabled={disabled}
      data-testid={testId || `button-${componentId}`}
      data-component-id={componentId}
      data-component-type={componentType}
      className={className}
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
    description: 'Interactive button that can trigger actions',
    capabilities: buttonCapabilities,
    defaultProps: {
      label: 'Button',
      variant: 'primary',
      size: 'medium'
    }
  },
  initializer: (props) => {
    return {
      id: props.id || uuidv4(),
      type: ComponentType.BUTTON,
      properties: props,
      state: {
        label: props.label || 'Button',
        variant: props.variant || 'primary',
        enabled: props.disabled !== true,
        payload: props.payload || {}
      }
    };
  },
  renderer: (instance: ComponentInstance) => {
    const {
      id: componentId,
      type: componentType,
      properties
    } = instance;
    
    const {
      label,
      variant = 'primary',
      size = 'medium',
      color = 'primary',
      disabled = false,
      startIcon,
      endIcon,
      fullWidth = false,
      className = '',
      testId,
      ...rest
    } = properties;
    
    // Generate styles based on props and theme
    const styles = getButtonStyles(variant as ButtonVariant, size as ButtonSize);
    
    // Add full width style if specified
    if (fullWidth) {
      styles.width = '100%';
    }
    
    // Handle click event
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Emit to output connection points if available
      console.log('Button clicked:', componentId);
    };
    
    return (
      <button
        style={styles}
        onClick={handleClick}
        disabled={disabled}
        data-testid={testId || `button-${componentId}`}
        data-component-id={componentId}
        data-component-type={componentType}
        className={className}
      >
        {startIcon && <span className="button-start-icon">{startIcon}</span>}
        {label}
        {endIcon && <span className="button-end-icon">{endIcon}</span>}
      </button>
    );
  }
};

// Register the button component
componentRegistry.registerComponent(buttonComponentDefinition);

export default IntelligentButton; 