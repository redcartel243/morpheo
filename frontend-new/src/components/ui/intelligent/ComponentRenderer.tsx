import React, { ReactElement } from 'react';
import { ComponentId } from './ComponentTypes';
import { componentRegistry } from './ComponentRegistry';

/**
 * Render a component by its ID
 */
export function renderComponent(componentId: ComponentId): React.ReactElement | null {
  const instance = componentRegistry.getInstance(componentId);
  if (!instance) {
    console.warn(`Component instance ${componentId} not found`);
    return null;
  }
  
  const definition = componentRegistry.getComponent(instance.type);
  if (!definition) {
    console.warn(`Component definition for ${instance.type} not found`);
    return null;
  }
  
  // Render using the component's renderer
  const renderedComponent = definition.renderer(instance);
  
  // Handle non-ReactElement renderers by wrapping them in a fragment if needed
  if (renderedComponent === null || renderedComponent === undefined) {
    return null;
  }
  
  // If it's already a React element, return it directly
  if (React.isValidElement(renderedComponent)) {
    return renderedComponent;
  }
  
  // For other types (like strings), wrap in a span
  return <span>{renderedComponent}</span>;
} 