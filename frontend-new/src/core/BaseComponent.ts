import { ComponentInterface } from './ComponentInterface';
import { ComponentRegistry } from './ComponentRegistry';

/**
 * Base component implementation that implements the ComponentInterface
 * This class can be extended to create specific component types
 */
export class BaseComponent implements ComponentInterface {
  protected id: string;
  protected element: HTMLElement | null = null;
  protected properties: Map<string, any> = new Map();
  protected parentComponent: ComponentInterface | null = null;
  protected childComponents: ComponentInterface[] = [];
  protected eventListeners: Map<string, Set<EventListener>> = new Map();

  /**
   * Create a new base component
   * @param id The component ID
   * @param element The associated DOM element (optional)
   */
  constructor(id: string, element?: HTMLElement) {
    this.id = id;
    
    if (element) {
      this.element = element;
    } else {
      // Try to find the element by ID
      this.element = document.getElementById(id);
    }
    
    // Register this component with the registry
    ComponentRegistry.getInstance().register(id, this);
  }

  /**
   * Get the component's value
   * @returns The component's value as a string
   */
  getValue(): string {
    const element = this.getElement();
    if (!element) return '';
    
    // Handle form elements
    if (element instanceof HTMLInputElement || 
        element instanceof HTMLTextAreaElement || 
        element instanceof HTMLSelectElement) {
      return element.value;
    }
    
    // Handle other elements (use textContent)
    return element.textContent || '';
  }

  /**
   * Set the component's value
   * @param value The value to set
   */
  setValue(value: string): void {
    const element = this.getElement();
    if (!element) return;
    
    // Handle form elements
    if (element instanceof HTMLInputElement || 
        element instanceof HTMLTextAreaElement || 
        element instanceof HTMLSelectElement) {
      element.value = value;
      // Trigger change event
      element.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // Handle other elements (set textContent)
      element.textContent = value;
    }
  }

  /**
   * Get the associated DOM element
   * @returns The DOM element or null if not found
   */
  getElement(): HTMLElement | null {
    // If element isn't already cached, try to find it
    if (!this.element) {
      this.element = document.getElementById(this.id);
    }
    return this.element;
  }

  /**
   * Get a property value
   * @param name The property name
   * @returns The property value or undefined if not found
   */
  getProperty(name: string): any {
    return this.properties.get(name);
  }

  /**
   * Set a property value
   * @param name The property name
   * @param value The property value
   */
  setProperty(name: string, value: any): void {
    this.properties.set(name, value);
    
    // If element exists, also set as data attribute
    const element = this.getElement();
    if (element && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')) {
      element.dataset[name] = String(value);
    }
  }

  /**
   * Set a style property
   * @param property The CSS property name
   * @param value The CSS property value
   */
  setStyle(property: string, value: string): void {
    const element = this.getElement();
    if (element) {
      element.style[property as any] = value;
    }
  }

  /**
   * Add a CSS class
   * @param className The class to add
   */
  addClass(className: string): void {
    const element = this.getElement();
    if (element) {
      element.classList.add(className);
    }
  }

  /**
   * Remove a CSS class
   * @param className The class to remove
   */
  removeClass(className: string): void {
    const element = this.getElement();
    if (element) {
      element.classList.remove(className);
    }
  }

  /**
   * Get child components
   * @returns Array of child components
   */
  getChildComponents(): ComponentInterface[] {
    return [...this.childComponents];
  }

  /**
   * Get parent component
   * @returns The parent component or null if none
   */
  getParentComponent(): ComponentInterface | null {
    return this.parentComponent;
  }

  /**
   * Set the parent component
   * @param parent The parent component
   */
  setParentComponent(parent: ComponentInterface | null): void {
    this.parentComponent = parent;
  }

  /**
   * Add a child component
   * @param child The child component to add
   */
  addChildComponent(child: ComponentInterface): void {
    if (!this.childComponents.includes(child)) {
      this.childComponents.push(child);
      child.setParentComponent(this);
    }
  }

  /**
   * Remove a child component
   * @param child The child component to remove
   */
  removeChildComponent(child: ComponentInterface): void {
    const index = this.childComponents.indexOf(child);
    if (index !== -1) {
      this.childComponents.splice(index, 1);
      child.setParentComponent(null);
    }
  }

  /**
   * Add an event listener
   * @param eventName The event name
   * @param handler The event handler
   */
  addEventListener(eventName: string, handler: EventListener): void {
    // Add to our tracking
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    
    const handlers = this.eventListeners.get(eventName)!;
    handlers.add(handler);
    
    // Add to the element
    const element = this.getElement();
    if (element) {
      element.addEventListener(eventName, handler);
    }
  }

  /**
   * Remove an event listener
   * @param eventName The event name
   * @param handler The event handler to remove
   */
  removeEventListener(eventName: string, handler: EventListener): void {
    // Remove from our tracking
    const handlers = this.eventListeners.get(eventName);
    if (handlers) {
      handlers.delete(handler);
    }
    
    // Remove from the element
    const element = this.getElement();
    if (element) {
      element.removeEventListener(eventName, handler);
    }
  }

  /**
   * Clean up this component (remove event listeners, etc.)
   */
  destroy(): void {
    // Remove from registry
    ComponentRegistry.getInstance().unregister(this.id);
    
    // Remove event listeners
    const element = this.getElement();
    if (element) {
      this.eventListeners.forEach((handlers, eventName) => {
        handlers.forEach(handler => {
          element.removeEventListener(eventName, handler);
        });
      });
    }
    
    // Clean up child relationships
    this.childComponents.forEach(child => {
      child.setParentComponent(null);
    });
    
    // Clear references
    this.childComponents = [];
    this.eventListeners.clear();
    this.properties.clear();
    this.parentComponent = null;
    this.element = null;
  }
} 