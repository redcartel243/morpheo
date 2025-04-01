import { AppState } from './Store';

// Define selector type
export type StateSelector<TState, TResult> = (state: TState) => TResult;

/**
 * Creates a derived state selector that combines the results of multiple selectors
 * 
 * @param selectors Array of selectors to combine
 * @param combiner Function that combines the results of the selectors
 * @returns A selector function that combines the results
 */
export function createDerivedState<TResult>(
  selectors: Array<StateSelector<AppState, any>>,
  combiner: (...args: any[]) => TResult
): StateSelector<AppState, TResult> {
  return (state: AppState) => {
    const selectedValues = selectors.map(selector => selector(state));
    return combiner(...selectedValues);
  };
}

/**
 * Helper types for compose
 */
export type Selector<T> = () => T;

/**
 * Composes values from multiple sources
 * 
 * NOTE: This is for static composition only, not for hooks. 
 * Do not use hooks inside the selectors passed to this function.
 */
export function composeState<R, T1, T2>(
  combiner: (t1: T1, t2: T2) => R,
  value1: T1,
  value2: T2
): R;

export function composeState<R, T1, T2, T3>(
  combiner: (t1: T1, t2: T2, t3: T3) => R,
  value1: T1,
  value2: T2,
  value3: T3
): R;

export function composeState<R>(
  combiner: (...args: any[]) => R,
  ...values: any[]
): R {
  return combiner(...values);
} 