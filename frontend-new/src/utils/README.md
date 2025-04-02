# Morpheo Utilities

This directory contains utility functions for the Morpheo framework - an AI-driven component system.

## Core Principles

1. Morpheo is an AI-driven component system - no hardcoded application logic
2. All components are generic building blocks
3. The AI makes all decisions about component relationships and behaviors

## Utility Modules

### DOM Utilities (`domUtils.ts`)

Basic DOM manipulation utilities for formatting, validation, animations, and safe evaluation of expressions.

- `formatNumber`, `formatDate`, `formatCurrency`: Format values for display
- `truncateText`: Limit text length with ellipsis
- `validateInput`: Validate input based on type
- `animateElement`: Apply animations to elements
- `safeEval`: Safely evaluate expressions
- `closest`, `siblings`: DOM traversal
- `create`: Create DOM elements
- `storeValue`, `getValue`, `watchValue`: Simple value storage
- `sanitizeInput`: Protect against XSS

### Enhanced Behaviors (`enhancedBehaviors.ts`)

Smart default behaviors for components.

- `enhanceInputValidation`: Automatically validate inputs based on type
- `enhanceButtonBehavior`: Add hover effects, loading states
- `enhanceResponsiveContainer`: Make containers responsive
- `createSafeEventHandler`: Error handling for event handlers
- `enableAutoSanitization`: Sanitize input automatically

### Form Behaviors (`formBehaviors.ts`)

Form-specific behaviors and validation.

- `enhanceForm`: Validation, submission handling, and serialization
- `createFormSummary`: Generate a summary of form values

### Component State Management (`stateManagement.ts`) [NEW]

Advanced state management for components with history tracking.

- `initComponentState`: Initialize state for a component
- `bindStateToComponent`: Auto-bind state to DOM elements
- `restoreComponentState`: Restore component state
- `createStateTransition`: Define complex state transitions
- `syncComponentWithDOM`: Keep component state in sync with DOM

#### State Features

- Input history tracking
- Validation state tracking
- Undo/redo capability
- Operation logging
- Dirty/touched field tracking
- State persistence and restoration

### Component Relationship Analysis (`componentRelationship.ts`) [NEW]

Analyze and detect relationships between components.

- `analyzeEventHandlerReferences`: Find component references in code
- `buildComponentGraph`: Build a dependency graph of components
- `validateInteractionChains`: Validate completeness of interaction chains
- `detectMissingValidations`: Find components missing validation
- `analyzeComponentRelationships`: Comprehensive relationship analysis
- `analyzeComponentsFromDOM`: Analyze components directly from DOM

#### Analysis Features

- Event handler code analysis
- Component dependency graphing
- Validation completeness checking
- Form submission validation detection
- Missing validation identification
- Input constraint verification

## How to Use

### Basic DOM Manipulation

```javascript
// Select an element by ID
const element = $m('elementId');

// Get/set properties
const value = element.getProperty('value');
element.setProperty('value', 'New value');

// Style manipulation
element.setStyle('color', 'red');

// Classes
element.addClass('active');
element.removeClass('inactive');
```

### State Management

```javascript
// Initialize state management for a component
const stateManager = $m('myInput').initState();

// Track input value changes
$m('myInput').bindState();

// Create a state transition
const transition = $m('myForm').createTransition({
  submit: (state, payload) => ({
    values: { ...state.values, submitted: true },
    operationHistory: [...state.operationHistory, { type: 'submit', timestamp: Date.now() }]
  }),
  reset: () => ({
    values: {},
    dirtyFields: new Set(),
    touchedFields: new Set(),
    validationState: {}
  })
});

// Use the transition
transition('submit', { userId: 123 });
```

### Component Relationship Analysis

```javascript
// Analyze relationships between components in the DOM
const analysis = $m.analyzeComponentsFromDOM(document.getElementById('app'));

// Check for validation issues
console.log(analysis.validationIssues);

// Access input components
analysis.inputComponents.forEach(id => {
  console.log(`Input component: ${id}`);
});
```

## Best Practices

1. Use the `$m()` selector to access elements by ID
2. Implement validation for all user inputs
3. Track state for components that need it
4. Analyze component relationships for missing interactions
5. Use the provided utilities instead of raw DOM manipulation

## Security Considerations

- All user input is automatically sanitized
- Expressions are evaluated securely
- Event handlers are wrapped in error boundaries
- Input validation prevents malformed data 