## Form Application Generator

Generate a complete form application configuration using our component system. This template provides patterns for AI-driven form functionality, validation, and state management without hardcoded application logic.

**IMPORTANT: Your response MUST follow this structure exactly:**

```json
{
  "app": {
    "name": "Form Application",
    "description": "Interactive form with validation and state management",
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
        "content": "Interactive Form",
        "variant": "h2"
      },
      "styles": {
        "textAlign": "center",
        "padding": "20px",
        "color": "#333"
      }
    },
    {
      "id": "form-container",
      "type": "container",
      "region": "main",
      "styles": {
        "display": "flex",
        "flexDirection": "column",
        "gap": "15px",
        "maxWidth": "600px",
        "margin": "0 auto",
        "padding": "20px",
        "backgroundColor": "#fff",
        "borderRadius": "8px",
        "boxShadow": "0 2px 10px rgba(0,0,0,0.1)"
      },
      "children": [
        /* Form fields will be placed here */
      ]
    },
    {
      "id": "form-status",
      "type": "text",
      "region": "main",
      "properties": {
        "content": "",
        "variant": "body1"
      },
      "styles": {
        "padding": "10px",
        "margin": "15px auto",
        "maxWidth": "600px",
        "textAlign": "center",
        "display": "none"
      }
    },
    {
      "id": "footer-text",
      "type": "text",
      "region": "footer",
      "properties": {
        "content": "© 2023 Form Application",
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

1. **Field Validation**:
   - Validate required fields with appropriate error messages
   - Implement type-specific validation (email format, number ranges, etc.)
   - Show real-time validation feedback as users type
   - Disable submission until all validations pass

2. **State Management**:
   - Track form completion state and validation status
   - Maintain field values and validation states
   - Handle conditional form logic based on input values
   - Preserve form state during navigation when appropriate

3. **Submission Handling**:
   - Display loading states during submission process
   - Show success/error messages after submission attempts
   - Clear form or preserve values based on context
   - Handle form reset functionality

### DOM Manipulation Patterns

For form applications, implement these patterns:

```javascript
// Field validation example
"onInput": {
  "code": "function(event, $m) {
    const email = $m('#email-input').getValue();
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    
    if (!email) {
      $m('#email-error').setText('Email is required');
      $m('#email-error').show();
      $m('#email-input').setStyle('borderColor', 'red');
      window.formValidState = window.formValidState || {};
      window.formValidState.emailValid = false;
    } else if (!emailRegex.test(email)) {
      $m('#email-error').setText('Please enter a valid email address');
      $m('#email-error').show();
      $m('#email-input').setStyle('borderColor', 'red');
      window.formValidState = window.formValidState || {};
      window.formValidState.emailValid = false;
    } else {
      $m('#email-error').hide();
      $m('#email-input').setStyle('borderColor', 'green');
      window.formValidState = window.formValidState || {};
      window.formValidState.emailValid = true;
    }
    
    // Update submit button state
    checkFormValidity($m);
  }",
  "affectedComponents": ["email-error", "email-input", "submit-button"]
}

// Form submission with validation
"onClick": {
  "code": "function(event, $m) {
    // Prevent submission if form is invalid
    const formValidState = window.formValidState || {};
    const isValid = formValidState.nameValid && 
                   formValidState.emailValid && 
                   formValidState.messageValid;
                   
    if (!isValid) {
      // Show validation message
      $m('#form-status').setText('Please fix the errors before submitting');
      $m('#form-status').setStyle('backgroundColor', '#ffe0e0');
      $m('#form-status').setStyle('color', '#d32f2f');
      $m('#form-status').show();
      
      // Highlight invalid fields
      if (!formValidState.nameValid) {
        $m('#name-input').setStyle('borderColor', 'red');
        $m('#name-error').show();
      }
      if (!formValidState.emailValid) {
        $m('#email-input').setStyle('borderColor', 'red');
        $m('#email-error').show();
      }
      if (!formValidState.messageValid) {
        $m('#message-input').setStyle('borderColor', 'red');
        $m('#message-error').show();
      }
      
      return;
    }
    
    // Show loading state
    $m('#submit-button').setProperty('text', 'Submitting...');
    $m('#submit-button').setStyle('opacity', '0.7');
    $m('#submit-button').setProperty('disabled', true);
    
    // Simulate submission (in a real app, this would be an API call)
    setTimeout(function() {
      // Show success message
      $m('#form-status').setText('Form submitted successfully!');
      $m('#form-status').setStyle('backgroundColor', '#e0ffe0');
      $m('#form-status').setStyle('color', '#2e7d32');
      $m('#form-status').show();
      
      // Reset form
      $m('#name-input').setValue('');
      $m('#email-input').setValue('');
      $m('#message-input').setValue('');
      
      // Reset button
      $m('#submit-button').setProperty('text', 'Submit');
      $m('#submit-button').setStyle('opacity', '1');
      $m('#submit-button').setProperty('disabled', false);
      
      // Reset validation states
      window.formValidState = {};
    }, 1500);
  }",
  "affectedComponents": ["form-status", "submit-button", "name-input", "email-input", "message-input"]
}

// Helper function definition (to be included in the first component with methods)
// This shows how to create reusable logic across form fields
"methods": {
  "checkFormValidity": {
    "code": "function checkFormValidity($m) {
      const formValidState = window.formValidState || {};
      const isValid = formValidState.nameValid && 
                      formValidState.emailValid && 
                      formValidState.messageValid;
                      
      if (isValid) {
        $m('#submit-button').setProperty('disabled', false);
        $m('#submit-button').setStyle('opacity', '1');
        $m('#submit-button').setStyle('cursor', 'pointer');
      } else {
        $m('#submit-button').setProperty('disabled', true);
        $m('#submit-button').setStyle('opacity', '0.5');
        $m('#submit-button').setStyle('cursor', 'not-allowed');
      }
    }"
  }
}
```

### Animation and User Feedback Examples

```javascript
// Field focus animation
"onFocus": {
  "code": "function(event, $m) {
    $m('#name-input').animate({
      boxShadow: ['0 0 0 rgba(66, 153, 225, 0)', '0 0 0 4px rgba(66, 153, 225, 0.2)']
    }, {duration: 300});
    $m('#name-label').setStyle('color', '#4299e1');
  }"
},
"onBlur": {
  "code": "function(event, $m) {
    $m('#name-input').animate({
      boxShadow: ['0 0 0 4px rgba(66, 153, 225, 0.2)', '0 0 0 rgba(66, 153, 225, 0)']
    }, {duration: 300});
    $m('#name-label').setStyle('color', '#4a5568');
    
    // Validate on blur
    validateNameField($m);
  }"
}

// Submit button hover effect
"onMouseEnter": {
  "code": "function(event, $m) {
    if (!$m('#submit-button').getProperty('disabled')) {
      $m('#submit-button').setStyle('transform', 'translateY(-2px)');
      $m('#submit-button').setStyle('boxShadow', '0 4px 12px rgba(66, 153, 225, 0.4)');
    }
  }"
},
"onMouseLeave": {
  "code": "function(event, $m) {
    $m('#submit-button').setStyle('transform', 'translateY(0)');
    $m('#submit-button').setStyle('boxShadow', '0 2px 6px rgba(66, 153, 225, 0.2)');
  }"
}
```

Generate the complete configuration with appropriate form fields, validation, submission handling, and user feedback implemented through generic component manipulation and state management. 