import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ProcessAppConfig } from './ui/DynamicComponent';
import { useParams } from 'react-router-dom';
import * as apiService from '../services/api';
import {
  animateElement
} from '../utils/domUtils';
import { withMethodsAdapter } from '../core/DynamicComponentAdapter';

// Global DOM manipulation registry
declare global {
  interface Window {
    $morpheo?: Record<string, any>;
    $m?: (selector: string) => any;
    _methodExecutionTimestamps?: Record<string, number>;
    _isProcessingEvent?: boolean;
  }
}

/**
 * AppViewer component for viewing and interacting with Morpheo applications.
 */
interface AppViewerProps {
  appConfig?: any; // Allow passing app config directly
  height?: string;
  width?: string;
  onEvent?: (eventName: string, data: any) => void;
}

// Create an enhanced ProcessAppConfig with method adapter
const EnhancedProcessAppConfig = withMethodsAdapter(ProcessAppConfig);

const AppViewer: React.FC<AppViewerProps> = ({ appConfig: propAppConfig, height, width, onEvent }) => {
  const [appConfig, setAppConfig] = useState<any>(propAppConfig || null);
  const [isLoading, setIsLoading] = useState<boolean>(!propAppConfig);
  const [error, setError] = useState<string | null>(null);
  const { appId } = useParams<{ appId: string }>();
  const appContainerRef = useRef<HTMLDivElement>(null);
  const [componentUsageStats, setComponentUsageStats] = useState<Record<string, number>>({});

  // Log component usage statistics
  const logComponentUsage = (config: any) => {
    if (!config || !config.components) return;
    const stats: Record<string, number> = {};
    const countComponentTypes = (component: any) => {
      if (!component) return;
      const type = component.type?.toLowerCase() || 'unknown';
      stats[type] = (stats[type] || 0) + 1;
      if (Array.isArray(component.children)) {
        component.children.forEach((child: any) => {
          if (typeof child === 'object') {
            countComponentTypes(child);
          }
        });
      }
    };
    config.components.forEach((component: any) => {
      countComponentTypes(component);
    });
    setComponentUsageStats(stats);
    console.log('Component Usage Statistics:');
    console.table(stats);
    console.log('Component Hierarchy:');
    config.components.forEach((component: any, index: number) => {
      console.group(`Root Component ${index + 1}: ${component.type} (${component.id || 'no-id'})`);
      if (component.children && component.children.length > 0) {
        console.log(`Contains ${component.children.length} children`);
      }
      if (component.methods && Object.keys(component.methods).length > 0) {
        console.log(`Has ${Object.keys(component.methods).length} methods:`, Object.keys(component.methods).join(', '));
      }
      console.groupEnd();
    });
    if (stats['map']) {
      console.log(`%cMap component detected! (${stats['map']} instances)`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
    }
  };

  // Initialize the global DOM manipulation object
  useEffect(() => {
    window.$morpheo = window.$morpheo || {};
    window.$m = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) {
        console.warn(`Element not found: ${selector}`);
        return {
          element: null, getValue: () => '', setValue: () => null,
          getProperty: () => null, setProperty: () => null,
          getStyle: () => null, setStyle: () => null,
          addClass: () => null, removeClass: () => null, toggleClass: () => null,
          on: () => null, off: () => null,
          show: () => null, hide: () => null, animate: () => null,
        };
      }
      return {
        element,
        getValue: () => {
          if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) return element.value;
            return element.textContent || '';
        },
        setValue: (value: string) => {
          if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) element.value = value;
          else element.textContent = value;
          return element;
        },
        getProperty: (prop: string) => (element as any)[prop],
        setProperty: (prop: string, value: any) => { (element as any)[prop] = value; return element; },
        getStyle: (prop: string) => window.getComputedStyle(element).getPropertyValue(prop),
        setStyle: (prop: string, value: string) => {
          if (element instanceof HTMLElement) {
            if (prop === 'transform') {
              element.style.transform = value;
              if (!element.style.transition) element.style.transition = 'transform 0.3s ease';
            } else {
              element.style[prop as any] = value;
            }
          }
          return element;
        },
        addClass: (className: string) => { element.classList.add(className); return element; },
        removeClass: (className: string) => { element.classList.remove(className); return element; },
        toggleClass: (className: string) => { element.classList.toggle(className); return element; },
        on: (eventName: string, handler: EventListener) => { element.addEventListener(eventName, handler); return element; },
        off: (eventName: string, handler: EventListener) => { element.removeEventListener(eventName, handler); return element; },
        show: () => { (element as HTMLElement).style.display = ''; return element; },
        hide: () => { (element as HTMLElement).style.display = 'none'; return element; },
        animate: (animation: string, options: Record<string, any> = {}) => { animateElement(element as HTMLElement, animation, options); return element; }
      };
    };
    window._methodExecutionTimestamps = window._methodExecutionTimestamps || {};
    window._isProcessingEvent = false;
  }, []);

  // Load the app configuration if not provided as a prop
  useEffect(() => {
    if (propAppConfig) {
      setAppConfig(propAppConfig);
      setIsLoading(false);
      logComponentUsage(propAppConfig);
      console.log('App configuration loaded from props');
    } else if (appId) {
      setIsLoading(true);
      apiService.getConfigById(appId)
        .then(data => {
          setAppConfig(data);
          setIsLoading(false);
          setError(null);
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

  // Add these handler functions back as they might be used by EnhancedProcessAppConfig
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
        {/* Ensure we are using the enhanced component that handles methods */}
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