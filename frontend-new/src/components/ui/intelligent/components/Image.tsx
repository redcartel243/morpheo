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
 * Define Image capabilities
 */
const imageCapabilities: ComponentCapability[] = [
  {
    id: 'interaction',
    name: 'User Interaction',
    description: 'Capabilities related to user interactions with the image',
    connectionPoints: [
      {
        id: 'click',
        name: 'Click Event',
        description: 'Triggered when the image is clicked',
        type: DataType.OBJECT,
        direction: 'output'
      }
    ]
  },
  {
    id: 'data',
    name: 'Image Data',
    description: 'Capabilities related to the image data',
    connectionPoints: [
      {
        id: 'src',
        name: 'Image Source',
        description: 'URL of the image to display',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: ''
      },
      {
        id: 'alt',
        name: 'Alternative Text',
        description: 'Alternative text for the image for accessibility',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: ''
      }
    ]
  },
  {
    id: 'display',
    name: 'Display Properties',
    description: 'Capabilities related to the image appearance',
    connectionPoints: [
      {
        id: 'objectFit',
        name: 'Object Fit',
        description: 'How the image should be resized to fit its container',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'cover'
      },
      {
        id: 'loading',
        name: 'Loading Strategy',
        description: 'Loading strategy for the image (eager or lazy)',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'lazy'
      }
    ]
  }
];

// Define Object Fit and Loading types
type ObjectFit = 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';
type Loading = 'eager' | 'lazy';

/**
 * Props for the Intelligent Image Component
 */
interface IntelligentImageProps {
  // Component system props
  componentId?: string;
  componentType?: ComponentType;
  sendEvent?: (type: ComponentEventType, connectionId: string, payload: any) => void;
  getConnectionValue?: (connectionId: string) => any;
  connect?: (sourceConnectionId: string, targetComponentId: string, targetConnectionId: string, transform?: (value: any) => any) => any;
  disconnect?: (connectionId: string) => boolean;
  
  // Image specific props
  src?: string;
  alt?: string;
  objectFit?: ObjectFit;
  loading?: Loading;
  className?: string;
  testId?: string;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

/**
 * Base Image implementation that uses the intelligent component system
 */
const IntelligentImageBase: React.FC<IntelligentImageProps> = ({
  componentId,
  componentType,
  sendEvent,
  getConnectionValue,
  connect,
  disconnect,
  src: propSrc = '',
  alt: propAlt = '',
  objectFit: propObjectFit = 'cover',
  loading: propLoading = 'lazy',
  className,
  testId,
  onClick,
  style,
  ...rest
}) => {
  // Get values from connections if available
  const connectionSrc = getConnectionValue?.('src');
  const connectionAlt = getConnectionValue?.('alt');
  const connectionObjectFit = getConnectionValue?.('objectFit');
  const connectionLoading = getConnectionValue?.('loading');
  
  // Use connection values or props
  const src = connectionSrc || propSrc || '';
  const alt = connectionAlt || propAlt || '';
  const objectFit = (connectionObjectFit || propObjectFit || 'cover') as ObjectFit;
  const loading = (connectionLoading || propLoading || 'lazy') as Loading;
  
  // Track loading state
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  
  // Handle image click
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
  
  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };
  
  // Handle image error
  const handleError = () => {
    setIsLoaded(true);
    setHasError(true);
  };
  
  // Calculate image styles
  const imageStyles: React.CSSProperties = {
    objectFit,
    width: '100%',
    height: '100%',
    display: 'block',
    opacity: isLoaded ? 1 : 0,
    transition: 'opacity 0.3s ease-in-out',
    ...style
  };
  
  // Container styles for wrapper
  const containerStyles: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: '50px',
    backgroundColor: '#f1f5f9',
    overflow: 'hidden'
  };
  
  // Loading placeholder styles
  const placeholderStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: isLoaded ? 'none' : 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    color: '#94a3b8',
    fontSize: '0.875rem'
  };
  
  // Error placeholder styles
  const errorStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: hasError ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    color: '#ef4444',
    fontSize: '0.875rem',
    padding: '1rem'
  };
  
  return (
    <div style={containerStyles} className={className} data-testid={testId}>
      {src ? (
        <>
          <img
            src={src}
            alt={alt}
            style={imageStyles}
            onClick={handleClick}
            onLoad={handleLoad}
            onError={handleError}
            loading={loading}
          />
          <div style={placeholderStyles}>Loading...</div>
          <div style={errorStyles}>
            Failed to load image
          </div>
        </>
      ) : (
        <div style={placeholderStyles}>No image source provided</div>
      )}
    </div>
  );
};

/**
 * Component definition for the component registry
 */
const imageComponentDefinition: ComponentDefinition = {
  meta: {
    type: ComponentType.IMAGE,
    name: 'Image',
    description: 'A component for displaying images with various loading strategies',
    capabilities: imageCapabilities,
    defaultProps: {
      src: '',
      alt: '',
      objectFit: 'cover',
      loading: 'lazy'
    }
  },
  initializer: (props: Record<string, any>) => ({
    id: props.id || `image-${uuidv4()}`,
    type: ComponentType.IMAGE,
    properties: {
      src: props.src || '',
      alt: props.alt || '',
      objectFit: props.objectFit || 'cover',
      loading: props.loading || 'lazy'
    }
  }),
  renderer: (instance) => {
    // The actual renderer is provided by the withIntelligentComponent HOC
    return null;
  }
};

// Register component with the registry
componentRegistry.registerComponent(imageComponentDefinition);

// Export the component wrapped with the intelligent component system
export const IntelligentImage = withIntelligentComponent<IntelligentImageProps>(
  IntelligentImageBase,
  ComponentType.IMAGE
);

// Export base component for testing purposes
export { IntelligentImageBase }; 