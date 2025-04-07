import { useState, useEffect, useCallback } from 'react';
import * as LibraryManager from '../utils/LibraryManager';

interface UseLibraryOptions {
  version?: string;
  url?: string;
  onLoad?: (library: any) => void;
  onError?: (error: Error) => void;
  accessor?: string;
}

interface UseLibraryResult<T = any> {
  library: T | null;
  isLoading: boolean;
  error: Error | null;
  reload: () => void;
}

/**
 * React hook to load and use an external library
 * @param libraryName Name of the library to load
 * @param options Loading options
 */
export function useLibrary<T = any>(
  libraryName: string,
  options: UseLibraryOptions = {}
): UseLibraryResult<T> {
  const [library, setLibrary] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [loadId, setLoadId] = useState<number>(0);
  
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    
    const loadLib = async () => {
      try {
        // Load the library
        await LibraryManager.loadLibrary(libraryName, options.version, options.url);
        
        // Wait for library to be loaded
        if (LibraryManager.isLibraryLoading(libraryName)) {
          await LibraryManager.waitForLibrary(libraryName);
        }
        
        // Get the library instance
        const libraryInstance = await LibraryManager.getLibraryInstance(libraryName, options.accessor);
        
        if (isMounted) {
          setLibrary(libraryInstance as unknown as T);
          setIsLoading(false);
          
          // Call onLoad callback if provided
          if (options.onLoad) {
            options.onLoad(libraryInstance as unknown as T);
          }
        }
      } catch (err) {
        console.error(`Error loading library ${libraryName}:`, err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    };
    
    loadLib();
    
    return () => {
      isMounted = false;
    };
  }, [libraryName, options.version, options.url, options.accessor, loadId]);
  
  // Function to reload the library
  const reload = useCallback(() => {
    setLoadId(prevId => prevId + 1);
  }, []);
  
  return { library, isLoading, error, reload };
}

interface LibraryConfig {
  version?: string;
  url?: string;
  accessor?: string;
}

/**
 * React hook to load multiple libraries at once
 * @param libraries Map of library names and their configurations
 */
export function useMultipleLibraries(
  libraries: Record<string, LibraryConfig>
): {
  libraries: Record<string, any>;
  isLoading: boolean;
  errors: Record<string, Error>;
  reload: () => void;
} {
  const libraryNames = Object.keys(libraries);
  const [loadedLibraries, setLoadedLibraries] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errors, setErrors] = useState<Record<string, Error>>({});
  const [loadId, setLoadId] = useState<number>(0);
  
  const reload = () => {
    setIsLoading(true);
    setErrors({});
    setLoadedLibraries({});
    setLoadId(prevId => prevId + 1);
  };
  
  useEffect(() => {
    if (libraryNames.length === 0) {
      setIsLoading(false);
      return;
    }
    
    const allPromises = libraryNames.map(libName => {
      const config = libraries[libName];
      
      return LibraryManager.loadLibrary(libName, config.version, config.url)
        .then(() => LibraryManager.getLibraryInstance(libName, config.accessor))
        .then(lib => ({ libName, lib, error: null }))
        .catch(err => ({ 
          libName, 
          lib: null, 
          error: err instanceof Error ? err : new Error(String(err))
        }));
    });
    
    Promise.all(allPromises)
      .then(results => {
        const newLibraries: Record<string, any> = {};
        const newErrors: Record<string, Error> = {};
        
        results.forEach(({ libName, lib, error }) => {
          if (lib) {
            newLibraries[libName] = lib;
          }
          if (error) {
            newErrors[libName] = error;
          }
        });
        
        setLoadedLibraries(newLibraries);
        setErrors(newErrors);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Unexpected error loading libraries:', err);
        setIsLoading(false);
      });
  }, [JSON.stringify(libraries), loadId]);
  
  return { libraries: loadedLibraries, isLoading, errors, reload };
}

export default { useLibrary, useMultipleLibraries }; 