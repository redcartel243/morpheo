import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ProcessAppConfig } from './ui/DynamicComponent';
import { useParams } from 'react-router-dom';
import * as apiService from '../services/api';
import {
  formatNumber, validateInput, animateElement, safeEval,
  formatDate, formatCurrency, truncateText,
  closest, siblings, create, storeValue, getValue, watchValue,
  sanitizeInput
} from '../utils/domUtils';
import {
  createSafeEventHandler
} from '../utils/enhancedBehaviors';
import { enhanceForm, createFormSummary } from '../utils/formBehaviors';
import { enhanceTooltip } from '../utils/tooltipBehaviors';
import { enhanceDragDrop } from '../utils/dragDropBehaviors';
import { enhanceContextMenu } from '../utils/contextMenuBehaviors';
import {
  enhanceTabIndex, enhanceAriaAttributes, enhanceColorContrast
} from '../utils/accessibilityBehaviors';
import {
  initComponentState, 
  bindStateToComponent, 
  restoreComponentState,
  createStateTransition,
  syncComponentWithDOM
} from '../utils/stateManagement';
import {
  analyzeComponentRelationships,
  analyzeComponentsFromDOM
} from '../utils/componentRelationship';
import { adaptMethodsToEvents, withMethodsAdapter } from '../core/DynamicComponentAdapter';

// Global DOM manipulation registry
declare global {
  interface Window {
    $morpheo?: Record<string, any>;
    $m?: (selector: string) => any;
  }
}

/**
 * AppViewer component for viewing and interacting with Morpheo applications.
 * This component fetches the app configuration from the API and renders it using the ProcessAppConfig component.
 */
interface AppViewerProps {
  appConfig?: any; // Allow passing app config directly
  height?: string;
  width?: string;
  onEvent?: (eventName: string, data: any) => void;
}

// Create an enhanced ProcessAppConfig with method adapter
const EnhancedProcessAppConfig = withMethodsAdapter(ProcessAppConfig);

/**
 * Validates method code and returns a clean version for execution
 * This ensures that method code is properly formatted and safe to execute
 */
function validateAndCleanMethodCode(methodCode: string): string {
  if (!methodCode || methodCode.trim() === '') {
    return 'function(event, $m) { console.error("Empty method code provided"); }';
  }

  try {
    // If the code is already a valid function declaration, return it as is
    if (methodCode.trim().startsWith('function(')) {
      // Test if we can create a function with this code
      try {
        new Function('event', '$m', methodCode.replace('function(event, $m)', ''));
        return methodCode;
      } catch (innerError) {
        console.error('Invalid method code:', innerError);
      }
    }
    
    // If it's an object with a code property, extract the code
    if (methodCode.includes('"code":')) {
      try {
        const methodObj = JSON.parse(methodCode);
        if (methodObj && methodObj.code) {
          return validateAndCleanMethodCode(methodObj.code);
        }
      } catch (parseError) {
        // Not a JSON object, continue with other approaches
      }
    }

    // If we're here, we need to wrap the code
    let wrappedCode = `function(event, $m) { ${methodCode} }`;
    
    // Test the wrapped code
    try {
      new Function('event', '$m', wrappedCode.replace('function(event, $m)', ''));
      return wrappedCode;
    } catch (wrapError) {
      console.error('Failed to wrap method code:', wrapError);
    }

    // If all else fails, return a safe empty function that logs the error
    return `function(event, $m) { console.error("Invalid method code could not be executed:", ${JSON.stringify(methodCode)}); }`;
  } catch (error) {
    console.error('Error validating method code:', error);
    return `function(event, $m) { console.error("Error in method code:", "Method validation failed"); }`;
  }
}

// Add this interface to define event data types
interface ComponentEvent {
  eventName: string;
  data: any;
}

const AppViewer: React.FC<AppViewerProps> = ({ appConfig: propAppConfig, height, width, onEvent }) => {
  const [appConfig, setAppConfig] = useState<any>(propAppConfig || null);
  const [isLoading, setIsLoading] = useState<boolean>(!propAppConfig);
  const [error, setError] = useState<string | null>(null);
  const { appId } = useParams<{ appId: string }>();
  const appContainerRef = useRef<HTMLDivElement>(null);
  const [componentsAnalyzed, setComponentsAnalyzed] = useState<boolean>(false);
  const [componentUsageStats, setComponentUsageStats] = useState<Record<string, number>>({});

  // Log component usage statistics
  const logComponentUsage = (config: any) => {
    if (!config || !config.components) return;
    
    // Track component types
    const stats: Record<string, number> = {};
    
    // Recursive function to count component types
    const countComponentTypes = (component: any) => {
      if (!component) return;
      
      // Count the component type
      const type = component.type?.toLowerCase() || 'unknown';
      stats[type] = (stats[type] || 0) + 1;
      
      // Recursively process children
      if (Array.isArray(component.children)) {
        component.children.forEach((child: any) => {
          if (typeof child === 'object') {
            countComponentTypes(child);
          }
        });
      }
    };
    
    // Process all top-level components
    config.components.forEach((component: any) => {
      countComponentTypes(component);
    });
    
    // Store and log the stats
    setComponentUsageStats(stats);
    
    console.log('Component Usage Statistics:');
    console.table(stats);
    
    // Log detailed component structure
    console.log('Component Hierarchy:');
    config.components.forEach((component: any, index: number) => {
      console.group(`Root Component ${index + 1}: ${component.type} (${component.id || 'no-id'})`);
      
      if (component.children && component.children.length > 0) {
        console.log(`Contains ${component.children.length} children`);
      }
      
      // Log methods if available
      if (component.methods && Object.keys(component.methods).length > 0) {
        console.log(`Has ${Object.keys(component.methods).length} methods:`, 
          Object.keys(component.methods).join(', '));
      }
      
      console.groupEnd();
    });
    
    // Log if any map components are detected
    if (stats['map']) {
      console.log(`%cMap component detected! (${stats['map']} instances)`, 
        'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
    }
  };

  // Initialize the global DOM manipulation object
  useEffect(() => {
    // Initialize the global $morpheo object
    window.$morpheo = window.$morpheo || {};
    
    // Create the global selector function
    window.$m = (selector: string) => {
      if (!selector) return null;
      
      // Extract ID from selector
      const id = selector.startsWith('#') ? selector.substring(1) : selector;
      
      // Ensure $morpheo exists
      if (!window.$morpheo) {
        window.$morpheo = {};
      }
      
      // Return the component reference if it exists
      if (window.$morpheo[id]) {
        return window.$morpheo[id];
      }
      
      // Create a new reference for the element
      const elementRef = {
        // DOM element getter
        element: () => document.getElementById(id),
        
        // Get element helper
        getElement: () => document.getElementById(id),
        
        // Property manipulation
        getProperty: (propName: string) => {
          const element = document.getElementById(id);
          if (!element) return null;
          
          if (propName === 'content' || propName === 'text') {
            return element.textContent;
          } else if (propName === 'value') {
            return (element as HTMLInputElement).value;
          } else if (propName === 'checked') {
            return (element as HTMLInputElement).checked;
          } else {
            return element.getAttribute(propName);
          }
        },
        
        setProperty: (propName: string, value: any) => {
          const element = document.getElementById(id);
          if (!element) return null;
          
          // Sanitize user input for security
          const safeValue = typeof value === 'string' ? sanitizeInput(value) : value;
          
          if (propName === 'content' || propName === 'text') {
            element.textContent = safeValue;
          } else if (propName === 'value') {
            (element as HTMLInputElement).value = safeValue;
          } else if (propName === 'checked') {
            (element as HTMLInputElement).checked = safeValue;
          } else {
            element.setAttribute(propName, safeValue);
          }
          
          // Dispatch change event for inputs
          if ((propName === 'value' || propName === 'checked') && 
              (element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA')) {
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }
          
          return safeValue;
        },
        
        // Style manipulation
        setStyle: (styleName: string, value: string) => {
          const element = document.getElementById(id);
          if (!element) return null;
          
          element.style[styleName as any] = value;
          return value;
        },
        
        // Classes manipulation
        addClass: (className: string) => {
          const element = document.getElementById(id);
          if (!element) return null;
          
          element.classList.add(className);
          return true;
        },
        
        removeClass: (className: string) => {
          const element = document.getElementById(id);
          if (!element) return null;
          
          element.classList.remove(className);
          return true;
        },
        
        // Get value helper
        getValue: () => {
          const element = document.getElementById(id);
          if (!element) {
            console.warn(`getValue: Element not found for selector #${id}`);
            return '';
          }
          
          if (element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
            console.log(`getValue: Getting value from ${id}:`, (element as HTMLInputElement).value);
            return (element as HTMLInputElement).value;
          } else {
            console.log(`getValue: Getting text content from ${id}:`, element.textContent);
            return element.textContent || '';
          }
        },
        
        // Set value helper
        setValue: (value: any) => {
          const element = document.getElementById(id);
          if (!element) {
            console.warn(`setValue: Element not found for selector #${id}`);
            return null;
          }
          
          // Sanitize user input for security
          const safeValue = typeof value === 'string' ? sanitizeInput(value) : value;
          console.log(`setValue: Setting value for ${id} to:`, safeValue);
          
          if (element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
            (element as HTMLInputElement).value = safeValue;
            element.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            element.textContent = safeValue;
          }
          
          return safeValue;
        },
        
        // Animation helper
        animate: (keyframes: Keyframe[] | PropertyIndexedKeyframes, options?: KeyframeAnimationOptions) => {
          const element = document.getElementById(id);
          if (!element) return null;
          
          return element.animate(keyframes, options);
        },
        
        // Show/hide helpers
        show: () => {
          const element = document.getElementById(id);
          if (!element) return null;
          
          element.style.display = '';
          return true;
        },
        
        hide: () => {
          const element = document.getElementById(id);
          if (!element) return null;
          
          element.style.display = 'none';
          return true;
        },
        
        // Event dispatching
        emit: (eventName: string, detail?: any) => {
          const element = document.getElementById(id);
          if (!element) return null;
          
          element.dispatchEvent(new CustomEvent(eventName, { 
            bubbles: true, 
            detail 
          }));
          return true;
        },
        
        // Get value shorthand
        getElementValue: () => {
          const element = document.getElementById(id);
          if (!element) return null;
          
          if (element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
            return (element as HTMLInputElement).value;
          } else {
            return element.textContent;
          }
        },
        
        // Validation helper
        validate: (type?: string) => {
          const element = document.getElementById(id);
          if (!element) return { isValid: false, message: 'Element not found' };
          
          if (element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
            const validationType = type || (element as HTMLInputElement).type || 'text';
            return validateInput((element as HTMLInputElement).value, validationType);
          }
          
          return { isValid: true };
        },
        
        // Enhanced animation with predefined animations
        animateElement: (animation: string, options?: any) => {
          const element = document.getElementById(id);
          if (!element) return null;
          
          return animateElement(element, animation, options);
        },
        
        // Remove child helper
        removeChild: (childElement: HTMLElement | string) => {
          const parent = document.getElementById(id);
          if (!parent) return false;
          
          let childToRemove: HTMLElement | null = null;
          
          // Handle string (selector or ID)
          if (typeof childElement === 'string') {
            // If it's a selector
            if (childElement.startsWith('#')) {
              childToRemove = document.getElementById(childElement.substring(1));
            } else {
              // Assume it's an ID
              childToRemove = document.getElementById(childElement);
            }
          } else {
            // It's already an element
            childToRemove = childElement;
          }
          
          if (!childToRemove) return false;
          
          try {
            parent.removeChild(childToRemove);
            return true;
          } catch (error) {
            console.error('Error removing child:', error);
            return false;
          }
        }
      };
      
      // Store the reference globally
      window.$morpheo[id] = elementRef;
      
      return elementRef;
    };
    
    // Cleanup function
    return () => {
      delete window.$m;
      window.$morpheo = {};
    };
  }, []);

  // Load the app configuration if not provided as a prop
  useEffect(() => {
    if (propAppConfig) {
      setAppConfig(propAppConfig);
      setIsLoading(false);
      
      // Log component usage statistics
      logComponentUsage(propAppConfig);
      console.log('App configuration loaded from props');
    } else if (appId) {
      setIsLoading(true);
      
      // Fetch the app configuration from the API
      apiService.getConfigById(appId)
        .then(data => {
          setAppConfig(data);
          setIsLoading(false);
          setError(null);
          
          // Log component usage statistics
          logComponentUsage(data);
          console.log('App configuration loaded from API');
        })
        .catch(err => {
          console.error('Failed to load app configuration:', err);
          setError('Failed to load app configuration. Please try again later.');
      setIsLoading(false);
        });
    }
  }, [propAppConfig, appId]);

  // Analyze component relationships after app is loaded
  useEffect(() => {
    if (!appContainerRef.current || componentsAnalyzed || !appConfig) return;
    
    // Small delay to ensure DOM elements are rendered
    const timer = setTimeout(() => {
      try {
        // Analyze component relationships
        const analysis = analyzeComponentsFromDOM(appContainerRef.current!);
        console.log('Component analysis results:', analysis);
        
        // Auto-bind state to input components
        analysis.inputComponents.forEach(componentId => {
          const element = document.getElementById(componentId);
          if (element) {
            bindStateToComponent(componentId, element);
          }
        });
        
        // Process component methods from the app configuration
        processComponentMethods(appConfig.components || []);
        
        setComponentsAnalyzed(true);
      } catch (error) {
        console.error('Error analyzing component relationships:', error);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [appConfig, componentsAnalyzed]);
  
  // Process component methods from config
  const processComponentMethods = useCallback((components: any[]) => {
    // Function to process a single component and its children
    const processComponent = (component: any) => {
      // Skip if no ID or methods/events
      if (!component.id) return;
      
      const element = document.getElementById(component.id);
      if (!element) return;

      // Process both methods AND events
      const processHandlers = (sourceObj: any, sourceType: string) => {
        if (!sourceObj) return;
        
        Object.entries(sourceObj).forEach(([eventName, methodInfo]) => {
          // Skip if no method info
          if (!methodInfo) return;
          
          // Extract method code and affected components
          let methodCode: string | null = null;
          
          if (typeof methodInfo === 'string') {
            methodCode = methodInfo;
          } else if (typeof methodInfo === 'object' && methodInfo !== null) {
            // Check if methodInfo has a 'code' property
            const methodInfoObj = methodInfo as Record<string, any>;
            if (methodInfoObj.code && typeof methodInfoObj.code === 'string') {
              methodCode = methodInfoObj.code;
            }
          }
          
          if (!methodCode) return;
          
          try {
            // Validate and clean the method code
            methodCode = validateAndCleanMethodCode(methodCode);
            console.log(`Validated method code for ${component.id}, event ${eventName}:`, methodCode.substring(0, 50) + "...");
            
            // Create a safe event handler with a direct execution approach
            const safeFunction = createSafeEventHandler(function(event: Event) {
              try {
                // Create a function that will execute the validated method code
                const methodFunction = new Function('event', '$m', 
                  `try {
                    console.log('Method execution');
                    
                    // Create helper functions
                    const getValue = function(selector) {
                      const el = document.getElementById(selector.replace('#', ''));
                      if (!el) {
                        console.warn('getValue: Element not found for selector', selector);
                        return '';
                      }
                      return el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' 
                        ? el.value : el.textContent || '';
                    };
                    
                    const setValue = function(selector, value) {
                      const el = document.getElementById(selector.replace('#', ''));
                      if (!el) {
                        console.warn('setValue: Element not found for selector', selector);
                        return;
                      }
                      if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
                        el.value = value;
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                      } else {
                        el.textContent = value;
                      }
                    };
                    
                    // Create a simple selector function if $m isn't available
                    const selector = function(selectorStr) {
                      const result = {
                        getValue: () => getValue(selectorStr),
                        setValue: (value) => setValue(selectorStr, value),
                        getElement: () => document.getElementById(selectorStr.replace('#', ''))
                      };
                      return result;
                    };
                    
                    // Use the proper $m implementation or our fallback
                    const $m_impl = window.$m || selector;
                    
                    return (${methodCode})(event, $m_impl);
                  } catch (error) {
                    console.error('Error executing method:', error);
                    return null;
                  }`
                );
                
                // Execute the method
                return methodFunction(event, window.$m);
              } catch (error) {
                console.error(`Error executing method for ${component.id}, event ${eventName}:`, error);
                return null;
              }
            });
            
            // Normalize the event name by removing 'on' prefix if present
            const normalizedDOMEventName = eventName.startsWith('on') && eventName.length > 2
              ? eventName.charAt(2).toLowerCase() + eventName.slice(3)
              : eventName;
              
            // Normalize the event name for method storage to use the 'on' prefix
            const normalizedMethodName = eventName.startsWith('on') 
              ? eventName 
              : `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
            
            // Add the event listener using the DOM event name format (without 'on' prefix)
            element.addEventListener(normalizedDOMEventName, safeFunction);
            
            // Store the method in the component reference for future use
            if (window.$morpheo && window.$morpheo[component.id]) {
              if (!window.$morpheo[component.id].methods) {
                window.$morpheo[component.id].methods = {};
              }
              
              // Store both the function and the original code using the normalized method name
              window.$morpheo[component.id].methods[normalizedMethodName] = {
                handler: safeFunction,
                code: methodCode,
                execute: function(event: Event) {
                  return safeFunction(event);
                }
              };
              
              // Also store directly for compatibility with some code patterns
              window.$morpheo[component.id][normalizedMethodName] = function(event: Event) {
                return safeFunction(event);
              };
            }
          } catch (error) {
            console.error(`Error setting up method for ${component.id}, event ${eventName}:`, error);
          }
        });
      };
      
      // Process methods and events from the component
      processHandlers(component.methods, 'methods');
      processHandlers(component.events, 'events');
      
      // Recursively process child components if any
      if (component.children && Array.isArray(component.children)) {
        component.children.forEach((child: any) => {
          if (typeof child === 'object') {
            processComponent(child);
          }
        });
      }
    };
    
    // Process all top-level components
    components.forEach(processComponent);
  }, []);

  // Handle events from components - now using direct DOM manipulation
  const handleEvent = useCallback((event: any) => {
    console.log('App event:', event);
    
    // Wrap event handler in error boundary
    try {
      // Events are handled directly by component methods using DOM manipulation
      // No need for a central event dispatcher anymore
    } catch (error) {
      console.error('Error handling event:', error);
    }
  }, []);

  // Add these handler functions that were referenced in the component
  const handleRegionComponentsUpdated = (regionName: string, components: any[]) => {
    console.log(`Region ${regionName} updated with ${components.length} components`);
  };

  const handleRegionsUpdated = (regions: string[]) => {
    console.log(`App regions updated: ${regions.join(', ')}`);
  };

  if (isLoading) {
    return <div className="loading">Loading app...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!appConfig) {
    return <div className="error">No app configuration available</div>;
  }

  return (
    <div className="app-viewer" ref={appContainerRef} style={{ height, width }}>
      <div className="app-container" style={{ 
        margin: '0 auto', 
        maxWidth: width || 'initial',
        width: '100%',
        position: 'relative',
        padding: '20px',
        backgroundColor: '#fff',
        color: '#333'
      }}>
        <EnhancedProcessAppConfig 
          config={appConfig} 
          onRegionComponentsUpdated={handleRegionComponentsUpdated}
          onRegionsUpdated={handleRegionsUpdated}
          onComponentEventOccurred={(eventName: string, data: any) => {
            if (onEvent) {
              onEvent(eventName, data);
            }
          }}
        />
      </div>
    </div>
  );
};

export default AppViewer; 