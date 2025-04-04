import React from 'react';
import { 
  ComponentType, 
  ComponentDefinition, 
  ComponentRegistry,
  ComponentId,
  ComponentInstance 
} from './ComponentTypes';

// Import map component for registration
import Map from '../components/visualization/Map';

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

// Register Map component
componentRegistry.registerComponent({
  meta: {
    type: ComponentType.MAP,
    name: 'Map',
    description: 'Displays interactive geographical maps with markers',
    capabilities: [],
    defaultProps: {
      center: { lat: 0, lng: 0 },
      zoom: 12,
      markers: [],
      interactive: true
    }
  },
  initializer: (props) => ({
    id: props.id,
    type: ComponentType.MAP,
    properties: {
      center: props.center || { lat: 0, lng: 0 },
      zoom: props.zoom || 12,
      markers: props.markers || [],
      interactive: props.interactive !== undefined ? props.interactive : true
    },
    component: Map
  }),
  renderer: (instance: ComponentInstance) => {
    // Extract the required props from the instance properties
    const properties = instance.properties || {};
    
    // Handle center coordinates with better validation
    let center = properties.center || { lat: 41.3851, lng: 2.1734 }; // Default to Barcelona
    // Convert array format to object if needed
    if (Array.isArray(center) && center.length >= 2) {
      center = { lat: center[0], lng: center[1] };
    }
    // Final validation to ensure center is properly formatted
    if (!center || typeof center !== 'object' || center.lat === undefined || center.lng === undefined) {
      center = { lat: 41.3851, lng: 2.1734 }; // Fallback to Barcelona
    }
    
    const zoom = typeof properties.zoom === 'number' ? properties.zoom : 12;
    
    // Handle markers with better validation
    let markers = properties.markers || [];
    if (!Array.isArray(markers)) markers = [];
    
    // Ensure each marker has valid position
    markers = markers.map((marker: any) => {
      if (!marker || typeof marker !== 'object') {
        return { position: { lat: center.lat, lng: center.lng } };
      }
      
      let position = marker.position;
      // Convert array position to object if needed
      if (Array.isArray(position) && position.length >= 2) {
        position = { lat: position[0], lng: position[1] };
      }
      
      // Final validation
      if (!position || typeof position !== 'object' || position.lat === undefined || position.lng === undefined) {
        position = { lat: center.lat, lng: center.lng };
      }
      
      return {
        ...marker,
        position
      };
    });
    
    const interactive = properties.interactive !== undefined ? properties.interactive : true;
    
    // Return the Map component with properly mapped props
    return React.createElement(Map, {
      testId: instance.id,
      center,
      zoom,
      markers,
      interactive,
      handleEvent: (eventType, payload) => {
        console.log(`Map event: ${eventType}`, payload);
        // Here you would typically dispatch an event to your event system
      }
    });
  }
}); 