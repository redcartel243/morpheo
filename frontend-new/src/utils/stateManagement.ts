/**
 * Component State Management for Morpheo
 * 
 * This file contains utilities for managing component state,
 * tracking input history, validation states, and operation history.
 * It provides automatic state restoration for common patterns and
 * helper methods for complex state transitions.
 */

import { sanitizeInput } from './domUtils';

// Types for state history and state subscription
type StateHistory<T> = {
  past: T[];
  present: T;
  future: T[];
}

type StateSubscriber<T> = (state: T) => void;

interface ComponentState {
  values: Record<string, any>;
  validationState: Record<string, boolean>;
  dirtyFields: Set<string>;
  touchedFields: Set<string>;
  inputHistory: Record<string, any[]>;
  operationHistory: {
    type: string;
    timestamp: number;
    details: Record<string, any>;
  }[];
  lastUpdated: number;
}

const DEFAULT_STATE: ComponentState = {
  values: {},
  validationState: {},
  dirtyFields: new Set(),
  touchedFields: new Set(),
  inputHistory: {},
  operationHistory: [],
  lastUpdated: Date.now()
};

// Maximum history length to prevent memory issues
const MAX_HISTORY_LENGTH = 50;

// Global registry of component states
const componentStates: Map<string, StateHistory<ComponentState>> = new Map();
const stateSubscribers: Map<string, Set<StateSubscriber<ComponentState>>> = new Map();

/**
 * Initialize state for a component
 * @param componentId - Component ID to track
 * @param initialState - Optional initial state
 * @returns Component state manager object
 */
export function initComponentState(
  componentId: string,
  initialState: Partial<ComponentState> = {}
): {
  getState: () => ComponentState;
  setState: (updater: Partial<ComponentState> | ((state: ComponentState) => Partial<ComponentState>)) => void;
  resetState: () => void;
  subscribe: (callback: StateSubscriber<ComponentState>) => () => void;
  trackValue: (fieldName: string, value: any) => void;
  getFieldHistory: (fieldName: string) => any[];
  markAsTouched: (fieldName: string) => void;
  markAsDirty: (fieldName: string) => void;
  setValidationState: (fieldName: string, isValid: boolean) => void;
  logOperation: (type: string, details: Record<string, any>) => void;
  getOperationHistory: () => any[];
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
} {
  // Initialize state if it doesn't exist
  if (!componentStates.has(componentId)) {
    componentStates.set(componentId, {
      past: [],
      present: { ...DEFAULT_STATE, ...initialState, lastUpdated: Date.now() },
      future: []
    });
  }

  // Initialize subscribers if they don't exist
  if (!stateSubscribers.has(componentId)) {
    stateSubscribers.set(componentId, new Set());
  }

  // Get current state
  const getState = (): ComponentState => {
    const history = componentStates.get(componentId);
    return history ? { ...history.present } : { ...DEFAULT_STATE };
  };

  // Update state with new values
  const setState = (updater: Partial<ComponentState> | ((state: ComponentState) => Partial<ComponentState>)): void => {
    const history = componentStates.get(componentId);
    if (!history) return;

    // Get updates based on updater type
    const updates = typeof updater === 'function' 
      ? updater(history.present) 
      : updater;

    // Add current state to past
    const newPast = [...history.past];
    newPast.push(history.present);
    
    // Limit past history length
    if (newPast.length > MAX_HISTORY_LENGTH) {
      newPast.shift();
    }

    // Create new present state with updates
    const newPresent = {
      ...history.present,
      ...updates,
      lastUpdated: Date.now()
    };

    // Update state history
    componentStates.set(componentId, {
      past: newPast,
      present: newPresent,
      future: [] // Clear future when new action happens
    });

    // Notify subscribers
    const subscribers = stateSubscribers.get(componentId);
    if (subscribers) {
      subscribers.forEach(callback => callback(newPresent));
    }
  };

  // Reset state to initial values
  const resetState = (): void => {
    setState({ ...DEFAULT_STATE });
  };

  // Subscribe to state changes
  const subscribe = (callback: StateSubscriber<ComponentState>): () => void => {
    const subscribers = stateSubscribers.get(componentId);
    if (subscribers) {
      subscribers.add(callback);
    }

    // Return unsubscribe function
    return () => {
      const subscribers = stateSubscribers.get(componentId);
      if (subscribers) {
        subscribers.delete(callback);
      }
    };
  };

  // Track field value and add to history
  const trackValue = (fieldName: string, value: any): void => {
    const state = getState();
    const sanitizedValue = typeof value === 'string' ? sanitizeInput(value) : value;
    
    // Add to history
    const currentHistory = state.inputHistory[fieldName] || [];
    const newHistory = [...currentHistory, sanitizedValue];
    
    // Limit history length
    if (newHistory.length > MAX_HISTORY_LENGTH) {
      newHistory.shift();
    }

    // Update state
    setState({
      values: { ...state.values, [fieldName]: sanitizedValue },
      inputHistory: { ...state.inputHistory, [fieldName]: newHistory },
      dirtyFields: new Set([...state.dirtyFields, fieldName])
    });
  };

  // Get history for a field
  const getFieldHistory = (fieldName: string): any[] => {
    const state = getState();
    return state.inputHistory[fieldName] || [];
  };

  // Mark field as touched (interaction occurred)
  const markAsTouched = (fieldName: string): void => {
    const state = getState();
    setState({
      touchedFields: new Set([...state.touchedFields, fieldName])
    });
  };

  // Mark field as dirty (value changed)
  const markAsDirty = (fieldName: string): void => {
    const state = getState();
    setState({
      dirtyFields: new Set([...state.dirtyFields, fieldName])
    });
  };

  // Set validation state for a field
  const setValidationState = (fieldName: string, isValid: boolean): void => {
    const state = getState();
    setState({
      validationState: { ...state.validationState, [fieldName]: isValid }
    });
  };

  // Log operation to operation history
  const logOperation = (type: string, details: Record<string, any>): void => {
    const state = getState();
    const newOperation = {
      type,
      timestamp: Date.now(),
      details
    };

    const newHistory = [...state.operationHistory, newOperation];
    
    // Limit history length
    if (newHistory.length > MAX_HISTORY_LENGTH) {
      newHistory.shift();
    }

    setState({
      operationHistory: newHistory
    });
  };

  // Get operation history
  const getOperationHistory = (): any[] => {
    const state = getState();
    return [...state.operationHistory];
  };

  // Undo last state change
  const undo = (): boolean => {
    const history = componentStates.get(componentId);
    if (!history || history.past.length === 0) return false;

    // Get the last state from past
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, history.past.length - 1);

    // Update state
    componentStates.set(componentId, {
      past: newPast,
      present: previous,
      future: [history.present, ...history.future]
    });

    // Notify subscribers
    const subscribers = stateSubscribers.get(componentId);
    if (subscribers) {
      subscribers.forEach(callback => callback(previous));
    }

    return true;
  };

  // Redo previously undone state change
  const redo = (): boolean => {
    const history = componentStates.get(componentId);
    if (!history || history.future.length === 0) return false;

    // Get the first state from future
    const next = history.future[0];
    const newFuture = history.future.slice(1);

    // Update state
    componentStates.set(componentId, {
      past: [...history.past, history.present],
      present: next,
      future: newFuture
    });

    // Notify subscribers
    const subscribers = stateSubscribers.get(componentId);
    if (subscribers) {
      subscribers.forEach(callback => callback(next));
    }

    return true;
  };

  // Check if undo is available
  const canUndo = (): boolean => {
    const history = componentStates.get(componentId);
    return history ? history.past.length > 0 : false;
  };

  // Check if redo is available
  const canRedo = (): boolean => {
    const history = componentStates.get(componentId);
    return history ? history.future.length > 0 : false;
  };

  return {
    getState,
    setState,
    resetState,
    subscribe,
    trackValue,
    getFieldHistory,
    markAsTouched,
    markAsDirty,
    setValidationState,
    logOperation,
    getOperationHistory,
    undo,
    redo,
    canUndo,
    canRedo
  };
}

/**
 * Auto-bind state management to a component's DOM element
 * @param componentId - Component ID to track
 * @param element - Component DOM element
 * @returns Cleanup function
 */
export function bindStateToComponent(
  componentId: string,
  element: HTMLElement
): () => void {
  const stateManager = initComponentState(componentId);
  const eventHandlers: Array<[HTMLElement, string, EventListener]> = [];

  // Handle input elements
  const inputs = element.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    const inputElement = input as HTMLInputElement;
    const fieldName = inputElement.name || inputElement.id || '';
    if (!fieldName) return;

    // Track initial value
    stateManager.trackValue(fieldName, inputElement.value);

    // Set up input event handler
    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      stateManager.trackValue(fieldName, target.value);
      stateManager.markAsDirty(fieldName);
    };

    // Set up focus/blur event handlers
    const handleFocus = () => {
      stateManager.markAsTouched(fieldName);
    };

    // Set up validation events
    const handleBlur = () => {
      const isValid = (inputElement as any).validate ? (inputElement as any).validate() : true;
      stateManager.setValidationState(fieldName, isValid);
    };

    // Attach events
    inputElement.addEventListener('input', handleInput);
    inputElement.addEventListener('focus', handleFocus);
    inputElement.addEventListener('blur', handleBlur);

    // Store handlers for cleanup
    eventHandlers.push([inputElement, 'input', handleInput]);
    eventHandlers.push([inputElement, 'focus', handleFocus]);
    eventHandlers.push([inputElement, 'blur', handleBlur]);
  });

  // Handle button clicks and other interactive elements
  const buttons = element.querySelectorAll('button, [role="button"]');
  buttons.forEach(button => {
    const buttonElement = button as HTMLButtonElement;
    const buttonId = buttonElement.id || '';
    if (!buttonId) return;

    const handleClick = () => {
      stateManager.logOperation('buttonClick', { 
        buttonId, 
        buttonText: buttonElement.textContent,
      });
    };

    buttonElement.addEventListener('click', handleClick);
    eventHandlers.push([buttonElement, 'click', handleClick]);
  });

  // Return cleanup function
  return () => {
    eventHandlers.forEach(([element, eventType, handler]) => {
      element.removeEventListener(eventType, handler);
    });
  };
}

/**
 * Automatically restore component state
 * @param componentId - Component ID to restore
 * @param element - Component DOM element
 */
export function restoreComponentState(
  componentId: string,
  element: HTMLElement
): void {
  const stateManager = initComponentState(componentId);
  const state = stateManager.getState();

  // Restore input values
  Object.entries(state.values).forEach(([fieldName, value]) => {
    const inputElement = element.querySelector(`[name="${fieldName}"], #${fieldName}`) as HTMLInputElement;
    if (!inputElement) return;

    // Restore value based on input type
    if (inputElement.type === 'checkbox') {
      inputElement.checked = !!value;
    } else if (inputElement.type === 'radio') {
      inputElement.checked = inputElement.value === String(value);
    } else if (inputElement.tagName === 'SELECT' && Array.isArray(value)) {
      // Handle multi-select
      if (inputElement instanceof HTMLSelectElement) {
        Array.from(inputElement.options).forEach(option => {
          option.selected = value.includes(option.value);
        });
      }
    } else {
      // Regular input
      inputElement.value = value !== null && value !== undefined ? String(value) : '';
    }

    // Restore validation state
    const isValid = state.validationState[fieldName];
    if (isValid !== undefined) {
      if (isValid) {
        inputElement.classList.add('valid');
        inputElement.classList.remove('invalid');
      } else {
        inputElement.classList.add('invalid');
        inputElement.classList.remove('valid');
      }
    }
  });
}

/**
 * Create a function to handle complex state transitions
 * @param componentId - Component ID to manage
 * @param transitions - State transition definitions
 * @returns State transition function
 */
export function createStateTransition(
  componentId: string,
  transitions: Record<string, (state: ComponentState, payload?: any) => Partial<ComponentState>>
): (transitionName: string, payload?: any) => void {
  const stateManager = initComponentState(componentId);
  
  return (transitionName: string, payload?: any) => {
    const transition = transitions[transitionName];
    if (!transition) {
      console.warn(`Transition "${transitionName}" not found for component "${componentId}"`);
      return;
    }

    const currentState = stateManager.getState();
    const updates = transition(currentState, payload);
    
    stateManager.setState(updates);
    stateManager.logOperation('stateTransition', { 
      transition: transitionName,
      payload,
      timestamp: Date.now()
    });
  };
}

/**
 * Monitor a component for changes and automatically sync with DOM
 * @param componentId - Component ID to monitor
 * @param element - Component DOM element
 * @returns Cleanup function
 */
export function syncComponentWithDOM(
  componentId: string,
  element: HTMLElement
): () => void {
  const stateManager = initComponentState(componentId);
  
  // Update DOM when state changes
  const unsubscribe = stateManager.subscribe((state) => {
    // Sync input values
    Object.entries(state.values).forEach(([fieldName, value]) => {
      const inputElement = element.querySelector(`[name="${fieldName}"], #${fieldName}`) as HTMLInputElement;
      if (!inputElement) return;

      // Only update if element doesn't have focus to avoid disrupting typing
      if (document.activeElement !== inputElement) {
        // Update based on input type
        if (inputElement.type === 'checkbox') {
          inputElement.checked = !!value;
        } else if (inputElement.type === 'radio') {
          inputElement.checked = inputElement.value === String(value);
        } else if (inputElement.tagName === 'SELECT' && Array.isArray(value)) {
          // Handle multi-select
          if (inputElement instanceof HTMLSelectElement) {
            Array.from(inputElement.options).forEach(option => {
              option.selected = value.includes(option.value);
            });
          }
        } else {
          // Regular input
          const currentValue = inputElement.value;
          const newValue = value !== null && value !== undefined ? String(value) : '';
          
          // Only update if different to avoid selection issues
          if (currentValue !== newValue) {
            inputElement.value = newValue;
          }
        }
      }
    });
  });

  return unsubscribe;
} 