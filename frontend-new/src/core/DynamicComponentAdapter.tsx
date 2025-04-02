import React from 'react';
import { ComponentInterface } from './ComponentInterface';

/**
 * Defines the basic structure of a component in our system
 */
interface ComponentType {
  id?: string;
  type?: string;
  properties?: Record<string, any>;
  styles?: Record<string, any>;
  methods?: Record<string, any>;
  events?: Record<string, any>;
  children?: (ComponentType | string)[];
  [key: string]: any;
}

/**
 * Creates a deep copy of an object to ensure it's extensible
 * @param obj The object to copy
 * @returns A deep copy of the object
 */
function deepCopy<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  // Handle Date
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  // Handle Array
  if (Array.isArray(obj)) {
    return obj.map(item => deepCopy(item)) as unknown as T;
  }
  
  // Handle Object
  const copy = {} as Record<string, any>;
  Object.keys(obj as Record<string, any>).forEach(key => {
    copy[key] = deepCopy((obj as Record<string, any>)[key]);
  });
  
  return copy as T;
}

/**
 * Adapter function to convert legacy format methods to events format
 * This is needed to bridge the gap between the different event handling formats
 */
export function adaptMethodsToEvents(component: ComponentType): ComponentType {
  // Make a deep copy to avoid mutating the original
  const adaptedComponent = deepCopy(component);
  
  // If there are no methods, no adaptation needed
  if (!adaptedComponent.methods) {
    return adaptedComponent;
  }
  
  // Create events object if it doesn't exist
  if (!adaptedComponent.events) {
    adaptedComponent.events = {};
  }
  
  // Process each method and convert it to an event
  Object.entries(adaptedComponent.methods).forEach(([methodName, methodDef]) => {
    // Skip if undefined
    if (!methodDef) return;
    
    // Convert method names from onClick format to click format
    let eventName = methodName;
    if (methodName.startsWith('on') && methodName.length > 2) {
      // Convert onClick to click format
      eventName = methodName.charAt(2).toLowerCase() + methodName.slice(3);
    }
    
    // Create a normalized copy of the method definition
    let normalizedMethodDef = methodDef;
    
    // Ensure the method definition has a consistent format
    if (typeof methodDef === 'string') {
      normalizedMethodDef = { code: methodDef };
    } else if (typeof methodDef === 'object' && methodDef !== null) {
      // Already an object, keep it as is
      normalizedMethodDef = { ...methodDef };
    }
    
    // Add the method to events object
    adaptedComponent.events![eventName] = normalizedMethodDef;
    
    // Also keep the original method to support both formats
    adaptedComponent.methods![methodName] = normalizedMethodDef;
  });
  
  // Process children recursively
  if (adaptedComponent.children && Array.isArray(adaptedComponent.children)) {
    adaptedComponent.children = adaptedComponent.children.map((child) => {
      if (typeof child === 'object' && child !== null) {
        return adaptMethodsToEvents(child as ComponentType);
      }
      return child;
    });
  }
  
  return adaptedComponent;
}

/**
 * App config type
 */
interface AppConfig {
  app?: Record<string, any>;
  layout?: Record<string, any>;
  components?: ComponentType[];
  [key: string]: any;
}

/**
 * Higher-order component that adapts component formats
 * This wraps ProcessAppConfig to ensure compatibility
 */
export function withMethodsAdapter(WrappedComponent: React.ComponentType<any>): React.FC<any> {
  return (props: { config: AppConfig; [key: string]: any }) => {
    try {
      // Make a deep copy of the config to ensure it's extensible
      const adaptedConfig: AppConfig = { ...props.config };
      
      // Deep copy and adapt components
      if (adaptedConfig.components && Array.isArray(adaptedConfig.components)) {
        adaptedConfig.components = adaptedConfig.components.map((comp: ComponentType) => 
          adaptMethodsToEvents(comp)
        );
      }
      
      // Pass the adapted config to the wrapped component
      return <WrappedComponent {...props} config={adaptedConfig} />;
    } catch (error) {
      console.error("Error in method adapter:", error);
      // Return original component with original props as fallback
      return <WrappedComponent {...props} />;
    }
  };
} 