## Calculator Application Generator

Generate a complete calculator application configuration using our component system. This template provides patterns for AI-driven calculator functionality without hardcoded application logic.

**IMPORTANT: Your response MUST follow this structure exactly:**

```json
{
  "app": {
    "name": "Calculator Application",
    "description": "Interactive calculator with state management and validation",
    "theme": "light"
  },
  "layout": {
    "type": "singlepage",
    "regions": ["header", "main", "footer"]
  },
  "components": [
    {
      "id": "app-title",
      "type": "text",
      "region": "header",
      "properties": {
        "content": "Interactive Calculator",
        "variant": "h2"
      },
      "styles": {
        "textAlign": "center",
        "padding": "20px",
        "color": "#333"
      }
    },
    {
      "id": "calculator-display",
      "type": "text",
      "region": "main",
      "properties": {
        "content": "0",
        "variant": "h3"
      },
      "styles": {
        "width": "100%",
        "padding": "15px",
        "backgroundColor": "#f0f0f0",
        "borderRadius": "5px",
        "textAlign": "right",
        "fontFamily": "monospace",
        "marginBottom": "10px",
        "border": "1px solid #ddd"
      }
    },
    {
      "id": "calculator-pad",
      "type": "container",
      "region": "main",
      "styles": {
        "display": "grid",
        "gridTemplateColumns": "repeat(4, 1fr)",
        "gap": "10px",
        "width": "100%",
        "maxWidth": "300px",
        "margin": "0 auto"
      },
      "children": [
        /* Here you'll place number and operation buttons */
      ]
    },
    {
      "id": "footer-text",
      "type": "text",
      "region": "footer",
      "properties": {
        "content": "© 2023 Calculator App",
        "variant": "body2"
      },
      "styles": {
        "textAlign": "center",
        "padding": "20px",
        "fontSize": "0.8rem",
        "color": "#777"
      }
    }
  ]
}
```

### Functional Requirements

1. **Display Management**:
   - Use `$m('#calculator-display').setText(value)` to update the display
   - Maintain display state with appropriate digit grouping and formatting
   - Handle display overflow with text truncation or scrolling

2. **State Management**:
   - Track current input, operation type, and previous values
   - Handle calculation state transitions (input → operation → input → equals)
   - Preserve significant calculation history if appropriate

3. **Input Validation**:
   - Prevent division by zero with appropriate error messages
   - Handle decimal point input correctly (only one decimal per number)
   - Manage maximum input length to prevent overflow
   - Show "Error" when invalid operations are attempted

### DOM Manipulation Patterns

For calculator functionality, implement these patterns:

```javascript
// Number button event handler
"onClick": {
  "code": "function(event, $m) { 
    const currentDisplay = $m('#calculator-display').getProperty('content');
    const buttonValue = '5'; // Use the actual button value
    
    // First input or after operation logic
    if (currentDisplay === '0') {
      $m('#calculator-display').setText(buttonValue);
    } else {
      // Append to current input
      $m('#calculator-display').setText(currentDisplay + buttonValue);
    }
  }",
  "affectedComponents": ["calculator-display"]
}

// Operation button event handler
"onClick": {
  "code": "function(event, $m) {
    const currentInput = $m('#calculator-display').getProperty('content');
    const operation = '+'; // Use the actual operation
    
    // Store current value and operation for later calculation
    window.calculatorState = window.calculatorState || {};
    window.calculatorState.storedValue = parseFloat(currentInput);
    window.calculatorState.pendingOperation = operation;
    window.calculatorState.newInput = true;
  }",
  "affectedComponents": ["calculator-display"]
}

// Equals button event handler with validation example
"onClick": {
  "code": "function(event, $m) {
    const currentInput = parseFloat($m('#calculator-display').getProperty('content'));
    const { storedValue, pendingOperation } = window.calculatorState || {};
    
    let result;
    
    // Validate operation and perform calculation
    if (pendingOperation === '/' && currentInput === 0) {
      $m('#calculator-display').setText('Error');
      $m('#calculator-display').setStyle('color', 'red');
      return;
    }
    
    // Perform calculation based on operation
    switch(pendingOperation) {
      case '+': result = storedValue + currentInput; break;
      case '-': result = storedValue - currentInput; break;
      case '*': result = storedValue * currentInput; break;
      case '/': result = storedValue / currentInput; break;
      default: result = currentInput;
    }
    
    // Format and display result
    $m('#calculator-display').setText(result.toString());
    
    // Reset state for new calculation
    window.calculatorState = {};
  }",
  "affectedComponents": ["calculator-display"]
}
```

### Animation and Feedback Examples

```javascript
// Button press animation
"onMouseDown": {
  "code": "function(event, $m) {
    $m('#button-id').setStyle('transform', 'scale(0.95)');
    $m('#button-id').setStyle('boxShadow', 'inset 0 0 5px rgba(0,0,0,0.2)');
  }"
},
"onMouseUp": {
  "code": "function(event, $m) {
    $m('#button-id').setStyle('transform', 'scale(1)');
    $m('#button-id').setStyle('boxShadow', '0 2px 5px rgba(0,0,0,0.1)');
    
    // Add feedback animation to display when value changes
    $m('#calculator-display').animate({
      backgroundColor: ['#f0f0f0', '#e6f7ff', '#f0f0f0']
    }, {duration: 300});
  }"
}
```

Generate the complete configuration with appropriate buttons, styling, and fully functional calculator capabilities implemented through generic component manipulation and state management. 