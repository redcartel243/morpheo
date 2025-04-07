import React, { useState, useEffect, ReactNode } from 'react';
import * as LibraryManager from '../../utils/LibraryManager';

/**
 * Props for a library dependency
 */
interface LibraryDependency {
  library: string;
  version?: string;
}

/**
 * Props for the LibraryLoader component
 */
export interface LibraryLoaderProps {
  /**
   * The name of the library to load (must be registered in LibraryManager)
   */
  library: string;
  
  /**
   * Optional specific version of the library
   */
  version?: string;
  
  /**
   * Optional custom URL to load from instead of the registered URL
   */
  url?: string;
  
  /**
   * Libraries that this library depends on (will be loaded first)
   */
  dependencies?: string[] | LibraryDependency[];
  
  /**
   * Content to render while the library is loading
   */
  loading?: ReactNode;
  
  /**
   * Function to render error state
   */
  errorRenderer?: (error: Error, retry: () => void) => ReactNode;
  
  /**
   * Children to render - can be a function that receives the loaded library
   */
  children: ((library: any) => ReactNode) | ReactNode;
  
  /**
   * Prop to access a specific property of the library (e.g., 'Chart' to access the Chart class from chart.js)
   */
  accessor?: string;
  
  /**
   * Optional className for the container
   */
  className?: string;
  
  /**
   * Whether to display debug information
   */
  debug?: boolean;
  
  /**
   * Alternative to loading prop - content to show while loading
   */
  fallback?: ReactNode;
  
  /**
   * Callback when library is loaded successfully
   */
  onLoad?: () => void;
  
  /**
   * Callback when library fails to load
   */
  onError?: (error: Error) => void;
  
  /**
   * Function to render error state (alternative to error prop)
   */
  errorFallback?: (error: Error) => ReactNode;
}

/**
 * Check if library is cached in localStorage
 * @param library The name of the library
 * @param version The version of the library
 * @returns True if cached information exists
 */
const isLibraryCached = (library: string, version?: string): boolean => {
  try {
    const cachedInfo = localStorage.getItem(`library_${library}_${version || 'latest'}_info`);
    return !!cachedInfo;
  } catch (e) {
    // In case localStorage is not available (private browsing, etc.)
    return false;
  }
};

/**
 * Mark a library as cached
 * @param library The name of the library
 * @param version The version of the library
 */
const markLibraryCached = (library: string, version?: string): void => {
  try {
    localStorage.setItem(
      `library_${library}_${version || 'latest'}_info`, 
      JSON.stringify({ 
        cachedAt: new Date().toISOString(),
        version: version
      })
    );
  } catch (e) {
    // Silently fail if localStorage is not available
    console.warn('Unable to cache library information:', e);
  }
};

/**
 * Single Library Loader Component
 * 
 * A component that dynamically loads an external library and renders
 * its children only when the library is successfully loaded.
 */
const LibraryLoader: React.FC<LibraryLoaderProps> = ({
  library,
  version,
  url,
  dependencies = [],
  loading,
  errorRenderer,
  children,
  accessor,
  className = '',
  debug = false,
  fallback = <DefaultFallback />,
  onLoad,
  onError,
  errorFallback
}) => {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [libraryInstance, setLibraryInstance] = useState<any>(null);
  
  useEffect(() => {
    let isMounted = true;
    
    const loadLibrary = async () => {
      try {
        // Check if this library is already loaded
        if (LibraryManager.isLibraryLoaded(library)) {
          if (isMounted) {
            // Get the library instance
            const instance = await LibraryManager.getLibraryInstance(library, accessor);
            setLibraryInstance(instance);
            setIsLoaded(true);
            onLoad?.();
          }
          return;
        }
        
        // Load all dependencies first
        if (dependencies.length > 0) {
          await Promise.all(dependencies.map(dep => {
            if (typeof dep === 'string') {
              return LibraryManager.loadLibrary(dep);
            } else {
              return LibraryManager.loadLibrary(dep.library, dep.version);
            }
          }));
        }
        
        // Load the main library
        await LibraryManager.loadLibrary(library, version, url);
        
        if (isMounted) {
          // Get the library instance
          const instance = await LibraryManager.getLibraryInstance(library, accessor);
          setLibraryInstance(instance);
          setIsLoaded(true);
          onLoad?.();
        }
      } catch (err) {
        console.error(`Error loading library ${library}:`, err);
        if (isMounted) {
          const error = err instanceof Error ? err : new Error(`Failed to load library ${library}`);
          setLoadError(error);
          onError?.(error);
        }
      }
    };
    
    // Start loading
    loadLibrary();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [library, version, url, onLoad, onError, dependencies, accessor]);
  
  if (loadError) {
    if (errorFallback) {
      return <>{errorFallback(loadError)}</>;
    } else if (errorRenderer) {
      return <>{errorRenderer(loadError, () => {})}</>;
    } else {
      return <div>Error loading library: {loadError.message}</div>;
    }
  }
  
  if (!isLoaded) {
    return <>{fallback}</>;
  }
  
  // Render children based on type
  return (
    <>
      {typeof children === 'function' 
        ? (children as Function)(libraryInstance) 
        : children
      }
    </>
  );
};

/**
 * Component that loads multiple libraries at once
 */
export interface MultiLibraryLoaderProps {
  /**
   * Map of libraries to load
   */
  libraries: Record<string, { 
    version?: string, 
    url?: string, 
    accessor?: string,
    dependencies?: string[] 
  }>;
  
  /**
   * Content to render while libraries are loading
   */
  loading?: ReactNode;
  
  /**
   * Content to render if loading fails
   */
  error?: (errors: Record<string, Error>, retry: () => void) => ReactNode;
  
  /**
   * Children function that receives the loaded libraries
   */
  children: (libraries: Record<string, any>) => ReactNode;
  
  /**
   * Optional className for the container
   */
  className?: string;
  
  /**
   * Whether to display debug information
   */
  debug?: boolean;
}

/**
 * A component that loads multiple libraries at once
 */
export const MultiLibraryLoader: React.FC<MultiLibraryLoaderProps> = ({
  libraries,
  loading,
  error,
  children,
  className = '',
  debug = false
}) => {
  const [loadedLibraries, setLoadedLibraries] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errors, setErrors] = useState<Record<string, Error>>({});
  const [loadCount, setLoadCount] = useState<number>(0);
  
  const libraryNames = Object.keys(libraries);
  
  useEffect(() => {
    if (libraryNames.length === 0) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    // Track which libraries have been loaded
    const newLoadedLibraries: Record<string, any> = {};
    const newErrors: Record<string, Error> = {};
    
    // Create a promise for each library
    const promises = libraryNames.map(name => {
      const config = libraries[name];
      
      // Load dependencies first if specified
      const dependencyPromises = (config.dependencies || []).map(dep =>
        LibraryManager.loadLibrary(dep)
      );
      
      return Promise.all(dependencyPromises)
        .then(() => LibraryManager.loadLibrary(name, config.version, config.url))
        .then(() => LibraryManager.getLibraryInstance(name, config.accessor))
        .then(instance => {
          if (debug) {
            console.log(`[MultiLibraryLoader] Successfully loaded ${name}`);
          }
          newLoadedLibraries[name] = instance;
          return true;
        })
        .catch(err => {
          if (debug) {
            console.error(`[MultiLibraryLoader] Error loading ${name}:`, err);
          }
          newErrors[name] = err instanceof Error ? err : new Error(String(err));
          return false;
        });
    });
    
    // Wait for all libraries to load or fail
    Promise.all(promises)
      .then(() => {
        setLoadedLibraries(newLoadedLibraries);
        setErrors(newErrors);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("[MultiLibraryLoader] Unexpected error:", err);
        setIsLoading(false);
      });
  }, [JSON.stringify(libraries), loadCount]);
  
  // Retry function for error state
  const retry = () => {
    setLoadCount(prevCount => prevCount + 1);
  };
  
  // If loading, show loading component
  if (isLoading) {
    return (
      <div className={`multi-library-loader loading ${className || ''}`}>
        {loading || <div>Loading libraries...</div>}
      </div>
    );
  }
  
  // If any errors and no libraries loaded, show error component
  if (Object.keys(errors).length > 0 && Object.keys(loadedLibraries).length === 0) {
    return (
      <div className={`multi-library-loader error ${className || ''}`}>
        {error ? error(errors, retry) : (
          <div>
            <p>Error loading libraries:</p>
            <ul>
              {Object.entries(errors).map(([name, err]) => (
                <li key={name}>{name}: {err.message}</li>
              ))}
            </ul>
            <button onClick={retry}>Retry</button>
          </div>
        )}
      </div>
    );
  }
  
  // Libraries loaded successfully (or partially), render children
  return (
    <div className={`multi-library-loader loaded ${className || ''}`}>
      {children(loadedLibraries)}
    </div>
  );
};

/**
 * Higher-order component that wraps a component with LibraryLoader
 */
export function withLibrary<P extends object>(
  Component: React.ComponentType<P & { libraryInstance?: any }>,
  libraryName: string,
  options: Omit<LibraryLoaderProps, 'library' | 'children'> = {}
): React.FC<P> {
  return (props: P) => (
    <LibraryLoader
      library={libraryName}
      {...options}
    >
      {(libraryInstance) => <Component {...props} libraryInstance={libraryInstance} />}
    </LibraryLoader>
  );
}

// Default loading component
const DefaultFallback = () => <div>Loading library...</div>;

export default LibraryLoader; 