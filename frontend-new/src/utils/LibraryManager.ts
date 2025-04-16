/**
 * LibraryManager
 * 
 * A utility for dynamically loading external libraries at runtime
 * when they're required by components but not pre-installed.
 */

/**
 * Record of libraries that are currently loading (not yet complete)
 */
const loadingLibraries: Record<string, Promise<void>> = {};

/**
 * Record of libraries that have been successfully loaded
 */
const loadedLibraries: Set<string> = new Set();

/**
 * Record of loaded library versions
 */
const loadedVersions: Record<string, string> = {};

/**
 * Registry of known libraries with their CDN URLs
 * Format: libraryName: { url: string or (version) => string, defaultVersion: string }
 */
const libraryRegistry: Record<string, { 
  url: string | ((version: string) => string), 
  defaultVersion: string,
  css?: string | ((version: string) => string), 
  global?: string,
  modules?: boolean
}> = {
  // Charts & Visualization
  'd3': {
    url: (version) => `https://cdn.jsdelivr.net/npm/d3@${version}/dist/d3.min.js`,
    defaultVersion: '7.8.5',
    global: 'd3'
  },
  'chart.js': {
    url: (version) => `https://cdn.jsdelivr.net/npm/chart.js@${version}/dist/Chart.min.js`,
    defaultVersion: '3.7.0',
    global: 'Chart'
  },
  'plotly.js': {
    url: (version) => `https://cdn.jsdelivr.net/npm/plotly.js@${version}/dist/plotly.min.js`,
    defaultVersion: '2.26.1',
    global: 'Plotly'
  },
  'echarts': {
    url: (version) => `https://cdn.jsdelivr.net/npm/echarts@${version}/dist/echarts.min.js`,
    defaultVersion: '5.4.3',
    global: 'echarts'
  },
  'apex-charts': {
    url: (version) => `https://cdn.jsdelivr.net/npm/apexcharts@${version}/dist/apexcharts.min.js`,
    defaultVersion: '3.44.0',
    css: (version) => `https://cdn.jsdelivr.net/npm/apexcharts@${version}/dist/apexcharts.css`,
    global: 'ApexCharts'
  },
  'highcharts': {
    url: (version) => `https://cdn.jsdelivr.net/npm/highcharts@${version}/highcharts.js`,
    defaultVersion: '11.1.0',
    global: 'Highcharts'
  },

  // UI Frameworks
  'bootstrap': {
    url: (version) => `https://cdn.jsdelivr.net/npm/bootstrap@${version}/dist/js/bootstrap.bundle.min.js`,
    defaultVersion: '5.3.2',
    css: (version) => `https://cdn.jsdelivr.net/npm/bootstrap@${version}/dist/css/bootstrap.min.css`,
    global: 'bootstrap'
  },
  'material-components': {
    url: (version) => `https://cdn.jsdelivr.net/npm/material-components-web@${version}/dist/material-components-web.min.js`,
    defaultVersion: '14.0.0',
    css: (version) => `https://cdn.jsdelivr.net/npm/material-components-web@${version}/dist/material-components-web.min.css`,
    global: 'mdc'
  },
  'tailwind': {
    url: (version) => `https://cdn.jsdelivr.net/npm/tailwindcss@${version}/dist/tailwind.min.js`,
    defaultVersion: '3.3.5',
    global: 'tailwind'
  },

  // Mapping
  'leaflet': {
    url: (version) => `https://cdn.jsdelivr.net/npm/leaflet@${version}/dist/leaflet.js`,
    defaultVersion: '1.9.4',
    css: (version) => `https://cdn.jsdelivr.net/npm/leaflet@${version}/dist/leaflet.css`,
    global: 'L'
  },
  'mapbox-gl': {
    url: (version) => `https://cdn.jsdelivr.net/npm/mapbox-gl@${version}/dist/mapbox-gl.js`,
    defaultVersion: '2.15.0',
    css: (version) => `https://cdn.jsdelivr.net/npm/mapbox-gl@${version}/dist/mapbox-gl.css`,
    global: 'mapboxgl'
  },
  'google-maps': {
    url: (version) => `https://maps.googleapis.com/maps/api/js?v=${version}&callback=initMap`,
    defaultVersion: 'weekly',
    global: 'google.maps'
  },

  // Animation Libraries
  'gsap': {
    url: (version) => `https://cdn.jsdelivr.net/npm/gsap@${version}/dist/gsap.min.js`,
    defaultVersion: '3.12.2',
    global: 'gsap'
  },
  'anime.js': {
    url: (version) => `https://cdn.jsdelivr.net/npm/animejs@${version}/lib/anime.min.js`,
    defaultVersion: '3.2.1',
    global: 'anime'
  },
  'lottie-web': {
    url: (version) => `https://cdn.jsdelivr.net/npm/lottie-web@${version}/build/player/lottie.min.js`,
    defaultVersion: '5.12.2',
    global: 'lottie'
  },

  // Utility Libraries
  'lodash': {
    url: (version) => `https://cdn.jsdelivr.net/npm/lodash@${version}/lodash.min.js`,
    defaultVersion: '4.17.21',
    global: '_'
  },
  'moment': {
    url: (version) => `https://cdn.jsdelivr.net/npm/moment@${version}/moment.min.js`,
    defaultVersion: '2.29.4',
    global: 'moment'
  },
  'dayjs': {
    url: (version) => `https://cdn.jsdelivr.net/npm/dayjs@${version}/dayjs.min.js`,
    defaultVersion: '1.11.10',
    global: 'dayjs'
  },
  'axios': {
    url: (version) => `https://cdn.jsdelivr.net/npm/axios@${version}/dist/axios.min.js`,
    defaultVersion: '1.5.1',
    global: 'axios'
  },

  // Data Processing
  'papaparse': {
    url: (version) => `https://cdn.jsdelivr.net/npm/papaparse@${version}/papaparse.min.js`,
    defaultVersion: '5.4.1',
    global: 'Papa'
  },
  'xlsx': {
    url: (version) => `https://cdn.jsdelivr.net/npm/xlsx@${version}/dist/xlsx.full.min.js`,
    defaultVersion: '0.18.13',
    global: 'XLSX'
  },

  // Rich Text Editors
  'quill': {
    url: (version) => `https://cdn.jsdelivr.net/npm/quill@${version}/dist/quill.min.js`,
    defaultVersion: '1.3.7',
    css: (version) => `https://cdn.jsdelivr.net/npm/quill@${version}/dist/quill.snow.css`,
    global: 'Quill'
  },
  'tinymce': {
    url: (version) => `https://cdn.jsdelivr.net/npm/tinymce@${version}/tinymce.min.js`,
    defaultVersion: '6.7.1',
    global: 'tinymce'
  },
  'monaco-editor': {
    url: (version) => `https://cdn.jsdelivr.net/npm/monaco-editor@${version}/min/vs/loader.js`,
    defaultVersion: '0.44.0',
    global: 'monaco'
  },

  // AI and ML Libraries
  'tensorflow': {
    url: (version) => `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@${version}/dist/tf.min.js`,
    defaultVersion: '4.12.0',
    global: 'tf'
  },
  'ml5': {
    url: (version) => `https://cdn.jsdelivr.net/npm/ml5@${version}/dist/ml5.min.js`,
    defaultVersion: '0.12.2',
    global: 'ml5'
  },

  // 3D and Graphics
  'three': {
    url: (version) => `https://cdn.jsdelivr.net/npm/three@${version}/build/three.min.js`,
    defaultVersion: '0.157.0',
    global: 'THREE'
  },
  'babylon': {
    url: (version) => `https://cdn.jsdelivr.net/npm/babylonjs@${version}/babylon.min.js`,
    defaultVersion: '6.24.0',
    global: 'BABYLON'
  },
  'p5': {
    url: (version) => `https://cdn.jsdelivr.net/npm/p5@${version}/lib/p5.min.js`,
    defaultVersion: '1.7.0',
    global: 'p5'
  },

  // Form Validation & Handling
  'yup': {
    url: (version) => `https://cdn.jsdelivr.net/npm/yup@${version}/index.js`,
    defaultVersion: '1.3.2',
    global: 'yup',
    modules: true
  },
  'formik': {
    url: (version) => `https://cdn.jsdelivr.net/npm/formik@${version}/dist/formik.umd.production.min.js`,
    defaultVersion: '2.4.5',
    global: 'Formik'
  },

  // Time & Date Pickers
  'flatpickr': {
    url: (version) => `https://cdn.jsdelivr.net/npm/flatpickr@${version}/dist/flatpickr.min.js`,
    defaultVersion: '4.6.13',
    css: (version) => `https://cdn.jsdelivr.net/npm/flatpickr@${version}/dist/flatpickr.min.css`,
    global: 'flatpickr'
  }
};

/**
 * Library dependencies - libraries that need to be loaded before other libraries
 */
const libraryDependencies: Record<string, string[]> = {
  'ml5': ['tensorflow'],
  'echarts': ['zrender'],
  'material-components': ['material-components-web'],
  'monaco-editor': [] // Special loading logic required
};

/**
 * Special handlers for libraries that require custom loading logic
 */
const specialLoadHandlers: Record<string, (version?: string) => Promise<void>> = {
  'google-maps': async (version?: string) => {
    const ver = version || libraryRegistry['google-maps'].defaultVersion;
    
    // Create a promise that will resolve when the map is initialized
    return new Promise<void>((resolve, reject) => {
      // Add global callback for Google Maps
      (window as any).initMap = () => {
        resolve();
      };
      
      // Create script tag
      const script = document.createElement('script');
      script.src = (libraryRegistry['google-maps'].url as Function)(ver);
      script.async = true;
      script.defer = true;
      script.onerror = () => reject(new Error('Failed to load Google Maps API'));
      document.head.appendChild(script);
    });
  },
  
  'monaco-editor': async (version?: string) => {
    const ver = version || libraryRegistry['monaco-editor'].defaultVersion;
    const loaderUrl = (libraryRegistry['monaco-editor'].url as Function)(ver);
    
    return new Promise<void>((resolve, reject) => {
      // First, load the AMD loader
      const script = document.createElement('script');
      script.src = loaderUrl;
      script.onload = () => {
        // Configure require
        (window as any).require.config({
          paths: { 'vs': `https://cdn.jsdelivr.net/npm/monaco-editor@${ver}/min/vs` }
        });
        
        // Load monaco editor
        (window as any).require(['vs/editor/editor.main'], () => {
          resolve();
        });
      };
      script.onerror = () => reject(new Error('Failed to load Monaco Editor'));
      document.head.appendChild(script);
    });
  }
};

/**
 * Cache loaded libraries in IndexedDB for faster loading
 */
const setupLibraryCache = (): void => {
  // Check if IndexedDB is available
  if (!('indexedDB' in window)) {
    console.warn('IndexedDB not available, library caching disabled');
    return;
  }
  
  // Set up the database
  const request = indexedDB.open('LibraryCache', 1);
  
  request.onerror = (event) => {
    console.error('Failed to open library cache database:', event);
  };
  
  request.onupgradeneeded = (event) => {
    const db = (event.target as IDBOpenDBRequest).result;
    
    // Create an object store for library metadata
    if (!db.objectStoreNames.contains('libraries')) {
      db.createObjectStore('libraries', { keyPath: 'id' });
    }
  };
  
  request.onsuccess = () => {
    console.log('Library cache database initialized');
  };
};

/**
 * Check if a library is cached in IndexedDB
 * @param library The library name
 * @param version The library version
 * @returns Promise resolving to true if cached, false otherwise
 */
const isLibraryCached = (library: string, version?: string): Promise<boolean> => {
  return new Promise((resolve) => {
    // If no IndexedDB, we can't cache
    if (!('indexedDB' in window)) {
      resolve(false);
      return;
    }
    
    const ver = version || libraryRegistry[library]?.defaultVersion || 'latest';
    const libraryId = `${library}@${ver}`;
    
    try {
      const request = indexedDB.open('LibraryCache', 1);
      
      request.onerror = () => {
        resolve(false);
      };
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['libraries'], 'readonly');
        const store = transaction.objectStore('libraries');
        const getRequest = store.get(libraryId);
        
        getRequest.onsuccess = () => {
          resolve(!!getRequest.result);
        };
        
        getRequest.onerror = () => {
          resolve(false);
        };
      };
    } catch (e) {
      console.warn('Error checking library cache:', e);
      resolve(false);
    }
  });
};

/**
 * Store information about a loaded library in IndexedDB
 * @param library The library name
 * @param version The library version
 */
const cacheLibraryInfo = (library: string, version?: string): void => {
  // If no IndexedDB, we can't cache
  if (!('indexedDB' in window)) {
    return;
  }
  
  const ver = version || libraryRegistry[library]?.defaultVersion || 'latest';
  const libraryId = `${library}@${ver}`;
  
  try {
    const request = indexedDB.open('LibraryCache', 1);
    
    request.onerror = (event) => {
      console.warn('Error opening cache database:', event);
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['libraries'], 'readwrite');
      const store = transaction.objectStore('libraries');
      
      store.put({
        id: libraryId,
        library,
        version: ver,
        cachedAt: new Date().toISOString()
      });
    };
  } catch (e) {
    console.warn('Error caching library info:', e);
  }
};

// Initialize the library cache
setupLibraryCache();

/**
 * Dynamically load a library from CDN
 * @param library The name of the library to load
 * @param version Optional specific version to load
 * @param customUrl Optional custom URL to load from
 * @returns Promise that resolves when the library is loaded
 */
export const loadLibrary = async (
  library: string,
  version?: string,
  customUrl?: string
): Promise<void> => {
  // If library is already loaded, return immediately
  if (loadedLibraries.has(library)) {
    return Promise.resolve();
  }

  // If library is already loading, return the existing promise
  if (library in loadingLibraries) {
    return loadingLibraries[library];
  }

  // Check if the library is registered
  if (!customUrl && !libraryRegistry[library]) {
    throw new Error(`Library '${library}' is not registered in the library registry`);
  }

  // Check if this library is cached
  const isCached = await isLibraryCached(library, version);
  console.log(`Library ${library} cached status:`, isCached);

  // Create a promise to load the library
  const loadPromise = new Promise<void>(async (resolve, reject) => {
    try {
      // First, load dependencies if any
      if (libraryDependencies[library]) {
        for (const dep of libraryDependencies[library]) {
          await loadLibrary(dep);
        }
      }

      // Check if there's a special load handler for this library
      if (specialLoadHandlers[library]) {
        await specialLoadHandlers[library](version);
        loadedLibraries.add(library);
        if (version) {
          loadedVersions[library] = version;
        } else if (libraryRegistry[library]) {
          loadedVersions[library] = libraryRegistry[library].defaultVersion;
        }

        // Cache library info
        cacheLibraryInfo(library, version);
        
        return resolve();
      }

      // Determine URL to load from
      let url: string;
      let cssUrl: string | undefined;

      if (customUrl) {
        url = customUrl;
      } else {
        const registryEntry = libraryRegistry[library];
        const ver = version || registryEntry.defaultVersion;
        
        if (typeof registryEntry.url === 'function') {
          url = registryEntry.url(ver);
        } else {
          url = registryEntry.url;
        }
        
        if (registryEntry.css) {
          if (typeof registryEntry.css === 'function') {
            cssUrl = registryEntry.css(ver);
          } else {
            cssUrl = registryEntry.css;
          }
        }
        
        // Store version info
        loadedVersions[library] = ver;
      }

      // Load CSS if needed
      if (cssUrl) {
        const linkElement = document.createElement('link');
        linkElement.rel = 'stylesheet';
        linkElement.href = cssUrl;
        document.head.appendChild(linkElement);
      }

      // Load the script
      const scriptElement = document.createElement('script');
      scriptElement.src = url;
      scriptElement.async = true;
      scriptElement.type = libraryRegistry[library]?.modules ? 'module' : 'text/javascript';

      // Set up event handlers
      scriptElement.onload = () => {
        // Library successfully loaded
        loadedLibraries.add(library);
        delete loadingLibraries[library];
        
        // Cache info about this library
        cacheLibraryInfo(library, version);
        
        resolve();
      };

      scriptElement.onerror = (event) => {
        // Failed to load library
        delete loadingLibraries[library];
        reject(new Error(`Failed to load library '${library}' from ${url}`));
      };

      // Add script to the document
      document.head.appendChild(scriptElement);

    } catch (error) {
      // Handle any errors
      delete loadingLibraries[library];
      reject(error);
    }
  });

  // Store the loading promise
  loadingLibraries[library] = loadPromise;
  
  return loadPromise;
};

/**
 * Check if a library is loaded
 * @param library The name of the library to check
 * @returns True if the library is loaded, false otherwise
 */
export const isLibraryLoaded = (library: string): boolean => {
  return loadedLibraries.has(library);
};

/**
 * Check if a library is currently loading
 * @param library The name of the library to check
 * @returns True if the library is currently loading, false otherwise
 */
export const isLibraryLoading = (library: string): boolean => {
  return library in loadingLibraries;
};

/**
 * Wait for a library to be loaded
 * @param library The name of the library to wait for
 * @returns Promise that resolves when the library is loaded
 */
export const waitForLibrary = async (library: string): Promise<void> => {
  if (loadedLibraries.has(library)) {
    return Promise.resolve();
  }
  
  if (library in loadingLibraries) {
    return loadingLibraries[library];
  }
  
  throw new Error(`Library '${library}' is not loading or loaded`);
};

/**
 * Get the version of a loaded library
 * @param library The name of the library
 * @returns The version of the library, or null if not loaded
 */
export const getLibraryVersion = (library: string): string | null => {
  return loadedVersions[library] || null;
};

/**
 * Get a loaded library instance (wait for it if necessary)
 * @param library The name of the library
 * @param accessor Optional dot-notation path to access a specific part of the library
 * @returns Promise that resolves with the library object
 */
export const getLibraryInstance = async (library: string, accessor?: string): Promise<any> => {
  // If not loaded, wait for it
  if (!isLibraryLoaded(library)) {
    if (isLibraryLoading(library)) {
      await waitForLibrary(library);
    } else {
      throw new Error(`Library '${library}' is not loading or loaded`);
    }
  }
  
  // Get global object access
  const windowObject = window as any;
  
  // If an accessor is provided, use it to access a specific part of the library
  if (accessor) {
    const accessorParts = accessor.split('.');
    let currentObject: any = windowObject;
    
    for (const part of accessorParts) {
      if (currentObject && typeof currentObject === 'object') {
        currentObject = currentObject[part];
      } else {
        throw new Error(`Cannot access ${accessor} from library ${library}`);
      }
    }
    
    return currentObject;
  }
  
  // Get the library's global object
  if (libraryRegistry[library]?.global) {
    const globalPath = libraryRegistry[library]?.global?.split('.') || [];
    let globalObj: any = windowObject;
    
    for (const part of globalPath) {
      if (globalObj && typeof globalObj === 'object') {
        globalObj = globalObj[part];
      } else {
        throw new Error(`Global object for library ${library} not found at ${libraryRegistry[library]?.global}`);
      }
    }
    
    return globalObj;
  }
  
  // Otherwise, return the library object from the window
  return windowObject[library];
};

/**
 * Register a custom library
 * @param name The name of the library
 * @param url The URL for the library or a function that returns the URL based on version
 * @param options Additional options for the library
 */
export const registerLibrary = (
  name: string,
  url: string | ((version: string) => string),
  options: {
    defaultVersion?: string;
    css?: string | ((version: string) => string);
    global?: string;
    dependencies?: string[];
    modules?: boolean;
    specialLoadHandler?: (version?: string) => Promise<void>;
  } = {}
): void => {
  // Register the library
  libraryRegistry[name] = {
    url,
    defaultVersion: options.defaultVersion || 'latest',
    css: options.css,
    global: options.global,
    modules: options.modules
  };
  
  // Register dependencies if any
  if (options.dependencies && options.dependencies.length > 0) {
    libraryDependencies[name] = options.dependencies;
  }
  
  // Register special load handler if provided
  if (options.specialLoadHandler) {
    specialLoadHandlers[name] = options.specialLoadHandler;
  }
};

/**
 * Get a list of registered libraries
 * @returns Array of library names
 */
export const getRegisteredLibraries = (): string[] => {
  return Object.keys(libraryRegistry);
};

/**
 * Get a list of loaded libraries
 * @returns Array of loaded library names
 */
export const getLoadedLibraries = (): string[] => {
  return Array.from(loadedLibraries);
};

/**
 * Preload multiple libraries
 * @param libraries Array of library names to preload
 * @returns Promise that resolves when all libraries are loaded
 */
export const preloadLibraries = async (libraries: string[]): Promise<void> => {
  await Promise.all(libraries.map(lib => loadLibrary(lib)));
};

/**
 * @deprecated Use getLibraryInstance instead to avoid ESLint hooks warnings
 * Legacy function to use a loaded library (wait for it if necessary)
 * This is kept for backward compatibility
 * @param library The name of the library
 * @param accessor Optional dot-notation path to access a specific part of the library
 * @returns Promise that resolves with the library object
 */
export const useLibrary = async (library: string, accessor?: string): Promise<any> => {
  return getLibraryInstance(library, accessor);
};

export default {
  loadLibrary,
  isLibraryLoaded,
  isLibraryLoading,
  waitForLibrary,
  getLibraryInstance,
  useLibrary,
  registerLibrary,
  getRegisteredLibraries,
  getLoadedLibraries,
  preloadLibraries,
  getLibraryVersion
}; 