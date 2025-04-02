/**
 * Standardized interface that all components must implement
 */
export interface ComponentInterface {
  // Core methods
  getValue(): string;
  setValue(value: string): void;
  
  // Element access
  getElement(): HTMLElement | null;
  
  // Properties
  getProperty(name: string): any;
  setProperty(name: string, value: any): void;
  
  // Styling
  setStyle(property: string, value: string): void;
  addClass(className: string): void;
  removeClass(className: string): void;
  
  // Children and relationships
  getChildComponents(): ComponentInterface[];
  getParentComponent(): ComponentInterface | null;
  setParentComponent(parent: ComponentInterface | null): void;
  
  // Event handling
  addEventListener(eventName: string, handler: EventListener): void;
  removeEventListener(eventName: string, handler: EventListener): void;
}

/**
 * Declarative action types for component behaviors
 */
export interface Action {
  type: string;
  [key: string]: any;
}

export interface SetValueAction extends Action {
  type: 'setValue';
  target: string;
  value: any | ValueExpression;
}

export interface GetValueAction extends Action {
  type: 'getValue';
  target: string;
  store?: string; // Store result in a variable
}

export interface StyleAction extends Action {
  type: 'setStyle';
  target: string;
  property: string;
  value: string | ValueExpression;
}

export interface ClassAction extends Action {
  type: 'addClass' | 'removeClass';
  target: string;
  class: string;
}

export interface TimeoutAction extends Action {
  type: 'setTimeout';
  callback: Action | Action[];
  delay: number;
}

export interface ConditionAction extends Action {
  type: 'if';
  condition: Condition;
  then: Action | Action[];
  else?: Action | Action[];
}

export interface ValueExpression {
  concat?: any[];
  add?: any[];
  subtract?: any[];
  multiply?: any[];
  divide?: any[];
  equals?: any[];
  value?: any;
  ref?: string; // Reference to component or variable
}

export interface Condition {
  equals?: [any, any];
  notEquals?: [any, any];
  greaterThan?: [any, any];
  lessThan?: [any, any];
  contains?: [any, any];
  and?: Condition[];
  or?: Condition[];
}

/**
 * Component method definition using declarative actions
 */
export interface ComponentMethod {
  actions: Action[];
  description?: string;
  affectedComponents?: string[];
} 