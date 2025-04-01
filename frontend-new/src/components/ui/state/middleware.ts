import { Middleware, StateAction } from './StateManager';
import { SUBSCRIBE, UNSUBSCRIBE } from './actionTypes';

/**
 * Thunk middleware - allows dispatching functions that can dispatch actions
 * This is useful for async operations and complex action sequences
 */
export const createThunkMiddleware = <TState>(): Middleware<TState> => {
  return (state, action, next) => {
    // Check if action.payload is a function (thunk)
    if (typeof action.payload === 'function') {
      // Call the thunk with state and dispatch
      action.payload(state, (nextAction: StateAction) => {
        // Tag thunk actions for debugging
        const actionWithMeta = {
          ...nextAction, 
          meta: { ...(nextAction.meta || {}), thunk: true }
        };
        
        // Continue middleware chain with the dispatched action
        next(actionWithMeta);
      });
    } else {
      // Not a thunk, continue with original action
      next(action);
    }
  };
};

/**
 * Create API middleware for handling API requests
 */
export function createApiMiddleware<TState>(options?: {
  baseUrl?: string;
  headers?: Record<string, string> | (() => Record<string, string>);
  onRequest?: (url: string, options: RequestInit) => Promise<RequestInit>;
  onResponse?: (response: Response) => Promise<Response>;
  onError?: (error: any, action: StateAction) => void;
}): Middleware<TState> {
  return (state, action, next) => {
    // Only process actions with API meta field
    if (!action.meta?.api) {
      next(action);
      return;
    }
    
    const {
      baseUrl = '',
      headers: baseHeaders = {},
      onRequest,
      onResponse,
      onError = console.error
    } = options || {};
    
    const {
      url,
      method = 'GET',
      body,
      headers: actionHeaders = {},
      params = {},
      responseType = 'json',
      withCredentials = false
    } = action.meta.api;
    
    // Build URL with query params
    let fullUrl = `${baseUrl}${url}`;
    
    if (Object.keys(params).length > 0) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
      fullUrl += `?${queryParams.toString()}`;
    }
    
    // Combine headers
    const headers = {
      ...typeof baseHeaders === 'function' ? baseHeaders() : baseHeaders,
      ...actionHeaders
    };
    
    // Set default content type for non-GET requests with body
    if (body && method !== 'GET' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    
    // Build request options
    let requestOptions: RequestInit = {
      method,
      headers,
      credentials: withCredentials ? 'include' : 'same-origin',
      body: body ? JSON.stringify(body) : undefined
    };
    
    // First dispatch request action
    next({
      type: `${action.type}_REQUEST`,
      meta: { ...action.meta, originalAction: action }
    });
    
    // Process request
    const processRequest = async () => {
      try {
        // Apply onRequest hook if provided
        if (onRequest) {
          requestOptions = await onRequest(fullUrl, requestOptions);
        }
        
        // Make the API call
        let response = await fetch(fullUrl, requestOptions);
        
        // Apply onResponse hook if provided
        if (onResponse) {
          response = await onResponse(response);
        }
        
        // Check for error status
        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (e) {
            errorData = { message: response.statusText };
          }
          
          // Dispatch error action
          next({
            type: `${action.type}_FAILURE`,
            payload: errorData,
            meta: { 
              ...action.meta, 
              originalAction: action,
              status: response.status
            }
          });
          
          return;
        }
        
        // Parse response based on responseType
        let data;
        switch (responseType) {
          case 'json':
            data = await response.json();
            break;
          case 'text':
            data = await response.text();
            break;
          case 'blob':
            data = await response.blob();
            break;
          case 'arraybuffer':
            data = await response.arrayBuffer();
            break;
          default:
            data = await response.json();
        }
        
        // Dispatch success action
        next({
          type: `${action.type}_SUCCESS`,
          payload: data,
          meta: { 
            ...action.meta, 
            originalAction: action,
            status: response.status
          }
        });
      } catch (error) {
        // Handle network errors
        onError(error, action);
        
        next({
          type: `${action.type}_FAILURE`,
          payload: { message: (error as any).message || 'Unknown error' },
          meta: { 
            ...action.meta, 
            originalAction: action,
            error
          }
        });
      }
    };
    
    // Execute the request
    processRequest();
  };
}

/**
 * Create debounce middleware
 * This delays dispatching actions with the same type to avoid rapid consecutive calls
 */
export function createDebounceMiddleware<TState>(options?: {
  defaultDelay?: number;
}): Middleware<TState> {
  const timers: Record<string, NodeJS.Timeout> = {};
  const { defaultDelay = 300 } = options || {};
  
  return (state, action, next) => {
    // Only process actions with debounce meta field
    if (!action.meta?.debounce) {
      next(action);
      return;
    }
    
    const { id = action.type, delay = defaultDelay } = 
      typeof action.meta.debounce === 'object' 
        ? action.meta.debounce 
        : { id: action.type, delay: defaultDelay };
    
    // Clear any existing timer for this action
    if (timers[id]) {
      clearTimeout(timers[id]);
      delete timers[id];
    }
    
    // Set a new timer
    timers[id] = setTimeout(() => {
      delete timers[id];
      next(action);
    }, delay);
  };
}

/**
 * Create throttle middleware
 * This ensures an action type is only dispatched once within a time period
 */
export function createThrottleMiddleware<TState>(options?: {
  defaultDelay?: number;
}): Middleware<TState> {
  const lastExecuted: Record<string, number> = {};
  const { defaultDelay = 300 } = options || {};
  
  return (state, action, next) => {
    // Only process actions with throttle meta field
    if (!action.meta?.throttle) {
      next(action);
      return;
    }
    
    const { id = action.type, delay = defaultDelay } = 
      typeof action.meta.throttle === 'object' 
        ? action.meta.throttle 
        : { id: action.type, delay: defaultDelay };
    
    const now = Date.now();
    const last = lastExecuted[id] || 0;
    
    // Check if enough time has passed since last execution
    if (now - last >= delay) {
      lastExecuted[id] = now;
      next(action);
    }
  };
}

/**
 * Create a validation middleware that runs validation on the state
 * This is useful for ensuring data integrity
 */
export function createValidationMiddleware<TState>(
  validators: Array<{
    test: (state: TState, action: StateAction) => boolean;
    error: string;
    actions?: string[];
  }>
): Middleware<TState> {
  return (state, action, next) => {
    // Run the action through all validators
    for (const validator of validators) {
      // Skip if validator only applies to specific actions and this isn't one
      if (validator.actions && !validator.actions.includes(action.type)) {
        continue;
      }
      
      // Run the test
      if (!validator.test(state, action)) {
        console.error(`Validation error: ${validator.error}`, { 
          action, 
          state 
        });
        
        // Dispatch validation error action
        next({
          type: 'VALIDATION_ERROR',
          payload: {
            originalAction: action,
            error: validator.error
          },
          meta: { ...action.meta }
        });
        
        return; // Stop processing this action
      }
    }
    
    // If all validations pass, continue to next middleware
    next(action);
  };
}

/**
 * Create a batch actions middleware
 * This allows dispatching multiple actions at once
 */
export function createBatchActionsMiddleware<TState>(): Middleware<TState> {
  return (state, action, next) => {
    // Check if this is a batch action
    if (action.type === 'BATCH_ACTIONS' && Array.isArray(action.payload)) {
      // Process each action in the batch
      action.payload.forEach(batchedAction => {
        next(batchedAction);
      });
      return;
    }
    
    // Otherwise proceed normally
    next(action);
  };
}

/**
 * Create a localStorage persistence middleware
 * This automatically saves specified state slices to localStorage
 */
export function createLocalStorageMiddleware<TState>(
  options: {
    key: string;
    paths: (keyof TState)[];
    debounceTime?: number;
  }
): Middleware<TState> {
  const { key, paths, debounceTime = 500 } = options;
  let debounceTimer: NodeJS.Timeout | null = null;
  let lastState: Partial<TState> = {};
  
  return (state, action, next) => {
    // First pass the action to the next middleware/reducer
    next(action);
    
    // After state update, check if we need to persist
    let shouldPersist = false;
    
    // Extract relevant state parts
    const stateToStore: Partial<TState> = {};
    
    paths.forEach(path => {
      stateToStore[path] = state[path];
      // Check if this path changed
      shouldPersist = shouldPersist || lastState[path] !== state[path];
    });
    
    // Update last state
    lastState = { ...stateToStore };
    
    // If relevant parts changed, schedule persistence
    if (shouldPersist) {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      debounceTimer = setTimeout(() => {
        try {
          localStorage.setItem(key, JSON.stringify(stateToStore));
        } catch (e) {
          console.error('Failed to save state to localStorage:', e);
        }
        debounceTimer = null;
      }, debounceTime);
    }
  };
}

/**
 * Create a combo middleware that combines multiple middleware into one
 */
export function combineMiddleware<TState>(...middleware: Middleware<TState>[]): Middleware<TState> {
  return (state, action, next) => {
    // Create a middleware chain
    let index = 0;
    
    const runMiddleware = (action: StateAction): void => {
      // Get the current middleware
      const current = middleware[index];
      
      // Move to the next middleware
      index++;
      
      if (index < middleware.length) {
        // If there are more middleware, call the current one with our custom next
        current(state, action, runMiddleware);
      } else {
        // If this is the last middleware, call it with the original next
        current(state, action, next);
      }
    };
    
    // Start the chain
    if (middleware.length > 0) {
      middleware[0](state, action, runMiddleware);
    } else {
      next(action);
    }
  };
}

/**
 * Create a subscription middleware that allows components to listen for actions
 * This is useful for cross-component communication and event-driven architecture
 */
export function createSubscriptionMiddleware<TState>(): Middleware<TState> {
  // Store all event subscribers
  const subscribers: Array<(action: StateAction) => void> = [];
  
  return (state, action, next) => {
    // Handle subscription actions
    if (action.type === SUBSCRIBE) {
      if (typeof action.payload === 'function') {
        subscribers.push(action.payload);
        
        // Return a function to unsubscribe
        const unsubscribe = () => {
          const index = subscribers.indexOf(action.payload);
          if (index !== -1) {
            subscribers.splice(index, 1);
          }
        };
        
        // Call next before returning so the action continues through the middleware
        next(action);
        return unsubscribe;
      } else {
        console.error('SUBSCRIBE payload must be a function');
        next(action);
        return undefined;
      }
    } 
    else if (action.type === UNSUBSCRIBE) {
      if (typeof action.payload === 'function') {
        const index = subscribers.indexOf(action.payload);
        if (index !== -1) {
          subscribers.splice(index, 1);
        }
      } else {
        console.error('UNSUBSCRIBE payload must be a function');
      }
      
      // Continue the middleware chain
      next(action);
      return undefined;
    }
    else {
      // Continue the middleware chain for non-subscription actions
      next(action);
      
      // After the action has been processed by reducers, notify all subscribers
      if (action.type !== SUBSCRIBE && action.type !== UNSUBSCRIBE) {
        subscribers.forEach(subscriber => {
          try {
            subscriber(action);
          } catch (error) {
            console.error('Error in subscriber:', error);
          }
        });
      }
      
      return undefined;
    }
  };
} 