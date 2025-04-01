/**
 * Intelligent Components System for Morpheo
 * 
 * This system allows components to self-manage their logic and communicate
 * with each other through defined connection points. Each component can
 * send and receive data through these connections, making them behave like
 * interconnected building blocks that can be assembled into complete applications.
 * 
 * The AI Behavior System extends this with dynamic behaviors that can be
 * applied to components based on natural language requirements.
 */

// Types exports
export * from './ComponentTypes';
export * from './BehaviorSystem';
export * from './MorpheoAI';

// Core services
export { componentRegistry } from './ComponentRegistry';
export { connectionManager } from './ConnectionManager';
export { behaviorSystem } from './BehaviorSystem';
export { morpheoAI } from './MorpheoAI';

// Explicitly import needed services for internal use
import { componentRegistry } from './ComponentRegistry';
import { connectionManager } from './ConnectionManager';
import { behaviorSystem } from './BehaviorSystem';
import { morpheoAI } from './MorpheoAI';

// Component exports
export { IntelligentComponent, withIntelligentComponent } from './IntelligentComponent';
export { useIntelligentComponent } from './useIntelligentComponent';
export { useIntelligentComponentSystem } from './IntelligentComponentProvider';

// API for working with intelligent components
/**
 * Create a new intelligent application from natural language description
 */
export async function createApplicationFromDescription(description: string): Promise<string[]> {
  // Use the MorpheoAI service for processing
  return morpheoAI.processRequest(description);
}

/**
 * Apply a behavior to a component
 */
export function applyBehaviorToComponent(
  componentId: string, 
  behaviorType: string, 
  options?: any
): string | null {
  // Find a behavior matching the type
  const behaviors = behaviorSystem.getAllBehaviors();
  const behavior = behaviors.find(b => b.type.toLowerCase() === behaviorType.toLowerCase());
  
  if (!behavior) {
    console.error(`No behavior found matching type ${behaviorType}`);
    return null;
  }
  
  return behaviorSystem.applyBehavior(componentId, behavior.id, options);
}

/**
 * Connect two components
 */
export function connectComponents(
  sourceId: string,
  sourcePoint: string,
  targetId: string, 
  targetPoint: string,
  transform?: (value: any) => any
): string {
  return connectionManager.connect(
    sourceId,
    sourcePoint,
    targetId,
    targetPoint,
    transform
  );
}

/**
 * Auto-connect components based on semantic compatibility
 */
export function autoConnectComponents(componentIds: string[]): string[] {
  return connectionManager.createAIConnections(componentIds);
}

// Redux integration
export { 
  componentReducer,
  registerComponent,
  unregisterComponent,
  updateComponent,
  dispatchComponentEvent,
  createConnection,
  removeConnection,
  receiveConnectionData,
  COMPONENT_REGISTERED,
  COMPONENT_UNREGISTERED,
  COMPONENT_UPDATED,
  COMPONENT_EVENT,
  CONNECTION_CREATED,
  CONNECTION_REMOVED,
  CONNECTION_DATA_RECEIVED
} from './ComponentReducer'; 