/**
 * Morpheo Behavior System
 * 
 * This system allows the AI to dynamically apply behaviors to components,
 * enabling complex interactions and transformations without requiring
 * hardcoded logic in each component.
 */

import { v4 as uuidv4 } from 'uuid';
import { ComponentId, ComponentType, DataType } from './ComponentTypes';
import { componentRegistry } from './ComponentRegistry';
import { connectionManager } from './ConnectionManager';
import { behaviors } from './behaviors';

/**
 * BehaviorType defines the categories of behaviors that can be applied
 */
export enum BehaviorType {
  ACTION = 'action',           // Single action (like showing a message)
  TOGGLE = 'toggle',           // Toggle between states
  COUNTER = 'counter',         // Count up or down
  TRANSFORM = 'transform',     // Transform data
  ANIMATION = 'animation',     // Visual animation
  TIMER = 'timer',             // Time-based behavior
  CONDITIONAL = 'conditional', // Logic based on conditions
  GAME = 'game',               // Game mechanics
  FORM = 'form',               // Form behaviors (validation, etc)
  POSITION = 'position',       // Position-related behavior
  CUSTOM = 'custom'            // Custom defined behavior
}

/**
 * EventType defines the types of events that can trigger behaviors
 */
export enum EventType {
  CLICK = 'click',
  CHANGE = 'change',
  INPUT = 'input',
  FOCUS = 'focus',
  BLUR = 'blur',
  MOUNT = 'mount',
  UNMOUNT = 'unmount',
  TIMER = 'timer',
  CUSTOM = 'custom'
}

/**
 * StateChangeHandler is a function that takes the current state and an event
 * and returns the new state
 */
export type StateChangeHandler = (state: any, event: any) => any;

/**
 * ValueTransformer is a function that transforms a value
 */
export type ValueTransformer = (value: any, context?: any) => any;

/**
 * BehaviorHandler defines how a behavior responds to events
 */
export interface BehaviorHandler {
  event: EventType | string;
  handler: StateChangeHandler;
}

/**
 * BehaviorOptions interface for behavior initialization
 */
export interface BehaviorOptions {
  [key: string]: any;
}

/**
 * BehaviorDefinition defines a behavior that can be applied to a component
 */
export interface BehaviorDefinition {
  id: string;
  type: BehaviorType;
  name: string;
  description: string;
  initialState: any;
  handlers: BehaviorHandler[];
  transformers?: Record<string, ValueTransformer>;
  compatibleWith: ComponentType[];
  metadata?: Record<string, any>;
}

/**
 * AppliedBehavior represents a behavior that has been applied to a component
 */
export interface AppliedBehavior {
  id: string;
  behaviorId: string;
  componentId: ComponentId;
  state: any;
  connections: string[];
  metadata?: Record<string, any>;
}

/**
 * BehaviorApplicationOptions provides options when applying a behavior
 */
export interface BehaviorApplicationOptions {
  initialState?: any;
  customHandlers?: BehaviorHandler[];
  customTransformers?: Record<string, ValueTransformer>;
  metadata?: Record<string, any>;
}

/**
 * BehaviorBase is the base class for all behaviors
 */
export abstract class BehaviorBase {
  id: string;
  name: string;
  type: BehaviorType;
  description: string;
  compatibleTypes: ComponentType[] = [];
  connectionPoints: {
    inputs: Array<{
      id: string;
      name: string;
      description: string;
      dataType: string;
    }>;
    outputs: Array<{
      id: string;
      name: string;
      description: string;
      dataType: string;
    }>;
  } = { inputs: [], outputs: [] };
  
  // Component-specific options
  protected componentOptions: Map<string, any> = new Map();
  
  // Component state
  private componentState: Map<string, any> = new Map();
  
  constructor(id: string, name: string, type: BehaviorType, description: string) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.description = description;
  }
  
  /**
   * Initialize the behavior with component-specific options
   */
  abstract initialize(componentId: string, options?: any): void;
  
  /**
   * Handle incoming data on connection points
   */
  abstract onDataReceived(componentId: string, connectionPointId: string, data: any): void;
  
  /**
   * Clean up when behavior is removed
   */
  cleanup(componentId: string): void {
    // By default, just clear state
    this.componentOptions.delete(componentId);
    this.componentState.delete(componentId);
  }
  
  /**
   * Update the state for a component
   */
  protected updateState(componentId: string, state: any): void {
    const currentState = this.componentState.get(componentId) || {};
    this.componentState.set(componentId, { ...currentState, ...state });
  }
  
  /**
   * Get the state for a component
   */
  protected getState(componentId: string): any {
    return this.componentState.get(componentId) || {};
  }
  
  /**
   * Emit an event on an output connection point
   */
  protected emitEvent(componentId: string, connectionPointId: string, data: any): void {
    // Find the component instance
    const component = componentRegistry.getInstance(componentId);
    if (!component) return;
    
    // Find outgoing connections from this connection point
    const connections = connectionManager.getOutgoingConnections(componentId)
      .filter(connection => connection.sourceConnectionId === connectionPointId);
    
    // Send data to each connected target
    connections.forEach(connection => {
      // Apply transform function if provided
      const transformedData = connection.transform 
        ? connection.transform(data) 
        : data;
      
      // Update target component's state to reflect the new value
      componentRegistry.updateInstance(connection.targetComponentId, {
        state: {
          [connection.targetConnectionId]: transformedData
        }
      });
      
      // For now, we'll just update the component state
      // In a real implementation, we'd dispatch a Redux event
      // but for simplicity here, we're avoiding direct Redux usage
    });
  }
}

/**
 * BehaviorSystem manages the registration and application of behaviors
 */
class BehaviorSystem {
  private behaviors: Map<string, BehaviorDefinition> = new Map();
  private appliedBehaviors: Map<string, AppliedBehavior> = new Map();
  
  /**
   * Register a new behavior definition
   */
  registerBehavior(behavior: Omit<BehaviorDefinition, 'id'>): string {
    const id = uuidv4();
    this.behaviors.set(id, { ...behavior, id });
    return id;
  }
  
  /**
   * Get a behavior by id
   */
  getBehavior(id: string): BehaviorDefinition | undefined {
    return this.behaviors.get(id);
  }
  
  /**
   * Get all registered behaviors
   */
  getAllBehaviors(): BehaviorDefinition[] {
    return Array.from(this.behaviors.values());
  }
  
  /**
   * Get behaviors compatible with a component type
   */
  getBehaviorsForComponentType(componentType: ComponentType): BehaviorDefinition[] {
    return this.getAllBehaviors().filter(behavior =>
      behavior.compatibleWith.includes(componentType)
    );
  }
  
  /**
   * Apply a behavior to a component
   */
  applyBehavior(
    componentId: ComponentId, 
    behaviorId: string,
    options: BehaviorApplicationOptions = {}
  ): string | null {
    // Get the component instance
    const component = componentRegistry.getInstance(componentId);
    if (!component) {
      console.error(`Component with id ${componentId} not found`);
      return null;
    }
    
    // Get the behavior definition
    const behavior = this.behaviors.get(behaviorId);
    if (!behavior) {
      console.error(`Behavior with id ${behaviorId} not found`);
      return null;
    }
    
    // Check compatibility
    if (!behavior.compatibleWith.includes(component.type)) {
      console.error(`Behavior ${behavior.name} is not compatible with component type ${component.type}`);
      return null;
    }
    
    // Create applied behavior ID
    const appliedBehaviorId = uuidv4();
    
    // Initialize state
    const initialState = options.initialState || behavior.initialState;
    
    // Create connections based on behavior
    const connections: string[] = [];
    
    // Store the applied behavior
    this.appliedBehaviors.set(appliedBehaviorId, {
      id: appliedBehaviorId,
      behaviorId,
      componentId,
      state: initialState,
      connections,
      metadata: options.metadata
    });
    
    // Set up event handlers
    this.setupBehaviorHandlers(appliedBehaviorId, options.customHandlers);
    
    // Set up transformers
    this.setupBehaviorTransformers(appliedBehaviorId, options.customTransformers);
    
    console.log(`Applied behavior ${behavior.name} to component ${componentId}`);
    
    return appliedBehaviorId;
  }
  
  /**
   * Set up behavior event handlers
   */
  private setupBehaviorHandlers(
    appliedBehaviorId: string, 
    customHandlers?: BehaviorHandler[]
  ): void {
    const appliedBehavior = this.appliedBehaviors.get(appliedBehaviorId);
    if (!appliedBehavior) return;
    
    const behavior = this.behaviors.get(appliedBehavior.behaviorId);
    if (!behavior) return;
    
    const component = componentRegistry.getInstance(appliedBehavior.componentId);
    if (!component) return;
    
    // Combine default and custom handlers
    const handlers = [...behavior.handlers, ...(customHandlers || [])];
    
    // Set up each handler
    handlers.forEach(({ event, handler }) => {
      // Find the connection point for this event
      const connectionPoint = this.findConnectionPointForEvent(component.type, event);
      if (!connectionPoint) return;
      
      // Create a special connection that loops back to component
      // This allows the behavior to update the component's state
      const connectionId = connectionManager.connect(
        appliedBehavior.componentId,
        connectionPoint,
        appliedBehavior.componentId,
        'behaviorUpdate',
        (eventData) => {
          // Update the behavior state
          const currentState = appliedBehavior.state;
          const newState = handler(currentState, eventData);
          
          // Store the new state
          appliedBehavior.state = newState;
          
          // Return the new state as the transformed value
          return newState;
        }
      );
      
      // Store the connection ID
      appliedBehavior.connections.push(connectionId);
    });
  }
  
  /**
   * Set up behavior transformers
   */
  private setupBehaviorTransformers(
    appliedBehaviorId: string,
    customTransformers?: Record<string, ValueTransformer>
  ): void {
    const appliedBehavior = this.appliedBehaviors.get(appliedBehaviorId);
    if (!appliedBehavior) return;
    
    const behavior = this.behaviors.get(appliedBehavior.behaviorId);
    if (!behavior) return;
    
    // Combine default and custom transformers
    const transformers = {
      ...(behavior.transformers || {}),
      ...(customTransformers || {})
    };
    
    // Apply each transformer
    Object.entries(transformers).forEach(([connectionPointId, transformer]) => {
      // The transformer is applied to outgoing connections
      // Find all outgoing connections from this component
      const outgoingConnections = connectionManager.getOutgoingConnections(appliedBehavior.componentId)
        .filter(connection => connection.sourceConnectionId === connectionPointId);
      
      // Update each connection with the transformer
      outgoingConnections.forEach(connection => {
        // Create a new connection with the transformer
        const newConnectionId = connectionManager.connect(
          connection.sourceComponentId,
          connection.sourceConnectionId,
          connection.targetComponentId,
          connection.targetConnectionId,
          (value) => transformer(value, appliedBehavior.state)
        );
        
        // Store the new connection ID
        appliedBehavior.connections.push(newConnectionId);
        
        // Remove the old connection
        connectionManager.removeConnection(connection.id);
      });
    });
  }
  
  /**
   * Find the connection point ID for an event type
   */
  private findConnectionPointForEvent(componentType: ComponentType, eventType: string): string | null {
    // Get the component definition
    const componentDef = componentRegistry.getComponent(componentType);
    if (!componentDef) return null;
    
    // Common mappings
    const eventToConnectionMap: Record<string, string> = {
      'click': 'click',
      'change': 'onChange',
      'input': 'onInput',
      'focus': 'onFocus',
      'blur': 'onBlur'
    };
    
    // Use the mapping if available
    if (eventToConnectionMap[eventType]) {
      return eventToConnectionMap[eventType];
    }
    
    // Otherwise, look through all connection points
    for (const capability of componentDef.meta.capabilities) {
      for (const point of capability.connectionPoints) {
        if (point.id.toLowerCase().includes(eventType.toLowerCase())) {
          return point.id;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Remove an applied behavior
   */
  removeBehavior(appliedBehaviorId: string): boolean {
    const appliedBehavior = this.appliedBehaviors.get(appliedBehaviorId);
    if (!appliedBehavior) return false;
    
    // Remove all connections
    appliedBehavior.connections.forEach(connectionId => {
      connectionManager.removeConnection(connectionId);
    });
    
    // Remove the applied behavior
    this.appliedBehaviors.delete(appliedBehaviorId);
    
    return true;
  }
  
  /**
   * Update the state of an applied behavior
   */
  updateBehaviorState(appliedBehaviorId: string, state: any): boolean {
    const appliedBehavior = this.appliedBehaviors.get(appliedBehaviorId);
    if (!appliedBehavior) return false;
    
    appliedBehavior.state = state;
    return true;
  }
  
  /**
   * Get all behaviors applied to a component
   */
  getBehaviorsForComponent(componentId: ComponentId): AppliedBehavior[] {
    return Array.from(this.appliedBehaviors.values())
      .filter(behavior => behavior.componentId === componentId);
  }
}

// Singleton instance
export const behaviorSystem = new BehaviorSystem();

// Register built-in behaviors
// These serve as examples and starting points for the AI to build upon

// Toggle Behavior
behaviorSystem.registerBehavior({
  type: BehaviorType.TOGGLE,
  name: 'Toggle State',
  description: 'Toggles between two states when triggered',
  initialState: { 
    active: false,
    states: ['inactive', 'active'],
    property: 'active' 
  },
  handlers: [
    {
      event: EventType.CLICK,
      handler: (state, event) => ({
        ...state,
        active: !state.active
      })
    }
  ],
  transformers: {
    'value': (value, state) => state.active ? state.states[1] : state.states[0]
  },
  compatibleWith: [
    ComponentType.BUTTON,
    ComponentType.TOGGLE,
    ComponentType.CHECKBOX
  ]
});

// Counter Behavior
behaviorSystem.registerBehavior({
  type: BehaviorType.COUNTER,
  name: 'Counter',
  description: 'Counts up or down when triggered',
  initialState: { 
    count: 0,
    step: 1,
    min: null,
    max: null
  },
  handlers: [
    {
      event: EventType.CLICK,
      handler: (state, event) => {
        let newCount = state.count + state.step;
        
        // Apply min/max constraints
        if (state.max !== null && newCount > state.max) {
          newCount = state.max;
        }
        if (state.min !== null && newCount < state.min) {
          newCount = state.min;
        }
        
        return {
          ...state,
          count: newCount
        };
      }
    }
  ],
  transformers: {
    'value': (value, state) => state.count.toString()
  },
  compatibleWith: [
    ComponentType.BUTTON,
    ComponentType.TEXT
  ]
});

// Text Transformer Behavior
behaviorSystem.registerBehavior({
  type: BehaviorType.TRANSFORM,
  name: 'Text Transformer',
  description: 'Transforms text in various ways',
  initialState: { 
    transformType: 'uppercase', // uppercase, lowercase, reverse, etc.
  },
  handlers: [],
  transformers: {
    'value': (value, state) => {
      if (typeof value !== 'string') return value;
      
      switch (state.transformType) {
        case 'uppercase':
          return value.toUpperCase();
        case 'lowercase':
          return value.toLowerCase();
        case 'reverse':
          return value.split('').reverse().join('');
        case 'capitalize':
          return value.charAt(0).toUpperCase() + value.slice(1);
        default:
          return value;
      }
    }
  },
  compatibleWith: [
    ComponentType.TEXT_INPUT,
    ComponentType.TEXT,
    ComponentType.TEXTAREA
  ]
});

// Timer Behavior
behaviorSystem.registerBehavior({
  type: BehaviorType.TIMER,
  name: 'Timer',
  description: 'Triggers an action after a delay or at intervals',
  initialState: { 
    interval: 1000,
    count: 0,
    maxCount: null,
    autoStart: false,
    running: false,
    timerId: null
  },
  handlers: [
    {
      event: 'start',
      handler: (state, event) => {
        // Clear any existing timer
        if (state.timerId) {
          clearInterval(state.timerId);
        }
        
        // Create a new timer
        const timerId = setInterval(() => {
          // This will update the state via a separate mechanism
          // since this isn't directly triggered by a component event
          const newState = {
            ...state,
            count: state.count + 1
          };
          
          // Check if we've reached max count
          if (state.maxCount !== null && newState.count >= state.maxCount) {
            clearInterval(timerId);
            newState.running = false;
            newState.timerId = null;
          }
          
          // Update the state
          behaviorSystem.updateBehaviorState(event.appliedBehaviorId, newState);
        }, state.interval);
        
        return {
          ...state,
          running: true,
          timerId
        };
      }
    },
    {
      event: 'stop',
      handler: (state, event) => {
        if (state.timerId) {
          clearInterval(state.timerId);
        }
        
        return {
          ...state,
          running: false,
          timerId: null
        };
      }
    },
    {
      event: 'reset',
      handler: (state, event) => {
        if (state.timerId) {
          clearInterval(state.timerId);
        }
        
        return {
          ...state,
          count: 0,
          running: false,
          timerId: null
        };
      }
    }
  ],
  transformers: {
    'value': (value, state) => state.count.toString()
  },
  compatibleWith: [
    ComponentType.BUTTON,
    ComponentType.TEXT,
    ComponentType.PROGRESS
  ]
});

// Register built-in behaviors - position behavior will be imported from the behaviors/index.ts
// This import needs to be at the top of the file, not at the bottom
// It's already imported at the top of the file

export default behaviorSystem; 