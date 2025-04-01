import React, { useState, useEffect, useCallback } from 'react';
import { ProcessAppConfig } from './ui/DynamicComponent';
import { useParams } from 'react-router-dom';
import * as apiService from '../services/api';

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

const AppViewer: React.FC<AppViewerProps> = ({ appConfig: propAppConfig, height, width }) => {
  const [appConfig, setAppConfig] = useState<any>(propAppConfig || null);
  const [isLoading, setIsLoading] = useState<boolean>(!propAppConfig);
  const [error, setError] = useState<string | null>(null);
  const { appId } = useParams<{ appId: string }>();

  // Initialize the global DOM manipulation object
  useEffect(() => {
    // Initialize the global $morpheo object
    window.$morpheo = window.$morpheo || {};
    
    // Create the global selector function
    window.$m = (selector: string) => {
      if (!selector) return null;
      
      // Extract ID from selector
      const id = selector.startsWith('#') ? selector.substring(1) : selector;
      
      // Return the component reference if it exists
      if (window.$morpheo && window.$morpheo[id]) {
        return window.$morpheo[id];
      }
      
      // Create a new reference for the element
      return {
        // DOM element getter
        element: () => document.getElementById(id),
        
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
          
          return value;
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
        }
      };
    };
    
    // Cleanup on component unmount
    return () => {
      delete window.$m;
      window.$morpheo = {};
    };
  }, []);

  // Load app configuration from API only if not provided via props
  const loadAppConfig = useCallback(async () => {
    if (propAppConfig || !appId) return; // Skip if config is provided via props
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Use the getConfigById function from the API service
      const data = await apiService.getConfigById(appId);
      
      if (data) {
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

  // Handle events from components - now using direct DOM manipulation
  const handleEvent = useCallback((event: any) => {
    console.log('App event:', event);
    
    // Events are handled directly by component methods using DOM manipulation
    // No need for a central event dispatcher anymore
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
    <div className="app-viewer">
      <ProcessAppConfig 
        config={appConfig} 
          eventHandlers={{
            handleEvent
          }}
        />
    </div>
  );
};

export default AppViewer; 