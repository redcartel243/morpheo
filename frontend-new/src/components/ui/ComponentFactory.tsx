import React, { useEffect, useState } from 'react';
import { loadLibrary, getLibraryInstance, isLibraryLoaded } from '../../utils/LibraryManager';

/**
 * ComponentDefinition specifies what a component needs
 */
export interface ComponentDefinition {
  // The component name
  name: string;
  
  // Required libraries that must be loaded for this component to work
  requiredLibraries?: string[];
  
  // Optional libraries that enhance the component but aren't strictly necessary
  optionalLibraries?: string[];
  
  // Whether to lazy-load the component
  lazyLoad?: boolean;
  
  // Function to get the component
  getComponent: () => Promise<React.ComponentType<any>> | React.ComponentType<any>;
  
  // Default props to apply
  defaultProps?: Record<string, any>;
  
  // Function to validate props
  validateProps?: (props: any) => boolean;
  
  // Prop transformations before rendering
  transformProps?: (props: any) => any;
}

// Registry to hold all registered components
const componentRegistry: Record<string, ComponentDefinition> = {};

// Cache for loaded components
const loadedComponents: Record<string, React.ComponentType<any>> = {};

// Track loading components
const loadingComponents: Record<string, Promise<React.ComponentType<any>>> = {};

/**
 * Register a component with the factory
 */
export function registerComponent(definition: ComponentDefinition): void {
  if (componentRegistry[definition.name]) {
    console.warn(`Component ${definition.name} is already registered. Overwriting...`);
  }
  componentRegistry[definition.name] = definition;
}

/**
 * Check if the required libraries for a component are loaded
 */
export function areLibrariesLoaded(componentName: string): boolean {
  const definition = componentRegistry[componentName];
  if (!definition) {
    console.warn(`Component ${componentName} is not registered`);
    return false;
  }
  
  if (!definition.requiredLibraries || definition.requiredLibraries.length === 0) {
    return true;
  }
  
  return definition.requiredLibraries.every(lib => isLibraryLoaded(lib));
}

/**
 * Load all required libraries for a component
 */
export async function loadRequiredLibraries(componentName: string): Promise<boolean> {
  const definition = componentRegistry[componentName];
  if (!definition) {
    console.warn(`Component ${componentName} is not registered`);
    return false;
  }
  
  if (!definition.requiredLibraries || definition.requiredLibraries.length === 0) {
    return true;
  }
  
  try {
    await Promise.all(definition.requiredLibraries.map(lib => loadLibrary(lib)));
    return true;
  } catch (err) {
    console.error(`Failed to load required libraries for ${componentName}:`, err);
    return false;
  }
}

/**
 * Get a component by name, loading libraries if needed
 */
export async function getComponent(componentName: string): Promise<React.ComponentType<any> | null> {
  // Check if component is already loaded
  if (loadedComponents[componentName]) {
    return loadedComponents[componentName];
  }
  
  // Check if component is currently being loaded
  if (componentName in loadingComponents) {
    return loadingComponents[componentName];
  }
  
  // Get component definition
  const definition = componentRegistry[componentName];
  if (!definition) {
    console.warn(`Component ${componentName} is not registered`);
    return null;
  }
  
  // Create the loading promise
  loadingComponents[componentName] = (async () => {
    try {
      // Load required libraries first
      if (definition.requiredLibraries && definition.requiredLibraries.length > 0) {
        await Promise.all(definition.requiredLibraries.map(lib => loadLibrary(lib)));
      }
      
      // Load optional libraries in the background
      if (definition.optionalLibraries && definition.optionalLibraries.length > 0) {
        Promise.all(definition.optionalLibraries.map(lib => 
          loadLibrary(lib).catch(err => console.warn(`Optional library ${lib} failed to load:`, err instanceof Error ? err.message : String(err)))
        )).catch(() => {/* Ignore errors for optional libraries */});
      }
      
      // Get the component
      const Component = await definition.getComponent();
      
      // Cache the component
      loadedComponents[componentName] = Component;
      
      return Component;
    } catch (err) {
      console.error(`Failed to load component ${componentName}:`, err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      delete loadingComponents[componentName];
    }
  })();
  
  return loadingComponents[componentName];
}

/**
 * Creates a HOC that loads required libraries for a component
 */
export function withRequiredLibraries<P extends object>(
  componentName: string,
  Component: React.ComponentType<P>
): React.FC<P> {
  const WithLibraries: React.FC<P> = (props) => {
    const [librariesLoaded, setLibrariesLoaded] = React.useState(areLibrariesLoaded(componentName));
    const [loading, setLoading] = React.useState(!librariesLoaded);
    const [error, setError] = React.useState<string | null>(null);
    
    React.useEffect(() => {
      // If libraries are already loaded, skip
      if (librariesLoaded) return;
      
      // Load required libraries
      setLoading(true);
      loadRequiredLibraries(componentName)
        .then(success => {
          setLibrariesLoaded(success);
          setLoading(false);
          if (!success) {
            setError(`Failed to load required libraries for ${componentName}`);
          }
        })
        .catch(err => {
          console.error(`Error loading libraries for ${componentName}:`, err instanceof Error ? err.message : String(err));
          setLoading(false);
          setError(`Error loading required libraries: ${err instanceof Error ? err.message : String(err)}`);
        });
    }, [librariesLoaded, componentName]);
    
    // While loading, show a loading indicator
    if (loading) {
      return (
        <div className="loading-libraries">
          <div className="loading-spinner"></div>
          <div>Loading required libraries...</div>
        </div>
      );
    }
    
    // If there was an error, show error state
    if (error) {
      return (
        <div className="library-error">
          <div className="error-icon">⚠️</div>
          <div>{error}</div>
          <button onClick={() => {
            setError(null);
            setLoading(true);
            loadRequiredLibraries(componentName)
              .then(success => {
                setLibrariesLoaded(success);
                setLoading(false);
                if (!success) {
                  setError(`Failed to load required libraries for ${componentName}`);
                }
              })
              .catch(err => {
                setLoading(false);
                setError(`Error loading required libraries: ${err instanceof Error ? err.message : String(err)}`);
              });
          }}>
            Retry
          </button>
        </div>
      );
    }
    
    // Get component definition to transform props if needed
    const definition = componentRegistry[componentName];
    if (definition && definition.transformProps) {
      const transformedProps = definition.transformProps(props);
      return <Component {...transformedProps as P} />;
    }
    
    // All libraries loaded, render the component
    return <Component {...props} />;
  };
  
  return WithLibraries;
}

/**
 * Create a dynamic component
 */
export function createDynamicComponent<P extends object = any>(
  componentName: string,
  defaultProps?: P
): React.FC<P> {
  const DynamicComponent: React.FC<P> = (props) => {
    const [Component, setComponent] = useState<React.ComponentType<P> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
      // Special handling for native HTML elements
      if (['div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'canvas'].includes(componentName)) {
        // For native HTML elements, just create a wrapper component
        const NativeComponent: React.FC<any> = ({ children, ...props }) => {
          // Use type assertion to create the element without JSX namespace
          return React.createElement(
            componentName, 
            props, 
            children
          );
        };
        setComponent(NativeComponent as React.ComponentType<P>);
        setLoading(false);
        return;
      }
      
      // If not yet loaded, load the component
      if (!Component) {
        setLoading(true);
        getComponent(componentName)
          .then(comp => {
            if (comp) {
              setComponent(comp as React.ComponentType<P>);
              setLoading(false);
            } else {
              setError(`Component ${componentName} could not be loaded`);
              setLoading(false);
            }
          })
          .catch(err => {
            console.error(`Error loading component ${componentName}:`, err instanceof Error ? err.message : String(err));
            setError(`Error loading component: ${err instanceof Error ? err.message : String(err)}`);
            setLoading(false);
          });
      }
    }, [Component, componentName]);
    
    // If loading, show loading state
    if (loading) {
      return (
        <div className="loading-component">
          <div className="loading-spinner"></div>
          <div>Loading {componentName}...</div>
        </div>
      );
    }
    
    // If error, show error state
    if (error) {
      return (
        <div className="component-error">
          <div className="error-icon">⚠️</div>
          <div>{error}</div>
          <button onClick={() => {
            setComponent(null);
            setError(null);
            setLoading(true);
            getComponent(componentName)
              .then(comp => {
                if (comp) {
                  setComponent(comp as React.ComponentType<P>);
                  setLoading(false);
                } else {
                  setError(`Component ${componentName} could not be loaded`);
                  setLoading(false);
                }
              })
              .catch(err => {
                setError(`Error loading component: ${err instanceof Error ? err.message : String(err)}`);
                setLoading(false);
              });
          }}>
            Retry
          </button>
        </div>
      );
    }
    
    // If loaded, render the component with merged props
    if (Component) {
      const mergedProps = { ...defaultProps, ...props };
      return <Component {...mergedProps} />;
    }
    
    // Fallback
    return null;
  };
  
  return DynamicComponent;
}

/**
 * Create a lazy-loaded component with required library dependencies
 */
export function createLibraryComponent<P extends object = any>(
  componentName: string,
  requiredLibraries: string[] = [],
  getComponentFn: () => Promise<React.ComponentType<any>> | React.ComponentType<any>,
  defaultProps?: Partial<P>
): React.FC<P> {
  // Register the component if not already registered
  if (!componentRegistry[componentName]) {
    registerComponent({
      name: componentName,
      requiredLibraries,
      getComponent: getComponentFn,
      defaultProps: defaultProps as Record<string, any>,
    });
  }
  
  return createDynamicComponent<P>(componentName, defaultProps as P);
}

/**
 * Get registered component names
 */
export function getRegisteredComponents(): string[] {
  return Object.keys(componentRegistry);
}

/**
 * Check if a component is registered
 */
export function isComponentRegistered(componentName: string): boolean {
  return !!componentRegistry[componentName];
}

/**
 * Get a component definition
 */
export function getComponentDefinition(componentName: string): ComponentDefinition | undefined {
  return componentRegistry[componentName];
}

export default {
  registerComponent,
  getComponent,
  createDynamicComponent,
  createLibraryComponent,
  withRequiredLibraries,
  getRegisteredComponents,
  isComponentRegistered,
  getComponentDefinition,
  loadRequiredLibraries,
  areLibrariesLoaded
}; 