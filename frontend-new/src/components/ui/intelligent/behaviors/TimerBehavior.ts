/**
 * Timer Behavior
 * 
 * This behavior allows components to have time-based functionality.
 */

import { v4 as uuidv4 } from 'uuid';
import { BehaviorBase, BehaviorOptions, BehaviorType } from '../BehaviorSystem';
import { ComponentType } from '../ComponentTypes';

/**
 * Timer behavior options
 */
export interface TimerBehaviorOptions extends BehaviorOptions {
  interval?: number;
  count?: number;
  maxCount?: number | null;
  autoStart?: boolean;
  countDown?: boolean;
  initialCount?: number;
}

/**
 * Timer behavior class
 */
export class TimerBehavior extends BehaviorBase {
  // Default options
  private defaultOptions: TimerBehaviorOptions = {
    interval: 1000,
    count: 0,
    maxCount: null,
    autoStart: false,
    countDown: false,
    initialCount: 0
  };

  // Store timer IDs for each component
  private timers: Map<string, number> = new Map();

  constructor() {
    super(
      uuidv4(),
      'Timer Behavior',
      BehaviorType.TIMER,
      'Provides time-based functionality'
    );
    
    // Define compatible component types
    this.compatibleTypes = [
      ComponentType.BUTTON,
      ComponentType.TEXT,
      ComponentType.PROGRESS
    ];
    
    // Define connection points
    this.connectionPoints = {
      inputs: [
        {
          id: 'start',
          name: 'start',
          description: 'Start the timer',
          dataType: 'boolean'
        },
        {
          id: 'stop',
          name: 'stop',
          description: 'Stop the timer',
          dataType: 'boolean'
        },
        {
          id: 'reset',
          name: 'reset',
          description: 'Reset the timer',
          dataType: 'boolean'
        },
        {
          id: 'setInterval',
          name: 'setInterval',
          description: 'Set the timer interval',
          dataType: 'number'
        }
      ],
      outputs: [
        {
          id: 'tick',
          name: 'tick',
          description: 'Emitted on each timer tick',
          dataType: 'number'
        },
        {
          id: 'value',
          name: 'value',
          description: 'Current timer count',
          dataType: 'number'
        },
        {
          id: 'finished',
          name: 'finished',
          description: 'Emitted when timer reaches maxCount',
          dataType: 'boolean'
        }
      ]
    };
  }
  
  /**
   * Initialize the behavior with component-specific options
   */
  initialize(componentId: string, options?: TimerBehaviorOptions): void {
    // Merge provided options with defaults
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    // Store the options
    this.componentOptions.set(componentId, mergedOptions);
    
    // Initialize state
    this.updateState(componentId, {
      interval: mergedOptions.interval,
      count: mergedOptions.count || mergedOptions.initialCount || 0,
      maxCount: mergedOptions.maxCount,
      running: false,
      countDown: mergedOptions.countDown,
      initialCount: mergedOptions.initialCount || mergedOptions.count || 0
    });
    
    // Auto-start if specified
    if (mergedOptions.autoStart) {
      this._startTimer(componentId);
    }
  }
  
  /**
   * Clean up when behavior is removed
   */
  cleanup(componentId: string): void {
    // Clear any running timer
    this._stopTimer(componentId);
  }
  
  /**
   * Handle incoming data on connection points
   */
  onDataReceived(componentId: string, connectionPointId: string, data: any): void {
    const state = this.getState(componentId);
    if (!state) return;
    
    if (connectionPointId === 'start' && data) {
      this._startTimer(componentId);
    } else if (connectionPointId === 'stop' && data) {
      this._stopTimer(componentId);
    } else if (connectionPointId === 'reset' && data) {
      this._resetTimer(componentId);
    } else if (connectionPointId === 'setInterval' && typeof data === 'number') {
      this._setInterval(componentId, data);
    }
  }
  
  /**
   * Start the timer
   */
  private _startTimer(componentId: string): void {
    // Get current state
    const state = this.getState(componentId);
    if (!state) return;
    
    // Don't start if already running
    if (state.running) return;
    
    // Don't start if already at max count
    if (state.maxCount !== null && 
        (!state.countDown && state.count >= state.maxCount) || 
        (state.countDown && state.count <= 0)) {
      return;
    }
    
    // Clear any existing timer
    this._stopTimer(componentId);
    
    // Create a new timer
    const timerId = window.setInterval(() => {
      this._onTimerTick(componentId);
    }, state.interval);
    
    // Store the timer ID
    this.timers.set(componentId, timerId);
    
    // Update state
    this.updateState(componentId, {
      ...state,
      running: true
    });
  }
  
  /**
   * Stop the timer
   */
  private _stopTimer(componentId: string): void {
    // Clear the timer
    const timerId = this.timers.get(componentId);
    if (timerId !== undefined) {
      window.clearInterval(timerId);
      this.timers.delete(componentId);
    }
    
    // Update state
    const state = this.getState(componentId);
    if (state) {
      this.updateState(componentId, {
        ...state,
        running: false
      });
    }
  }
  
  /**
   * Reset the timer
   */
  private _resetTimer(componentId: string): void {
    // Stop the timer
    this._stopTimer(componentId);
    
    // Get state
    const state = this.getState(componentId);
    if (!state) return;
    
    // Reset to initial count
    this.updateState(componentId, {
      ...state,
      count: state.initialCount || 0,
      running: false
    });
    
    // Emit the tick event
    this.emitEvent(componentId, 'tick', state.initialCount || 0);
    this.emitEvent(componentId, 'value', state.initialCount || 0);
  }
  
  /**
   * Set the timer interval
   */
  private _setInterval(componentId: string, interval: number): void {
    // Validate interval
    if (interval <= 0) return;
    
    // Get state
    const state = this.getState(componentId);
    if (!state) return;
    
    // Update interval
    this.updateState(componentId, {
      ...state,
      interval
    });
    
    // If running, restart the timer with the new interval
    if (state.running) {
      this._stopTimer(componentId);
      this._startTimer(componentId);
    }
  }
  
  /**
   * Handle timer tick
   */
  private _onTimerTick(componentId: string): void {
    // Get state
    const state = this.getState(componentId);
    if (!state) return;
    
    // Calculate new count
    let newCount = state.countDown 
      ? state.count - 1 
      : state.count + 1;
    
    // Check if we've reached the max count
    let finished = false;
    if (state.maxCount !== null) {
      if (state.countDown && newCount <= 0) {
        newCount = 0;
        finished = true;
      } else if (!state.countDown && newCount >= state.maxCount) {
        newCount = state.maxCount;
        finished = true;
      }
    }
    
    // Update state
    this.updateState(componentId, {
      ...state,
      count: newCount,
      running: !finished
    });
    
    // Emit the tick event
    this.emitEvent(componentId, 'tick', newCount);
    this.emitEvent(componentId, 'value', newCount);
    
    // If finished, emit the finished event and stop the timer
    if (finished) {
      this.emitEvent(componentId, 'finished', true);
      this._stopTimer(componentId);
    }
  }
}

// Export the behavior
export const timerBehavior = new TimerBehavior(); 