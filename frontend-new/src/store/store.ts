// Re-export types from store index
import type { RootState, AppDispatch } from './index';

// Also export AppState for backward compatibility
export type AppState = RootState;

// Re-export types
export type { RootState, AppDispatch }; 