import { v4 as uuidv4 } from 'uuid';
import { 
  ComponentId, 
  ComponentType, 
  ComponentInstance
} from './ComponentTypes';
import { componentRegistry } from './ComponentRegistry';
import { connectionManager } from './ConnectionManager';

/**
 * Component Manager interface
 */
export interface ComponentManager {
  createInstance(type: ComponentType, properties: Record<string, any>): ComponentId;
  getInstance(id: ComponentId): ComponentInstance | undefined;
  updateInstance(id: ComponentId, updates: Partial<ComponentInstance>): boolean;
  removeInstance(id: ComponentId): boolean;
  getAllInstances(): ComponentInstance[];
  setParentChild(parentId: ComponentId, childId: ComponentId): void;
  removeParentChild(parentId: ComponentId, childId: ComponentId): void;
  getChildren(parentId: ComponentId): ComponentInstance[];
  getParent(childId: ComponentId): ComponentInstance | undefined;
}

/**
 * Component Manager implementation
 */
class ComponentManagerImpl implements ComponentManager {
  private static instance: ComponentManagerImpl;

  private constructor() {
    // Singleton implementation
  }

  /**
   * Get the singleton instance of the component manager
   */
  public static getInstance(): ComponentManagerImpl {
    if (!ComponentManagerImpl.instance) {
      ComponentManagerImpl.instance = new ComponentManagerImpl();
    }
    return ComponentManagerImpl.instance;
  }

  /**
   * Create a new component instance
   */
  createInstance(type: ComponentType, properties: Record<string, any> = {}): ComponentId {
    // Generate unique ID for the component
    const id = uuidv4();
    
    // Initialize with default state
    const instance: ComponentInstance = {
      id,
      type,
      properties,
      state: {}
    };
    
    // Register the instance
    componentRegistry.registerInstance(instance);
    
    return id;
  }

  /**
   * Get a component instance by ID
   */
  getInstance(id: ComponentId): ComponentInstance | undefined {
    return componentRegistry.getInstance(id);
  }

  /**
   * Update a component instance
   */
  updateInstance(id: ComponentId, updates: Partial<ComponentInstance>): boolean {
    const instance = this.getInstance(id);
    if (!instance) return false;
    
    // If properties are provided in updates, merge them with existing properties
    if (updates.properties) {
      updates.properties = {
        ...instance.properties,
        ...updates.properties
      };
    }
    
    // Call updateInstance and return true if it returned an updated instance
    const updated = componentRegistry.updateInstance(id, updates);
    return updated !== undefined;
  }

  /**
   * Remove a component instance
   */
  removeInstance(id: ComponentId): boolean {
    // Remove all connections first
    const connections = connectionManager.getConnectionsForComponent(id);
    connections.forEach(connection => {
      connectionManager.removeConnection(connection.id);
    });
    
    // Then remove the instance
    return componentRegistry.removeInstance(id);
  }

  /**
   * Get all component instances
   */
  getAllInstances(): ComponentInstance[] {
    return componentRegistry.getAllInstances();
  }

  /**
   * Set parent-child relationship
   */
  setParentChild(parentId: ComponentId, childId: ComponentId): void {
    const parent = this.getInstance(parentId);
    const child = this.getInstance(childId);
    
    if (!parent || !child) {
      console.warn('Parent or child not found');
      return;
    }
    
    // Update parent component to add child
    componentRegistry.updateInstance(parentId, {
      children: [...(parent.children || []), childId]
    });
    
    // Update child component to set parent
    componentRegistry.updateInstance(childId, {
      parent: parentId
    });
  }

  /**
   * Remove parent-child relationship
   */
  removeParentChild(parentId: ComponentId, childId: ComponentId): void {
    const parent = this.getInstance(parentId);
    const child = this.getInstance(childId);
    
    if (!parent || !child) {
      console.warn('Parent or child not found');
      return;
    }
    
    // Update parent component to remove child
    componentRegistry.updateInstance(parentId, {
      children: (parent.children || []).filter(id => id !== childId)
    });
    
    // Update child component to remove parent (if the parent matches)
    if (child.parent === parentId) {
      componentRegistry.updateInstance(childId, {
        parent: undefined
      });
    }
  }

  /**
   * Get all children of a component
   */
  getChildren(parentId: ComponentId): ComponentInstance[] {
    const parent = this.getInstance(parentId);
    
    if (!parent || !parent.children) {
      return [];
    }
    
    return parent.children
      .map(childId => this.getInstance(childId))
      .filter(Boolean) as ComponentInstance[];
  }

  /**
   * Get parent of a component
   */
  getParent(childId: ComponentId): ComponentInstance | undefined {
    const child = this.getInstance(childId);
    
    if (!child || !child.parent) {
      return undefined;
    }
    
    return this.getInstance(child.parent);
  }
}

/**
 * Export the singleton instance
 */
export const componentManager = ComponentManagerImpl.getInstance();
export default componentManager; 