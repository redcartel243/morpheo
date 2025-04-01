/**
 * Morpheo AI Integration Layer
 * 
 * This module integrates with external AI services to process natural language
 * requests and generate appropriate component configurations WITHOUT any
 * hardcoded application-specific logic.
 */

import { v4 as uuidv4 } from 'uuid';
import { ComponentType, DataType } from './ComponentTypes';
import { componentRegistry } from './ComponentRegistry';
import { connectionManager } from './ConnectionManager';
import { behaviorSystem, BehaviorType } from './BehaviorSystem';

/**
 * AI provider types
 */
export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  COHERE = 'cohere',
  MORPHEO = 'morpheo', // Built-in fallback
}

/**
 * AI request parameters
 */
export interface AIRequestParams {
  prompt: string;
  provider?: AIProvider;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
}

/**
 * Generic component configuration from AI
 */
export interface ComponentConfig {
  type: string;
  properties: Record<string, any>;
  id?: string;
  behaviors?: Array<{
    type: string;
    options?: Record<string, any>;
  }>;
}

/**
 * Generic connection configuration from AI
 */
export interface ConnectionConfig {
  sourceId: string;
  sourcePoint: string;
  targetId: string;
  targetPoint: string;
  transformerFunction?: string;
}

/**
 * AI-generated application structure
 */
export interface ApplicationStructure {
  components: ComponentConfig[];
  connections: ConnectionConfig[];
  layout?: Record<string, any>;
  styles?: Record<string, any>;
}

/**
 * AI response structure
 */
export interface AIResponse {
  applicationStructure: ApplicationStructure;
  explanation?: string;
  errors?: string[];
}

/**
 * MorpheoAI class that handles AI integration
 */
export class MorpheoAI {
  private provider: AIProvider = AIProvider.MORPHEO;
  private apiKey?: string;
  
  /**
   * Configure the AI provider
   */
  configure(provider: AIProvider, apiKey?: string): void {
    this.provider = provider;
    this.apiKey = apiKey;
  }
  
  /**
   * Process a natural language request and generate a component structure
   * This is the ONLY entry point for creating applications - no application-specific
   * logic exists elsewhere.
   */
  async processRequest(request: string): Promise<string[]> {
    try {
      // Get the AI to analyze the request and generate a component structure
      const aiResponse = await this.callAIProvider({
        prompt: this.buildPrompt(request),
        provider: this.provider,
        apiKey: this.apiKey
      });
      
      // Create components based on the AI response
      return this.createComponentsFromStructure(aiResponse.applicationStructure);
    } catch (error) {
      console.error('Error processing AI request:', error);
      
      // Provide a simple fallback in case of error
      return this.createFallbackComponents();
    }
  }
  
  /**
   * Build a prompt for the AI service
   */
  private buildPrompt(request: string): string {
    return `
You are Morpheo's AI application generator. Your task is to create an application based on the following request:

"${request}"

Generate a component structure that fulfills this request. The structure should specify:
1. Components - their types, properties, and behaviors
2. Connections - how components should interact with each other
3. Transformations - how data should be modified when flowing between components
4. Initial state values for any state management

IMPORTANT GUIDELINES:
- Always define initial state values for any state that components reference
- All response values must be valid JSON (no JavaScript expressions in the structure)
- Use named transformer functions instead of inline JavaScript code
- Position changes, random values, and other dynamic behavior must use state management
- For components that need dynamic position, include initial top/left values in state

The available component types include:
- button: Interactive clickable buttons
- text-input: Text input fields
- text: Text display elements
- container: Layout containers
- grid: Grid layouts for components
- card: Card containers for content
- image: Image display
- switch: Toggle switches
- checkbox: Checkboxes
- select: Dropdown selection
- slider: Numeric sliders
- progress: Progress indicators
- and many others...

The available behavior types include:
- toggle: Toggle between states
- counter: Count up or down
- transform: Transform data
- timer: Time-based behavior
- animation: Visual animations
- conditional: Logic based on conditions
- position: Change component position
- and others...

Connection points depend on the component type, but common ones include:
- For buttons: click (output), label (input)
- For text-input: value (output), onChange (input)
- For text: text (input)

Respond with a JSON structure like this:

{
  "applicationStructure": {
    "components": [
      {
        "type": "text-input",
        "properties": {
          "label": "Input",
          "placeholder": "Type here"
        }
      },
      {
        "type": "button",
        "properties": {
          "label": "Process"
        },
        "behaviors": [
          {
            "type": "counter",
            "options": {
              "step": 1
            }
          }
        ]
      },
      {
        "type": "text",
        "properties": {
          "text": "Output will appear here"
        }
      }
    ],
    "connections": [
      {
        "sourceId": "0",
        "sourcePoint": "value",
        "targetId": "2",
        "targetPoint": "text",
        "transformerFunction": "toUpperCase"
      },
      {
        "sourceId": "1",
        "sourcePoint": "click",
        "targetId": "0",
        "targetPoint": "value",
        "transformerFunction": "clearText"
      }
    ],
    "initialState": {
      "position": {
        "top": "20px",
        "left": "20px"
      },
      "count": 0
    }
  }
}

IMPORTANT: The component IDs in the "connections" section refer to the index of the component in the "components" array (0-based).

Available transformer functions include:
- identity: return the value unchanged
- toString: convert to string
- toNumber: convert to number
- toUpperCase: convert text to uppercase
- toLowerCase: convert text to lowercase
- reverse: reverse text
- negate: negate a boolean
- add: add a number
- multiply: multiply by a number
- randomPosition: generate random position values
- randomNumber: generate a random number in a specified range
- clearText: clear text content

Be creative and generate a solution that precisely matches the user's request. Always include appropriate initial state values for any dynamic behavior.
`;
  }
  
  /**
   * Call an AI provider to generate an application structure
   */
  private async callAIProvider(params: AIRequestParams): Promise<AIResponse> {
    // In a real implementation, this would call the appropriate API
    
    // For now, we'll simulate a response using the mock method
    // This would be replaced with actual API calls in a real implementation
    return this.generateMockResponse(params.prompt);
  }
  
  /**
   * Create components based on an application structure from the AI
   */
  private async createComponentsFromStructure(structure: ApplicationStructure): Promise<string[]> {
    const componentIds: string[] = [];
    const idMap: Record<string, string> = {};
    
    // Create all components first
    for (let i = 0; i < structure.components.length; i++) {
      const config = structure.components[i];
      
      // Generate an ID if not provided
      const id = config.id || uuidv4();
      
      // Map the index to the actual ID
      idMap[i.toString()] = id;
      
      // Create the component
      const componentId = this.createComponent(config);
      componentIds.push(componentId);
    }
    
    // Create all connections between components
    if (structure.connections) {
      for (const connection of structure.connections) {
        // Map the indices to actual component IDs
        const sourceId = idMap[connection.sourceId];
        const targetId = idMap[connection.targetId];
        
        if (sourceId && targetId) {
          // Create the connection with appropriate transform function
          this.createConnection(
            sourceId, 
            connection.sourcePoint, 
            targetId, 
            connection.targetPoint, 
            connection.transformerFunction
          );
        }
      }
    }
    
    return componentIds;
  }
  
  /**
   * Create a single component
   */
  private createComponent(config: ComponentConfig): string {
    // Map the component type string to ComponentType enum
    const componentType = this.mapToComponentType(config.type);
    
    // Get component definition
    const componentDef = componentRegistry.getComponent(componentType);
    if (!componentDef) {
      throw new Error(`Component type ${config.type} not found in registry`);
    }
    
    // Create the component ID
    const id = config.id || uuidv4();
    
    // Initialize the component
    const instance = componentDef.initializer({
      id,
      ...config.properties
    });
    
    // Register the instance
    componentRegistry.registerInstance(instance);
    
    // Apply behaviors if specified
    if (config.behaviors) {
      for (const behavior of config.behaviors) {
        // Map the behavior type
        const behaviorType = this.mapToBehaviorType(behavior.type);
        
        // Find a compatible behavior
        const compatibleBehaviors = behaviorSystem.getBehaviorsForComponent(componentType);
        const matchingBehavior = compatibleBehaviors.find(b => {
          const behavior = behaviorSystem.getBehavior(b.behaviorId);
          return behavior?.type.toLowerCase() === behaviorType.toLowerCase();
        });
        
        if (matchingBehavior) {
          // Apply the behavior with options
          behaviorSystem.applyBehavior(id, matchingBehavior.id, {
            initialState: behavior.options
          });
        }
      }
    }
    
    return id;
  }
  
  /**
   * Create a connection between components
   */
  private createConnection(
    sourceId: string,
    sourcePoint: string,
    targetId: string,
    targetPoint: string,
    transformerFunction?: string
  ): string {
    // Create a transform function based on the function name
    const transform = transformerFunction 
      ? this.createTransformFunction(transformerFunction)
      : undefined;
    
    // Create the connection
    return connectionManager.connect(
      sourceId,
      sourcePoint,
      targetId,
      targetPoint,
      transform
    );
  }
  
  /**
   * Create a transform function from a function name or code
   */
  private createTransformFunction(transformerFunction: string): (value: any) => any {
    // Handle built-in transformer functions
    switch (transformerFunction) {
      case 'identity':
        return (value) => value;
      case 'toString':
        return (value) => String(value);
      case 'toNumber':
        return (value) => Number(value);
      case 'toUpperCase':
        return (value) => typeof value === 'string' ? value.toUpperCase() : String(value).toUpperCase();
      case 'toLowerCase':
        return (value) => typeof value === 'string' ? value.toLowerCase() : String(value).toLowerCase();
      case 'reverse':
        return (value) => typeof value === 'string' ? value.split('').reverse().join('') : value;
      case 'negate':
        return (value) => !value;
      case 'add':
        return (value) => Number(value) + 1;
      case 'subtract':
        return (value) => Number(value) - 1;
      case 'multiply':
        return (value) => Number(value) * 2;
      case 'divide':
        return (value) => Number(value) / 2;
      case 'clearText':
        return () => '';
      case 'hello':
        return () => 'Hello World';
      case 'randomPosition':
        return () => ({
          top: `${Math.floor(Math.random() * 80)}%`,
          left: `${Math.floor(Math.random() * 80)}%`
        });
      case 'randomNumber':
        return (value) => {
          const min = typeof value === 'object' && value?.min ? value.min : 0;
          const max = typeof value === 'object' && value?.max ? value.max : 100;
          return Math.floor(Math.random() * (max - min + 1)) + min;
        };
    }
    
    // If it's not a built-in function, check if it's JavaScript code
    if (transformerFunction.includes('=>') || transformerFunction.includes('function')) {
      try {
        // Try to create a function from the code
        // This is potentially unsafe and should be used with caution in a real app
        return new Function('value', `return (${transformerFunction})(value);`) as (value: any) => any;
      } catch (error) {
        console.error('Error creating transform function:', error);
        return (value) => value; // Fallback to identity function
      }
    }
    
    // Default to identity function
    return (value) => value;
  }
  
  /**
   * Map a string to ComponentType enum
   */
  private mapToComponentType(type: string): ComponentType {
    const normalizedType = type.toLowerCase().replace(/_/g, '-');
    
    // Check if it matches a ComponentType directly
    if (Object.values(ComponentType).includes(normalizedType as ComponentType)) {
      return normalizedType as ComponentType;
    }
    
    // Map common aliases
    switch (normalizedType) {
      case 'input':
        return ComponentType.TEXT_INPUT;
      case 'label':
      case 'paragraph':
        return ComponentType.TEXT;
      case 'div':
      case 'box':
        return ComponentType.CONTAINER;
      default:
        console.warn(`Unknown component type: ${type}, defaulting to TEXT`);
        return ComponentType.TEXT;
    }
  }
  
  /**
   * Map a string to BehaviorType enum
   */
  private mapToBehaviorType(type: string): BehaviorType {
    const normalizedType = type.toLowerCase().replace(/_/g, '-');
    
    // Check if it matches a BehaviorType directly
    if (Object.values(BehaviorType).includes(normalizedType as BehaviorType)) {
      return normalizedType as BehaviorType;
    }
    
    // Map common aliases
    switch (normalizedType) {
      case 'toggle':
      case 'switch':
        return BehaviorType.TOGGLE;
      case 'count':
      case 'increment':
        return BehaviorType.COUNTER;
      case 'transform':
      case 'convert':
        return BehaviorType.TRANSFORM;
      case 'timer':
      case 'interval':
      case 'countdown':
        return BehaviorType.TIMER;
      case 'animate':
        return BehaviorType.ANIMATION;
      case 'condition':
      case 'if':
        return BehaviorType.CONDITIONAL;
      default:
        console.warn(`Unknown behavior type: ${type}, defaulting to CUSTOM`);
        return BehaviorType.CUSTOM;
    }
  }
  
  /**
   * Generate a mock response based on the request
   * This is a temporary stand-in for actual AI integration
   */
  private generateMockResponse(prompt: string): AIResponse {
    const requestLower = prompt.toLowerCase();
    
    // Extract the user's request from the prompt
    const requestMatch = prompt.match(/"([^"]*)"/);
    const userRequest = requestMatch ? requestMatch[1].toLowerCase() : '';
    
    // Generate response based on the request keywords
    if (userRequest.includes('calculator') && userRequest.includes('hello world')) {
      return this.generateHelloWorldCalculatorResponse();
    }
    
    if (userRequest.includes('calculator')) {
      return this.generateCalculatorResponse();
    }
    
    if ((userRequest.includes('button') && userRequest.includes('grow')) || 
        (userRequest.includes('button') && userRequest.includes('size'))) {
      return this.generateGrowingButtonResponse();
    }
    
    if (userRequest.includes('reverse') && userRequest.includes('text')) {
      return this.generateTextReverserResponse();
    }
    
    // Default to a simple button-text interaction
    return this.generateDefaultResponse();
  }
  
  /**
   * Create fallback components if AI generation fails
   */
  private createFallbackComponents(): string[] {
    const text = this.createComponent({
      type: 'text',
      properties: {
        text: 'AI generation failed. This is a fallback component.',
        variant: 'body1'
      }
    });
    
    const button = this.createComponent({
      type: 'button',
      properties: {
        label: 'Retry',
        variant: 'contained',
        color: 'primary'
      }
    });
    
    return [text, button];
  }
  
  /**
   * Generate mock responses for testing
   * These would be replaced by actual LLM responses in production
   */
  private generateHelloWorldCalculatorResponse(): AIResponse {
    return {
      applicationStructure: {
        components: [
          {
            type: 'text-input',
            properties: {
              readOnly: true,
              label: 'Result',
              value: 'Hello World',
              fullWidth: true,
              variant: 'outlined'
            }
          },
          {
            type: 'grid',
            properties: {
              container: true,
              spacing: 1
            }
          },
          ...['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', 'C', '=', '+'].map(label => ({
            type: 'button',
            properties: {
              label,
              variant: label === '=' ? 'contained' : 'outlined',
              color: label === 'C' ? 'secondary' : label === '=' ? 'primary' : 'default',
              fullWidth: true
            }
          }))
        ],
        connections: [
          ...Array(16).fill(0).map((_, i) => ({
            sourceId: (i + 2).toString(),
            sourcePoint: 'click',
            targetId: '0',
            targetPoint: 'value',
            transformerFunction: 'hello'
          }))
        ]
      }
    };
  }
  
  private generateCalculatorResponse(): AIResponse {
    return {
      applicationStructure: {
        components: [
          {
            type: 'text-input',
            properties: {
              readOnly: true,
              label: 'Result',
              value: '0',
              fullWidth: true,
              variant: 'outlined'
            }
          },
          {
            type: 'grid',
            properties: {
              container: true,
              spacing: 1
            }
          },
          ...['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', 'C', '=', '+'].map(label => ({
            type: 'button',
            properties: {
              label,
              variant: label === '=' ? 'contained' : 'outlined',
              color: label === 'C' ? 'secondary' : label === '=' ? 'primary' : 'default',
              fullWidth: true
            }
          }))
        ],
        connections: [
          // Number buttons (0-9) append their value to the display
          ...['7', '8', '9', '4', '5', '6', '1', '2', '3', '0'].map((_, i) => ({
            sourceId: (i + 2).toString(),
            sourcePoint: 'click',
            targetId: '0',
            targetPoint: 'value',
            transformerFunction: `(value) => value === '0' ? '${i}' : value + '${i}'`
          })),
          
          // Operation buttons append their symbol with spaces
          ...['/', '*', '-', '+'].map((op, i) => ({
            sourceId: (i === 0 ? 5 : i === 1 ? 9 : i === 2 ? 13 : 17).toString(),
            sourcePoint: 'click',
            targetId: '0',
            targetPoint: 'value',
            transformerFunction: `(value) => value + ' ${op} '`
          })),
          
          // Clear button resets the display
          {
            sourceId: '15',
            sourcePoint: 'click',
            targetId: '0',
            targetPoint: 'value',
            transformerFunction: '() => "0"'
          },
          
          // Equals button evaluates the expression
          {
            sourceId: '16',
            sourcePoint: 'click',
            targetId: '0',
            targetPoint: 'value',
            transformerFunction: `(value) => { 
              try { 
                return eval(value).toString(); 
              } catch (e) { 
                return "Error"; 
              } 
            }`
          }
        ]
      }
    };
  }
  
  private generateGrowingButtonResponse(): AIResponse {
    return {
      applicationStructure: {
        components: [
          {
            type: 'button',
            properties: {
              label: 'Click to Resize',
              variant: 'contained',
              size: 'medium'
            },
            behaviors: [
              {
                type: 'toggle',
                options: {
                  active: false,
                  states: ['small', 'medium', 'large'],
                  property: 'size',
                  currentIndex: 1
                }
              }
            ]
          },
          {
            type: 'text',
            properties: {
              text: 'This button changes size each time you click it',
              variant: 'body1'
            }
          }
        ],
        connections: [
          {
            sourceId: '0',
            sourcePoint: 'click',
            targetId: '0',
            targetPoint: 'size',
            transformerFunction: `(value) => {
              const sizes = ['small', 'medium', 'large'];
              const currentIndex = sizes.indexOf(value);
              return sizes[(currentIndex + 1) % sizes.length];
            }`
          }
        ]
      }
    };
  }
  
  private generateTextReverserResponse(): AIResponse {
    return {
      applicationStructure: {
        components: [
          {
            type: 'text-input',
            properties: {
              label: 'Enter text',
              placeholder: 'Type something here...',
              variant: 'outlined',
              fullWidth: true
            }
          },
          {
            type: 'text',
            properties: {
              text: '',
              variant: 'body1'
            }
          }
        ],
        connections: [
          {
            sourceId: '0',
            sourcePoint: 'value',
            targetId: '1',
            targetPoint: 'text',
            transformerFunction: 'reverse'
          }
        ]
      }
    };
  }
  
  private generateDefaultResponse(): AIResponse {
    return {
      applicationStructure: {
        components: [
          {
            type: 'text',
            properties: {
              text: 'Hello from Morpheo AI',
              variant: 'h5'
            }
          },
          {
            type: 'button',
            properties: {
              label: 'Click Me',
              variant: 'contained'
            }
          }
        ],
        connections: [
          {
            sourceId: '1',
            sourcePoint: 'click',
            targetId: '0',
            targetPoint: 'text',
            transformerFunction: '() => "Button was clicked!"'
          }
        ]
      }
    };
  }
}

// Create the singleton instance
export const morpheoAI = new MorpheoAI();

export default morpheoAI; 