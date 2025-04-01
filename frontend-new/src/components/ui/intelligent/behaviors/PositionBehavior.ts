/**
 * Position Behavior
 * 
 * This behavior allows components to change their position dynamically,
 * such as moving to random positions on the screen.
 */

import { v4 as uuidv4 } from 'uuid';
import { BehaviorBase, BehaviorOptions, BehaviorType } from '../BehaviorSystem';
import { ComponentType } from '../ComponentTypes';

/**
 * Position behavior options
 */
export interface PositionBehaviorOptions extends BehaviorOptions {
  useRandomPosition?: boolean;
  boundaryTop?: number;
  boundaryRight?: number;
  boundaryBottom?: number;
  boundaryLeft?: number;
  positionUnit?: 'px' | '%' | 'vh' | 'vw';
  transitionDuration?: number;
  initialTop?: string | number;
  initialLeft?: string | number;
}

/**
 * Position behavior class
 */
export class PositionBehavior extends BehaviorBase {
  // Default options
  private defaultOptions: PositionBehaviorOptions = {
    useRandomPosition: true,
    boundaryTop: 10,
    boundaryRight: 90,
    boundaryBottom: 90,
    boundaryLeft: 10,
    positionUnit: '%',
    transitionDuration: 300,
    initialTop: '50%',
    initialLeft: '50%'
  };

  constructor() {
    super(
      uuidv4(),
      'Position Behavior',
      BehaviorType.ANIMATION,
      'Allows components to change position dynamically'
    );
    
    // Define compatible component types
    this.compatibleTypes = [
      ComponentType.BUTTON,
      ComponentType.TEXT,
      ComponentType.IMAGE,
      ComponentType.ICON,
      ComponentType.CONTAINER,
      ComponentType.CARD
    ];
    
    // Define connection points
    this.connectionPoints = {
      inputs: [
        {
          id: 'position',
          name: 'position',
          description: 'Set component position',
          dataType: 'object'
        },
        {
          id: 'moveRandom',
          name: 'moveRandom',
          description: 'Trigger random position change',
          dataType: 'boolean'
        }
      ],
      outputs: [
        {
          id: 'positionChanged',
          name: 'positionChanged',
          description: 'Triggered when position changes',
          dataType: 'object'
        }
      ]
    };
  }
  
  /**
   * Initialize the behavior with component-specific options
   */
  initialize(componentId: string, options?: PositionBehaviorOptions): void {
    // Merge provided options with defaults
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    // Store the options
    this.componentOptions.set(componentId, mergedOptions);
    
    // Initialize position in state
    this.updateState(componentId, {
      position: {
        top: mergedOptions.initialTop,
        left: mergedOptions.initialLeft
      },
      isMoving: false,
      lastMoveTime: Date.now()
    });
    
    // Add CSS for smooth transitions if specified
    if (mergedOptions.transitionDuration) {
      const componentElement = document.getElementById(componentId);
      if (componentElement) {
        componentElement.style.transition = `top ${mergedOptions.transitionDuration}ms, left ${mergedOptions.transitionDuration}ms`;
      }
    }
  }
  
  /**
   * Handle incoming data on connection points
   */
  onDataReceived(componentId: string, connectionPointId: string, data: any): void {
    // Get component options
    const options = this.componentOptions.get(componentId) || this.defaultOptions;
    
    if (connectionPointId === 'moveRandom' && data) {
      // Move to a random position
      this._moveToRandomPosition(componentId, options);
    } else if (connectionPointId === 'position') {
      // Move to a specific position
      if (data && typeof data === 'object') {
        this._updatePosition(componentId, data.top, data.left);
      }
    }
  }
  
  /**
   * Move a component to a random position within boundaries
   */
  private _moveToRandomPosition(componentId: string, options: PositionBehaviorOptions): void {
    // Calculate random position within boundaries
    const randomTop = this._getRandomValue(options.boundaryTop!, options.boundaryBottom!);
    const randomLeft = this._getRandomValue(options.boundaryLeft!, options.boundaryRight!);
    
    // Format with units
    const topWithUnit = `${randomTop}${options.positionUnit}`;
    const leftWithUnit = `${randomLeft}${options.positionUnit}`;
    
    // Update the position
    this._updatePosition(componentId, topWithUnit, leftWithUnit);
    
    // Emit the position changed event
    this.emitEvent(componentId, 'positionChanged', {
      top: topWithUnit,
      left: leftWithUnit
    });
  }
  
  /**
   * Update a component's position
   */
  private _updatePosition(componentId: string, top: string | number, left: string | number): void {
    // Update the state
    this.updateState(componentId, {
      position: { top, left },
      isMoving: true,
      lastMoveTime: Date.now()
    });
    
    // Update the actual DOM element
    const componentElement = document.getElementById(componentId);
    if (componentElement) {
      componentElement.style.position = 'absolute';
      componentElement.style.top = typeof top === 'number' ? `${top}px` : top;
      componentElement.style.left = typeof left === 'number' ? `${left}px` : left;
    }
    
    // Reset the moving flag after transition duration
    const options = this.componentOptions.get(componentId) || this.defaultOptions;
    setTimeout(() => {
      this.updateState(componentId, { isMoving: false });
    }, options.transitionDuration || 300);
  }
  
  /**
   * Get a random value between min and max
   */
  private _getRandomValue(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

// Export the behavior
export const positionBehavior = new PositionBehavior(); 