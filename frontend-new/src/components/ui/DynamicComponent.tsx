import React, { useState, useRef, useEffect, useMemo, useCallback, createElement, Suspense } from 'react';
// Remove the direct import of TextInput to prevent potential conflicts
// import TextInput from './components/basic/TextInput';
import { Chart, DataTable, Map } from './components/visualization';
import type { ChartProps, DataTableProps, MapProps } from './components/visualization';
import { registerAllComponents } from './ComponentRegistry';
import { getComponent, getRegisteredComponents, isComponentRegistered } from './ComponentFactory';
import { createFallbackComponent } from './ComponentRegistry';
import { processComponentStructure, mapComponentType } from './ComponentProcessing';

/**
 * Default method implementations for common components
 */
const DEFAULT_METHOD_IMPLEMENTATIONS: Record<string, string> = {
  // Add other default method implementations here
  toggleVisibility: `
    function(event, $m) {
      const target = event.currentTarget.dataset.target;
      if (!target) return;
      
      const element = $m('#' + target);
      const isVisible = element.getStyle('display') !== 'none';
      
      if (isVisible) {
        element.hide();
      } else {
        element.show();
      }
    }
  `,
  
  submitForm: `
    function(event, $m) {
      const formId = event.currentTarget.dataset.form;
      if (!formId) return;
      
      const form = $m('#' + formId);
      if (!form) return;
      
      // Get form data
      const formData = new FormData(form.element);
      const data = {};
      
      // Convert to object
      for (const [key, value] of formData.entries()) {
        data[key] = value;
      }
      
      console.log('Form submitted:', data);
      
      // Here you would typically send the data to a server
      // For now, just store it locally
      $m('#form-result').setValue(JSON.stringify(data, null, 2));
    }
  `
};

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
    _methodExecutionTimestamps?: Record<string, number>;
  }
}

// Debug flags
const DEBUG_COMPONENT_LOADING = false;
const DEBUG_EVENT_HANDLING = false;

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
export interface ComponentChild {
  id?: string;
  type?: string;
  props?: Record<string, any>;
  properties?: Record<string, any>;
  children?: (ComponentChild | string)[] | undefined;
  styles?: Record<string, any>;
  events?: Record<string, any>;
  region?: string;
  methods?: Record<string, any>;
  key?: string; // Add the key property for React reconciliation
  itemTemplate?: ComponentChild | Record<string, any>; // Add optional itemTemplate property
}

// Now we can define the DynamicComponent

export const DynamicComponent: React.FC<DynamicComponentProps> = (props) => {
  const { component, functionality, eventHandlers, onUpdate, config } = props;
  
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [componentState, setLocalComponentState] = useState<Record<string, any>>({});
  
  // Process and normalize component
  const processedComponent = useMemo(() => {
    // Add a null/undefined check before processing
    if (!component) {
      console.warn('Received null or undefined component in DynamicComponent');
      return null;
    }
    
    // Log original component data to help debug AI responses
    console.log('Processing component in DynamicComponent:', {
      type: component.type,
      id: component.id,
      hasProps: !!component.props,
      hasProperties: !!component.properties,
      textProperty: component.props?.text || component.properties?.text,
      propsKeys: component.props ? Object.keys(component.props) : [],
      propertiesKeys: component.properties ? Object.keys(component.properties) : []
    });
    
    return processComponentStructure(component);
  }, [component]);
  
  // Create a safe component with defaults for all required properties
  const safeComponent = useMemo(() => {
    if (!processedComponent) {
      return {
        type: 'container',
        id: `component-${Math.random().toString(36).substr(2, 9)}`,
        props: {},
        children: [],
        styles: {},
        events: {},
        methods: {}
      };
    }
    
    // Normalize properties from either props or properties field
    const normalizedProps = {
      ...(processedComponent.properties || {}),
      ...(processedComponent.props || {})
    };

    // Handle text property specially for buttons and text components
    if (processedComponent.type === 'button' && 'text' in normalizedProps) {
      console.log(`Found text property for button: ${normalizedProps.text}`);
    }
    
    return {
      type: mapComponentType(processedComponent.type || 'container'),
      id: processedComponent.id || `component-${Math.random().toString(36).substr(2, 9)}`,
      props: normalizedProps,
      children: processedComponent.children || [],
      styles: processedComponent.styles || {},
      events: processedComponent.events || {},
      methods: processedComponent.methods || {}
    };
  }, [processedComponent]);
  
  // Create application state setter for this component
  const setComponentState = useCallback((stateUpdater: (prevState: Record<string, any>) => Record<string, any>) => {
    if (typeof onUpdate === 'function') {
      onUpdate((prevState: Record<string, any>) => {
        const newComponentState = stateUpdater(prevState[safeComponent.id] || {});
        return {
          ...prevState,
          [safeComponent.id]: newComponentState
        };
      });
    }
  }, [onUpdate, safeComponent.id]);
  
  // Add debug logging to check if the component type is registered
  useEffect(() => {
    const componentType = safeComponent.type;
    console.log(`Checking component registration for type: ${componentType}`);
    console.log(`Is component ${componentType} registered? ${isComponentRegistered(componentType)}`);
  }, [safeComponent.type]);
  
  // Initialize component state based on props and functionality
  const initialState = useMemo(() => {
    // Start with basic state properties
    const state: Record<string, any> = {
      value: safeComponent.props?.value || '',
      checked: safeComponent.props?.checked || false,
      showModal: false,
      isModalOpen: false
    };
    
    // Add any custom state properties from component props
    if (safeComponent.props?.initialState && typeof safeComponent.props.initialState === 'object') {
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
  const executeComponentMethod = useCallback((methodName: string, methodData: any, event: any) => {
    // --- NEW: Expect methodData to be { actions: [...] } object --- 
    if (!methodData || typeof methodData !== 'object' || !Array.isArray(methodData.actions)) {
      console.error(`Invalid method data format for ${methodName} on ${safeComponent.id}. Expected { actions: [...] }, got:`, methodData);
      return;
    }
    
    const actions = methodData.actions as { type: string; payload: any }[];
    console.log(`Executing ${actions.length} actions for method ${methodName} on ${safeComponent.id}`);

    // Simple context for variables declared within this method execution
    const methodContext: Record<string, any> = {};

    // Helper to resolve values (literals or $variables)
    const resolveValue = (value: any) => {
      if (typeof value === 'string' && value.startsWith('$')) {
        const varName = value.substring(1);
        if (varName in methodContext) {
          return methodContext[varName];
        }
        console.warn(`Variable ${value} not found in method context.`);
        return undefined; // Or null, depending on desired handling
      }
      // Handle structured values like the toggle object - pass them through
      if (typeof value === 'object' && value !== null) {
        return value;
      }
      // Otherwise, assume literal
      return value;
    };

    try {
      // Get global API functions from eventHandlers
      const addComponentFunc = eventHandlers?.addComponent;
      const removeComponentFunc = eventHandlers?.removeComponent;
      const updateComponentFunc = eventHandlers?.updateComponent;
      const getComponentPropertyFunc = eventHandlers?.getComponentProperty;
      const setComponentPropertyFunc = eventHandlers?.setComponentProperty;
      const callComponentMethodFunc = eventHandlers?.callComponentMethod;
      // NEW: Get list manipulation functions from handlers
      const addItemFunc = eventHandlers?.addItem;
      const removeItemFunc = eventHandlers?.removeItem;

      // --- Execute actions sequentially --- 
      for (const action of actions) {
        const { type, payload } = action;
        console.log(`Executing action: ${type}`, payload);

        switch (type) {
          case "GET_PROPERTY":
            if (payload?.targetId && payload?.propertyName && payload?.resultVariable) {
              const value = getComponentPropertyFunc(payload.targetId, payload.propertyName);
              methodContext[payload.resultVariable] = value; // Store in context
              console.log(`GET_PROPERTY: ${payload.resultVariable} =`, value);
            } else {
              console.warn("Skipping invalid GET_PROPERTY payload:", payload);
            }
            break;

          case "SET_PROPERTY":
            if (payload?.targetId && payload?.propertyName) {
              const resolvedVal = resolveValue(payload.value);
              setComponentPropertyFunc(payload.targetId, payload.propertyName, resolvedVal);
            } else {
              console.warn("Skipping invalid SET_PROPERTY payload:", payload);
            }
            break;

          // NOTE: TOGGLE_PROPERTY is handled *within* setComponentPropertyFunc now
          // No specific case needed here if we pass the special object

          case "LOG_MESSAGE":
            if (payload?.message) {
              let message = payload.message;
              // Resolve variables in the message string
              if (typeof message === 'string') {
                message = message.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, varName) => {
                  return varName in methodContext ? String(methodContext[varName]) : 'undefined';
                });
              }
              console.log(message);
            } else {
              console.warn("Skipping invalid LOG_MESSAGE payload:", payload);
            }
            break;
            
          // --- NEW: Handle ADD_ITEM --- 
          case "ADD_ITEM":
            if (addItemFunc && payload?.targetId && payload.itemValue !== undefined) {
              const resolvedItemValue = resolveValue(payload.itemValue);
              addItemFunc(payload.targetId, resolvedItemValue);
            } else {
              console.warn("Skipping invalid ADD_ITEM payload or missing addItem handler:", payload);
            }
            break;
            
          // --- NEW: Handle REMOVE_ITEM --- 
          case "REMOVE_ITEM":
            if (removeItemFunc && payload?.targetId && payload.itemValue !== undefined) {
              // Assuming itemValue identifies the item to remove (could also be itemIndex)
              const resolvedItemIdentifier = resolveValue(payload.itemValue); 
              removeItemFunc(payload.targetId, resolvedItemIdentifier);
            } else if (removeItemFunc && payload?.targetId && payload.itemIndex !== undefined) {
              // Handle removal by index if provided
              const resolvedIndex = resolveValue(payload.itemIndex); 
              removeItemFunc(payload.targetId, resolvedIndex);
        } else {
              console.warn("Skipping invalid REMOVE_ITEM payload or missing removeItem handler:", payload);
            }
            break;

          case "ERROR": // Handle translation errors
            console.error("Backend translation error:", payload);
            break;

          // Add cases for ADD_ITEM, REMOVE_ITEM, CALL_METHOD etc.
          // They should call the corresponding Func from eventHandlers
          // after resolving any $variables in their payloads.

          default:
            console.warn(`Unsupported action type: ${type}`);
        }
      }
      } catch (error) {
      console.error(`Error executing actions for method ${methodName} on ${safeComponent.id}:`, error);
    }
  }, [safeComponent.id, eventHandlers, setComponentState]); // Dependencies: id, handlers, state setter

  // Handle events from components
  const handleEvent = useCallback((eventType: string, event: any) => {
    if (!eventType) {
      console.error('No event type provided');
      return;
    }

    console.log(`Event '${eventType}' triggered on ${safeComponent.id}`, event);

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

    // Debug the methodNames we're looking for
      console.log(`Looking for method names:`, methodNamesToTry);
    console.log(`Component methods:`, componentMethods);
    console.log(`Component events:`, componentEvents);

    // Look for a matching method in both methods and events
    let method = null;
    let methodName = '';
    let methodSource = '';
    
    // First try methods
    for (const name of methodNamesToTry) {
      if (componentMethods && componentMethods[name] !== undefined) {
        method = componentMethods[name];
        methodName = name;
        methodSource = 'methods';
        break;
      }
    }
    
    // If not found in methods, try events
    if (!method) {
      for (const name of methodNamesToTry) {
        if (componentEvents && componentEvents[name] !== undefined) {
          method = componentEvents[name];
          methodName = name;
          methodSource = 'events';
          break;
        }
      }
    }

    if (method !== null) {
        console.log(`Found ${methodSource}.${methodName} for event ${eventType} on component ${safeComponent.id}`);
        console.log('Method details:', method);
      
      try {
        // --- REVISED: Check if method is already the { actions: [...] } object --- 
        // --- OR if it's just the action array itself --- 
        let methodObjectToExecute = null;
        if (typeof method === 'object' && method !== null) {
            if (Array.isArray(method.actions)) {
              // Already in the correct { actions: [...] } format
              methodObjectToExecute = method;
            } else if (Array.isArray(method)) {
              // It's just the array, wrap it
              console.log(`Wrapping raw action array for ${methodName}`);
              methodObjectToExecute = { actions: method };
            }
        }

        if (methodObjectToExecute) {
          // Directly pass the structured object to the executor
          executeComponentMethod(methodName, methodObjectToExecute, event);
        } else {
          // Log an error if the method data isn't in the expected format
          console.error(`Invalid method data format for ${methodName}. Expected { actions: [...] } or array [], got:`, method);
        }
        
      } catch (err) {
        console.error(`Error executing ${methodSource}.${methodName} for ${safeComponent.id}:`, err);
      }
    } else {
      console.log(`No method found for event ${eventType} on component ${safeComponent.id}`);
        console.log(`Available methods:`, componentMethods);
        console.log(`Available events:`, componentEvents);
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
        const backgroundColor = safeComponent.props?.backgroundColor || '#ffffff';
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
  }, [safeComponent.type, safeComponent.props?.backgroundColor, safeComponent.id]);

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
    ...(safeComponent.props?.style || {})
  };

  // Add this useEffect hook after the existing debug logging useEffect
  useEffect(() => {
    async function loadComponentFromRegistry() {
      const componentType = safeComponent.type;
      console.log(`[DynamicComponent] Loading component "${componentType}" from registry (original type: "${safeComponent.type}")`);
      
      try {
        // Check if component is registered
        if (!isComponentRegistered(componentType)) {
          console.error(`Component ${componentType} is not registered in the ComponentFactory. Available components:`, getRegisteredComponents());
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
          console.log(`[DynamicComponent] Successfully resolved component "${componentType}" (type: ${typeof resolvedComponent})`);
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
    style: safeComponent.styles || {},
    id: safeComponent.id,
    
    // Check if this is a button and add specific properties
    ...(safeComponent.type === 'button' && {
      // Ensure text and content properties are correctly passed to button component
      text: safeComponent.props?.text,
      content: safeComponent.props?.content,
      // Add debugging info
      'data-has-text': !!safeComponent.props?.text,
      'data-has-content': !!safeComponent.props?.content,
      'data-component-type': safeComponent.type,
      
      // Add onClick handler for buttons that directly invokes methods
      onClick: (event: any) => {
        console.log(`Button ${safeComponent.id} clicked`);
        
        // Prevent default behavior and stop propagation
        if (event && typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
        if (event && typeof event.stopPropagation === 'function') {
          event.stopPropagation();
        }
        
        // Look for onClick method in methods object
        // Prioritize 'click' key in methods as per common convention
        const methodData = safeComponent.methods?.click || safeComponent.methods?.onClick;

        if (methodData && typeof methodData === 'object' && Array.isArray(methodData.actions)) {
          const methodName = safeComponent.methods?.click ? 'click' : 'onClick';
          console.log(`Button onClick executing method: ${methodName}`);
          // Pass the structured object directly
          executeComponentMethod(methodName, methodData, event);
        } else {
          // Fall back to general event handling if no specific method or invalid format
          console.log("Button onClick falling back to handleEvent('click')");
          handleEvent('click', event);
        }
      }
    }),
    
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
        // Prevent default behavior and stop propagation
        if (event && typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
        if (event && typeof event.stopPropagation === 'function') {
          event.stopPropagation();
        }
        
        if (DEBUG_EVENT_HANDLING) {
          console.log(`Component ${safeComponent.id} triggered event ${eventName}`);
        }
        handleEvent(eventName.startsWith('on') ? eventName.substring(2).toLowerCase() : eventName, event);
      };
      
      return acc;
    }, {} as Record<string, any>)),
    
    // Handle children components
    children: safeComponent.children && safeComponent.children.length > 0 ? (
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
          executeComponentMethod(methodName, { actions: [{ type: 'CALL_METHOD', payload: { methodName, methodCode, args: [event] } }] }, event);
        };
      }
      return acc;
    }, {} as Record<string, any>)),
    
    // Add click handler if it's a button (special case for calculator buttons)
    onClick: safeComponent.type === 'button' ? (event: any) => {
      // Prevent default behavior and stop propagation
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      
      handleEvent('click', event);
    } : undefined
  };

  // --- DEBUGGING: Log final props before rendering --- 
  // Add specific check for the text component's style
  if (safeComponent.id === 'text-display') {
    console.log(`[DynamicComponent Render Check] text-display styles.fontWeight:`, safeComponent.styles?.fontWeight);
  }
  console.log(`[DynamicComponent Render] Final props for ${safeComponent.id} (${safeComponent.type}):`, {
    id: componentProps.id,
    style: componentProps.style,
    allProps: componentProps 
  });
  // --- END DEBUGGING ---

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
}> = ({ config: initialConfig, eventHandlers }) => {
  // State for the dynamic list of components
  const [appComponents, setAppComponents] = useState<ComponentChild[]>(initialConfig.components || []);
  
  // Force re-render when config changes (mainly for initial load or full config swap)
  React.useEffect(() => {
    console.log('ProcessAppConfig: Initial config received, setting components state.');
    setAppComponents(initialConfig.components || []);
  }, [initialConfig]);

  // Function to add a new component to the state
  const addComponent = useCallback((parentId: string, newComponentConfig: ComponentChild) => {
    // Parent ID is now required to know where to add the component
    if (!parentId || !newComponentConfig || typeof newComponentConfig !== 'object') {
      console.error('addComponent received invalid parentId or config:', parentId, newComponentConfig);
      return;
    }
    const componentToAdd = {
      ...newComponentConfig,
      id: newComponentConfig.id || `dynamic-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
    };
    console.log(`Adding new component:`, componentToAdd, `to parent: ${parentId}`);

    // Find the parent and add the child - recursive approach needed
    const addRecursive = (components: ComponentChild[]): ComponentChild[] => {
      return components.map(comp => {
        if (comp.id === parentId.replace('#', '')) {
          console.log(`Found parent ${parentId}, adding child.`);
          // Ensure children array exists and is an array
          const children = Array.isArray(comp.children) ? comp.children : [];
          return { ...comp, children: [...children, componentToAdd] };
        }
        if (Array.isArray(comp.children)) {
          // Filter out strings before recursive call
          const childComponents = comp.children.filter((c): c is ComponentChild => typeof c === 'object');
          return { ...comp, children: addRecursive(childComponents) };
        }
        return comp;
      });
    };

    setAppComponents(prevComponents => addRecursive(prevComponents));

  }, []); // Empty dependency array, relies on state updater form

  // --- Add removeComponent function ---
  const removeComponent = useCallback((componentId: string) => {
    if (!componentId) {
      console.error('removeComponent requires a componentId');
      return;
    }
    const targetId = componentId.replace('#', ''); // Allow selectors like #id
    console.log('Removing component:', targetId);

    // Recursive function to filter out the component
    const removeRecursive = (components: ComponentChild[]): ComponentChild[] => {
      return components
        .filter(comp => comp.id !== targetId)
        .map(comp => {
          if (Array.isArray(comp.children)) {
            // Filter out strings before recursive call
            const childComponents = comp.children.filter((c): c is ComponentChild => typeof c === 'object');
            return { ...comp, children: removeRecursive(childComponents) };
          }
          return comp;
        });
    };

    setAppComponents(prevComponents => removeRecursive(prevComponents));
  }, []);
  // --- End removeComponent ---

  // --- Add addItem function --- 
  const addItem = useCallback((listId: string, itemValue: any) => {
    if (!listId) {
      console.error('addItem requires a listId');
      return;
    }
    const targetId = listId.replace('#', '');
    console.log(`Adding item '${JSON.stringify(itemValue)}' to list '${targetId}'`); // Log the value being added

    setAppComponents(prevComponents => {
      const updateRecursive = (components: ComponentChild[]): ComponentChild[] => {
        return components.map(comp => {
          if (comp.id === targetId && (comp.type === 'list' || comp.type === 'List')) { // Allow 'List' as well
            console.log(`Found list ${targetId}, adding item.`);
            // Ensure properties and items exist
            const currentProperties = comp.properties || {};
            const currentItems = Array.isArray(currentProperties.items) ? currentProperties.items : [];
            const itemTemplate = comp.itemTemplate || currentProperties.itemTemplate; // Check both locations

            let newItemToAdd: any = itemValue; // Default to raw value

            if (itemTemplate && typeof itemTemplate === 'object') {
              console.log("Item template found:", itemTemplate);
              try {
                // 1. Deep clone the template
                let newItemConfig = JSON.parse(JSON.stringify(itemTemplate));

                // 2. Generate a unique ID for the item (or use a provided one if itemValue is an object with id)
                const baseId = typeof itemValue === 'object' && itemValue.id ? itemValue.id : `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                
                // Find the index of the item being added
                const itemIndex = currentItems.length; // The index will be the current length before adding

                // 3. Recursively process the template to set IDs and replace placeholders
                const processTemplateNode = (node: any, parentId: string): any => {
                   if (typeof node !== 'object' || node === null) return node;

                   // Generate unique ID for the node if it doesn't have one
                   if (!node.id) {
                       // Simple ID generation - might need refinement based on node type or index
                       node.id = `${parentId}-${node.type || 'child'}-${Math.random().toString(36).substr(2, 5)}`;
  } else {
                       // Allow relative IDs like "delete-button" to become unique within the item
                       node.id = `${parentId}-${node.id}`;
                   }

                   // Placeholder replacement (simple string replace)
                   // Look in properties, children, etc.
                   for (const key in node) {
                       if (typeof node[key] === 'string') {
                           // Replace {{item}} or similar (assuming itemValue is the primary data)
                           if (typeof itemValue === 'string') {
                             // Look for {{item}} specifically
                             node[key] = node[key].replace(/\{\{item\}\}/g, itemValue); 
                           } else if (typeof itemValue === 'object') {
                             // Replace {{item.fieldName}}
                             node[key] = node[key].replace(/\{\{item\.(\w+)\}\}/g, (_: any, fieldName: string) => {
                               return itemValue[fieldName] !== undefined ? String(itemValue[fieldName]) : `{{item.${fieldName}}}`; // Keep placeholder if field not found
                             });
                           }
                           // Replace {itemId} (keep this one)
                           node[key] = node[key].replace(/\{itemId\}/g, baseId);
                           // Replace {{index}}
                           node[key] = node[key].replace(/\{\{index\}\}/g, String(itemIndex)); 
                       } else if (key === 'properties' && typeof node.properties === 'object') {
                           // Also check within properties object
                           for (const propKey in node.properties) {
                               if (typeof node.properties[propKey] === 'string') {
                                 if (typeof itemValue === 'string') {
                                     // Look for {{item}} specifically
                                     node.properties[propKey] = node.properties[propKey].replace(/\{\{item\}\}/g, itemValue);
                                 } else if (typeof itemValue === 'object') {
                                     // Replace {{item.fieldName}}
                                     node.properties[propKey] = node.properties[propKey].replace(/\{\{item\.(\w+)\}\}/g, (_: any, fieldName: string) => {
                                       return itemValue[fieldName] !== undefined ? String(itemValue[fieldName]) : `{{item.${fieldName}}}`;
                                     });
                                 }
                                 // Replace {itemId} (keep this one)
                                 node.properties[propKey] = node.properties[propKey].replace(/\{itemId\}/g, baseId);
                               }
                           }
                       } else if (key === 'methods' && typeof node.methods === 'object') {
                          // Recursively process methods (translate IR if needed, handle placeholders)
                          // For now, just basic placeholder replacement in action parameters
                          for (const methodKey in node.methods) {
                             if (typeof node.methods[methodKey] === 'object' && node.methods[methodKey] !== null) {
                                // Assuming methods are { actions: [...] }
                                if (Array.isArray(node.methods[methodKey].actions)) {
                                   node.methods[methodKey].actions = node.methods[methodKey].actions.map((action: any) => {
                                      if (typeof action.payload === 'object' && action.payload !== null) {
                                         let payloadString = JSON.stringify(action.payload);
                                         // Replace {{item}} and {itemId} in method payloads
                                         if (typeof itemValue === 'string') {
                                            payloadString = payloadString.replace(/\{\{item\}\}/g, itemValue);
                                         } else if (typeof itemValue === 'object') {
                                            // Replace {{item.fieldName}}
                                            payloadString = payloadString.replace(/\{\{item\.(\w+)\}\}/g, (_: any, fieldName: string) => {
                                              return itemValue[fieldName] !== undefined ? String(itemValue[fieldName]) : `{{item.${fieldName}}}`;
                                            });
                                         }
                                         payloadString = payloadString.replace(/\{itemId\}/g, baseId);
                                         // Replace {{index}}
                                         payloadString = payloadString.replace(/\{\{index\}\}/g, String(itemIndex)); 
                                         try {
                                            action.payload = JSON.parse(payloadString);
                                         } catch (e) { console.error("Error parsing method payload after replace", e); }
                                      }
                                      return action;
                                   });
                                }
                             }
                          }
                       }
                   }
                   
                   // Recursively process children if they exist
                   if (Array.isArray(node.children)) {
                       node.children = node.children.map((child: any) => processTemplateNode(child, node.id));
                   }
                   
                   return node;
                };

                newItemConfig = processTemplateNode(newItemConfig, baseId); // Process starting with baseId
                // Ensure the top-level item gets the correct base ID
                newItemConfig.id = baseId; 
                newItemToAdd = newItemConfig; // Use the processed config object
                console.log("Generated new item from template:", newItemToAdd);
              } catch (e) {
                console.error("Error processing item template:", e);
                // Fallback to adding raw value if template processing fails
                newItemToAdd = itemValue; 
              }
            } else {
                console.log("No item template found, adding raw value:", itemValue);
            }

            return { 
              ...comp, 
              properties: { 
                ...currentProperties, 
                items: [...currentItems, newItemToAdd] // Add the new item (object or raw)
              }
            };
          }
          // Recursively update children
          if (Array.isArray(comp.children)) {
            const childComponents = comp.children.filter((c): c is ComponentChild => typeof c === 'object');
            return { ...comp, children: updateRecursive(childComponents) };
          }
          return comp;
        });
      };
      return updateRecursive(prevComponents);
    });
  }, []); // Depends on setAppComponents
  // --- End addItem ---

  // --- Add removeItem function --- 
  const removeItem = useCallback((listId: string, itemIdentifier: any) => {
    if (!listId) {
      console.error('removeItem requires a listId');
      return;
    }
    const targetId = listId.replace('#', '');
    console.log(`Removing item '${itemIdentifier}' from list '${targetId}'`);

    setAppComponents(prevComponents => {
      const updateRecursive = (components: ComponentChild[]): ComponentChild[] => {
        return components.map(comp => {
          if (comp.id === targetId && comp.type === 'list') {
            console.log(`Found list ${targetId}, attempting to remove item.`);
            const currentProperties = comp.properties || {};
            const currentItems = Array.isArray(currentProperties.items) ? currentProperties.items : [];
            let updatedItems = [...currentItems];

            if (typeof itemIdentifier === 'number') { // Remove by index
              if (itemIdentifier >= 0 && itemIdentifier < currentItems.length) {
                updatedItems.splice(itemIdentifier, 1);
              } else {
                console.warn(`removeItem: Index ${itemIdentifier} out of bounds for list ${targetId}`);
              }
            } else { // Remove by value (simple comparison)
              updatedItems = currentItems.filter(item => item !== itemIdentifier);
              if (updatedItems.length === currentItems.length) {
                 console.warn(`removeItem: Value '${itemIdentifier}' not found in list ${targetId}`);
              }
            }
            return { 
              ...comp, 
              properties: { 
                ...currentProperties, 
                items: updatedItems 
              }
            };
          }
          // Recursively update children
          if (Array.isArray(comp.children)) {
            const childComponents = comp.children.filter((c): c is ComponentChild => typeof c === 'object');
            return { ...comp, children: updateRecursive(childComponents) };
          }
          return comp;
        });
      };
      return updateRecursive(prevComponents);
    });
  }, []); // Depends on setAppComponents
  // --- End removeItem ---

  // --- Utility for deep merging state updates --- 
  const deepMerge = (target: any, source: any): any => {
    const output = { ...target };
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        if (isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
  } else {
            output[key] = deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  };

  const isObject = (item: any): boolean => {
    return (item && typeof item === 'object' && !Array.isArray(item));
  };

  // --- Add updateComponent function with deep merge --- 
  const updateComponent = useCallback((componentId: string, updates: Partial<ComponentChild>) => {
    if (!componentId || !updates || typeof updates !== 'object') {
      console.error('updateComponent requires a componentId and an updates object');
      return;
    }
    const targetId = componentId.replace('#', ''); // Allow selectors like #id
    console.log(`Updating component ${targetId} with:`, updates);

    // Recursive function to find and update the component
    const updateRecursive = (components: ComponentChild[]): ComponentChild[] => {
      return components.map(comp => {
        if (!comp || typeof comp !== 'object') return comp; // Safety check

        if (comp.id === targetId) {
          console.log(`Found component ${targetId} to update. Current:`, comp, "Applying:" , updates);
          // --- Apply Deep Merge --- 
          let newCompState = { ...comp };
          
          // Deep merge properties if provided in updates
          if (updates.properties || updates.props) {
            const updateProps = updates.properties || updates.props || {};
            const currentProps = comp.properties || comp.props || {};
            newCompState.properties = deepMerge(currentProps, updateProps);
            // Ensure props alias is removed if properties exists
            if (newCompState.props) delete newCompState.props;
          }
          
          // Deep merge styles if provided in updates
          if (updates.styles) {
            const currentStyles = comp.styles || {};
            newCompState.styles = deepMerge(currentStyles, updates.styles);
          }
          
          // Apply other top-level updates (excluding properties/styles already merged)
          const { properties, props, styles, ...otherUpdates } = updates;
          newCompState = { ...newCompState, ...otherUpdates };

          console.log(`Merged state for ${targetId}:`, newCompState);
          return newCompState;
          // --- End Deep Merge Logic ---
        }

        // Recursively update children
        if (Array.isArray(comp.children)) {
          const childComponents = comp.children.filter((c): c is ComponentChild => typeof c === 'object');
          const updatedChildren = updateRecursive(childComponents);
          // Combine updated children with any string children
          const finalChildren = comp.children.map(child => 
              typeof child === 'object' ? updatedChildren.find(uc => uc.id === child.id) || child : child
          );
          return { ...comp, children: finalChildren };
        }
        return comp;
      });
    };

    setAppComponents(prevComponents => updateRecursive(prevComponents));
  }, [appComponents]); // Depend on appComponents state for recursive updates
  // --- End updateComponent ---

  // --- Add getComponentProperty function (Ensure this exists and works) ---
  const getComponentProperty = useCallback((componentId: string, propertyName: string): any => {
    const targetId = componentId.replace('#', '');
    let foundValue: any = undefined;
    console.log(`[getComponentProperty] Searching for ${targetId}.${propertyName}`);

    // Support for nested properties using dot notation (e.g., "styles.fontWeight")
    const propertyParts = propertyName.split('.');
    const baseProperty = propertyParts[0];
    const nestedPath = propertyParts.slice(1);

    const findRecursive = (components: ComponentChild[]) => {
      for (const comp of components) {
        if (!comp || typeof comp !== 'object') continue; // Add safety check
        if (comp.id === targetId) {
          // --- CORRECTED LOGIC: Check styles object first if baseProperty is 'styles' --- 
          let sourceObject: Record<string, any> = {}; // Start with empty object

          if (baseProperty === 'styles' && comp.styles) {
            sourceObject = comp.styles;
          } else if (baseProperty === 'properties' && comp.properties) {
            sourceObject = comp.properties;
            if (propertyName.startsWith('properties.')) {
                nestedPath.shift(); 
            }
          } else if (comp.properties) { // Default check order
            sourceObject = comp.properties;
          } else if (comp.props) {
            sourceObject = comp.props;
          }
          // If none of the above assigned, sourceObject remains {}

          // Initialize foundValue to undefined for each component check
          let componentSpecificFoundValue: any = undefined;

          // Use the guaranteed-to-be-object sourceObject
          if (nestedPath.length > 0) { // Handle nested properties
            let currentValue: Record<string, any> | undefined = sourceObject; // Start search from sourceObject, allow undefined type
            for (const pathPart of nestedPath) {
              // Check if currentValue is an object before indexing
              if (currentValue && typeof currentValue === 'object' && pathPart in currentValue) {
                currentValue = currentValue[pathPart];
              } else {
                console.warn(`getComponentProperty: Nested path '${propertyName}' not fully resolved at '${pathPart}' in component state/styles.`);
                currentValue = undefined; 
                break;
              }
            }
            componentSpecificFoundValue = currentValue;
          } else if (baseProperty in sourceObject && nestedPath.length === 0) { // Handle direct properties
             if (sourceObject[baseProperty] !== undefined && sourceObject[baseProperty] !== null) {
                 componentSpecificFoundValue = sourceObject[baseProperty];
             }
          }
          
          // Only assign to foundValue if something was actually found in this component's state/styles
          if (componentSpecificFoundValue !== undefined) {
              foundValue = componentSpecificFoundValue;
          }
          // --- END CORRECTED LOGIC --- 
          
          // Found component, stop searching state/styles further down this branch
          return true; 
        }

        // Recursively search children
        if (Array.isArray(comp.children)) {
          const childComponents = comp.children.filter((c): c is ComponentChild => typeof c === 'object');
          if (findRecursive(childComponents)) {
            return true; // Found in children
          }
        }
      }
      return false; // Not found in this branch
    };
    
    findRecursive(appComponents);

    // --- (Keep the rest of getComponentProperty including DOM fallback) --- 

    if (foundValue === undefined) {
      console.log(`Property '${propertyName}' not found in component state for '${targetId}'. Falling back to DOM.`);
      try {
        const element = document.getElementById(targetId);
        if (element) {
           if (nestedPath.length > 0 && (baseProperty === 'style' || baseProperty === 'styles')) {
             // Handle nested style property (e.g., styles.fontWeight)
             const styleProperty = nestedPath[0];
             // Convert camelCase to kebab-case for CSS properties
             const cssProperty = styleProperty.replace(/([A-Z])/g, "-$1").toLowerCase();
             foundValue = getComputedStyle(element).getPropertyValue(cssProperty);
           } else if (baseProperty === 'style' || baseProperty === 'styles') {
             // Handle request for the entire style object
             const computedStyle = getComputedStyle(element);
             const styleObj: Record<string, string> = {};
             for (let i = 0; i < computedStyle.length; i++) {
               const prop = computedStyle[i];
               const value = computedStyle.getPropertyValue(prop);
               if (value) {
                 // Convert kebab-case to camelCase for API consistency
                 const camelProp = prop.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
                 styleObj[camelProp] = value;
               }
             }
             foundValue = styleObj;
           } else if (baseProperty === 'value' && 'value' in element) {
             foundValue = (element as HTMLInputElement).value;
           } else if (baseProperty === 'checked' && 'checked' in element) {
             foundValue = (element as HTMLInputElement).checked;
           } else if (baseProperty === 'textContent' || baseProperty === 'content') { // Added 'content' mapping
             foundValue = element.textContent;
           } else if (baseProperty === 'innerHTML') {
             foundValue = element.innerHTML;
           } else {
              // Generic attribute fallback for non-nested properties
              if (nestedPath.length === 0) {
                 foundValue = element.getAttribute(propertyName);
              } else {
                 console.warn(`Cannot get nested non-style property '${propertyName}' directly from DOM.`);
              }
           }
        }
      } catch (e) {
          console.error(`Error reading property '${propertyName}' from DOM element '${targetId}':`, e);
          foundValue = undefined;
      }
    }

    // Return {} for styles if still undefined, otherwise return found value
    if (foundValue === undefined && (baseProperty === 'style' || baseProperty === 'styles')) {
        console.log(`Returning empty object for undefined style property '${propertyName}' on '${targetId}'.`);
        return {}; 
    }
    
    console.log(`[getComponentProperty Final] Got '${propertyName}' from '${targetId}' =`, foundValue);
    return foundValue;
  }, [appComponents]); // Depend on state
  // --- End getComponentProperty --- 

  // --- Modify setComponentProperty function --- 
  const setComponentProperty = useCallback((componentId: string, propertyName: string, value: any) => {
    console.log(`setComponentProperty: Setting '${propertyName}' to`, value, `on component '${componentId.replace('#', '')}'`);
    
    // --- Check for internal TOGGLE action --- 
    if (value && typeof value === 'object' && value.type === '_TOGGLE_INTERNAL_') {
      const toggleValues = value.values;
      if (Array.isArray(toggleValues) && toggleValues.length === 2) {
        const currentValue = getComponentProperty(componentId, propertyName);
        const newValue = (currentValue === toggleValues[0]) ? toggleValues[1] : toggleValues[0];
        console.log(`Toggle Action: Current='${currentValue}', New='${newValue}'`);
        setComponentProperty(componentId, propertyName, newValue);
        return;
      } else {
        console.warn("Invalid TOGGLE value received:", value);
        return;
      }
    }

    // Existing logic for setting properties (including nested and styles)
    let processedValue = value; 
    const targetId = componentId.replace('#', '');

    const propertyParts = propertyName.split('.');
    const baseProperty = propertyParts[0];
    const nestedPath = propertyParts.slice(1);
    
    // Handle nested property setting differently
    if (nestedPath.length > 0) {
      // Construct the nested update object
      const nestedUpdate = nestedPath.reduceRight((val, key) => ({ [key]: val }), processedValue);
      
      // Determine if this is a style update or a regular property update
      if (baseProperty === 'styles') {
        updateComponent(componentId, { styles: nestedUpdate });
      } else {
        // Assume it's under 'properties'
        updateComponent(componentId, { properties: { [baseProperty]: nestedUpdate } });
      }

      return; // Return after handling nested property via state update
    }
    
    // Handle direct style property (setting the whole style object)
    if (propertyName === 'style' && typeof processedValue === 'object') {
        updateComponent(componentId, { styles: processedValue }); 
        return; 
    }
    
    // Default behavior for non-nested properties (under 'properties')
    updateComponent(componentId, { 
        properties: { [propertyName]: processedValue } 
    });

  }, [updateComponent, getComponentProperty, appComponents]); // Added appComponents dependency for deep merge access
  // --- End setComponentProperty --- 

  // --- Define callComponentMethod ---
  const callComponentMethod = useCallback((componentId: string, methodName: string, ...args: any[]) => {
    console.log(`Attempting to call method '${methodName}' on component '${componentId}' with args:`, args);
    const targetId = componentId.replace('#', '');
    let foundComponent: ComponentChild | null = null;
    let methodCode: string | null = null;

    // Recursive search function
    const findComponentAndMethod = (components: ComponentChild[]) => {
      for (const comp of components) {
        if (comp.id === targetId) {
          foundComponent = comp;
          if (comp.methods && typeof comp.methods === 'object' && comp.methods[methodName]) {
            const methodInfo = comp.methods[methodName];
            if (typeof methodInfo === 'string') {
              methodCode = methodInfo;
            } else if (typeof methodInfo === 'object' && methodInfo.code) {
              methodCode = methodInfo.code;
            }
          }
          return true; // Found component, stop searching this branch
        }
        if (Array.isArray(comp.children)) {
          // Filter out strings before recursive call
          const childComponents = comp.children.filter((c): c is ComponentChild => typeof c === 'object');
          if (findComponentAndMethod(childComponents)) {
            return true; // Found in children, stop searching
          }
        }
      }
      return false; // Not found in this branch
    };

    findComponentAndMethod(appComponents); // Start search from root

    if (!foundComponent) {
      console.error(`callComponentMethod Error: Component with ID '${targetId}' not found.`);
      return;
    }

    if (!methodCode) {
      console.error(`callComponentMethod Error: Method '${methodName}' not found on component '${targetId}'.`);
      return;
    }
    
    // --- Type guard passed, methodCode is now guaranteed to be string ---

    console.log(`Executing method '${methodName}' for component '${targetId}'`);
    console.log("Method code:", methodCode);

    try {
      // Recreate the $m utility locally for this execution context
      const $m = (selector: string) => {
        console.log(`($m in callComponentMethod) selector called with: ${selector}`);
        const elementId = selector.startsWith('#') ? selector.substring(1) : selector;
        const element = document.getElementById(elementId);
        if (!element) {
          console.warn(`($m in callComponentMethod) Element not found: ${selector}`);
          // Return a similar dummy object as in DynamicComponent's $m
          return {
            getProperty: () => null,
            setProperty: () => {},
            setStyle: () => {},
            // Add other methods if needed, possibly calling global functions
          };
        }
        // Return a simplified $m interface - might need expansion
        return {
           getProperty: (prop: string) => {
              if (prop === 'value' && 'value' in element) return (element as HTMLInputElement).value;
              if (prop === 'checked' && 'checked' in element) return (element as HTMLInputElement).checked;
              if (prop === 'innerHTML') return element.innerHTML;
              if (prop === 'innerText' || prop === 'content') return element.textContent;
              return element.getAttribute(prop);
           },
           setProperty: (prop: string, value: any) => {
              if (prop === 'value' && 'value' in element) (element as HTMLInputElement).value = value;
              else if (prop === 'checked' && 'checked' in element) (element as HTMLInputElement).checked = value;
              else if (prop === 'innerHTML') element.innerHTML = value;
              else if (prop === 'innerText' || prop === 'content') element.textContent = value;
              else element.setAttribute(prop, value);
           },
           setStyle: (prop: string, value: string) => {
             (element.style as any)[prop] = value;
           }
        };
      };

      // Prepare the execution body
      let functionBody = '';
      // Use type assertion here to fix the 'never' type issue
      const codeAsString = methodCode as string;
      if (codeAsString.trim().startsWith('function')) {
        const bodyStart = codeAsString.indexOf('{');
        const bodyEnd = codeAsString.lastIndexOf('}');
        if (bodyStart !== -1 && bodyEnd > bodyStart) {
          functionBody = codeAsString.substring(bodyStart + 1, bodyEnd);
        }
  } else {
        functionBody = codeAsString; // Assume it's plain code if not a function string
      }

      // Create the function with necessary scope
      // Pass addComponent, removeComponent, updateComponent directly from useCallback closure
      // Pass args as an array named 'methodArgs'
      const func = new Function('$m', 'addComponent', 'removeComponent', 'updateComponent', 'methodArgs', functionBody);
      
      // Execute the function
      func($m, addComponent, removeComponent, updateComponent, args);

    } catch (error) {
      console.error(`Error executing method '${methodName}' for component '${targetId}':`, error);
      console.error("Method code that failed:", methodCode);
    }
  }, [appComponents, addComponent, removeComponent, updateComponent]); // Depend on state and callbacks
  // --- End callComponentMethod ---

  // --- Attach to window object --- 
  useEffect(() => {
    // Ensure $morpheo object exists
    window.$morpheo = window.$morpheo || {};
    // Assign the method to the global object
    window.$morpheo.callComponentMethod = callComponentMethod;
    console.log('callComponentMethod attached to window.$morpheo');

    // Cleanup function to remove from window on unmount
    return () => {
      if (window.$morpheo) {
        delete window.$morpheo.callComponentMethod;
        console.log('callComponentMethod removed from window.$morpheo');
      }
    };
  }, [callComponentMethod]); // Re-run if callComponentMethod instance changes
  // --- End attach to window --- 

  // Organize components from the *state* not the initial config
  const componentsByRegion: Record<string, ComponentChild[]> = {};
  if (initialConfig.layout?.regions) {
    initialConfig.layout.regions.forEach(region => { componentsByRegion[region] = []; });
  } else {
    componentsByRegion['main'] = [];
  }
  if (appComponents) {
    appComponents.forEach(component => {
      const componentWithKey = {
        ...component,
        key: `${component.id || 'comp'}-${JSON.stringify(component.properties || component.props || {})}`
      };
      const region = component.region || 'main';
      if (!componentsByRegion[region]) componentsByRegion[region] = [];
      componentsByRegion[region].push(componentWithKey);
    });
  }

  const renderRegion = (region: string) => {
    const components = componentsByRegion[region] || [];
                return (
      <div key={region} className={`region region-${region}`} style={getRegionStyle(region)}>
        {components.map((component, index) => (
                  <DynamicComponent
            key={component.key || component.id || `${region}-component-${index}`}
            component={component}
            functionality={initialConfig.functionality}
            eventHandlers={{
                ...eventHandlers,
                addComponent,
                removeComponent,
                updateComponent,
                getComponentProperty,
                setComponentProperty,
                addItem,       // Pass addItem
                removeItem     // Pass removeItem
            }}
            config={initialConfig} 
          />
        ))}
      </div>
    );
  };

  const getRegionStyle = (region: string): React.CSSProperties => {
    switch (region) {
      case 'header': return { padding: '1rem', backgroundColor: initialConfig.theme?.colors?.primary || '#f8f9fa', borderBottom: '1px solid #dee2e6' };
      case 'footer': return { padding: '1rem', backgroundColor: initialConfig.theme?.colors?.secondary || '#f8f9fa', borderTop: '1px solid #dee2e6', marginTop: 'auto' };
      case 'sidebar': return { width: '250px', backgroundColor: initialConfig.theme?.colors?.surface || '#ffffff', padding: '1rem', borderRight: '1px solid #dee2e6' };
      case 'main': return { flex: 1, padding: '1rem', backgroundColor: initialConfig.theme?.colors?.background || '#ffffff' };
      default: return { padding: '1rem' }; // Ensure default returns a value
    }
  };

  const getLayoutStructure = () => {
    const layoutType = initialConfig.layout?.type || 'singlepage';
    const regions = initialConfig.layout?.regions || ['main'];
    const appLayout: React.CSSProperties = { display: 'flex', flexDirection: 'column', minHeight: '100%', width: '100%' };

    if (layoutType === 'sidebar') {
        // --- Ensure this block RETURNS the JSX --- 
        return (
          <div style={{ ...appLayout, flexDirection: 'row' }}>
            {regions.includes('sidebar') && renderRegion('sidebar')}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {regions.filter(r => r !== 'sidebar' && r !== 'footer').map(region => renderRegion(region))}
              {regions.includes('footer') && renderRegion('footer')}
          </div>
            </div>
          );
    } else { // singlepage or default
      // --- Ensure this block also RETURNS the JSX --- 
      return (
          <div style={appLayout}>
            {regions.map(region => renderRegion(region))}
        </div>
      );
    }
    // Remove any implicit return path - all paths should return JSX now
  };

  // --- RESTORED Return Statement --- 
  return (
    <div className="app-container" style={{ 
      height: '100%', 
      width: '100%',
      fontFamily: initialConfig.theme?.typography?.fontFamily || 'inherit',
      fontSize: initialConfig.theme?.typography?.fontSize || 'inherit',
      color: initialConfig.theme?.colors?.text || 'inherit',
      backgroundColor: initialConfig.theme?.colors?.background || 'inherit'
    }}>
      {getLayoutStructure()}
    </div>
  );
}; // <-- Ensure this closing brace exists for ProcessAppConfig

// ... (Keep DynamicComponent export etc.) ... 