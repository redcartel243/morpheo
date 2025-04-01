import React from 'react';
import { 
  ComponentType, 
  ComponentDefinition, 
  ComponentRegistry,
  ComponentId,
  ComponentInstance 
} from './ComponentTypes';

/**
 * Implementation of the component registry service
 */
class ComponentRegistryImpl implements ComponentRegistry {
  private components: Partial<Record<ComponentType, ComponentDefinition>> = {};
  private instances: Record<ComponentId, ComponentInstance> = {};
  private static instance: ComponentRegistryImpl;

  private constructor() {
    // Singleton implementation
  }

  /**
   * Get the singleton instance of the registry
   */
  public static getInstance(): ComponentRegistryImpl {
    if (!ComponentRegistryImpl.instance) {
      ComponentRegistryImpl.instance = new ComponentRegistryImpl();
    }
    return ComponentRegistryImpl.instance;
  }

  /**
   * Register a component definition with the registry
   */
  registerComponent(definition: ComponentDefinition): void {
    if (this.components[definition.meta.type]) {
      console.warn(`Component type ${definition.meta.type} is already registered. Overwriting...`);
    }
    this.components[definition.meta.type] = definition;
  }

  /**
   * Get a component definition by type
   */
  getComponent(type: ComponentType): ComponentDefinition | undefined {
    return this.components[type];
  }

  /**
   * Get all registered component definitions
   */
  getAllComponents(): Record<ComponentType, ComponentDefinition> {
    return this.components as Record<ComponentType, ComponentDefinition>;
  }

  /**
   * Register an instance of a component
   */
  registerInstance(instance: ComponentInstance): void {
    if (this.instances[instance.id]) {
      console.warn(`Component instance ${instance.id} is already registered. Overwriting...`);
    }
    this.instances[instance.id] = instance;
  }

  /**
   * Get a component instance by ID
   */
  getInstance(id: ComponentId): ComponentInstance | undefined {
    return this.instances[id];
  }

  /**
   * Get all registered component instances
   */
  getAllInstances(): ComponentInstance[] {
    return Object.values(this.instances);
  }

  /**
   * Update a component instance
   */
  updateInstance(id: ComponentId, updates: Partial<ComponentInstance>): ComponentInstance | undefined {
    if (!this.instances[id]) {
      console.warn(`Component instance ${id} not found for update:`, updates);
      return undefined;
    }

    // Handle nested state updates
    if (updates.state && this.instances[id].state) {
      updates.state = {
        ...this.instances[id].state,
        ...updates.state
      };
      console.log(`Updated component ${id} state:`, updates.state);
    }

    this.instances[id] = {
      ...this.instances[id],
      ...updates,
      // Always preserve the ID and type
      id,
      type: this.instances[id].type
    };

    return this.instances[id];
  }

  /**
   * Remove a component instance
   */
  removeInstance(id: ComponentId): boolean {
    if (!this.instances[id]) {
      console.warn(`Component instance ${id} not found.`);
      return false;
    }

    delete this.instances[id];
    return true;
  }
}

/**
 * Export the singleton instance
 */
export const componentRegistry = ComponentRegistryImpl.getInstance();

/**
 * Helper function to create a component instance
 */
export function createComponentInstance(
  type: ComponentType, 
  props: Record<string, any> = {}
): ComponentInstance | undefined {
  const definition = componentRegistry.getComponent(type);

  if (!definition) {
    console.error(`Component type ${type} not found in registry.`);
    return undefined;
  }

  // Create instance using the component's initializer
  const instance = definition.initializer({
    ...definition.meta.defaultProps,
    ...props
  });

  // Register the instance
  componentRegistry.registerInstance(instance);

  return instance;
}

/**
 * Helper function to render a component instance
 */
export function renderComponent(id: ComponentId): React.ReactElement | null {
  const instance = componentRegistry.getInstance(id);

  if (!instance) {
    console.error(`Component instance ${id} not found.`);
    return null;
  }

  const definition = componentRegistry.getComponent(instance.type);

  if (!definition) {
    console.error(`Component type ${instance.type} not found in registry.`);
    return null;
  }

  // Render using the component's renderer
  return definition.renderer(instance);
} 