import { ComponentInterface } from './ComponentInterface';

/**
 * Global registry of components for standardized access
 */
export class ComponentRegistry {
  private components: Map<string, ComponentInterface> = new Map();
  private eventHandlers: Map<string, Map<string, Set<EventListener>>> = new Map();
  private static instance: ComponentRegistry;

  /**
   * Get the singleton instance of the registry
   */
  public static getInstance(): ComponentRegistry {
    if (!ComponentRegistry.instance) {
      ComponentRegistry.instance = new ComponentRegistry();
    }
    return ComponentRegistry.instance;
  }

  /**
   * Register a component with the registry
   * @param id The component ID (without # prefix)
   * @param component The component instance
   */
  public register(id: string, component: ComponentInterface): void {
    // Remove # if present in the ID
    const cleanId = id.startsWith('#') ? id.substring(1) : id;
    this.components.set(cleanId, component);
  }

  /**
   * Get a component by ID
   * @param selector The component selector (with or without # prefix)
   * @returns The component instance or null if not found
   */
  public get(selector: string): ComponentInterface | null {
    // Remove # if present in the selector
    const cleanId = selector.startsWith('#') ? selector.substring(1) : selector;
    return this.components.get(cleanId) || null;
  }

  /**
   * Remove a component from the registry
   * @param id The component ID
   */
  public unregister(id: string): void {
    const cleanId = id.startsWith('#') ? id.substring(1) : id;
    this.components.delete(cleanId);
    
    // Clean up event handlers
    this.eventHandlers.delete(cleanId);
  }

  /**
   * Register an event handler for a component
   * @param selector The component selector
   * @param eventName The event name
   * @param handler The event handler function
   */
  public registerEventHandler(selector: string, eventName: string, handler: EventListener): void {
    const cleanId = selector.startsWith('#') ? selector.substring(1) : selector;
    const component = this.get(cleanId);
    
    if (!component) {
      console.warn(`Cannot register event handler: Component ${selector} not found`);
      return;
    }
    
    // Add to our internal tracking
    if (!this.eventHandlers.has(cleanId)) {
      this.eventHandlers.set(cleanId, new Map());
    }
    
    const componentHandlers = this.eventHandlers.get(cleanId)!;
    if (!componentHandlers.has(eventName)) {
      componentHandlers.set(eventName, new Set());
    }
    
    const eventHandlerSet = componentHandlers.get(eventName)!;
    eventHandlerSet.add(handler);
    
    // Add the actual event listener to the component
    component.addEventListener(eventName, handler);
  }

  /**
   * Unregister an event handler for a component
   * @param selector The component selector
   * @param eventName The event name
   * @param handler The event handler function
   */
  public unregisterEventHandler(selector: string, eventName: string, handler: EventListener): void {
    const cleanId = selector.startsWith('#') ? selector.substring(1) : selector;
    const component = this.get(cleanId);
    
    if (!component) return;
    
    // Remove from our internal tracking
    const componentHandlers = this.eventHandlers.get(cleanId);
    if (componentHandlers) {
      const eventHandlerSet = componentHandlers.get(eventName);
      if (eventHandlerSet) {
        eventHandlerSet.delete(handler);
      }
    }
    
    // Remove the actual event listener from the component
    component.removeEventListener(eventName, handler);
  }

  /**
   * Get all components in the registry
   * @returns Array of all components
   */
  public getAllComponents(): ComponentInterface[] {
    return Array.from(this.components.values());
  }
  
  /**
   * Query components by selector pattern (supports simple CSS selectors)
   * @param selector The CSS-like selector
   * @returns Array of matching components
   */
  public query(selector: string): ComponentInterface[] {
    // Implementation of a simplified selector engine
    // This is a basic implementation that could be expanded
    
    // Handle ID selector
    if (selector.startsWith('#')) {
      const component = this.get(selector);
      return component ? [component] : [];
    }
    
    // Handle class selector
    if (selector.startsWith('.')) {
      const className = selector.substring(1);
      return this.getAllComponents().filter(component => {
        const element = component.getElement();
        return element?.classList.contains(className) || false;
      });
    }
    
    // Handle tag selector
    return this.getAllComponents().filter(component => {
      const element = component.getElement();
      return element?.tagName.toLowerCase() === selector.toLowerCase();
    });
  }
} 