/**
 * Morpheo Utilities Index File
 * 
 * This file exports all utility functions for easier imports in other files.
 */

// Export all utilities from their respective modules for easier imports

// DOM Utilities
export * from './domUtils';

// Enhanced Behaviors
export * from './enhancedBehaviors';

// Form Behaviors
export * from './formBehaviors';

// Tooltip Behaviors
export * from './tooltipBehaviors';

// Drag and Drop Behaviors
export * from './dragDropBehaviors';

// Context Menu Behaviors
export * from './contextMenuBehaviors';

// Accessibility Behaviors
export * from './accessibilityBehaviors';

// Component State Management
export * from './stateManagement';

// Component Relationship Analysis
export * from './componentRelationship';

// Add a convenience function to apply multiple enhancements at once
export const enhanceElement = (
  element: HTMLElement,
  options?: {
    tooltip?: { content: string; options?: any };
    dragDrop?: { options?: any };
    contextMenu?: { items: any[]; options?: any };
    accessibility?: { 
      tabIndex?: any;
      aria?: any;
      contrast?: any;
    };
    animation?: { type: string; options?: any };
    state?: { componentId: string; initialState?: any };
  }
) => {
  // Import necessary functions to avoid circular dependencies
  const { enhanceTooltip } = require('./tooltipBehaviors');
  const { enhanceDragDrop } = require('./dragDropBehaviors');
  const { enhanceContextMenu } = require('./contextMenuBehaviors');
  const { 
    enhanceTabIndex, 
    enhanceAriaAttributes, 
    enhanceColorContrast 
  } = require('./accessibilityBehaviors');
  const { animateElement } = require('./domUtils');
  const { bindStateToComponent } = require('./stateManagement');

  // Store cleanup functions
  const cleanupFunctions: Array<() => void> = [];

  // Apply tooltip if requested
  if (options?.tooltip) {
    const tooltipCleanup = enhanceTooltip(
      element, 
      options.tooltip.content, 
      options.tooltip.options
    );
    cleanupFunctions.push(tooltipCleanup);
  }

  // Apply drag and drop if requested
  if (options?.dragDrop) {
    const dragDropCleanup = enhanceDragDrop(
      element, 
      options.dragDrop.options
    );
    cleanupFunctions.push(dragDropCleanup);
  }

  // Apply context menu if requested
  if (options?.contextMenu) {
    const contextMenuCleanup = enhanceContextMenu(
      element, 
      options.contextMenu.items, 
      options.contextMenu.options
    );
    cleanupFunctions.push(contextMenuCleanup);
  }

  // Apply accessibility enhancements if requested
  if (options?.accessibility) {
    if (options.accessibility.tabIndex) {
      const tabIndexCleanup = enhanceTabIndex(
        element, 
        options.accessibility.tabIndex
      );
      cleanupFunctions.push(tabIndexCleanup);
    }

    if (options.accessibility.aria) {
      const ariaCleanup = enhanceAriaAttributes(
        element, 
        options.accessibility.aria
      );
      cleanupFunctions.push(ariaCleanup);
    }

    if (options.accessibility.contrast) {
      const contrastCleanup = enhanceColorContrast(
        element, 
        options.accessibility.contrast
      );
      cleanupFunctions.push(contrastCleanup);
    }
  }

  // Apply animation if requested
  if (options?.animation) {
    const animation = animateElement(
      element, 
      options.animation.type, 
      options.animation.options
    );
    if (animation && typeof animation.cancel === 'function') {
      cleanupFunctions.push(() => animation.cancel());
    }
  }
  
  // Apply state management if requested
  if (options?.state && options.state.componentId) {
    const stateCleanup = bindStateToComponent(
      options.state.componentId,
      element
    );
    cleanupFunctions.push(stateCleanup);
  }

  // Return a function to remove all enhancements
  return () => {
    cleanupFunctions.forEach(cleanup => cleanup());
  };
};

// Export a version object
export const version = {
  name: 'Morpheo Utils',
  version: '1.1.0',
  description: 'Utility functions for Morpheo framework'
}; 