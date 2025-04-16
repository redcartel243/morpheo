import { 
  Action, 
  SetValueAction, 
  GetValueAction, 
  StyleAction, 
  ClassAction, 
  TimeoutAction, 
  ConditionAction,
  ValueExpression,
  Condition
} from './ComponentInterface';
import { ComponentRegistry } from './ComponentRegistry';

/**
 * Processes declarative actions for component behaviors
 */
export class ActionProcessor {
  private registry: ComponentRegistry;
  private variables: Map<string, any> = new Map();
  private actionHandlers: Map<string, (action: any) => any> = new Map();

  constructor(registry: ComponentRegistry = ComponentRegistry.getInstance()) {
    this.registry = registry;
    this.initializeActionHandlers();
  }

  private initializeActionHandlers() {
    this.registerActionHandler('setValue', this.executeSetValue.bind(this));
    this.registerActionHandler('getValue', this.executeGetValue.bind(this));
    this.registerActionHandler('setStyle', this.executeSetStyle.bind(this));
    this.registerActionHandler('addClass', this.executeClassAction.bind(this));
    this.registerActionHandler('removeClass', this.executeClassAction.bind(this));
    this.registerActionHandler('setTimeout', this.executeTimeout.bind(this));
    this.registerActionHandler('if', this.executeCondition.bind(this));
  }

  private registerActionHandler(type: string, handler: (action: any) => any) {
    this.actionHandlers.set(type, handler);
  }

  /**
   * Execute a sequence of actions
   * @param actions The actions to execute
   * @param context Optional execution context
   */
  public executeActions(actions: Action | Action[], context: Record<string, any> = {}): any {
    if (!actions) return null;
    
    // Initialize context variables
    for (const [key, value] of Object.entries(context)) {
      this.variables.set(key, value);
    }

    // Handle single action or array of actions
    if (Array.isArray(actions)) {
      let result = null;
      for (const action of actions) {
        result = this.executeAction(action);
      }
      return result;
    } else {
      return this.executeAction(actions);
    }
  }

  /**
   * Execute a single action
   * @param action The action to execute
   * @returns Any result from the action
   */
  private executeAction(action: Action): any {
    try {
      const handler = this.actionHandlers.get(action.type);
      
      if (handler) {
        return handler(action);
      }
      
      console.warn(`Unknown action type: ${action.type}`);
      return null;
    } catch (error) {
      console.error(`Error executing action of type ${action.type}:`, error);
      return null;
    }
  }

  /**
   * Execute a setValue action
   * @param action The setValue action
   */
  private executeSetValue(action: SetValueAction): any {
    const component = this.registry.get(action.target);
    if (!component) {
      console.warn(`Cannot set value: Component ${action.target} not found`);
      return null;
    }

    // Resolve the value if it's an expression
    const resolvedValue = this.resolveValue(action.value);
    
    // Set the value on the component
    component.setValue(String(resolvedValue));
    return resolvedValue;
  }

  /**
   * Execute a getValue action
   * @param action The getValue action
   */
  private executeGetValue(action: GetValueAction): any {
    const component = this.registry.get(action.target);
    if (!component) {
      console.warn(`Cannot get value: Component ${action.target} not found`);
      return null;
    }

    const value = component.getValue();
    
    // Store in variables if requested
    if (action.store) {
      this.variables.set(action.store, value);
    }
    
    return value;
  }

  /**
   * Execute a style action
   * @param action The style action
   */
  private executeSetStyle(action: StyleAction): void {
    const component = this.registry.get(action.target);
    if (!component) {
      console.warn(`Cannot set style: Component ${action.target} not found`);
      return;
    }

    const resolvedValue = this.resolveValue(action.value);
    component.setStyle(action.property, String(resolvedValue));
  }

  /**
   * Execute a class action (addClass or removeClass)
   * @param action The class action
   */
  private executeClassAction(action: ClassAction): void {
    const component = this.registry.get(action.target);
    if (!component) {
      console.warn(`Cannot modify class: Component ${action.target} not found`);
      return;
    }

    if (action.type === 'addClass') {
      component.addClass(action.class);
    } else if (action.type === 'removeClass') {
      component.removeClass(action.class);
    }
  }

  /**
   * Execute a timeout action
   * @param action The timeout action
   */
  private executeTimeout(action: TimeoutAction): number {
    return window.setTimeout(() => {
      this.executeActions(action.callback);
    }, action.delay);
  }

  /**
   * Execute a conditional action
   * @param action The conditional action
   */
  private executeCondition(action: ConditionAction): any {
    const conditionResult = this.evaluateCondition(action.condition);
    
    if (conditionResult) {
      return this.executeActions(action.then);
    } else if (action.else) {
      return this.executeActions(action.else);
    }
    
    return null;
  }

  /**
   * Evaluate a condition
   * @param condition The condition to evaluate
   * @returns Boolean result of the condition
   */
  private evaluateCondition(condition: Condition): boolean {
    // Handle equals condition
    if (condition.equals) {
      const [left, right] = condition.equals;
      return this.resolveValue(left) === this.resolveValue(right);
    }
    
    // Handle not equals condition
    if (condition.notEquals) {
      const [left, right] = condition.notEquals;
      return this.resolveValue(left) !== this.resolveValue(right);
    }
    
    // Handle greater than condition
    if (condition.greaterThan) {
      const [left, right] = condition.greaterThan;
      return this.resolveValue(left) > this.resolveValue(right);
    }
    
    // Handle less than condition
    if (condition.lessThan) {
      const [left, right] = condition.lessThan;
      return this.resolveValue(left) < this.resolveValue(right);
    }
    
    // Handle contains condition
    if (condition.contains) {
      const [container, item] = condition.contains;
      const containerValue = this.resolveValue(container);
      const itemValue = this.resolveValue(item);
      
      if (typeof containerValue === 'string') {
        return containerValue.includes(String(itemValue));
      } else if (Array.isArray(containerValue)) {
        return containerValue.includes(itemValue);
      }
      
      return false;
    }
    
    // Handle AND condition
    if (condition.and && Array.isArray(condition.and)) {
      return condition.and.every(subCondition => this.evaluateCondition(subCondition));
    }
    
    // Handle OR condition
    if (condition.or && Array.isArray(condition.or)) {
      return condition.or.some(subCondition => this.evaluateCondition(subCondition));
    }
    
    // Default to false for unknown conditions
    console.warn('Unknown condition type', condition);
    return false;
  }

  /**
   * Resolve a value or expression to its final value
   * @param value The value or expression to resolve
   * @returns The resolved value
   */
  private resolveValue(value: any): any {
    // Handle simple values
    if (value === null || value === undefined || 
        typeof value === 'boolean' || 
        typeof value === 'number') {
      return value;
    }
    
    // Handle string values
    if (typeof value === 'string') {
      // Check if it's a variable reference
      if (value.startsWith('$')) {
        const varName = value.substring(1);
        return this.variables.has(varName) ? this.variables.get(varName) : null;
      }
      
      // Otherwise, return as-is
      return value;
    }
    
    // Handle value expressions
    if (typeof value === 'object' && value !== null) {
      // Handle direct value
      if ('value' in value) {
        return this.resolveValue(value.value);
      }
      
      // Handle component reference
      if ('ref' in value) {
        const ref = value.ref;
        if (ref.startsWith('#')) {
          const component = this.registry.get(ref);
          return component ? component.getValue() : null;
        } else if (ref.startsWith('$')) {
          // Variable reference
          const varName = ref.substring(1);
          return this.variables.has(varName) ? this.variables.get(varName) : null;
        }
      }
      
      // Handle concatenation
      if ('concat' in value && Array.isArray(value.concat)) {
        return value.concat
          .map((item: any) => this.resolveValue(item))
          .join('');
      }
      
      // Handle addition
      if ('add' in value && Array.isArray(value.add)) {
        return value.add
          .map((item: any) => Number(this.resolveValue(item)))
          .reduce((a: number, b: number) => a + b, 0);
      }
      
      // Handle subtraction
      if ('subtract' in value && Array.isArray(value.subtract) && value.subtract.length === 2) {
        const [a, b] = value.subtract.map((item: any) => Number(this.resolveValue(item)));
        return a - b;
      }
      
      // Handle multiplication
      if ('multiply' in value && Array.isArray(value.multiply)) {
        return value.multiply
          .map((item: any) => Number(this.resolveValue(item)))
          .reduce((a: number, b: number) => a * b, 1);
      }
      
      // Handle division
      if ('divide' in value && Array.isArray(value.divide) && value.divide.length === 2) {
        const [a, b] = value.divide.map((item: any) => Number(this.resolveValue(item)));
        return b !== 0 ? a / b : null;
      }
      
      // Handle equality comparison
      if ('equals' in value && Array.isArray(value.equals) && value.equals.length === 2) {
        const [a, b] = value.equals.map((item: any) => this.resolveValue(item));
        return a === b;
      }
    }
    
    // Default case
    return value;
  }
} 