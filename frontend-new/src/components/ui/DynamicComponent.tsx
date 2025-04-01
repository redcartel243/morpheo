import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import TextInput from './components/basic/TextInput';
import { Chart, DataTable, Map } from './components/visualization';
import type { ChartProps, DataTableProps, MapProps } from './components/visualization';

// Define global window type to include appState
declare global {
  interface Window {
    appState?: any;
    textInputTimeouts?: Record<string, NodeJS.Timeout>;
    $morpheo?: Record<string, any>;
    $m?: (selector: string) => any;
  }
}

/**
 * DynamicComponent is a generic component that can render any type of UI component
 * based on a JSON configuration. It supports various component types like buttons,
 * inputs, containers, etc., and handles events through custom event handlers.
 * 
 * The component is designed to be completely generic and not tied to any specific
 * application type. All application-specific logic should be implemented in the event 
 * handlers provided through the eventHandlers prop.
 */
interface DynamicComponentProps {
  component: ComponentChild;
  functionality?: {
    type: string;
    config: Record<string, any>;
  };
  eventHandlers?: {
    stateReducer?: string;
    handleEvent?: (event: ComponentEvent) => void;
    [key: string]: any;
  };
  onUpdate?: (state: any) => void;
  config?: any; // Add this to support grid container functionality
}

// Event interface
interface ComponentEvent {
  type: string;
  payload: {
    componentId: string;
    source: string;
    data?: any;
    timestamp: number;
  };
}

// First, let's define the component child type at the top of the file
interface ComponentChild {
  id?: string;
  type?: string;
  props?: Record<string, any>;
  properties?: Record<string, any>;
  children?: (ComponentChild | string)[] | undefined;
  styles?: Record<string, any>;
  events?: Record<string, any>;
  region?: string;
  methods?: Record<string, any>;
}

// Extend the component type mapping function to handle app-specific components
const mapComponentType = (type: string): string => {
  // Normalize component type to prevent inconsistencies
  const normalizedType = type.toLowerCase();
  
  // Map component types to standardized names
  switch (normalizedType) {
    // Container types
    case 'container':
    case 'div':
    case 'box':
      return 'div';
    
    // Text types
    case 'text':
    case 'heading':
    case 'title':
    case 'paragraph':
    case 'p':
      return 'text';
    
    // Input types
    case 'text-input':
    case 'textinput':
    case 'input':
      return 'text-input';
    
    case 'button':
    case 'btn':
      return 'button';
    
    case 'checkbox':
    case 'check':
      return 'checkbox';
    
    // Layout types
    case 'card':
    case 'panel':
    case 'paper':
      return 'card';
    
    case 'list':
    case 'ul':
    case 'itemlist':
      return 'list';
    
    case 'image':
    case 'img':
    case 'picture':
      return 'image';
    
    // Default to the original type
    default:
      return normalizedType;
  }
};

// Generic component structure processor
const processComponentStructure = (component: ComponentChild | null): ComponentChild | null => {
  if (!component) return component;
  
  // Create a shallow copy of the component to avoid mutating the original
  const processedComponent: ComponentChild = {
    ...component,
    type: mapComponentType(component.type || 'container')
  };
  
  // Handle nested children
  if (Array.isArray(processedComponent.children)) {
    processedComponent.children = processedComponent.children.map((child: ComponentChild | string) => {
      if (typeof child === 'string') return child;
      return processComponentStructure(child) || child;
    });
  }
  
  return processedComponent;
}

const DynamicComponent: React.FC<DynamicComponentProps> = ({ component, functionality, eventHandlers, onUpdate, config }) => {
  // Process the component to ensure it follows the expected structure
  const processedComponent = useMemo(() => {
    return processComponentStructure(component);
  }, [component]);
  
  // Create a safe component with defaults for all required properties
  const safeComponent = {
    type: mapComponentType(processedComponent?.type || 'container'),
    id: processedComponent?.id || `component-${Math.random().toString(36).substr(2, 9)}`,
    props: processedComponent?.props || {},
    children: processedComponent?.children || [],
    styles: processedComponent?.styles || {},
    events: processedComponent?.events || {},
    methods: processedComponent?.methods || {}
  };
  
  // Local state for component
  const [componentState, setComponentState] = useState<Record<string, any>>({});
  
  // Initialize component state based on props and functionality
  const initialState = useMemo(() => {
    // Start with basic state properties
    const state: Record<string, any> = {
      value: safeComponent.props.value || '',
      checked: safeComponent.props.checked || false,
      showModal: false,
      isModalOpen: false
    };
    
    // Add any custom state properties from component props
    if (safeComponent.props.initialState && typeof safeComponent.props.initialState === 'object') {
      Object.assign(state, safeComponent.props.initialState);
    }
    
    // Add any functionality-specific state properties from the functionality config
    if (functionality?.config && typeof functionality.config === 'object') {
      Object.assign(state, functionality.config);
    }
    
    return state;
  }, [safeComponent.props, functionality]);

  // Event stream for the component
  const [events, setEvents] = useState<ComponentEvent[]>([]);

  // First, update the component method executor
  const executeComponentMethod = useCallback((methodName: string, methodCode: string, event: any) => {
    console.log(`Executing component method ${methodName} for ${safeComponent.id}`);
    
    try {
      // Create DOM manipulation utility
      const $m = (selector: string) => {
        if (!selector) return null;
        const targetId = selector.startsWith('#') ? selector.substring(1) : selector;
        
        return {
          // Get element
          element: () => document.getElementById(targetId),
          
          // Property getters and setters
          getProperty: (propName: string) => {
            const target = document.getElementById(targetId);
            if (!target) return null;
            
            if (propName === 'content' || propName === 'text') {
              return target.textContent;
            } else if (propName === 'value') {
              return (target as HTMLInputElement).value;
            } else if (propName === 'checked') {
              return (target as HTMLInputElement).checked;
            } else {
              return target.getAttribute(propName);
            }
          },
          
          setProperty: (propName: string, value: any) => {
            const target = document.getElementById(targetId);
            if (!target) return null;
            
            if (propName === 'content' || propName === 'text') {
              target.textContent = value;
            } else if (propName === 'value') {
              (target as HTMLInputElement).value = value;
            } else if (propName === 'checked') {
              (target as HTMLInputElement).checked = value;
            } else {
              target.setAttribute(propName, value);
            }
            
            // Dispatch change event for inputs
            if ((propName === 'value' || propName === 'checked') && 
                (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
              target.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            return value;
          },
          
          // Style manipulation
          setStyle: (styleName: string, value: string) => {
            const target = document.getElementById(targetId);
            if (!target) return null;
            
            target.style[styleName as any] = value;
            return value;
          },
          
          // Add/remove classes
          addClass: (className: string) => {
            const target = document.getElementById(targetId);
            if (!target) return null;
            
            target.classList.add(className);
            return true;
          },
          
          removeClass: (className: string) => {
            const target = document.getElementById(targetId);
            if (!target) return null;
            
            target.classList.remove(className);
            return true;
          },
          
          // Animation helper
          animate: (keyframes: Keyframe[] | PropertyIndexedKeyframes, options?: KeyframeAnimationOptions) => {
            const target = document.getElementById(targetId);
            if (!target) return null;
            
            return target.animate(keyframes, options);
          },
          
          // Show/hide helpers
          show: () => {
            const target = document.getElementById(targetId);
            if (!target) return null;
            
            target.style.display = '';
            return true;
          },
          
          hide: () => {
            const target = document.getElementById(targetId);
            if (!target) return null;
            
            target.style.display = 'none';
            return true;
          },
          
          // Event dispatching
          emit: (eventName: string, detail?: any) => {
            const target = document.getElementById(targetId);
            if (!target) return null;
            
            target.dispatchEvent(new CustomEvent(eventName, { 
              bubbles: true, 
              detail 
            }));
            return true;
          }
        };
      };
      
      // Create a function from the method code
      const methodFunction = new Function('event', '$m',
        `"use strict";
        try {
          ${typeof methodCode === 'string' && methodCode.trim().startsWith('function') 
            ? `return (${methodCode})(event, $m);` 
            : methodCode}
          } catch (error) {
          console.error('Error executing component method:', error);
          return false;
          }`
        );
      
      // Execute the method with DOM manipulation utilities
      return methodFunction(event, $m);
      } catch (error) {
      console.error(`Error executing method ${methodName} for ${safeComponent.id}:`, error);
      return false;
    }
  }, [safeComponent.id]);

  // Handle events from components
  const handleEvent = useCallback((eventType: string, event: any) => {
    if (!eventType) {
      console.error('No event type provided');
      return;
    }

    console.log(`Event '${eventType}' triggered on ${safeComponent.id}`, event);

    // Get the component's methods from props
    const componentMethods = safeComponent.props?.methods || {};

    // Try both naming conventions (with and without 'on' prefix)
    const methodName = eventType.toLowerCase().startsWith('on') ? 
      eventType.toLowerCase() : 
      'on' + eventType.charAt(0).toUpperCase() + eventType.slice(1);

    // Get the method - try both the original and transformed method names
    const method = componentMethods[methodName] || componentMethods[eventType];

    if (method) {
      console.log(`Executing method ${methodName} for ${safeComponent.id}`);
      
      try {
        // Get the method code
        const methodCode = typeof method === 'string' ? method : method.code;
        
        // Execute the method
        executeComponentMethod(methodName, methodCode, event);
        
        // If this method affects other components, notify them
        if (method.affectedComponents) {
          method.affectedComponents.forEach((targetId: string) => {
            if (!targetId) return;
            const cleanTargetId = targetId.startsWith('#') ? targetId.substring(1) : targetId;
            const target = document.getElementById(cleanTargetId);
            if (target) {
              target.dispatchEvent(new CustomEvent('componentUpdate', {
                detail: { sourceId: safeComponent.id, eventType }
              }));
            }
          });
        }
      } catch (err) {
        console.error('Error executing component method:', err);
      }
    } else {
      console.log(`No method found for event ${eventType} on component ${safeComponent.id}`);
    }
  }, [safeComponent, executeComponentMethod]);

  // Remove the state reducer code since we're using direct component methods
  const currentState = initialState;

  // Refs for specific component types
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize refs when needed
  useEffect(() => {
    // Handle canvas initialization
    if (safeComponent.type === 'canvas' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Set initial canvas state based on props or defaults
        const backgroundColor = safeComponent.props.backgroundColor || '#ffffff';
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add a canvas initialization event
        const initEvent: ComponentEvent = {
          type: 'canvas.initialize',
          payload: {
            componentId: safeComponent.id,
            source: safeComponent.type,
            data: { context: ctx },
            timestamp: Date.now()
          }
        };
        
        // Add to event stream
        setEvents(prevEvents => [...prevEvents, initEvent]);
      }
    }
  }, [safeComponent.type, safeComponent.props.backgroundColor, safeComponent.id]);

  // Helper function to extract display value from a component - generic for any component type
  const getComponentDisplayValue = (component: any): string => {
    // Check for value in props
    if (component.props.value !== undefined && component.props.value !== null) {
      return String(component.props.value);
    }
    
    // Check for text in props
    if (component.props.text) {
      return component.props.text;
    }
    
    // Check for label in props
    if (component.props.label) {
      return component.props.label;
    }
    
    // Check for content in props
    if (component.props.content) {
      return component.props.content;
    }
    
    // Check for children as string
    if (typeof component.children === 'string') {
      return component.children;
    }
    
    // Check for children array
    if (Array.isArray(component.children) && component.children.length > 0) {
      const firstChild = component.children[0];
      
      // If first child is a string
      if (typeof firstChild === 'string') {
        return firstChild;
      }
      
      // If first child is an object with text prop
      if (firstChild && typeof firstChild === 'object') {
        if (firstChild.props && firstChild.props.text) {
          return firstChild.props.text;
        }
        
        if (firstChild.props && firstChild.props.children && typeof firstChild.props.children === 'string') {
          return firstChild.props.children;
        }
      }
    }
    
    // Check for children in props
    if (component.props.children) {
      if (typeof component.props.children === 'string') {
        return component.props.children;
      }
      
      if (Array.isArray(component.props.children) && component.props.children.length > 0) {
        const firstChild = component.props.children[0];
        if (typeof firstChild === 'string') {
          return firstChild;
        }
      }
    }
    
    // Default fallback
    return '';
  };

  // Apply styling based on component type - generic styles for any component type
  const getStyle = () => {
    // Always prioritize component styles over default styles
    const componentStyles = component.styles || {};
    
    // Default styles based on component type
    let defaultStyles: React.CSSProperties = {};
    
    switch (safeComponent.type) {
      case 'container':
      case 'div':
        defaultStyles = {
          padding: '16px',
          margin: '8px 0',
          borderRadius: '4px',
        };
        break;
      case 'button':
        defaultStyles = {
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
        };
        break;
      case 'input':
        defaultStyles = {
          padding: '8px 12px',
          borderRadius: '4px',
          border: '1px solid #d1d5db',
          width: '100%',
        };
        break;
      case 'text':
        defaultStyles = {
          margin: '8px 0',
        };
        break;
      default:
        defaultStyles = {};
        break;
    }
    
    // Merge styles, with component styles taking precedence
    return { ...defaultStyles, ...componentStyles };
  };

  // Notify parent of state changes
  useEffect(() => {
    if (onUpdate) {
      onUpdate(currentState);
    }
  }, [currentState, onUpdate]);

  // Function to get property values from the component
  const getPropertyValue = (prop: string, defaultValue: any = undefined) => {
    // If the component doesn't have props, return the default value
    if (!component.props && !component.properties) {
      return defaultValue;
    }
    
    // Try to get from props or properties (for compatibility)
    const props = component.props || component.properties || {};
    return props[prop] !== undefined ? props[prop] : defaultValue;
  };

  // Function to render children
  const renderChildren = () => {
    if (!component.children) return null;
    
    return component.children.map((child, index) => {
      if (typeof child === 'string') {
        return <span key={index}>{child}</span>;
      }
      return (
        <DynamicComponent
          key={`${component.id || 'child'}-${index}`}
          component={child}
          functionality={functionality}
          eventHandlers={eventHandlers}
          onUpdate={onUpdate}
          config={config}
        />
      );
    });
  };

  // Define the button click handler function
  const handleButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // Log the click for debugging
    console.log(`Button clicked: ${safeComponent.id}`);
    
    // Call the direct event handler
    handleEvent('click', event);
  };

  /**
   * Renders a component based on its type.
   * This function is completely generic and can render any type of component
   * without being tied to specific application logic.
   */
  const renderComponent = () => {
    // Apply all styles from the component styles object
    const componentStyles = {
            ...getStyle(),
      // Add a default style to ensure the component is visible
      boxSizing: 'border-box',
    } as React.CSSProperties;

    // Handle different component types
    switch (safeComponent.type) {
      case 'text':
        // Text component - renders text with various styles
        return (
          <div
            id={safeComponent.id}
            className={`morpheo-component morpheo-text`}
            style={componentStyles}
            data-component-type="text"
            onClick={(e) => handleEvent('click', e)}
          >
            {getPropertyValue('content', 
              getPropertyValue('text', 
                getPropertyValue('children', '')))
            }
          </div>
        );

        case 'button':
        // Button component - interactive element with click handler
          return (
            <button
            id={safeComponent.id}
            className={`morpheo-component morpheo-button`}
            style={componentStyles}
            onClick={handleButtonClick}
            disabled={getPropertyValue('disabled', false)}
            data-component-type="button"
          >
            {getPropertyValue('text', 'Button')}
            </button>
          );

      case 'text-input':
        // Text input component
        return (
          <div className="morpheo-input-container" style={{ position: 'relative' }}>
            {getPropertyValue('label') && (
              <label 
                htmlFor={`input-${safeComponent.id}`}
                style={{ display: 'block', marginBottom: '0.5rem' }}
              >
                {getPropertyValue('label')}
              </label>
            )}
            <input
              id={safeComponent.id}
              className={`morpheo-component morpheo-input`}
              type={getPropertyValue('inputType', 'text')}
              value={getPropertyValue('value', '')}
              placeholder={getPropertyValue('placeholder', '')}
              onChange={(e) => {
                // Update the local component state
                setComponentState(prevState => ({
                  ...prevState,
                  value: e.target.value
                }));
                
                // Call the direct event handler
                handleEvent('change', e);
              }}
              onFocus={(e) => handleEvent('focus', e)}
              onBlur={(e) => handleEvent('blur', e)}
              style={componentStyles}
              disabled={getPropertyValue('disabled', false)}
              readOnly={getPropertyValue('readOnly', false)}
              maxLength={getPropertyValue('maxLength')}
              data-component-type="text-input"
            />
          </div>
        );

      case 'container':
        // Container component - holds other components
          return (
          <div
            id={safeComponent.id}
            className={`morpheo-component morpheo-container`}
            style={componentStyles}
            onClick={(e) => {
              // Only handle clicks directly on this element, not bubbled events
              if (e.target === e.currentTarget) {
                handleEvent('click', e);
              }
            }}
            data-component-type="container"
          >
              {renderChildren()}
          </div>
        );

      case 'image':
        // Image component
        return (
          <div className="morpheo-image-container" style={{ position: 'relative', ...componentStyles }}>
            <img
              id={safeComponent.id}
              className={`morpheo-component morpheo-image`}
              src={getPropertyValue('src', '')}
              alt={getPropertyValue('alt', 'Image')}
              onClick={(e) => handleEvent('click', e)}
              style={{
                maxWidth: '100%',
                height: 'auto',
                ...componentStyles
              }}
              data-component-type="image"
            />
          </div>
        );
      
      case 'checkbox':
        // Checkbox component
        return (
          <div className="morpheo-checkbox-container" style={{ display: 'flex', alignItems: 'center' }}>
                        <input
              id={safeComponent.id}
              className={`morpheo-component morpheo-checkbox`}
                          type="checkbox"
              checked={getPropertyValue('checked', false)}
              onChange={(e) => {
                // Update the local component state
                setComponentState(prevState => ({
                  ...prevState,
                  checked: e.target.checked
                }));
                
                // Call the direct event handler
                handleEvent('change', e);
              }}
              style={{ marginRight: '0.5rem', ...componentStyles }}
              disabled={getPropertyValue('disabled', false)}
              data-component-type="checkbox"
            />
            {getPropertyValue('label') && (
              <label 
                htmlFor={safeComponent.id}
              >
                {getPropertyValue('label')}
              </label>
            )}
          </div>
        );

      // Handle all other component types as generic div containers
      default:
                return (
          <div
            id={safeComponent.id}
            className={`morpheo-component morpheo-${safeComponent.type}`}
            style={componentStyles}
            onClick={(e) => handleEvent('click', e)}
            data-component-type={safeComponent.type}
          >
            {Array.isArray(safeComponent.children) ? renderChildren() : getPropertyValue('content', '')}
          </div>
        );
    }
  };

  // Add DOM manipulation reference setup
  useEffect(() => {
    // Skip if no ID
    if (!safeComponent.id) return;

    // Define the global manipulation object if it doesn't exist
    if (!window.$morpheo) {
      window.$morpheo = {};
    }

    // Register this component in the global registry
    window.$morpheo[safeComponent.id] = {
      // DOM element getter
      element: () => document.getElementById(safeComponent.id),

      // Property manipulation
      setProperty: (propName: string, value: any) => {
        // Update the DOM directly for immediate effect
        const element = document.getElementById(safeComponent.id);
        if (element) {
          if (propName === 'content' || propName === 'text') {
            element.textContent = value;
          } else if (propName === 'value') {
            (element as HTMLInputElement).value = value;
          } else if (propName === 'checked') {
            (element as HTMLInputElement).checked = value;
          } else {
            element.setAttribute(propName, value);
          }

          // Dispatch change event for inputs
          if ((propName === 'value' || propName === 'checked') && 
              (element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA')) {
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        
        // Also update the state for React
        setComponentState(prevState => ({
          ...prevState,
          [propName]: value
        }));
        
        return value;
      },

      // Style manipulation
      setStyle: (styleName: string, value: string) => {
        const element = document.getElementById(safeComponent.id);
        if (element) {
          element.style[styleName as any] = value;
        }
        return value;
      },

      // Show/hide
      show: () => {
        const element = document.getElementById(safeComponent.id);
        if (element) {
          element.style.display = '';
        }
        return true;
      },

      hide: () => {
        const element = document.getElementById(safeComponent.id);
        if (element) {
          element.style.display = 'none';
        }
        return true;
      },

      // Get the current state
      getState: () => componentState,

      // Update the entire state
      setState: (newState: any) => {
        setComponentState(newState);
        return newState;
      }
    };

    // Cleanup on unmount
    return () => {
      if (window.$morpheo && window.$morpheo[safeComponent.id]) {
        delete window.$morpheo[safeComponent.id];
      }
    };
  }, [safeComponent.id, componentState]);

  return renderComponent();
};

// Add a new top-level ProcessAppConfig component that handles the full app structure
interface AppConfig {
  app: {
    name: string;
    description: string;
    theme: string;
  };
  layout: {
    type: string;
    regions: string[];
  };
  components: ComponentChild[];
  backend?: {
    services: any[];
    dataFlow: any[];
  };
  theme?: {
    colors: Record<string, string>;
    typography: Record<string, any>;
    spacing: Record<string, string>;
  };
  functionality?: {
    type: string;
    config: Record<string, any>;
  };
}

export const ProcessAppConfig: React.FC<{ 
  config: AppConfig; 
  eventHandlers?: Record<string, any>;
}> = ({ config, eventHandlers }) => {
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);
  
  // Create a structure to organize components by region
  const componentsByRegion: Record<string, ComponentChild[]> = {};

  // Force re-render when config changes
  React.useEffect(() => {
    // This effect runs when config changes
    console.log('ProcessAppConfig: Config changed, re-organizing components');
    
    // Force a re-render of the entire tree
    setForceUpdateCounter(prev => prev + 1);
  }, [config]);

  // Generate a random key to ensure entire component re-mounts
  const instanceKey = useMemo(() => `process-app-${Date.now()}-${Math.random()}`, [forceUpdateCounter]);
  
  // More logging to aid debugging  
  console.log('ProcessAppConfig rendering with key:', instanceKey);
  
  if (config.components) {
    console.log('Component count:', config.components.length);
  }

  // Initialize regions if they exist in the layout
  if (config.layout && config.layout.regions) {
    config.layout.regions.forEach(region => {
      componentsByRegion[region] = [];
    });
  } else {
    // Default region if none are specified
    componentsByRegion['main'] = [];
  }

  // Organize components by region
  if (config.components && Array.isArray(config.components)) {
    config.components.forEach(component => {
      // Add a key property to help React identify when to re-render
      const componentWithKey = {
        ...component,
        key: `${component.id || ''}-${JSON.stringify(component.properties || {})}`
      };
      
      const region = component.region || 'main';
      if (!componentsByRegion[region]) {
        componentsByRegion[region] = [];
      }
      componentsByRegion[region].push(componentWithKey);
    });
  }

  // Create app layout structure
  const appLayout: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column' as 'column',
    minHeight: '100%',
    width: '100%',
  };

  // Function to render a region
  const renderRegion = (region: string) => {
    const components = componentsByRegion[region] || [];
                return (
      <div key={region} className={`region region-${region}`} style={getRegionStyle(region)}>
        {components.map((component, index) => (
                  <DynamicComponent
            key={component.id || `${region}-component-${index}`} 
            component={component}
            functionality={config.functionality}
                    eventHandlers={eventHandlers}
            config={config}
          />
        ))}
      </div>
    );
  };

  // Function to determine region style based on region name
  const getRegionStyle = (region: string): React.CSSProperties => {
    switch (region) {
      case 'header':
        return {
          padding: '1rem',
          backgroundColor: config.theme?.colors?.primary || '#f8f9fa',
          borderBottom: '1px solid #dee2e6',
        };
      case 'footer':
        return {
          padding: '1rem',
          backgroundColor: config.theme?.colors?.secondary || '#f8f9fa',
          borderTop: '1px solid #dee2e6',
          marginTop: 'auto',
        };
      case 'sidebar':
        return {
          width: '250px',
          backgroundColor: config.theme?.colors?.surface || '#ffffff',
          padding: '1rem',
          borderRight: '1px solid #dee2e6',
        };
      case 'main':
        return {
          flex: 1,
          padding: '1rem',
          backgroundColor: config.theme?.colors?.background || '#ffffff',
        };
        default:
        return {
          padding: '1rem',
        };
    }
  };

  // Determine layout structure based on layout type
  const getLayoutStructure = () => {
    switch (config.layout?.type) {
      case 'singlepage':
        return (
          <div style={appLayout}>
            {config.layout.regions.map(region => renderRegion(region))}
          </div>
        );
      case 'twocolumn':
          return (
          <div style={appLayout}>
            {renderRegion('header')}
            <div style={{ display: 'flex', flex: 1 }}>
              {renderRegion('sidebar')}
              <div style={{ flex: 1 }}>
                {renderRegion('main')}
              </div>
            </div>
            {renderRegion('footer')}
            </div>
          );
      default:
        // Default to rendering all regions in a column
      return (
          <div style={appLayout}>
            {Object.keys(componentsByRegion).map(region => renderRegion(region))}
        </div>
      );
    }
  };

  return (
    <div className="app-container" style={{ 
      height: '100%', 
      width: '100%',
      fontFamily: config.theme?.typography?.fontFamily || 'inherit',
      fontSize: config.theme?.typography?.fontSize || 'inherit',
      color: config.theme?.colors?.text || 'inherit',
      backgroundColor: config.theme?.colors?.background || 'inherit'
    }}>
      {getLayoutStructure()}
    </div>
  );
};

// Export the ProcessAppConfig component as the default
export default DynamicComponent; 