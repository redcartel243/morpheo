/**
 * Toggle Behavior
 * 
 * This behavior allows components to toggle between different states.
 */

import { v4 as uuidv4 } from 'uuid';
import { BehaviorBase, BehaviorOptions, BehaviorType } from '../BehaviorSystem';
import { ComponentType } from '../ComponentTypes';

/**
 * Toggle behavior options
 */
export interface ToggleBehaviorOptions extends BehaviorOptions {
  active?: boolean;
  states?: string[];
  property?: string;
  currentIndex?: number;
}

/**
 * Toggle behavior class
 */
export class ToggleBehavior extends BehaviorBase {
  // Default options
  private defaultOptions: ToggleBehaviorOptions = {
    active: false,
    states: ['inactive', 'active'],
    property: 'active',
    currentIndex: 0
  };

  constructor() {
    super(
      uuidv4(),
      'Toggle Behavior',
      BehaviorType.TOGGLE,
      'Toggles between states when triggered'
    );
    
    // Define compatible component types
    this.compatibleTypes = [
      ComponentType.BUTTON,
      ComponentType.TOGGLE,
      ComponentType.CHECKBOX
    ];
    
    // Define connection points
    this.connectionPoints = {
      inputs: [
        {
          id: 'toggle',
          name: 'toggle',
          description: 'Trigger the toggle',
          dataType: 'boolean'
        },
        {
          id: 'setState',
          name: 'setState',
          description: 'Set to a specific state',
          dataType: 'any'
        }
      ],
      outputs: [
        {
          id: 'stateChanged',
          name: 'stateChanged',
          description: 'Emitted when state changes',
          dataType: 'any'
        },
        {
          id: 'value',
          name: 'value',
          description: 'Current state value',
          dataType: 'any'
        }
      ]
    };
  }
  
  /**
   * Initialize the behavior with component-specific options
   */
  initialize(componentId: string, options?: ToggleBehaviorOptions): void {
    // Merge provided options with defaults
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    // Store the options
    this.componentOptions.set(componentId, mergedOptions);
    
    // Initialize state
    this.updateState(componentId, {
      active: mergedOptions.active,
      states: mergedOptions.states,
      property: mergedOptions.property,
      currentIndex: mergedOptions.currentIndex || 0
    });
  }
  
  /**
   * Handle incoming data on connection points
   */
  onDataReceived(componentId: string, connectionPointId: string, data: any): void {
    const state = this.getState(componentId);
    if (!state) return;
    
    const options = this.componentOptions.get(componentId) || this.defaultOptions;
    
    if (connectionPointId === 'toggle') {
      // Toggle between states
      this._toggleState(componentId, state);
    } else if (connectionPointId === 'setState' && data !== undefined) {
      // Set to a specific state
      this._setSpecificState(componentId, state, data);
    }
  }
  
  /**
   * Toggle to the next state
   */
  private _toggleState(componentId: string, currentState: any): void {
    const states = currentState.states || this.defaultOptions.states;
    const currentIndex = currentState.currentIndex || 0;
    const nextIndex = (currentIndex + 1) % states.length;
    
    const newState = {
      ...currentState,
      active: !currentState.active,
      currentIndex: nextIndex
    };
    
    this.updateState(componentId, newState);
    
    // Emit the state changed event
    this.emitEvent(componentId, 'stateChanged', states[nextIndex]);
    this.emitEvent(componentId, 'value', states[nextIndex]);
  }
  
  /**
   * Set a specific state
   */
  private _setSpecificState(componentId: string, currentState: any, newValue: any): void {
    const states = currentState.states || this.defaultOptions.states;
    let newIndex = states.indexOf(newValue);
    
    // If the value isn't in states, use it as a boolean indicator
    if (newIndex === -1) {
      newIndex = newValue ? 1 : 0;
      if (newIndex >= states.length) {
        newIndex = states.length - 1;
      }
    }
    
    const newState = {
      ...currentState,
      active: newIndex > 0,
      currentIndex: newIndex
    };
    
    this.updateState(componentId, newState);
    
    // Emit the state changed event
    this.emitEvent(componentId, 'stateChanged', states[newIndex]);
    this.emitEvent(componentId, 'value', states[newIndex]);
  }
}

// Export the behavior
export const toggleBehavior = new ToggleBehavior(); 