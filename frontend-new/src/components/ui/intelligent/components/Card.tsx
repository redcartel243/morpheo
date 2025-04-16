import React, { ReactNode, useState, useCallback, useEffect } from 'react';
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
import './Card.css'; // Import the CSS file with animations

/**
 * Define Card capabilities
 */
const cardCapabilities: ComponentCapability[] = [
  {
    id: 'interaction',
    name: 'User Interaction',
    description: 'Capabilities related to user interactions with the card',
    connectionPoints: [
      {
        id: 'click',
        name: 'Click Event',
        description: 'Triggered when the card is clicked',
        type: DataType.OBJECT,
        direction: 'output'
      },
      {
        id: 'hover',
        name: 'Hover Event',
        description: 'Triggered when the mouse enters or leaves the card',
        type: DataType.OBJECT,
        direction: 'output'
      }
    ]
  },
  {
    id: 'content',
    name: 'Content Properties',
    description: 'Capabilities related to the card content',
    connectionPoints: [
      {
        id: 'title',
        name: 'Card Title',
        description: 'Title text displayed in the card header',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: ''
      },
      {
        id: 'subtitle',
        name: 'Card Subtitle',
        description: 'Subtitle text displayed in the card header',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: ''
      },
      {
        id: 'headerImage',
        name: 'Header Image',
        description: 'URL of an image to display in the card header',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: ''
      },
      {
        id: 'content',
        name: 'Card Content',
        description: 'Text content displayed in the card body',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: ''
      },
      {
        id: 'footer',
        name: 'Card Footer',
        description: 'Text content displayed in the card footer',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: ''
      }
    ]
  },
  {
    id: 'display',
    name: 'Display Properties',
    description: 'Capabilities related to the card appearance',
    connectionPoints: [
      {
        id: 'variant',
        name: 'Card Variant',
        description: 'Visual style variant of the card',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'default'
      },
      {
        id: 'elevation',
        name: 'Card Elevation',
        description: 'Shadow elevation level of the card',
        type: DataType.NUMBER,
        direction: 'input',
        defaultValue: 1
      },
      {
        id: 'animation',
        name: 'Animation Type',
        description: 'Type of animation to apply to the card',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'none'
      },
      {
        id: 'customStyles',
        name: 'Custom Styles',
        description: 'Custom CSS styles for different parts of the card',
        type: DataType.OBJECT,
        direction: 'input',
        defaultValue: {}
      }
    ]
  },
  {
    id: 'state',
    name: 'State Management',
    description: 'Capabilities related to card state',
    connectionPoints: [
      {
        id: 'state',
        name: 'Card State',
        description: 'Current state of the card',
        type: DataType.OBJECT,
        direction: 'bidirectional',
        defaultValue: {}
      }
    ]
  }
];

// Define Card variant and elevation types
type CardVariant = 'default' | 'outlined' | 'elevated' | 'custom';
type CardElevation = 0 | 1 | 2 | 3 | 4 | 5;
type CardAnimation = 'none' | 'fade' | 'slide' | 'grow' | 'custom';

/**
 * Props for the Intelligent Card Component
 */
interface IntelligentCardProps {
  // Component system props
  componentId?: string;
  componentType?: ComponentType;
  sendEvent?: (type: ComponentEventType, connectionId: string, payload: any) => void;
  getConnectionValue?: (connectionId: string) => any;
  connect?: (sourceConnectionId: string, targetComponentId: string, targetConnectionId: string, transform?: (value: any) => any) => any;
  disconnect?: (connectionId: string) => boolean;
  
  // Card specific props
  title?: string;
  subtitle?: string;
  content?: string;
  footer?: string;
  headerImage?: string;
  variant?: CardVariant;
  elevation?: CardElevation;
  animation?: CardAnimation;
  children?: ReactNode;
  className?: string;
  testId?: string;
  onClick?: (e: React.MouseEvent) => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  
  // Extended customization props
  customStyles?: {
    card?: React.CSSProperties;
    header?: React.CSSProperties;
    headerImage?: React.CSSProperties;
    title?: React.CSSProperties;
    subtitle?: React.CSSProperties;
    content?: React.CSSProperties;
    footer?: React.CSSProperties;
  };
  
  // State management props
  initialState?: Record<string, any>;
  onStateChange?: (newState: Record<string, any>) => void;
}

/**
 * Get animation class name based on animation type
 */
const getAnimationClassName = (animation: CardAnimation): string => {
  switch (animation) {
    case 'fade':
      return 'card-fade-in';
    case 'slide':
      return 'card-slide-in';
    case 'grow':
      return 'card-grow-in';
    default:
      return '';
  }
};

/**
 * Get styles based on card variant and elevation
 */
const getCardStyles = (
  variant: CardVariant, 
  elevation: CardElevation,
  animation: CardAnimation,
  customStyles: {
    card?: React.CSSProperties;
    header?: React.CSSProperties;
    headerImage?: React.CSSProperties;
    title?: React.CSSProperties;
    subtitle?: React.CSSProperties;
    content?: React.CSSProperties;
    footer?: React.CSSProperties;
  } = {}
): {
  card: React.CSSProperties;
  header: React.CSSProperties;
  headerImage: React.CSSProperties;
  title: React.CSSProperties;
  subtitle: React.CSSProperties;
  content: React.CSSProperties;
  footer: React.CSSProperties;
} => {
  // Elevation shadow mapping
  const shadowMap = {
    0: 'none',
    1: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
    2: '0 3px 6px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.12)',
    3: '0 10px 20px rgba(0, 0, 0, 0.15), 0 3px 6px rgba(0, 0, 0, 0.10)',
    4: '0 15px 25px rgba(0, 0, 0, 0.15), 0 5px 10px rgba(0, 0, 0, 0.05)',
    5: '0 20px 40px rgba(0, 0, 0, 0.2)'
  };
  
  // Card container styles
  const card: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(.25,.8,.25,1)',
    width: '100%',
    maxWidth: '100%',
    marginBottom: '1rem',
    position: 'relative'
  };
  
  // Apply variant-specific styles
  if (variant === 'outlined') {
    card.border = '1px solid #e2e8f0';
    card.boxShadow = 'none';
  } else if (variant === 'elevated' || variant === 'default') {
    card.boxShadow = shadowMap[elevation];
    card.border = 'none';
  }
  
  // Apply animation-specific styles
  if (animation !== 'none' && animation !== 'custom') {
    card.animationDuration = '0.5s';
    card.animationFillMode = 'forwards';
  }
  
  // Header styles
  const header: React.CSSProperties = {
    padding: '1.25rem 1.5rem 0.75rem',
    borderBottom: variant === 'outlined' ? '1px solid #e2e8f0' : 'none',
    display: 'flex',
    flexDirection: 'column'
  };
  
  // Header image styles
  const headerImage: React.CSSProperties = {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    objectPosition: 'center',
    marginBottom: '0.75rem'
  };
  
  // Title styles
  const title: React.CSSProperties = {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '0.25rem',
    lineHeight: 1.2
  };
  
  // Subtitle styles
  const subtitle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: '#64748b',
    marginBottom: '0.5rem',
    lineHeight: 1.4
  };
  
  // Content styles
  const content: React.CSSProperties = {
    padding: '1.25rem 1.5rem',
    fontSize: '1rem',
    color: '#334155',
    lineHeight: 1.6,
    flexGrow: 1
  };
  
  // Footer styles
  const footer: React.CSSProperties = {
    padding: '0.75rem 1.5rem 1.25rem',
    borderTop: variant === 'outlined' ? '1px solid #e2e8f0' : 'none',
    fontSize: '0.875rem',
    color: '#64748b'
  };
  
  // Apply custom styles if provided
  return {
    card: { ...card, ...customStyles.card },
    header: { ...header, ...customStyles.header },
    headerImage: { ...headerImage, ...customStyles.headerImage },
    title: { ...title, ...customStyles.title },
    subtitle: { ...subtitle, ...customStyles.subtitle },
    content: { ...content, ...customStyles.content },
    footer: { ...footer, ...customStyles.footer }
  };
};

/**
 * Base Card implementation that uses the intelligent component system
 */
const IntelligentCardBase: React.FC<IntelligentCardProps> = ({
  componentId,
  componentType,
  sendEvent,
  getConnectionValue,
  connect,
  disconnect,
  title: propTitle,
  subtitle: propSubtitle,
  content: propContent,
  footer: propFooter,
  headerImage: propHeaderImage,
  variant: propVariant = 'default',
  elevation: propElevation = 1,
  animation: propAnimation = 'none',
  children,
  className,
  testId,
  onClick,
  onMouseEnter,
  onMouseLeave,
  customStyles: propCustomStyles = {},
  initialState = {},
  onStateChange,
  ...rest
}) => {
  // Internal state management
  const [internalState, setInternalState] = useState<Record<string, any>>({
    ...initialState,
    isHovered: false,
    clickCount: 0,
    lastClickTime: null
  });
  
  // Get values from connections if available
  const connectionTitle = getConnectionValue?.('title');
  const connectionSubtitle = getConnectionValue?.('subtitle');
  const connectionContent = getConnectionValue?.('content');
  const connectionFooter = getConnectionValue?.('footer');
  const connectionHeaderImage = getConnectionValue?.('headerImage');
  const connectionVariant = getConnectionValue?.('variant');
  const connectionElevation = getConnectionValue?.('elevation');
  const connectionAnimation = getConnectionValue?.('animation');
  const connectionCustomStyles = getConnectionValue?.('customStyles') || {};
  const connectionState = getConnectionValue?.('state') || {};
  
  // Use connection values or props
  const title = connectionTitle || propTitle;
  const subtitle = connectionSubtitle || propSubtitle;
  const content = connectionContent || propContent;
  const footer = connectionFooter || propFooter;
  const headerImage = connectionHeaderImage || propHeaderImage;
  const variant = (connectionVariant || propVariant) as CardVariant;
  const elevation = (connectionElevation || propElevation) as CardElevation;
  const animation = (connectionAnimation || propAnimation) as CardAnimation;
  const customStyles = { ...propCustomStyles, ...connectionCustomStyles };
  
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
  
  // Handle card click
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Update click count in internal state
    const clickCount = internalState.clickCount + 1;
    const lastClickTime = new Date().toISOString();
    updateState({ clickCount, lastClickTime });
    
    // Send the event through the component system
    if (sendEvent && componentId) {
      sendEvent(ComponentEventType.CLICK, 'click', {
        timestamp: new Date().toISOString(),
        event: e,
        state: { ...internalState, clickCount, lastClickTime }
      });
    }
    
    // Call the prop onClick if provided
    if (onClick) {
      onClick(e);
    }
  }, [componentId, onClick, sendEvent, internalState, updateState]);
  
  // Handle mouse enter
  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    // Update hover state
    updateState({ isHovered: true });
    
    // Send the event through the component system
    if (sendEvent && componentId) {
      sendEvent(ComponentEventType.HOVER, 'hover', {
        hovered: true,
        timestamp: new Date().toISOString(),
        event: e,
        state: { ...internalState, isHovered: true }
      });
    }
    
    // Call the prop onMouseEnter if provided
    if (onMouseEnter) {
      onMouseEnter(e);
    }
  }, [componentId, onMouseEnter, sendEvent, internalState, updateState]);
  
  // Handle mouse leave
  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    // Update hover state
    updateState({ isHovered: false });
    
    // Send the event through the component system
    if (sendEvent && componentId) {
      sendEvent(ComponentEventType.HOVER, 'hover', {
        hovered: false,
        timestamp: new Date().toISOString(),
        event: e,
        state: { ...internalState, isHovered: false }
      });
    }
    
    // Call the prop onMouseLeave if provided
    if (onMouseLeave) {
      onMouseLeave(e);
    }
  }, [componentId, onMouseLeave, sendEvent, internalState, updateState]);
  
  // Generate styles based on props and theme
  const styles = getCardStyles(variant, elevation, animation, customStyles);
  
  return (
    <div
      style={styles.card}
      className={combinedClassName}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid={testId || `card-${componentId}`}
      data-component-id={componentId}
      data-component-type={componentType}
      data-state={JSON.stringify(internalState)}
      {...rest}
    >
      {(title || subtitle || headerImage) && (
        <div style={styles.header}>
          {headerImage && (
            <img
              src={headerImage}
              alt={title || 'Card header image'}
              style={styles.headerImage}
            />
          )}
          {title && <div style={styles.title}>{title}</div>}
          {subtitle && <div style={styles.subtitle}>{subtitle}</div>}
        </div>
      )}
      
      <div style={styles.content}>
        {content || children}
      </div>
      
      {footer && (
        <div style={styles.footer}>
          {footer}
        </div>
      )}
    </div>
  );
};

/**
 * Wrap the base component with the intelligent component HOC
 */
export const IntelligentCard = withIntelligentComponent(
  IntelligentCardBase,
  ComponentType.CARD
);

/**
 * Component definition for the registry
 */
const cardComponentDefinition: ComponentDefinition = {
  meta: {
    type: ComponentType.CARD,
    name: 'Card',
    description: 'Container component with header, content, and footer sections',
    capabilities: cardCapabilities,
    defaultProps: {
      variant: 'default',
      elevation: 1
    }
  },
  initializer: (props) => {
    return {
      id: props.id || uuidv4(),
      type: ComponentType.CARD,
      properties: {
        ...props,
        variant: props.variant || 'default',
        elevation: props.elevation || 1,
        animation: props.animation || 'none',
        customStyles: props.customStyles || {}
      },
      state: {
        isHovered: false,
        clickCount: 0,
        lastClickTime: null,
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
    
    // Handle click with state management
    const handleClick = (e: React.MouseEvent) => {
      // Update the instance state
      if (instance.state) {
        const clickCount = (instance.state.clickCount || 0) + 1;
        const lastClickTime = new Date().toISOString();
        instance.state.clickCount = clickCount;
        instance.state.lastClickTime = lastClickTime;
        
        // Emit to output connection points if available
        if (instance.emit && typeof instance.emit === 'function') {
          instance.emit('click', {
            clickCount,
            lastClickTime,
            componentId,
            state: { ...state, clickCount, lastClickTime }
          });
        }
      }
    };
    
    // Handle hover events
    const handleMouseEnter = (e: React.MouseEvent) => {
      if (instance.state) {
        instance.state.isHovered = true;
        
        // Emit hover event if available
        if (instance.emit && typeof instance.emit === 'function') {
          instance.emit('hover', {
            hovered: true,
            timestamp: new Date().toISOString(),
            componentId,
            state: { ...state, isHovered: true }
          });
        }
      }
    };
    
    const handleMouseLeave = (e: React.MouseEvent) => {
      if (instance.state) {
        instance.state.isHovered = false;
        
        // Emit hover event if available
        if (instance.emit && typeof instance.emit === 'function') {
          instance.emit('hover', {
            hovered: false,
            timestamp: new Date().toISOString(),
            componentId,
            state: { ...state, isHovered: false }
          });
        }
      }
    };
    
    return (
      <IntelligentCard
        componentId={componentId}
        {...properties}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
    );
  }
};

// Register the card component
componentRegistry.registerComponent(cardComponentDefinition);

export default IntelligentCard; 