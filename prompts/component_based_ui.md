## Component-Based UI Generation

Generate a complete UI configuration for the requested app type. The configuration should be in JSON format and include the following components:

1. app - Basic app information (name, description)
2. layout - Layout structure with regions
3. components - UI components that make up the interface
4. theme (optional) - Custom theme settings

Make sure the configuration is well-structured and follows best practices for component-based architecture.

### Functional Requirements

Your configuration MUST implement core functionality based on the application type:

1. **State Management**:
   - Track and update component state in response to user interactions
   - Maintain data consistency across related components
   - Use window.appState or similar pattern for global state management
   - Reset state appropriately when components are reset/reinitialized

2. **Input Validation**:
   - Validate all user inputs with appropriate error messages
   - Prevent form submission until validation criteria are met
   - Provide visual feedback for validation errors
   - Support real-time validation as users type

3. **Component Initialization**:
   - Initialize all components with appropriate default values
   - Set up event handlers for user interactions
   - Establish connections between related components
   - Configure any required animation or transition effects

4. **Error Handling**:
   - Provide user-friendly error messages
   - Implement retry mechanisms for failed operations
   - Handle edge cases gracefully
   - Maintain UI stability during error conditions

### Application-Specific Logic Templates

For specialized applications, refer to these patterns:

#### Calculator Applications
Implement calculator functionality using the $m() selector for DOM manipulation:
- Track calculation state (current value, operation, etc.)
- Handle arithmetic operations with proper order of precedence
- Validate inputs to prevent invalid operations (division by zero, etc.)
- Format display output appropriately

#### Form Applications
Implement form handling with validation:
- Track form completion state for each field
- Apply field-specific validation rules (email format, required fields, etc.)
- Show clear validation messages adjacent to relevant fields
- Handle form submission with appropriate loading states

#### Data-Driven Applications
Implement data visualization and management:
- Handle loading states while fetching data
- Display error messages for failed data operations
- Implement filtering and sorting mechanisms
- Use appropriate visualization components based on data type

#### Todo/Task Applications
Implement task management functionality:
- Add, edit, complete, and delete tasks
- Filter tasks by completion status or other criteria
- Track task counts and completion statistics
- Store tasks in application state with unique identifiers

#### Quiz/Survey Applications
Implement question flow and scoring:
- Present questions with appropriate validation
- Track user responses for scoring
- Navigate between questions with proper state management
- Calculate and display final results

#### Product Showcase Applications
Implement product browsing and filtering:
- Display products in responsive grid layouts
- Filter products by multiple criteria
- Show detailed product information on selection
- Handle empty states when no products match filters

#### Weather/Information Applications
Implement information display with loading states:
- Search or select information sources
- Show loading indicators during data fetching
- Display information with appropriate formatting
- Update view when new information is requested

### Component Types
The application supports these component types:

#### Basic Components:
- text: Display text content (headings, paragraphs)
- button: Interactive button elements
- text-input: Text input fields
- checkbox: Checkbox input elements
- image: Image display

#### Layout Components:
- container/div: Generic container elements
- card: Card container with optional title
- grid: Grid layout with configurable columns
- list: List of items with various styles

#### Visualization Components:
- chart: Data visualization with various chart types (bar, line, pie, etc.)
- datatable: Interactive data tables with sorting and filtering
- map: Interactive map component with markers and events

### Visualization Component Details

#### Map Component
The map component provides an interactive map with markers and event handling:

```json
{
  "id": "location-map",
  "type": "map",
  "region": "main",
  "properties": {
    "center": { "lat": 40.7128, "lng": -74.0060 }, // Initial center coordinates
    "zoom": 12, // Initial zoom level
    "markers": [ // Optional array of markers
      {
        "position": { "lat": 40.7128, "lng": -74.0060 },
        "title": "New York"
      }
    ],
    "interactive": true // Whether the map allows user interaction
  },
  "styles": {
    "height": "500px", // Map container height
    "borderRadius": "8px" // Optional styling
  },
  "events": {
    "mapMoved": {
      "action": "updateMapCenter",
      "params": {}
    },
    "mapZoomed": {
      "action": "updateMapZoom",
      "params": {}
    },
    "markerClicked": {
      "action": "selectLocation",
      "params": {}
    }
  }
}
```

#### Chart Component
The chart component visualizes data with various chart types:

```json
{
  "id": "data-chart",
  "type": "chart",
  "region": "main",
  "properties": {
    "type": "bar", // Chart type: bar, line, pie, doughnut, area, scatter
    "data": {
      "labels": ["Category 1", "Category 2", "Category 3"], 
      "series": [
        {
          "label": "Series 1",
          "data": [10, 20, 30],
          "backgroundColor": "#3b82f6"
        }
      ]
    },
    "title": "Sample Chart",
    "xAxisLabel": "Categories",
    "yAxisLabel": "Values",
    "showLegend": true
  },
  "styles": {
    "height": "400px",
    "width": "100%"
  }
}
```

#### DataTable Component
The datatable component provides an interactive data table:

```json
{
  "id": "data-table",
  "type": "datatable",
  "region": "main",
  "properties": {
    "data": [
      { "id": 1, "name": "Item 1", "value": 100 },
      { "id": 2, "name": "Item 2", "value": 200 }
    ],
    "columns": [
      { "field": "id", "headerName": "ID", "width": 70 },
      { "field": "name", "headerName": "Name", "width": 200 },
      { "field": "value", "headerName": "Value", "width": 100 }
    ],
    "pageSize": 10,
    "sortable": true,
    "filterable": true,
    "selectable": false
  },
  "styles": {
    "height": "400px",
    "width": "100%"
  }
}
```

### DOM Manipulation Examples

Implement UI interactivity using the $m() selector function:

```javascript
// Simple click handler to update text
"onClick": {
  "code": "function(event, $m) {
    $m('#result-display').setText('Button was clicked!');
    $m('#result-display').setStyle('color', 'green');
  }",
  "affectedComponents": ["result-display"]
}

// Form validation example
"onInput": {
  "code": "function(event, $m) {
    const email = $m('#email-input').getValue();
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    
    if (!email) {
      $m('#email-error').setText('Email is required');
      $m('#email-error').show();
      window.formState.emailValid = false;
    } else if (!emailRegex.test(email)) {
      $m('#email-error').setText('Please enter a valid email address');
      $m('#email-error').show();
      window.formState.emailValid = false;
    } else {
      $m('#email-error').hide();
      window.formState.emailValid = true;
    }
    
    updateSubmitButton($m);
  }",
  "affectedComponents": ["email-error", "submit-button"]
}

// Animation example
"onMouseEnter": {
  "code": "function(event, $m) {
    $m('#hover-element').animate({
      transform: ['scale(1)', 'scale(1.05)'],
      boxShadow: ['0 2px 5px rgba(0,0,0,0.1)', '0 8px 15px rgba(0,0,0,0.2)']
    }, {duration: 300});
  }"
}
```

### State Management

For state-driven components, use the following pattern for event handling:

```json
"methods": {
  "initializeState": {
    "code": "function(event, $m) {
      // Create a global state object for this application
      window.appState = {
        items: [],
        selectedItem: null,
        filters: {
          category: 'all',
          searchTerm: ''
        }
      };
    }"
  },
  
  "addItem": {
    "code": "function(event, $m) {
      const newItemText = $m('#new-item-input').getValue().trim();
      
      if (!newItemText) return;
      
      // Create new item with unique ID
      const newItem = {
        id: Date.now(),
        text: newItemText,
        completed: false
      };
      
      // Add to state
      window.appState.items.push(newItem);
      
      // Clear input
      $m('#new-item-input').setValue('');
      
      // Update UI
      renderItems($m);
    }"
  }
}
```

Generate the complete configuration in valid JSON format. 

## YOUR TASK
Generate a complete JSON configuration for a UI application that satisfies the user's request.

DO NOT use templates or predefined application structures. Instead:
- Analyze what components would best serve the user's needs
- Create a component tree with appropriate nesting and organization
- Define component properties, styles, and methods
- Implement all necessary functionality through DOM manipulation ($m() selector) for **EXISTING** elements.
- **CRITICAL**: To add **NEW** components dynamically (e.g., adding a todo item), you **MUST** use the `addComponent(componentConfig)` function. **DO NOT** use `$m(...).addChild`, `$m(...).appendChild`, or any direct DOM insertion methods. See the pattern below.
- Ensure components work together seamlessly

## DOM MANIPULATION PATTERNS

The $m() selector is the primary way to manipulate **EXISTING** DOM elements. Here are common patterns:

```javascript
// Getting and setting content
const value = $m('#element-id').getProperty('content');
$m('#element-id').setProperty('content', 'New text');

// Handling input values
const inputValue = $m('#input-id').getProperty('value');
$m('#input-id').setProperty('value', '');

// Toggling visibility
$m('#element-id').setStyle('display', 'none');
$m('#element-id').setStyle('display', 'block');

// Changing appearance
$m('#element-id').setStyle('backgroundColor', '#ff0000');
$m('#element-id').setStyle('color', '#ffffff');
```

**Adding New Components Dynamically:**

To add new components to the UI (like adding a new todo item to a list), **DO NOT** attempt direct DOM manipulation like `appendChild` or `$m(...).addChild`. The **ONLY** correct way is to use the provided `addComponent` function:

```javascript
// Example for adding a Todo Item:

// 1. Define the new component as a JSON configuration object
const newTodoItemConfig = {
  id: 'todo-' + Date.now(), // Ensure a unique ID
  type: 'container', // Or the appropriate type for the item
  properties: { /* ... properties like text content ... */ },
  styles: { /* ... styles for the item ... */ },
  children: [ /* ... child components like checkbox, text, delete button ... */ ],
  methods: { /* ... methods for children, e.g., delete onClick ... */ }
};

// 2. Call the addComponent function with the configuration object
// This function adds the component to the application state, triggering a re-render.
addComponent(newTodoItemConfig);
```

**Removing Components Dynamically:**

To remove a component (e.g., a todo item when its delete button is clicked), use the `removeComponent(componentId)` function, passing the ID of the component to remove:

```javascript
// Example for removing a Todo Item with id 'todo-123'
removeComponent('todo-123'); 
```

**Updating Components Dynamically:**

To update properties or styles of an existing component (e.g., marking a todo as complete by changing its style), use the `updateComponent(componentId, updates)` function. The `updates` argument is an object containing the properties/styles to change:

```javascript
// Example for marking Todo Item 'todo-123' as complete
const updates = {
  styles: { textDecoration: 'line-through', opacity: 0.6 }
  // You could also update properties: properties: { completed: true }
};
updateComponent('todo-123', updates);
```

**Important:** Use `addComponent`, `removeComponent`, and `updateComponent` for managing dynamic components. **NEVER** use `$m(...).addChild`, `$m(...).remove()`, or direct style/property manipulation via `$m()` for adding/removing components or managing persistent state changes tied to the component's structure (like completion status). Use `$m()` only for temporary UI feedback or interacting with existing element properties (like getting input values). 