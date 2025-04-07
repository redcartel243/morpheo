import React, { useState, useRef, useEffect, useMemo, useCallback, createElement, Suspense } from 'react';
// Remove the direct import of TextInput to prevent potential conflicts
// import TextInput from './components/basic/TextInput';
import { Chart, DataTable, Map } from './components/visualization';
import type { ChartProps, DataTableProps, MapProps } from './components/visualization';
import { registerAllComponents } from './ComponentRegistry';
import { getComponent, getRegisteredComponents, isComponentRegistered } from './ComponentFactory';

// Register all components once when the module is loaded
// This prevents repeated registrations on each render
registerAllComponents();

// Add debug logging to see what components are registered
console.log('Registered components:', getRegisteredComponents());

// Define global window type to include appState
declare global {
  interface Window {
    appState?: any;
    textInputTimeouts?: Record<string, NodeJS.Timeout>;
    $morpheo?: Record<string, any>;
    $m?: (selector: string) => any;
  }
}

// Add a debug flag at the top of the file after the imports:
const DEBUG_EVENT_HANDLING = true;

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
  
  // Log component type mapping for debugging
  console.log(`Mapping component type: ${type} -> normalized: ${normalizedType}`);
  
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
    
    // Visualization types
    case 'map':
    case 'mapview':
    case 'mapcomponent':
      return 'map';
    
    case 'chart':
    case 'graph':
      return 'chart';
    
    case 'datatable':
    case 'table':
      return 'datatable';
    
    // Default to the original type
    default:
      return normalizedType;
  }
};

// Generic component structure processor
const processComponentStructure = (component: ComponentChild | null): ComponentChild | null => {
  if (!component) return null;
  
  // Create a shallow copy of the component to avoid mutating the original
  const processedComponent: ComponentChild = {
    ...component,
    type: mapComponentType(component.type || 'container')
  };
  
  // Handle nested children
  if (Array.isArray(processedComponent.children)) {
    processedComponent.children = processedComponent.children
      .filter(child => child !== null && child !== undefined) // Filter out null/undefined children
      .map((child: ComponentChild | string) => {
        if (typeof child === 'string') return child;
        return processComponentStructure(child) || child;
      });
  }
  
  return processedComponent;
}

const DynamicComponent = ({ component, functionality, eventHandlers, onUpdate, config }: DynamicComponentProps): React.ReactElement | null => {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Process the component to ensure it follows the expected structure
  const processedComponent = useMemo(() => {
    // Add a null/undefined check before processing
    if (!component) {
      console.warn('Received null or undefined component in DynamicComponent');
      return null;
    }
    return processComponentStructure(component);
  }, [component]);
  
  // Create a safe component with defaults for all required properties
  const safeComponent = useMemo(() => ({
    type: mapComponentType(processedComponent?.type || 'container'),
    id: processedComponent?.id || `component-${Math.random().toString(36).substr(2, 9)}`,
    props: processedComponent?.props || {},
    children: processedComponent?.children || [],
    styles: processedComponent?.styles || {},
    events: processedComponent?.events || {},
    methods: processedComponent?.methods || {}
  }), [processedComponent]);
  
  // Add debug logging to check if the component type is registered
  useEffect(() => {
    const componentType = safeComponent.type;
    console.log(`Checking component registration for type: ${componentType}`);
    console.log(`Is component ${componentType} registered? ${isComponentRegistered(componentType)}`);
  }, [safeComponent.type]);
  
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
    
    // First check if methodCode is missing or empty
    if (!methodCode || methodCode.trim() === '') {
      console.error(`Method code is empty for ${methodName} on ${safeComponent.id}`);
      return;
    }
    
    try {
      // Create DOM manipulation utility
      const $m = (selector: string) => {
        if (!selector) return null;
        const targetId = selector.startsWith('#') ? selector.substring(1) : selector;
        
        // Create a component reference with utility methods
        return {
          // Element getter
          element: () => document.getElementById(targetId),
          getElement: () => document.getElementById(targetId),
          
          // Property getters/setters
          getProperty: (propName: string) => {
            const element = document.getElementById(targetId);
            if (!element) return null;
            
            // Handle different property types
            if (propName === 'value' && 'value' in element) {
              return (element as HTMLInputElement).value;
            }
            
            if (propName === 'checked' && 'checked' in element) {
              return (element as HTMLInputElement).checked;
            }
            
            if (propName === 'text' || propName === 'textContent') {
              return element.textContent;
            }
            
            // Try to get from data attributes
            return element.getAttribute(`data-${propName}`) || element.getAttribute(propName);
          },
          
          setProperty: (propName: string, value: any) => {
            const element = document.getElementById(targetId);
            if (!element) {
              console.warn(`Element not found for selector #${targetId} when setting ${propName}`);
              return null;
            }
            
            console.log(`Setting ${propName} to ${value} for #${targetId}`);
            
            // Handle different property types
            if (propName === 'value' && 'value' in element) {
              (element as HTMLInputElement).value = value;
              // Dispatch input and change events for proper event propagation
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
              return;
            }
            
            if (propName === 'checked' && 'checked' in element) {
              (element as HTMLInputElement).checked = value === true || value === 'true';
              element.dispatchEvent(new Event('change', { bubbles: true }));
              return;
            }
            
            if (propName === 'text' || propName === 'textContent') {
              element.textContent = value;
              return;
            }
            
            // Set as data attribute for custom properties
            element.setAttribute(`data-${propName}`, value.toString());
            
            // For normal attributes like disabled, etc.
            if (['disabled', 'readonly', 'required'].includes(propName)) {
              if (value === true || value === 'true') {
                element.setAttribute(propName, 'true');
              } else {
                element.removeAttribute(propName);
              }
            }
          },
          
          // Style manipulation
          setStyle: (styleProperty: string, value: string) => {
            const element = document.getElementById(targetId);
            if (!element) return null;
            
            if (styleProperty && value !== undefined) {
              (element as HTMLElement).style[styleProperty as any] = value;
            } else if (typeof styleProperty === 'object') {
              // Allow passing a style object
              Object.assign((element as HTMLElement).style, styleProperty);
            }
          },
          
          // Event handlers
          addEventListener: (eventType: string, handler: (e: Event) => void) => {
            const element = document.getElementById(targetId);
            if (!element) return null;
            element.addEventListener(eventType, handler);
          },
          
          // Additional utility methods
          setValue: (value: string) => {
            const element = document.getElementById(targetId);
            if (!element) return null;
            if ('value' in element) {
              (element as HTMLInputElement).value = value;
              // Dispatch events for proper event propagation
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
            }
          },
          
          getValue: () => {
            const element = document.getElementById(targetId);
            if (!element) return null;
            if ('value' in element) {
              return (element as HTMLInputElement).value;
            }
            return null;
          }
        };
      };
      
      // Special case for calculator-style direct execution code
      // If code contains direct modification like $m('#display').setProperty('value', ...) 
      if (methodCode.includes('$m(') && !methodCode.trim().startsWith('function')) {
        console.log('Direct execution of method code with $m selector detected');
        try {
          // Simply execute the code directly with the DOM manipulation utility
          new Function('event', '$m', methodCode)(event, $m);
          return;
        } catch (directError) {
          console.error('Error in direct code execution, falling back to function wrapper:', directError);
          // Continue to the function wrapper approaches below
        }
      }
      
      // Try different approaches to execute code
      try {
        // Approach 1: If code is already a function declaration
        if (methodCode.trim().startsWith('function')) {
          const func = new Function('event', '$m', `return ${methodCode}`);
          func()(event, $m);
          return;
        }
        
        // Approach 2: Wrap code in a function
        const wrappedFunc = new Function('event', '$m', `
          return function(event, $m) { 
            ${methodCode} 
          }
        `);
        wrappedFunc()(event, $m);
      } catch (error) {
        console.error('Error in function wrapper execution, trying direct execution:', error);
        
        // Approach 3: Direct execution as a last resort
        new Function('event', '$m', methodCode)(event, $m);
      }
      
      // Update app state if needed
      setComponentState(prevState => {
        const newState = { ...prevState };
        return newState;
      });
      
    } catch (error) {
      console.error(`Error executing method ${methodName} for ${safeComponent.id}:`, error);
    }
  }, [safeComponent.id, setComponentState]);

  // Handle events from components
  const handleEvent = useCallback((eventType: string, event: any) => {
    if (!eventType) {
      console.error('No event type provided');
      return;
    }

    if (DEBUG_EVENT_HANDLING) {
      console.log(`Event '${eventType}' triggered on ${safeComponent.id}`, event);
    }

    // Get the component's methods from safeComponent.methods or props.methods
    const componentMethods = safeComponent.methods || safeComponent.props?.methods || {};
    // Get the component's events from safeComponent.events or props.events
    const componentEvents = safeComponent.events || safeComponent.props?.events || {};

    if (DEBUG_EVENT_HANDLING) {
      console.log(`Methods available for ${safeComponent.id}:`, componentMethods ? Object.keys(componentMethods) : 'none');
      console.log(`Events available for ${safeComponent.id}:`, componentEvents ? Object.keys(componentEvents) : 'none');
    }

    // Normalize the event type to the React-style 'on' prefix format
    const normalizedEventType = `on${eventType.charAt(0).toUpperCase()}${eventType.slice(1)}`;

    // Try multiple naming conventions for methods/events (in order of preference)
    const methodNamesToTry = [
      normalizedEventType,                                    // React style (e.g., "onClick")
      eventType,                                              // direct match (e.g., "click")
      eventType.toLowerCase(),                                // lowercase (e.g., "click")
      `on${eventType.toLowerCase()}`                          // lowercase with on prefix (e.g., "onclick")
    ];
    
    // Add specific special-case mappings for common events
    if (eventType === 'click') methodNamesToTry.push('onClick');
    if (eventType === 'change') methodNamesToTry.push('onChange');
    if (eventType === 'blur') methodNamesToTry.push('onBlur');
    if (eventType === 'focus') methodNamesToTry.push('onFocus');
    if (eventType === 'input') methodNamesToTry.push('onInput');

    if (DEBUG_EVENT_HANDLING) {
      console.log(`Looking for method names:`, methodNamesToTry);
    }

    // Look for a matching method in both methods and events
    let method = null;
    let methodName = '';
    let methodSource = '';
    
    // First try methods
    for (const name of methodNamesToTry) {
      if (componentMethods && componentMethods[name]) {
        method = componentMethods[name];
        methodName = name;
        methodSource = 'methods';
        break;
      }
    }
    
    // If not found in methods, try events
    if (!method) {
      for (const name of methodNamesToTry) {
        if (componentEvents && componentEvents[name]) {
          method = componentEvents[name];
          methodName = name;
          methodSource = 'events';
          break;
        }
      }
    }

    if (method) {
      if (DEBUG_EVENT_HANDLING) {
        console.log(`Found ${methodSource}.${methodName} for event ${eventType} on component ${safeComponent.id}`);
        console.log('Method details:', method);
      }
      
      try {
        // Handle both string and object method definitions
        let methodCode;
        let affectedComponents = [];
        
        if (typeof method === 'string') {
          methodCode = method;
        } else if (typeof method === 'object' && method !== null) {
          methodCode = method.code || '';
          affectedComponents = method.affectedComponents || [];
        } else {
          console.error(`Invalid method format for ${methodName}:`, method);
          return;
        }
        
        // Execute the method
        executeComponentMethod(methodName, methodCode, event);
        
        // If this method affects other components, notify them
        if (affectedComponents && affectedComponents.length > 0) {
          affectedComponents.forEach((targetId: string) => {
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
        console.error(`Error executing ${methodSource}.${methodName} for ${safeComponent.id}:`, err);
      }
    } else {
      if (DEBUG_EVENT_HANDLING) {
        console.log(`No method found for event ${eventType} on component ${safeComponent.id}`);
        console.log(`Available methods:`, componentMethods);
        console.log(`Available events:`, componentEvents);
      }
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
      case 'text-input':
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

  // Define styles at component level, outside any conditionals
  const componentStyles = {
    ...safeComponent.props.style
  };

  // Add this useEffect hook after the existing debug logging useEffect
  useEffect(() => {
    async function loadComponentFromRegistry() {
      const componentType = safeComponent.type;
      console.log(`Loading component: ${componentType}`);
      
      try {
        // Check if component is registered
        if (!isComponentRegistered(componentType)) {
          console.error(`Component ${componentType} is not registered in the ComponentFactory`);
          setError(`Component type "${componentType}" not found`);
          setLoading(false);
          return;
        }
        
        // Get component from registry
        const resolvedComponent = await getComponent(componentType);
        console.log(`Component ${componentType} loaded:`, resolvedComponent !== null);
        
        // Check if we have a component
        if (!resolvedComponent) {
          console.error(`No component resolved for type: ${componentType}`);
          setError(`Failed to load component: ${componentType}`);
          setLoading(false);
          return;
        }
        
        // Check if it's a valid React component
        const isValidComponent = 
          typeof resolvedComponent === 'function' || 
          typeof resolvedComponent === 'string';
        
        if (isValidComponent) {
          setComponent(() => resolvedComponent);
          setLoading(false);
        } else {
          console.error(`Invalid component type received:`, resolvedComponent);
          setError(`Component ${componentType} is not a valid React component`);
          setLoading(false);
        }
      } catch (err) {
        console.error(`Error loading component ${componentType}:`, err);
        setError(`Error loading component: ${err instanceof Error ? err.message : String(err)}`);
        setLoading(false);
      }
    }
    
    loadComponentFromRegistry();
  }, [safeComponent.type]);
  
  // Render a fallback component if the component fails to load
  const renderFallbackComponent = () => {
    return (
      <div style={{
        padding: '10px',
        border: '1px dashed red',
        borderRadius: '4px',
        margin: '5px',
        color: '#721c24',
        backgroundColor: '#f8d7da'
      }}>
        <h4>Component Error: {safeComponent.type}</h4>
        <p>{error || 'Failed to load component'}</p>
        <div>
          <strong>ID:</strong> {safeComponent.id}
        </div>
        {safeComponent.props && Object.keys(safeComponent.props).length > 0 && (
          <details>
            <summary>Component Properties</summary>
            <pre>{JSON.stringify(safeComponent.props, null, 2)}</pre>
          </details>
        )}
      </div>
    );
  };

  // If loading, show loading indicator
  if (loading) {
    return (
      <div className="loading-component" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px',
        backgroundColor: '#e9ecef',
        borderRadius: '4px',
        margin: '5px'
      }}>
        <div className="spinner" style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          border: '2px solid #ccc',
          borderTopColor: '#666',
          animation: 'spin 1s linear infinite',
          marginRight: '10px'
        }} />
        <div>Loading {safeComponent.type} component...</div>
      </div>
    );
  }
  
  // If there was an error, show fallback component
  if (error || !Component) {
    return renderFallbackComponent();
  }

  // Prepare the final props to pass to the component
  const componentProps = {
    ...safeComponent.props,
    style: safeComponent.styles,
    id: safeComponent.id,
    
    // Bind native DOM events based on the events object
    ...(safeComponent.events && Object.entries(safeComponent.events).reduce((acc, [eventName, handler]) => {
      // Create React-compatible event handler names (onClick, onChange, etc.)
      let reactEventName = eventName;
      
      // Convert event names to React format if needed
      if (!eventName.startsWith('on')) {
        reactEventName = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
      }
      
      // Create the event handler function
      acc[reactEventName] = (event: any) => {
        if (DEBUG_EVENT_HANDLING) {
          console.log(`Component ${safeComponent.id} triggered event ${eventName}`);
        }
        handleEvent(eventName.startsWith('on') ? eventName.substring(2).toLowerCase() : eventName, event);
      };
      
      return acc;
    }, {} as Record<string, any>)),
    
    // Handle children components
    children: safeComponent.children.length > 0 ? (
      // Render nested child components recursively
      safeComponent.children.map((child, index) => {
        if (typeof child === 'string') {
          return <React.Fragment key={`string-${index}`}>{child}</React.Fragment>;
        }
        return (
          <DynamicComponent
            key={child.id || `child-${index}`}
            component={child}
            eventHandlers={eventHandlers}
          />
        );
      })
    ) : null,
    
    // Add method handlers based on method object
    ...(safeComponent.methods && Object.entries(safeComponent.methods).reduce((acc, [methodName, methodData]) => {
      // Only convert methods that follow React event naming conventions (onClick, onChange, etc.)
      if (methodName.startsWith('on') && typeof methodData === 'object' && methodData && 'code' in methodData) {
        const methodCode = methodData.code as string;
        
        acc[methodName] = (event: any) => {
          if (DEBUG_EVENT_HANDLING) {
            console.log(`Component ${safeComponent.id} triggered method ${methodName}`);
          }
          // Execute the method with the DOM manipulation utility
          executeComponentMethod(methodName, methodCode, event);
        };
      }
      return acc;
    }, {} as Record<string, any>)),
    
    // Add click handler if it's a button (special case for calculator buttons)
    onClick: safeComponent.type === 'button' ? (event: any) => {
      handleEvent('click', event);
    } : undefined
  };

  // Render the final component with props
  return <Component {...componentProps} />;
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

// Export default component
export default DynamicComponent; 