import React, { ReactNode } from 'react';
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
      }
    ]
  }
];

// Define Card variant and elevation types
type CardVariant = 'default' | 'outlined' | 'elevated';
type CardElevation = 0 | 1 | 2 | 3 | 4 | 5;

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
  children?: ReactNode;
  className?: string;
  testId?: string;
  onClick?: (e: React.MouseEvent) => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
}

/**
 * Get styles based on card variant and elevation
 */
const getCardStyles = (
  variant: CardVariant, 
  elevation: CardElevation
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
    height: 'auto',
    maxHeight: '200px',
    objectFit: 'cover',
    marginBottom: '0.5rem'
  };
  
  // Title styles
  const title: React.CSSProperties = {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '0.25rem',
    fontFamily: 'sans-serif'
  };
  
  // Subtitle styles
  const subtitle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: '#64748b',
    marginBottom: '0.5rem',
    fontFamily: 'sans-serif'
  };
  
  // Content styles
  const content: React.CSSProperties = {
    padding: '1rem 1.5rem',
    color: '#334155',
    fontSize: '1rem',
    lineHeight: 1.5,
    fontFamily: 'sans-serif',
    flex: 1
  };
  
  // Footer styles
  const footer: React.CSSProperties = {
    padding: '0.75rem 1.5rem 1.25rem',
    borderTop: variant === 'outlined' ? '1px solid #e2e8f0' : 'none',
    color: '#64748b',
    fontSize: '0.875rem',
    fontFamily: 'sans-serif'
  };
  
  return { card, header, headerImage, title, subtitle, content, footer };
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
  children,
  className,
  testId,
  onClick,
  onMouseEnter,
  onMouseLeave,
  ...rest
}) => {
  // Get values from connections if available
  const connectionTitle = getConnectionValue?.('title');
  const connectionSubtitle = getConnectionValue?.('subtitle');
  const connectionContent = getConnectionValue?.('content');
  const connectionFooter = getConnectionValue?.('footer');
  const connectionHeaderImage = getConnectionValue?.('headerImage');
  const connectionVariant = getConnectionValue?.('variant');
  const connectionElevation = getConnectionValue?.('elevation');
  
  // Use connection values or props
  const title = connectionTitle || propTitle || '';
  const subtitle = connectionSubtitle || propSubtitle || '';
  const content = connectionContent || propContent || '';
  const footer = connectionFooter || propFooter || '';
  const headerImage = connectionHeaderImage || propHeaderImage || '';
  const variant = (connectionVariant || propVariant || 'default') as CardVariant;
  const elevation = (connectionElevation || propElevation || 1) as CardElevation;
  
  // Get styles for the component
  const styles = getCardStyles(variant, elevation);
  
  // Handle card click
  const handleClick = (e: React.MouseEvent) => {
    // Send the event through the component system
    if (sendEvent && componentId) {
      sendEvent(ComponentEventType.CLICK, 'click', {
        timestamp: new Date().toISOString(),
        event: e
      });
    }
    
    // Call the prop onClick if provided
    if (onClick) {
      onClick(e);
    }
  };
  
  // Handle mouse enter
  const handleMouseEnter = (e: React.MouseEvent) => {
    // Send the event through the component system
    if (sendEvent && componentId) {
      sendEvent(ComponentEventType.HOVER, 'hover', {
        type: 'enter',
        timestamp: new Date().toISOString(),
        event: e
      });
    }
    
    // Call the prop onMouseEnter if provided
    if (onMouseEnter) {
      onMouseEnter(e);
    }
  };
  
  // Handle mouse leave
  const handleMouseLeave = (e: React.MouseEvent) => {
    // Send the event through the component system
    if (sendEvent && componentId) {
      sendEvent(ComponentEventType.HOVER, 'hover', {
        type: 'leave',
        timestamp: new Date().toISOString(),
        event: e
      });
    }
    
    // Call the prop onMouseLeave if provided
    if (onMouseLeave) {
      onMouseLeave(e);
    }
  };
  
  return (
    <div 
      style={styles.card} 
      className={className}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid={testId}
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
        {content && <div>{content}</div>}
        {children}
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
 * Component definition for the component registry
 */
const cardComponentDefinition: ComponentDefinition = {
  meta: {
    type: ComponentType.CARD,
    name: 'Card',
    description: 'A container component for organizing related content and actions',
    capabilities: cardCapabilities,
    defaultProps: {
      variant: 'default',
      elevation: 1
    }
  },
  initializer: (props: Record<string, any>) => ({
    id: props.id || `card-${uuidv4()}`,
    type: ComponentType.CARD,
    properties: {
      title: props.title || '',
      subtitle: props.subtitle || '',
      content: props.content || '',
      footer: props.footer || '',
      headerImage: props.headerImage || '',
      variant: props.variant || 'default',
      elevation: props.elevation || 1
    }
  }),
  renderer: (instance) => {
    // The actual renderer is provided by the withIntelligentComponent HOC
    return null;
  }
};

// Register component with the registry
componentRegistry.registerComponent(cardComponentDefinition);

// Export the component wrapped with the intelligent component system
export const IntelligentCard = withIntelligentComponent<IntelligentCardProps>(
  IntelligentCardBase,
  ComponentType.CARD
);

// Export base component for testing purposes
export { IntelligentCardBase }; 