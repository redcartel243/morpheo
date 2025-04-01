import React, { createContext, useContext, useReducer, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';

// State action type
export interface StateAction {
  type: string;
  payload?: any;
  meta?: Record<string, any>;
}

// State reducer function type
export type StateReducer<TState> = (state: TState, action: StateAction) => TState;

// State selector function type
export type StateSelector<TState, TSelected> = (state: TState) => TSelected;

// Middleware function type
export type Middleware<TState> = (
  state: TState,
  action: StateAction,
  next: (action: StateAction) => void
) => void;

export interface StateManagerOptions<TState> {
  initialState: TState;
  reducers: StateReducer<TState>[];
  middleware?: Middleware<TState>[];
  persist?: {
    key: string;
    storage?: Storage;
    include?: (keyof TState)[];
    exclude?: (keyof TState)[];
  };
}

// Create a context for the state manager
interface StateContextValue<TState> {
  state: TState;
  dispatch: (action: StateAction) => void;
  getState: () => TState;
  select: <TSelected>(selector: StateSelector<TState, TSelected>) => TSelected;
  addReducer: (reducer: StateReducer<TState>) => () => void;
  addMiddleware: (middleware: Middleware<TState>) => () => void;
}

// Helper to create a typed context
export function createStateContext<TState>() {
  return createContext<StateContextValue<TState> | null>(null);
}

// Helper function - not a hook - to throw context errors
const throwContextError = (contextName: string): never => {
  throw new Error(`use${contextName} must be used within a ${contextName}Provider`);
};

// Create a state manager hook factory
export function createStateManager<TState>(options: {
  initialState: TState;
  reducers?: StateReducer<TState>[];
  middleware?: Middleware<TState>[];
  persist?: {
    key: string;
    storage?: Storage;
    include?: Array<keyof TState>;
    exclude?: Array<keyof TState>;
  };
}) {
  const { 
    initialState, 
    reducers: initialReducers = [],
    middleware: initialMiddleware = [],
    persist
  } = options;
  
  // Create a context to store state
  const StateContext = createContext<{
    state: TState;
    dispatch: (action: StateAction) => void;
    getState: () => TState;
    select: <TSelected>(selector: StateSelector<TState, TSelected>) => TSelected;
    addReducer: (reducer: StateReducer<TState>) => () => void;
    addMiddleware: (middleware: Middleware<TState>) => () => void;
  } | null>(null);
  
  // Provider component
  const StateProvider: React.FC<{
    children: ReactNode;
  }> = ({ children }) => {
    // Initialize state
    const [state, setState] = React.useState<TState>(() => {
      // Load persisted state if available
      if (persist && typeof window !== 'undefined') {
        const storage = persist.storage || localStorage;
        const persistedStateJson = storage.getItem(persist.key);
        
        if (persistedStateJson) {
          try {
            const persistedState = JSON.parse(persistedStateJson);
            return {
              ...initialState,
              ...persistedState
            };
          } catch (e) {
            console.error('Failed to parse persisted state:', e);
          }
        }
      }
      
      return initialState;
    });
    
    // Hold references to reducers and middleware
    const [reducers, setReducers] = React.useState<StateReducer<TState>[]>(initialReducers);
    const [middleware, setMiddleware] = React.useState<Middleware<TState>[]>(initialMiddleware);
    
    // Create a dispatch function
    const dispatch = useCallback((action: StateAction) => {
      // Apply middleware
      const applyMiddleware = (index: number, currentAction: StateAction, currentState: TState) => {
        if (index >= middleware.length) {
          // Apply reducers
          setState(currentState => {
            const nextState = reducers.reduce(
              (state, reducer) => reducer(state, currentAction),
              currentState
            );
            
            return nextState !== currentState ? nextState : currentState;
          });
          return;
        }
        
        // Apply middleware
        middleware[index](currentState, currentAction, (nextAction: StateAction) => {
          // If action changed, restart middleware chain
          if (nextAction !== currentAction) {
            applyMiddleware(0, nextAction, currentState);
          } else {
            // Continue to next middleware
            applyMiddleware(index + 1, currentAction, currentState);
          }
        });
      };
      
      applyMiddleware(0, action, state);
    }, [state, reducers, middleware]);

    // Persist state changes if enabled
    useEffect(() => {
      if (persist && typeof window !== 'undefined') {
        const storage = persist.storage || localStorage;
        
        let stateToStore = state;
        
        // Filter state based on include/exclude options
        if (persist.include) {
          const filteredState = {} as Partial<TState>;
          persist.include.forEach((key) => {
            filteredState[key] = state[key];
          });
          stateToStore = filteredState as TState;
        } else if (persist.exclude) {
          const filteredState = { ...state };
          persist.exclude.forEach((key) => {
            delete filteredState[key];
          });
          stateToStore = filteredState;
        }
        
        storage.setItem(persist.key, JSON.stringify(stateToStore));
      }
    }, [state, persist]);

    // Get current state (useful for middleware)
    const getState = useCallback(() => state, [state]);
    
    // Selector function
    const select = useCallback(<TSelected>(selector: StateSelector<TState, TSelected>): TSelected => {
      return selector(state);
    }, [state]);
    
    // Method to add a reducer
    const addReducer = useCallback((reducer: StateReducer<TState>) => {
      setReducers((prev: StateReducer<TState>[]) => [...prev, reducer]);
      
      // Return cleanup function
      return () => {
        setReducers((prev: StateReducer<TState>[]) => prev.filter(r => r !== reducer));
      };
    }, []);
    
    // Method to add middleware
    const addMiddleware = useCallback((middleware: Middleware<TState>) => {
      setMiddleware((prev: Middleware<TState>[]) => [...prev, middleware]);
      
      // Return cleanup function
      return () => {
        setMiddleware((prev: Middleware<TState>[]) => prev.filter(m => m !== middleware));
      };
    }, []);
    
    // Context value
    const contextValue = useMemo(() => ({
      state,
      dispatch,
      getState,
      select,
      addReducer,
      addMiddleware
    }), [state, dispatch, getState, select, addReducer, addMiddleware]);
    
    return React.createElement(
      StateContext.Provider,
      { value: contextValue },
      children
    );
  };
  
  // Create hooks
  function throwContextError(): never {
    throw new Error('State hooks must be used within a StateProvider');
  }
  
  // Hook to access state
  const useState = <TSelected>(selector?: StateSelector<TState, TSelected>) => {
    const context = useContext(StateContext);
    
    if (!context) {
      throwContextError();
    }
    
    if (selector) {
      return context.select(selector);
    }
    
    return context.state;
  };
  
  // Hook to access dispatch
  const useDispatch = () => {
    const context = useContext(StateContext);
    
    if (!context) {
      throwContextError();
    }
    
    return context.dispatch;
  };
  
  // Hook to register a reducer effect - adds a reducer during component lifecycle
  const useReducerEffect = (reducer: StateReducer<TState>) => {
    const context = useContext(StateContext);
    
    if (!context) {
      throwContextError();
    }
    
    useEffect(() => {
      return context.addReducer(reducer);
    }, [reducer, context]);
  };
  
  // Hook to register middleware effect - adds middleware during component lifecycle
  const useMiddlewareEffect = (middleware: Middleware<TState>) => {
    const context = useContext(StateContext);
    
    if (!context) {
      throwContextError();
    }
    
    useEffect(() => {
      return context.addMiddleware(middleware);
    }, [middleware, context]);
  };
  
  // Hook for creating a selector that memoizes the result
  function useSelector<TSelected>(selector: StateSelector<TState, TSelected>): TSelected {
    const context = useContext(StateContext);
    
    if (!context) {
      throwContextError();
    }
    
    const result = context.select(selector);
    return useMemo(() => result, [result]);
  }
  
  return {
    StateContext,
    StateProvider,
    useState,
    useDispatch,
    useReducerEffect,
    useMiddlewareEffect,
    useSelector
  };
}

// Function to create actions - utility to ensure type safety
export function createAction<TPayload = void>(
  type: string
): (payload?: TPayload, meta?: Record<string, any>) => StateAction {
  return (payload?: TPayload, meta?: Record<string, any>) => ({
    type,
    payload,
    meta
  });
}

// Create a middleware factory for logging
export function createLoggerMiddleware<TState>(options?: {
  logger?: (message: string, data?: any) => void;
  collapsed?: boolean;
  predicate?: (state: TState, action: StateAction) => boolean;
}): Middleware<TState> {
  const {
    logger = console.log,
    collapsed = false,
    predicate = () => true
  } = options || {};

  return (state, action, next) => {
    if (!predicate(state, action)) {
      next(action);
      return;
    }

    const timestamp = new Date().toISOString();
    const log = collapsed 
      ? logger 
      : (message: string) => {
          logger(`%c ${message}`, 'color: #9E9E9E; font-weight: bold;');
        };

    log(`${timestamp} - Action: ${action.type}`);
    
    if (!collapsed) {
      logger('%c Previous State', 'color: #9E9E9E; font-weight: bold;', state);
      logger('%c Action', 'color: #00A7F7; font-weight: bold;', action);
    }

    next(action);

    if (!collapsed) {
      logger('%c Next State', 'color: #47B04B; font-weight: bold;', state);
    }
  };
}

// Helper to create derived state from multiple selectors
export function createDerivedState<TState, TResult>(
  selectors: Array<StateSelector<TState, any>>,
  combiner: (...args: any[]) => TResult
): StateSelector<TState, TResult> {
  return (state: TState) => {
    const selectedValues = selectors.map(selector => selector(state));
    return combiner(...selectedValues);
  };
}

// Helper to compose state from different state contexts
export function composeState<R>(
  composer: (...args: any[]) => R,
  ...selectors: Array<() => any>
): () => R {
  return () => {
    const selectedValues = selectors.map(selector => selector());
    return composer(...selectedValues);
  };
} 