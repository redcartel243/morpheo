# Morpheo Intelligent Component System

The Intelligent Component System for Morpheo enables self-contained, interconnected components that manage their own logic. This system allows components to communicate with each other through defined connection points, making them behave like interconnected building blocks that can be assembled into complex applications.

## Core Concepts

### Components

Each intelligent component:
- Has a unique identity
- Manages its own internal state
- Defines connection points for input and output
- Can connect with other components
- Operates independently but can interact with the broader system

### Connection Points

Connection points define how components can interact:
- **Direction**: Input, Output, or Bidirectional
- **Data Type**: Text, Number, Boolean, etc.
- **Purpose**: Each point has a defined purpose and behavior

### Connections

Connections link component connection points together:
- Can transform data as it flows between components
- Are directional (source → target)
- Can be created and removed dynamically
- Automatically validate type compatibility

## Architecture

The system is built on three core services:

1. **Component Registry**: Manages component definitions and instances
2. **Connection Manager**: Handles connections between components
3. **Component Manager**: Orchestrates component lifecycle and relationships

All of these services are integrated with Redux for state management.

## Using Intelligent Components

### Creating a Component

The simplest way to use an intelligent component is:

```jsx
import { IntelligentButton } from '../intelligent/components';

function MyComponent() {
  return (
    <IntelligentButton 
      label="Click Me" 
      variant="primary" 
    />
  );
}
```

### Creating Connections Programmatically

Components can be connected in code:

```jsx
// Create component instances
const buttonId = uuidv4();
const inputId = uuidv4();

// Connect button click to clear input
connectionManager.createConnection({
  id: uuidv4(),
  sourceComponentId: buttonId,
  sourceConnectionId: 'click',
  targetComponentId: inputId,
  targetConnectionId: 'value',
  transform: () => ''  // Clear the input on click
});

// Use the components with their IDs
function MyForm() {
  return (
    <div>
      <IntelligentTextInput
        componentId={inputId}
        label="Name"
      />
      <IntelligentButton
        componentId={buttonId}
        label="Clear"
      />
    </div>
  );
}
```

### Creating Custom Intelligent Components

You can create your own intelligent components by:

1. Define component capabilities and connection points
2. Create a base component implementation
3. Apply the `withIntelligentComponent` HOC
4. Register the component with the registry

See `Button.tsx` and `TextInput.tsx` for examples.

## Available Components

Currently available intelligent components:

- **IntelligentButton**: Interactive button that can trigger actions
- **IntelligentTextInput**: Text field that responds to and emits events

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                INTELLIGENT COMPONENT SYSTEM              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐      ┌─────────────┐      ┌──────────┐ │
│  │  Component  │      │ Connection  │      │Component │ │
│  │  Registry   │<────>│  Manager    │<────>│ Manager  │ │
│  └─────────────┘      └─────────────┘      └──────────┘ │
│          ▲                    ▲                  ▲      │
│          │                    │                  │      │
│          │                    │                  │      │
│          └──────────┬─────────┴─────────┬────────┘      │
│                     │                   │               │
│                     ▼                   ▼               │
│            ┌─────────────────┐ ┌───────────────────┐   │
│            │   Components    │ │  Redux Integration │   │
│            └─────────────────┘ └───────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Best Practices

1. **Use Unique IDs**: Always provide stable IDs for components that need to maintain connections across renders.

2. **Clean Up Connections**: Remove connections when components unmount.

3. **Validate Component Compatibility**: Check that connected components have compatible data types.

4. **Avoid Circular Connections**: Be careful not to create circular dependencies between components.

5. **Use Transformers**: Use transform functions to convert data between components when needed.

## Demo

You can see the intelligent components in action by visiting:

```
/intelligent-components-demo
```

The demo showcases:
- How components connect to each other
- How data flows between components
- How components react to events

## Future Development

Planned enhancements:
- More component types
- Visual connection builder
- Improved validation and error handling
- Serialization/deserialization of component networks
- AI-driven component network generation

## Contributing

To add a new intelligent component:

1. Create a new file in `src/components/ui/intelligent/components/`
2. Define the component's capabilities and connection points
3. Implement the component with appropriate connection handling
4. Register it with the component registry
5. Export it from the components index file 