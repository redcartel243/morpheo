/**
 * Counter Behavior
 * 
 * This behavior allows components to count up or down.
 */

import { v4 as uuidv4 } from 'uuid';
import { BehaviorBase, BehaviorOptions, BehaviorType } from '../BehaviorSystem';
import { ComponentType } from '../ComponentTypes';

/**
 * Counter behavior options
 */
export interface CounterBehaviorOptions extends BehaviorOptions {
  count?: number;
  step?: number;
  min?: number | null;
  max?: number | null;
}

/**
 * Counter behavior class
 */
export class CounterBehavior extends BehaviorBase {
  // Default options
  private defaultOptions: CounterBehaviorOptions = {
    count: 0,
    step: 1,
    min: null,
    max: null
  };

  constructor() {
    super(
      uuidv4(),
      'Counter Behavior',
      BehaviorType.COUNTER,
      'Counts up or down when triggered'
    );
    
    // Define compatible component types
    this.compatibleTypes = [
      ComponentType.BUTTON,
      ComponentType.TEXT
    ];
    
    // Define connection points
    this.connectionPoints = {
      inputs: [
        {
          id: 'increment',
          name: 'increment',
          description: 'Increment the counter',
          dataType: 'boolean'
        },
        {
          id: 'decrement',
          name: 'decrement',
          description: 'Decrement the counter',
          dataType: 'boolean'
        },
        {
          id: 'reset',
          name: 'reset',
          description: 'Reset the counter to initial value',
          dataType: 'boolean'
        },
        {
          id: 'setValue',
          name: 'setValue',
          description: 'Set a specific value',
          dataType: 'number'
        }
      ],
      outputs: [
        {
          id: 'countChanged',
          name: 'countChanged',
          description: 'Emitted when count changes',
          dataType: 'number'
        },
        {
          id: 'value',
          name: 'value',
          description: 'Current count value',
          dataType: 'number'
        }
      ]
    };
  }
  
  /**
   * Initialize the behavior with component-specific options
   */
  initialize(componentId: string, options?: CounterBehaviorOptions): void {
    // Merge provided options with defaults
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    // Store the options
    this.componentOptions.set(componentId, mergedOptions);
    
    // Initialize state
    this.updateState(componentId, {
      count: mergedOptions.count,
      step: mergedOptions.step,
      min: mergedOptions.min,
      max: mergedOptions.max,
      initialCount: mergedOptions.count
    });
  }
  
  /**
   * Handle incoming data on connection points
   */
  onDataReceived(componentId: string, connectionPointId: string, data: any): void {
    const state = this.getState(componentId);
    if (!state) return;
    
    if (connectionPointId === 'increment' && data) {
      this._increment(componentId, state);
    } else if (connectionPointId === 'decrement' && data) {
      this._decrement(componentId, state);
    } else if (connectionPointId === 'reset' && data) {
      this._reset(componentId, state);
    } else if (connectionPointId === 'setValue' && typeof data === 'number') {
      this._setValue(componentId, state, data);
    }
  }
  
  /**
   * Increment the counter
   */
  private _increment(componentId: string, currentState: any): void {
    const step = currentState.step || this.defaultOptions.step;
    let newCount = (currentState.count || 0) + step;
    
    // Apply max constraint
    if (currentState.max !== null && newCount > currentState.max) {
      newCount = currentState.max;
    }
    
    const newState = {
      ...currentState,
      count: newCount
    };
    
    this.updateState(componentId, newState);
    
    // Emit the count changed event
    this.emitEvent(componentId, 'countChanged', newCount);
    this.emitEvent(componentId, 'value', newCount);
  }
  
  /**
   * Decrement the counter
   */
  private _decrement(componentId: string, currentState: any): void {
    const step = currentState.step || this.defaultOptions.step;
    let newCount = (currentState.count || 0) - step;
    
    // Apply min constraint
    if (currentState.min !== null && newCount < currentState.min) {
      newCount = currentState.min;
    }
    
    const newState = {
      ...currentState,
      count: newCount
    };
    
    this.updateState(componentId, newState);
    
    // Emit the count changed event
    this.emitEvent(componentId, 'countChanged', newCount);
    this.emitEvent(componentId, 'value', newCount);
  }
  
  /**
   * Reset the counter to initial value
   */
  private _reset(componentId: string, currentState: any): void {
    const initialCount = currentState.initialCount || 0;
    
    const newState = {
      ...currentState,
      count: initialCount
    };
    
    this.updateState(componentId, newState);
    
    // Emit the count changed event
    this.emitEvent(componentId, 'countChanged', initialCount);
    this.emitEvent(componentId, 'value', initialCount);
  }
  
  /**
   * Set a specific counter value
   */
  private _setValue(componentId: string, currentState: any, newValue: number): void {
    let validValue = newValue;
    
    // Apply min/max constraints
    if (currentState.min !== null && validValue < currentState.min) {
      validValue = currentState.min;
    }
    if (currentState.max !== null && validValue > currentState.max) {
      validValue = currentState.max;
    }
    
    const newState = {
      ...currentState,
      count: validValue
    };
    
    this.updateState(componentId, newState);
    
    // Emit the count changed event
    this.emitEvent(componentId, 'countChanged', validValue);
    this.emitEvent(componentId, 'value', validValue);
  }
}

// Export the behavior
export const counterBehavior = new CounterBehavior(); 