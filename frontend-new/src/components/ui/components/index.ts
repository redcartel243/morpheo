/**
 * Morpheo Component Library Index
 * 
 * This file exports intelligent components that can be used throughout the application.
 */

// Re-export everything from the intelligent system
export * from '../intelligent';

// Re-export theme (kept from original)
export * from '../theme/theme';
export { default as ThemeProvider, useTheme } from '../theme/ThemeProvider';
export * from '../theme/styled';

// Specifically export essential intelligent components and utilities
export { 
  IntelligentComponent,
  ComponentType,
  withIntelligentComponent, 
  useIntelligentComponent, 
  useIntelligentComponentSystem,
  createApplicationFromDescription,
  applyBehaviorToComponent,
  connectComponents,
  autoConnectComponents,
  componentRegistry
} from '../intelligent';

/**
 * Helper functions to create components programmatically
 * These will get components from the intelligent registry
 */
export const createButton = (props: any) => {
  const { ComponentType, componentRegistry } = require('../intelligent');
  const buttonDef = componentRegistry.getComponent(ComponentType.BUTTON);
  return buttonDef ? buttonDef.initializer(props) : null;
};

export const createText = (props: any) => {
  const { ComponentType, componentRegistry } = require('../intelligent');
  const textDef = componentRegistry.getComponent(ComponentType.TEXT);
  return textDef ? textDef.initializer(props) : null;
};

export const createTextInput = (props: any) => {
  const { ComponentType, componentRegistry } = require('../intelligent');
  const inputDef = componentRegistry.getComponent(ComponentType.TEXT_INPUT);
  return inputDef ? inputDef.initializer(props) : null;
};

// Add more factory functions as needed 