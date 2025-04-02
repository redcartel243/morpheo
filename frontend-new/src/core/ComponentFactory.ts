import { BaseComponent } from './BaseComponent';
import { ComponentInterface, ComponentMethod, Action } from './ComponentInterface';
import { ComponentRegistry } from './ComponentRegistry';
import { ActionProcessor } from './ActionProcessor';

/**
 * Selector function that replaces $m
 * @param selector The selector string
 * @returns The component or null if not found
 */
export function selector(selector: string): ComponentInterface | null {
  return ComponentRegistry.getInstance().get(selector);
}

/**
 * Factory for creating components
 */
export class ComponentFactory {
  private registry: ComponentRegistry;
  private actionProcessor: ActionProcessor;
  
  constructor() {
    this.registry = ComponentRegistry.getInstance();
    this.actionProcessor = new ActionProcessor(this.registry);
  }
  
  /**
   * Create a component from a JSON definition
   * @param definition The component definition
   * @returns The created component
   */
  createComponent(definition: any): ComponentInterface {
    if (!definition.id) {
      throw new Error('Component definition must have an id');
    }
    
    // Create the base component
    const component = new BaseComponent(definition.id);
    
    // Set properties
    if (definition.properties && typeof definition.properties === 'object') {
      Object.entries(definition.properties).forEach(([key, value]) => {
        component.setProperty(key, value);
      });
    }
    
    // Set styles
    if (definition.styles && typeof definition.styles === 'object') {
      Object.entries(definition.styles).forEach(([key, value]) => {
        component.setStyle(key, value as string);
      });
    }
    
    // Register methods
    if (definition.methods && typeof definition.methods === 'object') {
      this.registerMethods(component, definition.methods);
    }
    
    // Process children
    if (definition.children && Array.isArray(definition.children)) {
      definition.children.forEach((childDef: any) => {
        const childComponent = this.createComponent(childDef);
        component.addChildComponent(childComponent);
      });
    }
    
    return component;
  }
  
  /**
   * Register methods with a component
   * @param component The component
   * @param methods The method definitions
   */
  private registerMethods(component: ComponentInterface, methods: Record<string, any>): void {
    Object.entries(methods).forEach(([eventName, methodDef]) => {
      if (!methodDef) return;
      
      // Handle string methods (legacy format)
      if (typeof methodDef === 'string') {
        this.registerLegacyMethod(component, eventName, methodDef);
        return;
      }
      
      // Handle method objects with code (legacy format)
      if (typeof methodDef === 'object' && methodDef.code) {
        this.registerLegacyMethod(component, eventName, methodDef.code, methodDef.affectedComponents);
        return;
      }
      
      // Handle new declarative action format
      if (typeof methodDef === 'object' && methodDef.actions) {
        this.registerDeclarativeMethod(component, eventName, methodDef as ComponentMethod);
      }
    });
  }
  
  /**
   * Register a legacy method that uses code strings
   * @param component The component
   * @param eventName The event name
   * @param code The method code
   * @param affectedComponents Optional list of affected components
   */
  private registerLegacyMethod(
    component: ComponentInterface, 
    eventName: string, 
    code: string,
    affectedComponents?: string[]
  ): void {
    // Convert event name to DOM event name if needed
    const domEventName = eventName.startsWith('on') 
      ? eventName.substring(2).toLowerCase() 
      : eventName;
    
    try {
      // Create a safe function from the code string
      // This is where we'd apply the wrapper from before
      const func = this.createSafeFunction(code);
      
      // Register the event handler using the imported selector function
      component.addEventListener(domEventName, (event: Event) => {
        func(event, selector);
      });
    } catch (error) {
      console.error(`Error registering legacy method for ${component.getProperty('id')}.${eventName}:`, error);
    }
  }
  
  /**
   * Register a declarative method using the actions API
   * @param component The component
   * @param eventName The event name
   * @param method The method definition
   */
  private registerDeclarativeMethod(
    component: ComponentInterface, 
    eventName: string, 
    method: ComponentMethod
  ): void {
    // Convert event name to DOM event name if needed
    const domEventName = eventName.startsWith('on') 
      ? eventName.substring(2).toLowerCase() 
      : eventName;
    
    // Create an event handler that executes the actions
    const handler = (event: Event) => {
      this.actionProcessor.executeActions(method.actions, { event });
    };
    
    // Register the event handler
    component.addEventListener(domEventName, handler);
  }
  
  /**
   * Create a safe function from a code string
   * @param code The code string
   * @returns A function that can be safely executed
   */
  private createSafeFunction(code: string): Function {
    // Ensure the code is in function expression format
    if (!code.trim().startsWith('function(')) {
      code = `function(event, $m) { ${code} }`;
    }
    
    // Create a function from the code string
    try {
      // Here we'd apply the wrapper we had before
      return new Function('event', '$m', `
        try {
          return (${code})(event, $m);
        } catch (error) {
          console.error('Error in event handler:', error);
          return null;
        }
      `);
    } catch (error) {
      console.error('Error creating function from code:', error);
      return () => null;
    }
  }
}

// Create a global $m replacement
declare global {
  interface Window {
    m: typeof selector;
  }
}

// Attach to window for global access
window.m = selector; 