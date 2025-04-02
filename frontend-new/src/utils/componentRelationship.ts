/**
 * Component Relationship Analysis for Morpheo
 * 
 * This file contains utilities for analyzing and detecting relationships
 * between components, building dependency graphs, and validating
 * interaction chains and validation completeness.
 */

interface ComponentNode {
  id: string;
  type: string;
  properties: Record<string, any>;
  connections: string[];
  triggers: string[];
  consumers: string[];
  validators: string[];
}

interface ComponentRelationship {
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
}

interface ValidationRequirement {
  componentId: string;
  type: string;
  isImplemented: boolean;
  details: Record<string, any>;
}

type ComponentGraph = Map<string, ComponentNode>;
type RelationshipMap = Map<string, ComponentRelationship[]>;

/**
 * Analyzes event handler code to identify component references
 * @param handlerCode - JavaScript code string from event handlers
 * @returns Array of referenced component IDs
 */
export function analyzeEventHandlerReferences(handlerCode: string): string[] {
  if (!handlerCode || typeof handlerCode !== 'string') {
    return [];
  }

  try {
    const references: Set<string> = new Set();
    
    // Find $m selector calls - pattern: $m('componentId') or $m('#componentId')
    const selectorPattern = /\$m\(['"]#?([\w-]+)['"]\)/g;
    let match;
    
    while ((match = selectorPattern.exec(handlerCode)) !== null) {
      if (match[1]) {
        references.add(match[1]);
      }
    }
    
    // Find $m selector calls with string concatenation - pattern: $m('#' + componentId)
    const concatPattern = /\$m\(['"]#['"]\s*\+\s*['"]?([\w-]+)['"]?\)/g;
    
    while ((match = concatPattern.exec(handlerCode)) !== null) {
      if (match[1]) {
        references.add(match[1]);
      }
    }
    
    // Find direct DOM method calls - pattern: document.getElementById('componentId')
    const domPattern = /document\.getElementById\(['"]#?([\w-]+)['"]\)/g;
    
    while ((match = domPattern.exec(handlerCode)) !== null) {
      if (match[1]) {
        references.add(match[1]);
      }
    }
    
    // Find querySelector references - pattern: document.querySelector('#componentId')
    const querySelectorPattern = /(?:document|element|container|wrapper)\.querySelector\(['"]#([\w-]+)['"]\)/g;
    
    while ((match = querySelectorPattern.exec(handlerCode)) !== null) {
      if (match[1]) {
        references.add(match[1]);
      }
    }
    
    // Find direct references to components in common patterns:
    // 1. In function parameters: function(event, $m) { $m('#display').setValue(...) }
    if (handlerCode.includes('function(') && handlerCode.includes('$m)')) {
      // This is a function with $m as a parameter, look for references in the body
      const funcBodyMatch = /function\([^)]*\)\s*{([\s\S]*)}/g.exec(handlerCode);
      if (funcBodyMatch && funcBodyMatch[1]) {
        const funcBody = funcBodyMatch[1];
        
        // Look for $m('#id') patterns in the function body
        const bodyMatches = funcBody.matchAll(/\$m\(['"]#?([\w-]+)['"]\)/g);
        for (const match of bodyMatches) {
          if (match[1]) {
            references.add(match[1]);
          }
        }
      }
    }
    
    // Find direct references to components - pattern: variable.componentId
    const directPattern = /(^|\s|\.|=|\()(\w+)\.(\w+)(?=\.|\.|\s|$|\))/g;
    
    while ((match = directPattern.exec(handlerCode)) !== null) {
      if (match[3] && !isJavaScriptKeyword(match[3])) {
        references.add(match[3]);
      }
    }
    
    return Array.from(references);
  } catch (error) {
    console.error('Error analyzing event handler references:', error);
    return [];
  }
}

/**
 * Check if a string is a JavaScript keyword or common property name
 */
function isJavaScriptKeyword(word: string): boolean {
  const keywords = new Set([
    'if', 'else', 'for', 'while', 'function', 'return', 'try', 'catch',
    'finally', 'switch', 'case', 'break', 'continue', 'new', 'delete',
    'typeof', 'instanceof', 'void', 'this', 'class', 'const', 'let',
    'var', 'length', 'push', 'pop', 'shift', 'unshift', 'splice', 'slice',
    'indexOf', 'lastIndexOf', 'forEach', 'map', 'filter', 'reduce',
    'toUpperCase', 'toLowerCase', 'trim', 'toString', 'valueOf',
    'addEventListener', 'removeEventListener', 'setAttribute', 'getAttribute',
    'appendChild', 'removeChild', 'insertBefore', 'replaceChild',
    'preventDefault', 'stopPropagation', 'value', 'textContent', 'innerHTML',
    'style', 'classList', 'dataset', 'parentNode', 'childNodes', 'firstChild',
    'lastChild', 'nextSibling', 'previousSibling', 'target', 'currentTarget'
  ]);
  
  return keywords.has(word.toLowerCase());
}

/**
 * Builds a dependency graph of component interactions
 * @param components - Array of component configurations
 * @returns Component graph and relationship map
 */
export function buildComponentGraph(components: any[]): {
  graph: ComponentGraph;
  relationships: RelationshipMap;
} {
  const graph: ComponentGraph = new Map();
  const relationships: RelationshipMap = new Map();
  
  // First pass: Create nodes for all components
  components.forEach(component => {
    if (!component.id) return;
    
    // Create the node with basic information
    const node: ComponentNode = {
      id: component.id,
      type: component.type || 'unknown',
      properties: { ...component.properties },
      connections: [],
      triggers: [],
      consumers: [],
      validators: []
    };
    
    graph.set(component.id, node);
    relationships.set(component.id, []);
  });
  
  // Second pass: Analyze event handlers and build relationships
  components.forEach(component => {
    if (!component.id) return;
    
    // Get the current node
    const node = graph.get(component.id);
    if (!node) return;
    
    // Process event handlers - handle both old and new formats
    const processEventHandlers = (handlers: Record<string, any>) => {
      Object.entries(handlers).forEach(([event, handler]) => {
        // Handler can be a string or an object with a code property
        let handlerCode = '';
        if (typeof handler === 'string') {
          handlerCode = handler;
        } else if (handler && typeof handler === 'object') {
          // Check for the new method format with code property
          if (handler.code && typeof handler.code === 'string') {
            handlerCode = handler.code;
          }
          
          // If we have affectedComponents, use them directly
          if (handler.affectedComponents && Array.isArray(handler.affectedComponents)) {
            handler.affectedComponents.forEach((targetId: string) => {
              if (targetId === component.id) return; // Skip self-references
              
              // Check if target component exists
              const targetNode = graph.get(targetId);
              if (!targetNode) return;
              
              // Add connection
              if (!node.connections.includes(targetId)) {
                node.connections.push(targetId);
              }
              
              // Determine relationship type based on event
              let relationType = 'unknown';
              
              if (event.startsWith('click') || event.startsWith('submit')) {
                relationType = 'triggers';
                
                if (!node.triggers.includes(targetId)) {
                  node.triggers.push(targetId);
                }
                
                const targetNode = graph.get(targetId);
                if (targetNode && !targetNode.consumers.includes(component.id)) {
                  targetNode.consumers.push(component.id);
                }
              } else if (event.startsWith('change') || event.startsWith('input')) {
                relationType = 'updates';
              } else if (event.startsWith('validate') || event.startsWith('blur')) {
                relationType = 'validates';
                
                if (!node.validators.includes(targetId)) {
                  node.validators.push(targetId);
                }
              }
              
              // Create relationship object
              const relationship: ComponentRelationship = {
                source: component.id,
                target: targetId,
                type: relationType,
                properties: {
                  eventType: event,
                  handlerContainsValidation: handlerCode.includes('validate') || handlerCode.includes('isValid')
                }
              };
              
              // Add to relationships map
              const existingRelationships = relationships.get(component.id) || [];
              existingRelationships.push(relationship);
              relationships.set(component.id, existingRelationships);
            });
            
            // If we've processed affectedComponents directly, we can return here
            if (handler.affectedComponents && handler.affectedComponents.length > 0) {
              return;
            }
          }
        }
        
        // Skip if we don't have a handler code to analyze
        if (!handlerCode) return;
        
        // Analyze handler code for references
        const references = analyzeEventHandlerReferences(handlerCode);
        
        // Add connections to the node
        references.forEach(targetId => {
          // Skip self-references
          if (targetId === component.id) return;
          
          // Check if target component exists
          const targetNode = graph.get(targetId);
          if (!targetNode) return;
          
          // Add connection
          if (!node.connections.includes(targetId)) {
            node.connections.push(targetId);
          }
          
          // Determine relationship type based on event and target type
          let relationType = 'unknown';
          
          if (event.startsWith('click') || event.startsWith('submit')) {
            relationType = 'triggers';
            
            if (!node.triggers.includes(targetId)) {
              node.triggers.push(targetId);
            }
            
            const targetNode = graph.get(targetId);
            if (targetNode && !targetNode.consumers.includes(component.id)) {
              targetNode.consumers.push(component.id);
            }
          } else if (event.startsWith('change') || event.startsWith('input')) {
            relationType = 'updates';
          } else if (event.startsWith('validate') || event.startsWith('blur')) {
            relationType = 'validates';
            
            if (!node.validators.includes(targetId)) {
              node.validators.push(targetId);
            }
          }
          
          // Create relationship object
          const relationship: ComponentRelationship = {
            source: component.id,
            target: targetId,
            type: relationType,
            properties: {
              eventType: event,
              handlerContainsValidation: handlerCode.includes('validate') || handlerCode.includes('isValid')
            }
          };
          
          // Add to relationships map
          const existingRelationships = relationships.get(component.id) || [];
          existingRelationships.push(relationship);
          relationships.set(component.id, existingRelationships);
        });
      });
    };
    
    // Check for different ways methods can be defined
    if (component.eventHandlers) {
      processEventHandlers(component.eventHandlers);
    }
    
    // Check for the "methods" structure used in the app config
    if (component.methods) {
      processEventHandlers(component.methods);
    }
    
    // Also check for onClick, onChange directly on the component
    const directEvents = ['onClick', 'onChange', 'onSubmit', 'onBlur', 'onFocus', 'onInput'];
    directEvents.forEach(eventName => {
      if (component[eventName]) {
        const handler = component[eventName];
        processEventHandlers({ [eventName]: handler });
      }
    });
  });
  
  return { graph, relationships };
}

/**
 * Validates the completeness of interaction chains
 * @param graph - Component dependency graph
 * @param relationships - Component relationship map
 * @returns Validation results with potential issues
 */
export function validateInteractionChains(
  graph: ComponentGraph,
  relationships: RelationshipMap
): {
  isComplete: boolean;
  missingConnections: Array<{ source: string; expectedTarget: string; reason: string }>;
} {
  const missingConnections: Array<{ source: string; expectedTarget: string; reason: string }> = [];
  
  // Check for input fields without validation
  graph.forEach((node, componentId) => {
    // Check input components
    if (node.type === 'input' || node.type === 'textarea' || node.type === 'select') {
      // Check if any validator is connected to this input
      if (node.validators.length === 0) {
        // Look for submit buttons or form components that might need this input
        graph.forEach((otherNode, otherComponentId) => {
          if (otherNode.type === 'button' && otherNode.properties.type === 'submit') {
            // Check if this button has a path to use this input
            const hasPathToInput = tracePath(otherComponentId, componentId, graph, new Set());
            
            if (hasPathToInput) {
              missingConnections.push({
                source: componentId,
                expectedTarget: otherComponentId,
                reason: 'Input used in submission has no validation'
              });
            }
          }
        });
      }
    }
    
    // Check buttons that don't update anything
    if (node.type === 'button' && node.triggers.length === 0) {
      missingConnections.push({
        source: componentId,
        expectedTarget: 'any-component',
        reason: 'Button has no effect on any component'
      });
    }
    
    // Check display components with no data source
    if ((node.type === 'div' || node.type === 'span' || node.type === 'p') && 
        node.consumers.length === 0 && node.connections.length === 0) {
      missingConnections.push({
        source: 'any-input-component',
        expectedTarget: componentId,
        reason: 'Display component has no data sources'
      });
    }
  });
  
  return {
    isComplete: missingConnections.length === 0,
    missingConnections
  };
}

/**
 * Helper function to trace a path between components
 */
function tracePath(
  fromId: string,
  toId: string,
  graph: ComponentGraph,
  visited: Set<string>
): boolean {
  // Prevent infinite recursion
  if (visited.has(fromId)) return false;
  visited.add(fromId);
  
  const node = graph.get(fromId);
  if (!node) return false;
  
  // Direct connection
  if (node.connections.includes(toId)) return true;
  
  // Recursive search through connections
  for (const connectionId of node.connections) {
    if (tracePath(connectionId, toId, graph, visited)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Detects missing validations in components
 * @param components - Array of component configurations
 * @returns Array of validation requirements
 */
export function detectMissingValidations(components: any[]): ValidationRequirement[] {
  const validationRequirements: ValidationRequirement[] = [];
  
  components.forEach(component => {
    if (!component.id) return;
    
    // Check input components
    if (component.type === 'input' || component.type === 'textarea' || component.type === 'select') {
      const inputType = component.properties?.type || 'text';
      const isRequired = component.properties?.required === true;
      const hasMinMax = component.properties?.min !== undefined || component.properties?.max !== undefined;
      const hasPatterLength = component.properties?.pattern !== undefined || component.properties?.minlength !== undefined;
      
      // Check for validators in event handlers
      let hasValidation = false;
      const eventHandlers = component.eventHandlers || {};
      
      Object.values(eventHandlers).forEach(handler => {
        if (typeof handler === 'string' && 
           (handler.includes('validate') || handler.includes('isValid'))) {
          hasValidation = true;
        }
      });
      
      // Add requirements based on input type
      if (inputType === 'number') {
        validationRequirements.push({
          componentId: component.id,
          type: 'numberValidation',
          isImplemented: hasValidation || hasMinMax,
          details: {
            hasMinMax,
            inputType,
            isRequired
          }
        });
      } else if (inputType === 'email') {
        validationRequirements.push({
          componentId: component.id,
          type: 'emailValidation',
          isImplemented: hasValidation,
          details: {
            inputType,
            isRequired
          }
        });
      } else if (inputType === 'text' && isRequired) {
        validationRequirements.push({
          componentId: component.id,
          type: 'textValidation',
          isImplemented: hasValidation || hasPatterLength,
          details: {
            hasPatterLength,
            inputType,
            isRequired
          }
        });
      }
      
      // Add required field validation if needed
      if (isRequired && !hasValidation) {
        validationRequirements.push({
          componentId: component.id,
          type: 'requiredValidation',
          isImplemented: false,
          details: {
            inputType,
            message: 'Required field has no validation logic'
          }
        });
      }
    }
    
    // Check form components
    if (component.type === 'form') {
      let hasSubmitValidation = false;
      const eventHandlers = component.eventHandlers || {};
      
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        if (event === 'submit' && typeof handler === 'string' && 
            (handler.includes('validate') || handler.includes('preventDefault'))) {
          hasSubmitValidation = true;
        }
      });
      
      validationRequirements.push({
        componentId: component.id,
        type: 'formValidation',
        isImplemented: hasSubmitValidation,
        details: {
          message: hasSubmitValidation ? 'Form has submission validation' : 'Form submission has no validation'
        }
      });
    }
  });
  
  return validationRequirements;
}

/**
 * Analyze components and build a comprehensive dependency map
 * @param components - Array of component configurations
 * @returns Analysis results
 */
export function analyzeComponentRelationships(components: any[]): {
  graph: ComponentGraph;
  relationships: RelationshipMap;
  validationIssues: ValidationRequirement[];
  interactionIssues: { isComplete: boolean; missingConnections: any[] };
} {
  // Build the component graph
  const { graph, relationships } = buildComponentGraph(components);
  
  // Detect missing validations
  const validationIssues = detectMissingValidations(components);
  
  // Validate interaction chains
  const interactionIssues = validateInteractionChains(graph, relationships);
  
  return {
    graph,
    relationships,
    validationIssues,
    interactionIssues
  };
}

/**
 * Integrates relationship analysis with component auto-detection
 * @param rootElement - Root DOM element to analyze
 * @returns Analysis results
 */
export function analyzeComponentsFromDOM(rootElement: HTMLElement): {
  componentIds: string[];
  inputComponents: string[];
  displayComponents: string[];
  interactiveComponents: string[];
  validationIssues: ValidationRequirement[];
} {
  const componentIds: string[] = [];
  const inputComponents: string[] = [];
  const displayComponents: string[] = [];
  const interactiveComponents: string[] = [];
  const validationIssues: ValidationRequirement[] = [];
  
  // Find all elements with IDs
  const elementsWithId = rootElement.querySelectorAll('[id]');
  
  elementsWithId.forEach(element => {
    const componentId = element.id;
    if (!componentId) return;
    
    componentIds.push(componentId);
    
    // Check all attributes for event handlers
    let hasEventHandlers = false;
    const attributes = element.attributes;
    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i];
      if (attr.name.startsWith('on') || 
          attr.name.startsWith('data-on') || 
          attr.name.includes('handler') || 
          attr.name.includes('listener')) {
        hasEventHandlers = true;
        break;
      }
    }
    
    // Look for method and event handler properties from the internal store
    const hasMethodsFromStore = window.$morpheo && 
                               window.$morpheo[componentId] && 
                               (window.$morpheo[componentId].methods || 
                                window.$morpheo[componentId].eventHandlers);
    
    // Categorize by type
    if (element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
      inputComponents.push(componentId);
      
      // Check for validation attributes
      const inputElement = element as HTMLInputElement;
      const isRequired = inputElement.required;
      const hasMinMax = inputElement.min !== '' || inputElement.max !== '';
      const hasPattern = inputElement.pattern !== '';
      
      // Check for event handlers
      const hasBlurHandler = element.hasAttribute('onblur') || 
                           element.hasAttribute('data-onblur') || 
                           hasMethodsFromStore;
      const hasChangeHandler = element.hasAttribute('onchange') || 
                             element.hasAttribute('data-onchange') || 
                             hasMethodsFromStore;
      const hasInputHandler = element.hasAttribute('oninput') || 
                            element.hasAttribute('data-oninput') || 
                            hasMethodsFromStore;
      const hasValidationHandler = hasBlurHandler || hasChangeHandler || hasInputHandler;
      
      // Add validation requirements if needed
      if (isRequired && !hasValidationHandler) {
        validationIssues.push({
          componentId,
          type: 'requiredValidation',
          isImplemented: false,
          details: {
            inputType: inputElement.type,
            message: 'Required field has no validation logic'
          }
        });
      }
      
      if (inputElement.type === 'number' && !hasMinMax && !hasValidationHandler) {
        validationIssues.push({
          componentId,
          type: 'numberValidation',
          isImplemented: false,
          details: {
            inputType: inputElement.type,
            message: 'Number input has no constraints or validation'
          }
        });
      }
    } else if (element.tagName === 'DIV' || element.tagName === 'SPAN' || element.tagName === 'P') {
      displayComponents.push(componentId);
    } else if (element.tagName === 'BUTTON' || 
              element.tagName === 'A' || 
              element.getAttribute('role') === 'button') {
      interactiveComponents.push(componentId);
      
      // Check for event handlers
      const hasClickHandler = element.hasAttribute('onclick') || 
                            element.hasAttribute('data-onclick') || 
                            hasEventHandlers ||
                            hasMethodsFromStore;
      
      if (!hasClickHandler) {
        validationIssues.push({
          componentId,
          type: 'interactionValidation',
          isImplemented: false,
          details: {
            message: 'Interactive element has no click handler'
          }
        });
      }
    }
  });
  
  // Check for forms without validation
  const forms = rootElement.querySelectorAll('form');
  forms.forEach(form => {
    const formId = form.id;
    if (!formId) return;
    
    // Check for various submit handler patterns
    const hasSubmitHandler = form.hasAttribute('onsubmit') || 
                           form.hasAttribute('data-onsubmit') || 
                           (window.$morpheo && 
                            window.$morpheo[formId] && 
                            (window.$morpheo[formId].methods?.onSubmit || 
                             window.$morpheo[formId].eventHandlers?.onSubmit));
    
    const inputs = form.querySelectorAll('input, select, textarea');
    const hasRequiredInputs = Array.from(inputs).some(input => (input as HTMLInputElement).required);
    
    if (hasRequiredInputs && !hasSubmitHandler) {
      validationIssues.push({
        componentId: formId,
        type: 'formValidation',
        isImplemented: false,
        details: {
          message: 'Form with required fields has no submission validation'
        }
      });
    }
  });
  
  return {
    componentIds,
    inputComponents,
    displayComponents,
    interactiveComponents,
    validationIssues
  };
} 