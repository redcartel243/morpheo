/**
 * Behaviors Index
 * 
 * This file exports all available behaviors for the intelligent component system
 */

import { BehaviorType } from '../BehaviorSystem';
import { toggleBehavior } from './ToggleBehavior';
import { counterBehavior } from './CounterBehavior';
import { timerBehavior } from './TimerBehavior';
import { positionBehavior } from './PositionBehavior';

// Export all behaviors
export const behaviors = {
  [BehaviorType.TOGGLE]: toggleBehavior,
  [BehaviorType.COUNTER]: counterBehavior,
  [BehaviorType.TIMER]: timerBehavior,
  [BehaviorType.POSITION]: positionBehavior
};

export {
  toggleBehavior,
  counterBehavior,
  timerBehavior,
  positionBehavior
}; 