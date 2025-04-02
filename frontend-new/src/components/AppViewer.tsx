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
}

// Create an enhanced ProcessAppConfig with method adapter
const EnhancedProcessAppConfig = withMethodsAdapter(ProcessAppConfig);

/**
 * Validates method code and returns a clean version for execution
 * This ensures that method code is properly formatted and safe to execute
 */
function validateAndCleanMethodCode(code: string): string {
  try {
    // If empty, return a safe empty function
    if (!code || code.trim() === '') {
      return 'function(event, $m) { console.error("Empty method code"); }';
    }

    // Check if it's already a function declaration
    const trimmedCode = code.trim();
    if (trimmedCode.startsWith('function(')) {
      // Test if it's valid by creating a function (but don't execute it)
      try {
        // eslint-disable-next-line no-new-func
        new Function('return ' + trimmedCode);
        return trimmedCode; // It's valid function code
      } catch (e) {
        console.error('Invalid function code, will try to repair:', e);
      }
    }
    
    // If we're here, it's either not a function or the function has syntax errors
    // Try to wrap it in a proper function
    try {
      const wrappedCode = `function(event, $m) { ${code} }`;
      // Test if valid
      // eslint-disable-next-line no-new-func
      new Function('return ' + wrappedCode);
      return wrappedCode;
    } catch (e) {
      console.error('Failed to wrap code in function:', e);
      
      // Last resort: return a safe empty function with error logging
      return 'function(event, $m) { console.error("Invalid method code could not be executed: ' + String(e).replace(/"/g, '\\"') + '"); }';
    }
  } catch (e) {
    console.error('Error validating method code:', e);
    return 'function(event, $m) { console.error("Invalid method code could not be processed"); }';
  }
}

const AppViewer: React.FC<AppViewerProps> = ({ appConfig: propAppConfig, height, width }) => {
  const [appConfig, setAppConfig] = useState<any>(propAppConfig || null);
  const [isLoading, setIsLoading] = useState<boolean>(!propAppConfig);
  const [error, setError] = useState<string | null>(null);
  const { appId } = useParams<{ appId: string }>();
  const appContainerRef = useRef<HTMLDivElement>(null);
  const [componentsAnalyzed, setComponentsAnalyzed] = useState<boolean>(false);

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

  // Process any incoming app configuration
  useEffect(() => {
    if (propAppConfig) {
      try {
        // Use the adapter directly without deep copying first
        setAppConfig(propAppConfig);
      } catch (error) {
        console.error("Error processing app config:", error);
        // Fall back to original config
        setAppConfig(propAppConfig);
      }
    }
  }, [propAppConfig]);

  // Load app configuration from API only if not provided via props
  const loadAppConfig = useCallback(async () => {
    if (propAppConfig || !appId) return; // Skip if config is provided via props
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Use the getConfigById function from the API service
      const data = await apiService.getConfigById(appId);
      
      if (data) {
        // Don't try to pre-adapt the data - let the adapter HOC handle it
        setAppConfig(data);
      } else {
        setError('No app configuration found');
      }
    } catch (err) {
      console.error('Error loading app:', err);
      setError('Failed to load app configuration');
    } finally {
      setIsLoading(false);
    }
  }, [appId, propAppConfig]);

  useEffect(() => {
    loadAppConfig();
  }, [loadAppConfig]);

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
      <EnhancedProcessAppConfig 
        config={appConfig} 
        eventHandlers={{
          handleEvent
        }}
      />
    </div>
  );
};

export default AppViewer; 