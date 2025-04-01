# Morpheo Advanced State Management

This module provides a comprehensive state management solution for Morpheo applications, supporting advanced patterns like context/provider patterns, derived state, and state composition.

## Key Features

- **Context/Provider Pattern**: Uses React Context API for efficient state access at any component level
- **Modular State Design**: Separate state modules for UI, Forms, Data, and Auth concerns
- **Middleware Support**: Extensible middleware system for logging, API requests, debouncing, and more
- **Strongly Typed**: Full TypeScript support with type inference for selectors and actions
- **Persistence**: Built-in localStorage persistence with fine-grained control
- **Derived State**: Compute derived values efficiently with memoization and selector composition
- **Form Management**: Robust form state handling with validation and state tracking

## Core Components

### StateManager

The foundation of the state management system. Creates typed contexts, providers, and hooks for managing state in a React application.

```tsx
import { createStateManager } from './state';

const { StateProvider, useState, useDispatch } = createStateManager({
  initialState: { count: 0 },
  reducers: [(state, action) => {
    if (action.type === 'INCREMENT') {
      return { ...state, count: state.count + 1 };
    }
    return state;
  }]
});
```

### Store

Implements concrete state modules for common application concerns:

- **UI State**: Manages UI-related state like dark mode, notifications, and modals
- **Forms State**: Handles form values, validation, submission state, and errors
- **Data State**: Manages API data with normalization, loading states, and caching
- **Auth State**: Handles authentication state, tokens, and user information

### Middleware

Provides powerful middleware for handling common patterns:

- **API Middleware**: Simplifies API requests with automatic loading states and error handling
- **Thunk Middleware**: Enables complex asynchronous action sequences
- **Debounce/Throttle Middleware**: Controls the frequency of state updates
- **Validation Middleware**: Ensures data integrity before state updates
- **LocalStorage Middleware**: Automatically persists state to localStorage
- **Batch Actions Middleware**: Efficiently processes multiple actions at once

## Derived State

Enables computing derived values from state slices, with automatic memoization for performance.

```tsx
import { createDerivedState, selectEntitiesList } from './state';

// Create a derived selector that combines and transforms data
const selectCompletedTasks = createDerivedState(
  [selectEntitiesList('tasks')],
  (tasks) => tasks.filter(task => task.completed)
);
```

## Usage Examples

### Basic Provider Setup

```tsx
import { AppProvider } from './state';

const App = () => (
  <AppProvider>
    <YourComponents />
  </AppProvider>
);
```

### Using State with Hooks

```tsx
import { useAppSelector, useAppDispatch, selectDarkMode, toggleDarkMode } from './state';

const ThemeToggle = () => {
  const darkMode = useAppSelector(selectDarkMode);
  const dispatch = useAppDispatch();
  
  return (
    <button onClick={() => dispatch(toggleDarkMode())}>
      {darkMode ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
};
```

### Form Management

```tsx
import { useAppDispatch, useAppSelector, initializeForm, setFormValue, selectForm } from './state';

const MyForm = () => {
  const dispatch = useAppDispatch();
  const form = useAppSelector(selectForm('myForm'));
  
  useEffect(() => {
    dispatch(initializeForm({
      formId: 'myForm',
      initialValues: { name: '' },
      validationRules: {
        name: { required: true, minLength: 3 }
      }
    }));
  }, [dispatch]);
  
  return (
    <form>
      <input
        value={form?.values.name || ''}
        onChange={e => dispatch(setFormValue({ 
          formId: 'myForm', 
          field: 'name', 
          value: e.target.value 
        }))}
      />
      {form?.errors.name && <div>{form.errors.name}</div>}
    </form>
  );
};
```

### Composed State

```tsx
import { useComposedThemeAndTaskState } from './state';

const TaskStats = () => {
  // Access state composed from multiple sources
  const { darkMode, stats, categories } = useComposedThemeAndTaskState('taskFilters');
  
  return (
    <div className={darkMode ? 'dark' : 'light'}>
      <h2>Task Stats</h2>
      <div>{stats.complete} of {stats.total} tasks completed</div>
      <div>Categories: {categories.join(', ')}</div>
    </div>
  );
};
```

## API Documentation

### Core Types

- `StateAction<TPayload>`: Represents actions with a type and optional payload/meta
- `StateReducer<TState>`: Functions that update state based on actions
- `StateSelector<TState, TSelected>`: Functions to select and transform state

### Main Exports

- **Core Functions**:
  - `createStateManager`: Creates a state management system
  - `createAction`: Creates typed action creators
  - `createDerivedState`: Creates selectors for derived state
  - `composeState`: Composes state from multiple contexts

- **App State Hooks**:
  - `useAppState`: Access state and dispatch function
  - `useAppDispatch`: Access dispatch function only
  - `useAppSelector`: Select specific state slice

- **Middleware Factories**:
  - `createLoggerMiddleware`: Debug state changes
  - `createThunkMiddleware`: Handle async flows
  - `createApiMiddleware`: Simplify API requests
  - `createDebounceMiddleware`: Debounce actions
  - `createThrottleMiddleware`: Throttle actions

- **Actions and Selectors**:
  - Numerous pre-defined actions for common operations
  - Type-safe selectors for retrieving state

## Best Practices

1. **Organize by Domain**: Group related state, selectors, and actions together
2. **Use Selectors**: Create selectors for accessing derived data
3. **Batch Related Changes**: Use batch actions for related state changes
4. **Optimize Re-renders**: Use precise selectors to minimize component re-renders
5. **Add Middleware Sparingly**: Only add middleware you actually need
6. **Validate Early**: Use validation middleware to catch issues early
7. **Extract Common Patterns**: Create custom hooks for common state patterns 