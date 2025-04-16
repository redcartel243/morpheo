import React, { useState, useEffect, useCallback } from 'react';
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
import './Image.css'; // Import the CSS file with animations

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
      },
      {
        id: 'hover',
        name: 'Hover Event',
        description: 'Triggered when the mouse enters or leaves the image',
        type: DataType.OBJECT,
        direction: 'output'
      },
      {
        id: 'load',
        name: 'Load Event',
        description: 'Triggered when the image is loaded',
        type: DataType.OBJECT,
        direction: 'output'
      },
      {
        id: 'error',
        name: 'Error Event',
        description: 'Triggered when the image fails to load',
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
      },
      {
        id: 'caption',
        name: 'Image Caption',
        description: 'Caption text to display below the image',
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
      },
      {
        id: 'animation',
        name: 'Animation Type',
        description: 'Type of animation to apply to the image',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'none'
      },
      {
        id: 'filter',
        name: 'Image Filter',
        description: 'CSS filter to apply to the image',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'none'
      },
      {
        id: 'shape',
        name: 'Image Shape',
        description: 'Shape/border radius of the image',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'rectangle'
      },
      {
        id: 'frame',
        name: 'Image Frame',
        description: 'Apply a decorative frame to the image',
        type: DataType.BOOLEAN,
        direction: 'input',
        defaultValue: false
      }
    ]
  },
  {
    id: 'effect',
    name: 'Dynamic Effects',
    description: 'Capabilities related to dynamic image effects',
    connectionPoints: [
      {
        id: 'hoverEffect',
        name: 'Hover Effect',
        description: 'Effect to apply when hovering over the image',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'none'
      },
      {
        id: 'transform',
        name: 'Transform Style',
        description: 'CSS transform to apply to the image',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: ''
      },
      {
        id: 'transition',
        name: 'Transition Style',
        description: 'CSS transition style for the image',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'all 0.3s ease'
      }
    ]
  },
  {
    id: 'state',
    name: 'State Management',
    description: 'Capabilities related to image state',
    connectionPoints: [
      {
        id: 'state',
        name: 'Image State',
        description: 'Current state of the image',
        type: DataType.OBJECT,
        direction: 'bidirectional',
        defaultValue: {
          isLoaded: false,
          hasError: false,
          isHovered: false
        }
      }
    ]
  }
];

// Define Object Fit and Loading types
type ObjectFit = 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';
type Loading = 'eager' | 'lazy';
type ImageAnimation = 'none' | 'fade-in' | 'zoom-in' | 'slide-in' | 'custom';
type ImageFilter = 'none' | 'grayscale' | 'sepia' | 'blur' | 'custom';
type ImageShape = 'rectangle' | 'rounded-sm' | 'rounded-md' | 'rounded-lg' | 'circle' | 'custom';
type HoverEffect = 'none' | 'zoom' | 'contrast' | 'tilt' | 'border' | 'custom';

// Interface for image state
interface ImageState {
  isLoaded: boolean;
  hasError: boolean;
  isHovered: boolean;
  [key: string]: any;
}

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
  caption?: string;
  objectFit?: ObjectFit;
  loading?: Loading;
  className?: string;
  testId?: string;
  onClick?: (e: React.MouseEvent) => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  onLoad?: () => void;
  onError?: () => void;
  
  // Enhanced props
  animation?: ImageAnimation;
  filter?: ImageFilter;
  shape?: ImageShape;
  frame?: boolean;
  hoverEffect?: HoverEffect;
  transform?: string;
  transition?: string;
  
  // Custom styles
  style?: React.CSSProperties;
  captionStyle?: React.CSSProperties;
  containerStyle?: React.CSSProperties;
  
  // State management props
  initialState?: Partial<ImageState>;
  onStateChange?: (newState: ImageState) => void;
}

/**
 * Get animation class name based on animation type
 */
const getAnimationClassName = (animation: ImageAnimation): string => {
  switch (animation) {
    case 'fade-in':
      return 'image-fade-in';
    default:
      return '';
  }
};

/**
 * Get filter class name based on filter type
 */
const getFilterClassName = (filter: ImageFilter): string => {
  switch (filter) {
    case 'grayscale':
      return 'image-grayscale';
    case 'sepia':
      return 'image-sepia';
    case 'blur':
      return 'image-blur';
    default:
      return '';
  }
};

/**
 * Get shape class name based on shape type
 */
const getShapeClassName = (shape: ImageShape): string => {
  switch (shape) {
    case 'rounded-sm':
      return 'image-rounded-sm';
    case 'rounded-md':
      return 'image-rounded-md';
    case 'rounded-lg':
      return 'image-rounded-lg';
    case 'circle':
      return 'image-rounded-full';
    default:
      return '';
  }
};

/**
 * Get hover effect class name based on effect type
 */
const getHoverEffectClassName = (effect: HoverEffect): string => {
  switch (effect) {
    case 'zoom':
      return 'image-zoom-hover';
    case 'contrast':
      return 'image-contrast-hover';
    case 'tilt':
      return 'image-tilt-hover';
    case 'border':
      return 'image-border-hover';
    default:
      return '';
  }
};

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
  caption: propCaption = '',
  objectFit: propObjectFit = 'cover',
  loading: propLoading = 'lazy',
  className,
  testId,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onLoad,
  onError,
  animation: propAnimation = 'none',
  filter: propFilter = 'none',
  shape: propShape = 'rectangle',
  frame: propFrame = false,
  hoverEffect: propHoverEffect = 'none',
  transform: propTransform = '',
  transition: propTransition = 'all 0.3s ease',
  style,
  captionStyle,
  containerStyle,
  initialState = {},
  onStateChange,
  ...rest
}) => {
  // Get values from connections if available
  const connectionSrc = getConnectionValue?.('src');
  const connectionAlt = getConnectionValue?.('alt');
  const connectionCaption = getConnectionValue?.('caption');
  const connectionObjectFit = getConnectionValue?.('objectFit');
  const connectionLoading = getConnectionValue?.('loading');
  const connectionAnimation = getConnectionValue?.('animation');
  const connectionFilter = getConnectionValue?.('filter');
  const connectionShape = getConnectionValue?.('shape');
  const connectionFrame = getConnectionValue?.('frame');
  const connectionHoverEffect = getConnectionValue?.('hoverEffect');
  const connectionTransform = getConnectionValue?.('transform');
  const connectionTransition = getConnectionValue?.('transition');
  const connectionState = getConnectionValue?.('state');
  
  // Use connection values or props
  const src = connectionSrc || propSrc || '';
  const alt = connectionAlt || propAlt || '';
  const caption = connectionCaption || propCaption || '';
  const objectFit = (connectionObjectFit || propObjectFit || 'cover') as ObjectFit;
  const loading = (connectionLoading || propLoading || 'lazy') as Loading;
  const animation = (connectionAnimation || propAnimation || 'none') as ImageAnimation;
  const filter = (connectionFilter || propFilter || 'none') as ImageFilter;
  const shape = (connectionShape || propShape || 'rectangle') as ImageShape;
  const frame = connectionFrame !== undefined ? connectionFrame : propFrame;
  const hoverEffect = (connectionHoverEffect || propHoverEffect || 'none') as HoverEffect;
  const transform = connectionTransform || propTransform || '';
  const transition = connectionTransition || propTransition || 'all 0.3s ease';
  
  // Initialize state from props/connections with defaults
  const [state, setState] = useState<ImageState>({
    isLoaded: false,
    hasError: false,
    isHovered: false,
    ...initialState,
    ...(connectionState || {})
  });
  
  // Update state function
  const updateState = useCallback((updates: Partial<ImageState>) => {
    setState(prevState => {
      const newState = { ...prevState, ...updates };
      
      // Emit state change event
      if (sendEvent && componentId) {
        sendEvent(ComponentEventType.STATE_CHANGE, 'state', newState);
      }
      
      // Call onStateChange callback if provided
      if (onStateChange) {
        onStateChange(newState);
      }
      
      return newState;
    });
  }, [componentId, sendEvent, onStateChange]);
  
  // Handle image click
  const handleClick = useCallback((e: React.MouseEvent) => {
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
  }, [componentId, sendEvent, onClick]);
  
  // Handle image load
  const handleLoad = useCallback(() => {
    updateState({ isLoaded: true, hasError: false });
    
    // Send the event through the component system
    if (sendEvent && componentId) {
      sendEvent(ComponentEventType.CUSTOM, 'load', {
        timestamp: new Date().toISOString(),
        success: true
      });
    }
    
    // Call the prop onLoad if provided
    if (onLoad) {
      onLoad();
    }
  }, [componentId, sendEvent, onLoad, updateState]);
  
  // Handle image error
  const handleError = useCallback(() => {
    updateState({ isLoaded: true, hasError: true });
    
    // Send the event through the component system
    if (sendEvent && componentId) {
      sendEvent(ComponentEventType.CUSTOM, 'error', {
        timestamp: new Date().toISOString(),
        success: false
      });
    }
    
    // Call the prop onError if provided
    if (onError) {
      onError();
    }
  }, [componentId, sendEvent, onError, updateState]);
  
  // Handle mouse enter
  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    updateState({ isHovered: true });
    
    // Send the event through the component system
    if (sendEvent && componentId) {
      sendEvent(ComponentEventType.CUSTOM, 'hover', {
        timestamp: new Date().toISOString(),
        type: 'enter',
        event: e
      });
    }
    
    // Call the prop onMouseEnter if provided
    if (onMouseEnter) {
      onMouseEnter(e);
    }
  }, [componentId, sendEvent, onMouseEnter, updateState]);
  
  // Handle mouse leave
  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    updateState({ isHovered: false });
    
    // Send the event through the component system
    if (sendEvent && componentId) {
      sendEvent(ComponentEventType.CUSTOM, 'hover', {
        timestamp: new Date().toISOString(),
        type: 'leave',
        event: e
      });
    }
    
    // Call the prop onMouseLeave if provided
    if (onMouseLeave) {
      onMouseLeave(e);
    }
  }, [componentId, sendEvent, onMouseLeave, updateState]);
  
  // Calculate image styles
  const imageStyles: React.CSSProperties = {
    objectFit,
    width: '100%',
    height: '100%',
    display: 'block',
    opacity: state.isLoaded ? 1 : 0,
    transition: transition,
    transform,
    ...style
  };
  
  // Container styles for wrapper
  const containerStyles: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: '50px',
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
    ...containerStyle
  };
  
  // Loading placeholder styles
  const placeholderStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: state.isLoaded ? 'none' : 'flex',
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
    display: state.hasError ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    color: '#ef4444',
    fontSize: '0.875rem',
    padding: '1rem'
  };
  
  // Caption styles
  const defaultCaptionStyles: React.CSSProperties = {
    padding: '0.5rem',
    fontSize: '0.875rem',
    color: '#4b5563',
    textAlign: 'center',
    ...captionStyle
  };
  
  // Combine all the class names
  const animationClass = getAnimationClassName(animation);
  const filterClass = getFilterClassName(filter);
  const shapeClass = getShapeClassName(shape);
  const hoverEffectClass = getHoverEffectClassName(hoverEffect);
  const frameClass = frame ? 'image-frame' : '';
  const loadingClass = !state.isLoaded ? 'image-loading-pulse' : '';
  
  const combinedClassName = [
    className,
    animationClass,
    filterClass,
    shapeClass,
    hoverEffectClass,
    frameClass,
    loadingClass
  ].filter(Boolean).join(' ');
  
  return (
    <div className="image-component" style={{ width: '100%' }}>
      <div 
        style={containerStyles} 
        className={combinedClassName} 
        data-testid={testId}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
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
      {caption && (
        <div style={defaultCaptionStyles}>
          {caption}
        </div>
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
    description: 'An intelligent image component that can be customized and connected to other components',
    capabilities: imageCapabilities
  },
  initializer: (props: Record<string, any>) => ({
    id: props.id || uuidv4(),
    type: ComponentType.IMAGE,
    properties: {
      src: props.src || '',
      alt: props.alt || 'Image',
      objectFit: props.objectFit || 'cover',
      loading: props.loading || 'lazy'
    }
  }),
  renderer: () => null // The actual rendering is handled by the HOC
};

// Register the component
componentRegistry.registerComponent(imageComponentDefinition);

// Create the enhanced component with the intelligent component wrapper
const IntelligentImage = withIntelligentComponent<IntelligentImageProps>(
  IntelligentImageBase,
  ComponentType.IMAGE
);

export { IntelligentImage };
export default IntelligentImage; 