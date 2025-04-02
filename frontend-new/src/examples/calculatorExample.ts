import { ComponentMethod } from '../core/ComponentInterface';

/**
 * Example of a calculator definition using the declarative action API
 */
export const calculatorButtonExample = {
  id: "button-7",
  type: "button",
  properties: {
    text: "7"
  },
  styles: {
    padding: "10px",
    fontSize: "1.2em",
    backgroundColor: "#90EE90",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    transition: "background-color 0.3s ease"
  },
  // This is the new declarative format for methods
  methods: {
    onClick: {
      actions: [
        // Get the current value from the display
        {
          type: "getValue",
          target: "#display",
          store: "currentValue"
        },
        // Set the new value with 7 appended
        {
          type: "setValue",
          target: "#display",
          value: {
            concat: ["$currentValue", "7"]
          }
        },
        // Add a visual feedback by briefly changing the color
        {
          type: "setStyle",
          target: "#button-7",
          property: "backgroundColor",
          value: "#70C070"
        },
        // Reset the color after a delay
        {
          type: "setTimeout",
          callback: {
            type: "setStyle",
            target: "#button-7",
            property: "backgroundColor",
            value: "#90EE90"
          },
          delay: 100
        }
      ],
      affectedComponents: ["display", "button-7"] // Optional, for optimization
    }
  }
};

/**
 * Example of a calculator equals button with conditional logic
 */
export const calculatorEqualsButtonExample = {
  id: "button-equals",
  type: "button",
  properties: {
    text: "="
  },
  styles: {
    padding: "10px",
    fontSize: "1.2em",
    backgroundColor: "#4682B4",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer"
  },
  methods: {
    onClick: {
      actions: [
        // Get the expression from the display
        {
          type: "getValue",
          target: "#display",
          store: "expression"
        },
        // Custom action for evaluating the expression
        {
          type: "evaluateExpression",
          expression: "$expression",
          store: "result",
          onError: {
            type: "setValue",
            target: "#display",
            value: "Error"
          }
        },
        // Set the result on the display
        {
          type: "setValue",
          target: "#display",
          value: "$result"
        }
      ]
    }
  }
};

/**
 * Example of how the entire calculator could be defined
 */
export const calculatorAppExample = {
  app: {
    name: "Declarative Calculator",
    description: "A calculator built with the declarative actions API"
  },
  components: [
    {
      id: "calculator-container",
      type: "container",
      styles: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px",
        backgroundColor: "#f0f8ff"
      },
      children: [
        {
          id: "display",
          type: "input",
          properties: {
            placeholder: "0"
          },
          styles: {
            width: "300px",
            padding: "10px",
            margin: "10px",
            fontSize: "1.5em",
            textAlign: "right",
            border: "1px solid #ccc",
            borderRadius: "5px"
          }
        },
        {
          id: "button-clear",
          type: "button",
          properties: {
            text: "C"
          },
          styles: {
            width: "300px",
            padding: "10px",
            fontSize: "1.2em",
            backgroundColor: "#DC143C",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            marginBottom: "10px"
          },
          methods: {
            onClick: {
              actions: [
                {
                  type: "setValue",
                  target: "#display",
                  value: ""
                }
              ]
            }
          }
        },
        // Number buttons would go here
        // ...
        // We would define all of the calculator buttons similarly
      ]
    }
  ]
}; 