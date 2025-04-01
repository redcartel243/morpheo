export const calculatorConfig = {
  app: {
    name: "Simple Calculator",
    description: "A basic calculator with standard operations",
    theme: "light"
  },
  layout: {
    type: "singlepage",
    regions: ["header", "main", "footer"]
  },
  components: [
    {
      id: "header",
      type: "text",
      region: "header",
      properties: {
        content: "Simple Calculator",
        variant: "h2",
        align: "center"
      },
      styles: {
        padding: "16px",
        color: "#333"
      }
    },
    {
      id: "calculator-container",
      type: "card",
      region: "main",
      properties: {
        elevation: 3
      },
      styles: {
        maxWidth: "320px",
        margin: "0 auto",
        padding: "0"
      },
      children: [
        {
          id: "calculator-display",
          type: "text",
          properties: {
            content: "0",
            variant: "h4",
            align: "right"
          },
          styles: {
            backgroundColor: "#f0f0f0",
            padding: "16px",
            margin: "0",
            borderBottom: "1px solid #ddd",
            fontFamily: "monospace",
            minHeight: "30px"
          }
        },
        {
          id: "calculator-keypad",
          type: "div",
          styles: {
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1px",
            backgroundColor: "#ddd",
            padding: "1px"
          },
          children: [
            // First row
            {
              id: "btn-clear",
              type: "button",
              properties: {
                text: "C",
                variant: "outlined"
              },
              styles: {
                backgroundColor: "#f8f8f8",
                color: "#ff3b30"
              },
              events: {
                onClick: {
                  action: "CLEAR_CALCULATOR"
                }
              }
            },
            {
              id: "btn-sign",
              type: "button",
              properties: {
                text: "+/-",
                variant: "outlined"
              },
              styles: {
                backgroundColor: "#f8f8f8"
              },
              events: {
                onClick: {
                  action: "TOGGLE_SIGN"
                }
              }
            },
            {
              id: "btn-percent",
              type: "button",
              properties: {
                text: "%",
                variant: "outlined"
              },
              styles: {
                backgroundColor: "#f8f8f8"
              },
              events: {
                onClick: {
                  action: "PERCENT"
                }
              }
            },
            {
              id: "btn-divide",
              type: "button",
              properties: {
                text: "÷",
                variant: "outlined"
              },
              styles: {
                backgroundColor: "#ff9500",
                color: "white"
              },
              events: {
                onClick: {
                  action: "OPERATION",
                  params: {
                    operation: "divide"
                  }
                }
              }
            },
            // Second row
            {
              id: "btn-7",
              type: "button",
              properties: {
                text: "7",
                variant: "outlined"
              },
              styles: {
                backgroundColor: "#f8f8f8"
              },
              events: {
                onClick: {
                  action: "DIGIT",
                  params: {
                    digit: "7"
                  }
                }
              }
            },
            {
              id: "btn-8",
              type: "button",
              properties: {
                text: "8",
                variant: "outlined"
              },
              styles: {
                backgroundColor: "#f8f8f8"
              },
              events: {
                onClick: {
                  action: "DIGIT",
                  params: {
                    digit: "8"
                  }
                }
              }
            },
            {
              id: "btn-9",
              type: "button",
              properties: {
                text: "9",
                variant: "outlined"
              },
              styles: {
                backgroundColor: "#f8f8f8"
              },
              events: {
                onClick: {
                  action: "DIGIT",
                  params: {
                    digit: "9"
                  }
                }
              }
            },
            {
              id: "btn-multiply",
              type: "button",
              properties: {
                text: "×",
                variant: "outlined"
              },
              styles: {
                backgroundColor: "#ff9500",
                color: "white"
              },
              events: {
                onClick: {
                  action: "OPERATION",
                  params: {
                    operation: "multiply"
                  }
                }
              }
            },
            // Third row
            {
              id: "btn-4",
              type: "button",
              properties: {
                text: "4",
                variant: "outlined"
              },
              styles: {
                backgroundColor: "#f8f8f8"
              },
              events: {
                onClick: {
                  action: "DIGIT",
                  params: {
                    digit: "4"
                  }
                }
              }
            },
            {
              id: "btn-5",
              type: "button",
              properties: {
                text: "5",
                variant: "outlined"
              },
              styles: {
                backgroundColor: "#f8f8f8"
              },
              events: {
                onClick: {
                  action: "DIGIT",
                  params: {
                    digit: "5"
                  }
                }
              }
            },
            {
              id: "btn-6",
              type: "button",
              properties: {
                text: "6",
                variant: "outlined"
              },
              styles: {
                backgroundColor: "#f8f8f8"
              },
              events: {
                onClick: {
                  action: "DIGIT",
                  params: {
                    digit: "6"
                  }
                }
              }
            },
            {
              id: "btn-subtract",
              type: "button",
              properties: {
                text: "-",
                variant: "outlined"
              },
              styles: {
                backgroundColor: "#ff9500",
                color: "white"
              },
              events: {
                onClick: {
                  action: "OPERATION",
                  params: {
                    operation: "subtract"
                  }
                }
              }
            },
            // Fourth row
            {
              id: "btn-1",
              type: "button",
              properties: {
                text: "1",
                variant: "outlined"
              },
              styles: {
                backgroundColor: "#f8f8f8"
              },
              events: {
                onClick: {
                  action: "DIGIT",
                  params: {
                    digit: "1"
                  }
                }
              }
            },
            {
              id: "btn-2",
              type: "button",
              properties: {
                text: "2",
                variant: "outlined"
              },
              styles: {
                backgroundColor: "#f8f8f8"
              },
              events: {
                onClick: {
                  action: "DIGIT",
                  params: {
                    digit: "2"
                  }
                }
              }
            },
            {
              id: "btn-3",
              type: "button",
              properties: {
                text: "3",
                variant: "outlined"
              },
              styles: {
                backgroundColor: "#f8f8f8"
              },
              events: {
                onClick: {
                  action: "DIGIT",
                  params: {
                    digit: "3"
                  }
                }
              }
            },
            {
              id: "btn-add",
              type: "button",
              properties: {
                text: "+",
                variant: "outlined"
              },
              styles: {
                backgroundColor: "#ff9500",
                color: "white"
              },
              events: {
                onClick: {
                  action: "OPERATION",
                  params: {
                    operation: "add"
                  }
                }
              }
            },
            // Fifth row
            {
              id: "btn-0",
              type: "button",
              properties: {
                text: "0",
                variant: "outlined"
              },
              styles: {
                backgroundColor: "#f8f8f8",
                gridColumn: "span 2"
              },
              events: {
                onClick: {
                  action: "DIGIT",
                  params: {
                    digit: "0"
                  }
                }
              }
            },
            {
              id: "btn-decimal",
              type: "button",
              properties: {
                text: ".",
                variant: "outlined"
              },
              styles: {
                backgroundColor: "#f8f8f8"
              },
              events: {
                onClick: {
                  action: "DECIMAL"
                }
              }
            },
            {
              id: "btn-equals",
              type: "button",
              properties: {
                text: "=",
                variant: "outlined"
              },
              styles: {
                backgroundColor: "#ff9500",
                color: "white"
              },
              events: {
                onClick: {
                  action: "EQUALS"
                }
              }
            }
          ]
        }
      ]
    },
    {
      id: "footer",
      type: "text",
      region: "footer",
      properties: {
        content: "© 2023 Morpheo Calculator",
        align: "center"
      },
      styles: {
        fontSize: "12px",
        padding: "16px",
        color: "#666"
      }
    }
  ],
  state: {
    display: "0",
    firstOperand: null,
    operator: null,
    waitingForSecondOperand: false,
    clearOnNextDigit: false
  },
  stateReducer: `
    function stateReducer(state, action) {
      const newState = { ...state };
      
      // Helper function to perform calculation
      function calculate(a, b, op) {
        a = parseFloat(a);
        b = parseFloat(b);
        switch(op) {
          case 'add': return a + b;
          case 'subtract': return a - b;
          case 'multiply': return a * b;
          case 'divide': return b !== 0 ? a / b : 'Error';
          default: return b;
        }
      }
      
      if (action.type === 'DIGIT') {
        const digit = action.params?.digit || '';
        
        // If we're waiting for second operand or need to clear display
        if (newState.waitingForSecondOperand || newState.clearOnNextDigit) {
          newState.display = digit;
          newState.waitingForSecondOperand = false;
          newState.clearOnNextDigit = false;
        } else {
          // Append digit, but only if it wouldn't make the number too long
          if (newState.display.length < 12) {
            newState.display = newState.display === '0' ? digit : newState.display + digit;
          }
        }
      }
      
      else if (action.type === 'DECIMAL') {
        // If waiting for second operand, start with "0."
        if (newState.waitingForSecondOperand) {
          newState.display = '0.';
          newState.waitingForSecondOperand = false;
        } 
        // Only add decimal if it doesn't already exist
        else if (!newState.display.includes('.')) {
          newState.display += '.';
        }
      }
      
      else if (action.type === 'OPERATION') {
        const operation = action.params?.operation;
        
        // If we already have an operator and both operands, calculate result
        if (newState.operator && !newState.waitingForSecondOperand) {
          const result = calculate(newState.firstOperand, newState.display, newState.operator);
          newState.display = typeof result === 'number' ? String(result) : result;
          newState.firstOperand = newState.display;
        } else {
          // Store the first operand and operator
          newState.firstOperand = newState.display;
        }
        
        newState.waitingForSecondOperand = true;
        newState.operator = operation;
      }
      
      else if (action.type === 'EQUALS') {
        // Only calculate if we have both operands and an operator
        if (newState.operator && newState.firstOperand != null) {
          const result = calculate(newState.firstOperand, newState.display, newState.operator);
          newState.display = typeof result === 'number' ? String(result) : result;
          
          // Reset calculation state
          newState.firstOperand = null;
          newState.operator = null;
          newState.waitingForSecondOperand = false;
          newState.clearOnNextDigit = true;
        }
      }
      
      else if (action.type === 'CLEAR_CALCULATOR') {
        // Reset everything
        newState.display = '0';
        newState.firstOperand = null;
        newState.operator = null;
        newState.waitingForSecondOperand = false;
        newState.clearOnNextDigit = false;
      }
      
      else if (action.type === 'TOGGLE_SIGN') {
        // Toggle between positive and negative
        if (newState.display !== '0') {
          newState.display = newState.display.startsWith('-') 
            ? newState.display.substring(1) 
            : '-' + newState.display;
        }
      }
      
      else if (action.type === 'PERCENT') {
        // Convert to percentage (divide by 100)
        const value = parseFloat(newState.display);
        if (!isNaN(value)) {
          newState.display = String(value / 100);
        }
      }
      
      return newState;
    }
  `,
  eventBindings: {},
  dataBindings: {
    "calculator-display": {
      content: "state.display"
    }
  },
  theme: {
    colors: {
      primary: "#007aff",
      secondary: "#ff9500",
      background: "#f2f2f7",
      surface: "#ffffff",
      text: "#000000"
    },
    typography: {
      fontFamily: "'Helvetica Neue', sans-serif",
      fontSize: "16px"
    },
    spacing: {
      unit: "8px",
      small: "8px",
      medium: "16px",
      large: "24px"
    }
  },
  functionality: {
    type: "calculator",
    config: {}
  }
}; 