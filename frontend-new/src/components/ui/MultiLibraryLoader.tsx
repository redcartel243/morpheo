import React, { useState, useEffect, ReactNode } from 'react';
import * as LibraryManager from '../../utils/LibraryManager';

/**
 * Props for the MultiLibraryLoader component
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

export default MultiLibraryLoader; 