import React from 'react';

/**
 * Interface for component structure to ensure type consistency
 */
export interface Component {
  id: string;
  type: string;
  props?: Record<string, any>;
  properties?: Record<string, any>; // Alternative field name seen in AI responses
  children?: (Component | string)[];
  styles?: Record<string, any>;
  events?: Record<string, any>;
  methods?: Record<string, any>;
  region?: string;
}

/**
 * Process component structure to normalize the component tree
 * and ensure all required fields are present
 */
export function processComponentStructure(component: any): Component {
  if (!component) {
    return {
      id: `fallback-${Math.random().toString(36).substr(2, 9)}`,
      type: 'container'
    };
  }

  // Log original structure for debugging
  console.log(`Processing component: ${component.type} (${component.id})`, {
    hasProperties: !!component.properties,
    hasProps: !!component.props
  });

  // Normalize component properties - handle both props and properties fields
  const normalizedProps = {
    ...(component.properties || {}),
    ...(component.props || {})
  };

  // Process button components specially to ensure text property is correctly set
  if (component.type === 'button') {
    if (component.properties?.text) {
    console.log(`Found button text property: ${component.properties.text}`);
    }
    if (component.properties?.content) {
      console.log(`Found button content property: ${component.properties.content}`);
    }
  }

  // Process children recursively if present
  const children = Array.isArray(component.children)
    ? component.children.map((child: Component | string) => 
        typeof child === 'string' 
          ? child 
          : processComponentStructure(child)
      )
    : [];

  // Return normalized component structure
  return {
    id: component.id || `comp-${Math.random().toString(36).substr(2, 9)}`,
    type: component.type || 'container',
    props: normalizedProps,
    children,
    styles: component.styles || {},
    events: component.events || {},
    methods: component.methods || {},
    region: component.region
  };
}

/**
 * Map component type to the registered name
 * This ensures compatibility between AI naming and registered components
 */
export function mapComponentType(type: string): string {
  // Standardize type to lowercase
  const normalizedType = type.toLowerCase();
  
  // Add debugging
  console.log(`ComponentProcessing: Mapping component type "${type}" (normalized: "${normalizedType}")`);
  
  // Map from AI output types to registered component names
  const typeMap: Record<string, string> = {
    // Basic HTML elements
    'div': 'div',
    'span': 'span',
    'paragraph': 'p',
    'p': 'p',
    'heading1': 'h1',
    'h1': 'h1',
    'heading2': 'h2',
    'h2': 'h2',
    'heading3': 'h3',
    'h3': 'h3',
    'canvas': 'canvas', // Ensure canvas is properly mapped
    
    // Basic UI components
    'container': 'container', // Explicitly map to lowercase registered component
    'button': 'button',
    'textinput': 'text-input',
    'text-input': 'text-input',
    'input': 'text-input',
    'text': 'text',
    
    // Special handling for more complex or ambiguous types
    'input-text': 'text-input',
    'textbox': 'text-input',
    
    // Default to the original type if no mapping exists
    // This allows custom component types to be used directly
  };
  
  // Return the mapped type or the original normalized type
  const result = typeMap[normalizedType] || normalizedType;
  console.log(`ComponentProcessing: Mapped "${type}" to "${result}"`);
  return result;
} 