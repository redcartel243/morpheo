import sys
import os

# Add the project root directory to the Python path
# This allows us to import 'backend' as a top-level package
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, project_root)

import pytest
import json
from jsonschema import validate, ValidationError
from unittest.mock import MagicMock # Alternative if pytest-mock isn't used

# Assuming ComponentService is importable like this:
# Now this should work because 'backend' is findable
from backend.components.service import ComponentService

# --- Pytest Fixture to Set Up Service ---
@pytest.fixture(scope="module") # Create service once per module
def component_service():
    """Provides a ComponentService instance for testing."""
    # If your ComponentRegistry loads external files, you might need
    # to adjust paths or mock file loading here too.
    return ComponentService()

# --- Define a Detailed JSON Schema for AppConfig ---
# (Expand based on prompt rules and component definitions)

# Schema for common IR actions
IR_ACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "type": {
            "type": "string",
            "enum": [
                "GET_PROPERTY",
                "GET_EVENT_DATA",
                "SET_PROPERTY",
                "ADD_ITEM",
                "REMOVE_ITEM",
                "LOG_MESSAGE",
                "CALL_METHOD"
                # Add other valid action types here if any
            ]
        },
        "payload": {
            "type": "object",
            # We can add more specific payload validation per type later if needed
            "minProperties": 1 # Ensures payload is not empty
        }
    },
    "required": ["type", "payload"]
}

# Schema for component definitions within the main array
COMPONENT_SCHEMA = {
    "type": "object",
    "properties": {
        "id": {"type": "string", "description": "Unique identifier for the component"},
        "type": {"type": "string", "description": "Type of the component (e.g., button, text-input)"},
        "region": {"type": "string", "description": "Layout region where the component resides"},
        "properties": {
            "type": "object",
            "description": "Component-specific configuration properties",
            "additionalProperties": True # Allow any properties initially
        },
        "styles": {
            "type": "object",
            "description": "CSS styles for the component",
            "additionalProperties": {"type": ["string", "number"]} # Allow string or number values for styles
        },
        "methods": {
            "type": "object",
            "description": "Event handlers defined using IR actions",
            # Each property should be an array of IR actions
            "additionalProperties": {
                "type": "array",
                "items": IR_ACTION_SCHEMA
            }
        },
        "itemTemplate": { # Specific to list component
            "type": "object",
            "description": "Template for list items (used only for list component)"
            # Could recursively reference COMPONENT_SCHEMA here if needed, but keep simple for now
        },
        "children": {
            "type": "array",
            "items": {
                "oneOf": [
                    {"type": "string"},
                    {"$ref": "#/definitions/component"} # Recursive reference
                ]
            }
        }
    },
    "required": ["id", "type"] # region can default
}


# Main AppConfig Schema
APP_CONFIG_SCHEMA = {
    "definitions": {
        "component": COMPONENT_SCHEMA # Define component schema for reuse/recursion
    },
    "type": "object",
    "properties": {
        "app": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "description": {"type": "string"},
                "theme": {"type": "string"}
            },
            "required": ["name", "description"]
        },
        "layout": {
            "type": "object",
            "properties": {
                "type": {"type": "string"},
                "regions": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["type", "regions"]
        },
        "components": {
            "type": "array",
            "items": {"$ref": "#/definitions/component"} # Reference the component schema
        }
    },
    "required": ["app", "layout", "components"]
}


# --- Mock Responses ---
# Example of a minimal valid config (as a JSON string)
MOCK_VALID_MINIMAL_RESPONSE = json.dumps({
    "app": {"name": "Test App", "description": "A test", "theme": "light"},
    "layout": {"type": "singlepage", "regions": ["main"]},
    "components": [
        {
            "id": "btn-1",
            "type": "button",
            "region": "main",
            "properties": {"content": "Click Me"},
            "styles": {},
            "methods": {
                "click": [
                    {"type": "LOG_MESSAGE", "payload": {"message": "Clicked!"}}
                ]
            }
        }
    ]
})

# Example of a response missing required 'click' for button
MOCK_MISSING_BUTTON_CLICK_RESPONSE = json.dumps({
    "app": {"name": "Test App", "description": "A test", "theme": "light"},
    "layout": {"type": "singlepage", "regions": ["main"]},
    "components": [
        {
            "id": "btn-1",
            "type": "button", # This button is missing methods.click
            "region": "main",
            "properties": {"content": "Click Me"},
            "styles": {},
            "methods": {}
        }
    ]
})

# Example of response with incorrect payload structure
MOCK_BAD_PAYLOAD_RESPONSE = json.dumps({
    "app": {"name": "Test App", "description": "A test", "theme": "light"},
    "layout": {"type": "singlepage", "regions": ["main"]},
    "components": [
        {
            "id": "btn-1",
            "type": "button",
            "region": "main",
            "properties": {"content": "Click Me"},
            "styles": {},
            "methods": {
                "click": [
                    # Incorrect: message should be inside payload object
                    {"type": "LOG_MESSAGE", "message": "Clicked!"}
                ]
            }
        }
    ]
})

MOCK_INVALID_JSON_RESPONSE = '{"app": {"name": "Test"}' # Incomplete JSON

# --- Actual AI Output for Todo List (Captured) ---
MOCK_AI_TODO_OUTPUT = json.dumps(
    {
      "app": {
        "name": "Todo List",
        "description": "A simple todo list application.",
        "theme": "light"
      },
      "layout": {
        "type": "singlepage",
        "regions": ["main"]
      },
      "components": [
        {
          "id": "main-container",
          "type": "container",
          # Removed region here as it's a child
          "styles": {
            "display": "flex",
            "flexDirection": "column",
            "alignItems": "center",
            "padding": "20px"
          },
          "children": [
            {
                "id": "add-task-container",
                "type": "container",
                # Removed region here as it's a child
                "styles": {
                    "display": "flex",
                    "gap": "10px",
                    "marginBottom": "10px"
                },
                "children": [
                    {
                        "id": "new-task-input",
                        "type": "text-input",
                        # Removed region
                        "properties": {
                            "placeholder": "Enter task",
                            "value": ""
                        },
                        "styles": {
                            "padding": "8px",
                            "border": "1px solid #ccc",
                            "borderRadius": "4px"
                        },
                        "methods": {
                            "change": [
                                {
                                    "type": "GET_EVENT_DATA",
                                    "payload": {
                                    "path": "target.value",
                                    "resultVariable": "inputValue"
                                    }
                                },
                                {
                                    "type": "SET_PROPERTY",
                                    "payload": {
                                    "targetId": "new-task-input",
                                    "propertyName": "value",
                                    "newValue": "$inputValue"
                                    }
                                }
                            ]
                        }
                    },
                    {
                        "id": "add-task-button",
                        "type": "button",
                        # Removed region
                        "properties": {
                            "content": "Add Task"
                        },
                        "styles": {
                            "backgroundColor": "#4CAF50",
                            "color": "white",
                            "padding": "8px 16px",
                            "border": "none",
                            "borderRadius": "4px",
                            "cursor": "pointer"
                        },
                        "methods": {
                            "click": [
                                {
                                    "type": "GET_PROPERTY",
                                    "payload": {
                                    "targetId": "new-task-input",
                                    "propertyName": "value",
                                    "resultVariable": "newTaskText"
                                    }
                                },
                                {
                                    "type": "ADD_ITEM",
                                    "payload": {
                                    "targetId": "task-list",
                                    "itemValue": "$newTaskText"
                                    }
                                },
                                {
                                    "type": "SET_PROPERTY",
                                    "payload": {
                                    "targetId": "new-task-input",
                                    "propertyName": "value",
                                    "newValue": ""
                                    }
                                }
                            ]
                        }
                    }
                ]
            },
            {
              "id": "task-list",
              "type": "list",
              # Removed region
              "properties": {
                "items": []
                # Item template is NOT a property, it's a top-level field
              },
              "itemTemplate": { # Correct placement
                "type": "container",
                "id": "task-item-{{itemId}}",
                "styles": {
                  "display": "flex",
                  "justifyContent": "space-between",
                  "alignItems": "center",
                  "padding": "8px",
                  "borderBottom": "1px solid #eee"
                },
                "children": [
                  {
                    "id": "task-text-{{itemId}}",
                    "type": "text",
                    "properties": {
                      "content": "{{item}}"
                    },
                    "styles": {
                      "flexGrow": "1"
                    }
                  },
                  {
                    "id": "delete-task-button-{{itemId}}",
                    "type": "button",
                    "properties": {
                      "content": "Delete"
                    },
                    "styles": {
                      "backgroundColor": "#f44336",
                      "color": "white",
                      "padding": "6px 12px",
                      "border": "none",
                      "borderRadius": "4px",
                      "cursor": "pointer"
                    },
                    "methods": {
                      "click": [
                        {
                          "type": "REMOVE_ITEM",
                          "payload": {
                            "targetId": "task-list",
                            "itemIdentifier": "{itemId}"
                          }
                        }
                      ]
                    }
                  }
                ]
              },
              "styles": {
                "width": "100%",
                "maxWidth": "500px"
              }
            }
          ]
        }
        # Note: Removed the separate text and delete button definitions
        # They should be defined ONLY within the itemTemplate
      ]
    }
)

# --- Actual AI Output for Calculator (Captured - UPDATED) ---
MOCK_AI_CALCULATOR_OUTPUT = json.dumps(
    {
      "app": {
        "name": "Calculator",
        "description": "A simple calculator application.",
        "theme": "light"
      },
      "layout": {
        "type": "singlepage",
        "regions": ["main"]
      },
      "components": [
        {
          "id": "calculator-container",
          "type": "container",
          "region": "main",
          "styles": {
            "display": "flex",
            "flexDirection": "column",
            "alignItems": "center",
            "justifyContent": "center", # Centered layout
            "width": "300px",
            "padding": "20px",
            "backgroundColor": "#f0f0f0",
            "borderRadius": "8px",
            "boxShadow": "0 2px 5px rgba(0, 0, 0, 0.2)"
          },
          "children": [
            {
              "id": "display",
              "type": "text-input",
              "properties": {
                "value": "0",
                "placeholder": "0",
                "type": "text",
                "disabled": True
              },
              "styles": {
                "width": "100%",
                "padding": "10px",
                "fontSize": "24px",
                "textAlign": "right",
                "border": "1px solid #ccc",
                "borderRadius": "4px",
                "marginBottom": "10px",
                "backgroundColor": "#fff"
              }
              # No methods.change needed for disabled input
            },
            {
              "id": "button-grid",
              "type": "grid",
              "properties": {
                "container": True,
                "spacing": 1, # Reduced spacing
                "columns": 4 # Explicitly 4 columns
              },
              "styles": {
                "width": "100%",
                "display": "grid",
                "gridTemplateColumns": "repeat(4, 1fr)",
                "gap": "8px" # Use gap from spacing
              },
              "children": [
                # Button definitions using CALL_METHOD as generated by AI
                {
                  "id": "button-clear",
                  "type": "button",
                  "properties": {"content": "C"},
                  "styles": {"padding": "20px", "fontSize": "18px", "backgroundColor": "#f44336", "color": "white", "gridColumn": "span 2"}, # Span 2 columns
                  "methods": {"click": [{"type": "SET_PROPERTY", "payload": {"targetId": "display", "propertyName": "value", "newValue": "0"}}]}
                },
                # ... (other digit/operator buttons using CALL_METHOD to appendToDisplay)
                { "id": "button-7", "type": "button", "properties": {"content": "7"}, "styles": {"padding": "20px", "fontSize": "18px"}, "methods": {"click": [{"type": "CALL_METHOD", "payload": {"targetId": "window", "methodName": "$morpheo.appendToDisplay", "args": ["display", "7"]}}]}},
                { "id": "button-8", "type": "button", "properties": {"content": "8"}, "styles": {"padding": "20px", "fontSize": "18px"}, "methods": {"click": [{"type": "CALL_METHOD", "payload": {"targetId": "window", "methodName": "$morpheo.appendToDisplay", "args": ["display", "8"]}}]}},
                { "id": "button-9", "type": "button", "properties": {"content": "9"}, "styles": {"padding": "20px", "fontSize": "18px"}, "methods": {"click": [{"type": "CALL_METHOD", "payload": {"targetId": "window", "methodName": "$morpheo.appendToDisplay", "args": ["display", "9"]}}]}},
                { "id": "button-divide", "type": "button", "properties": {"content": "/"}, "styles": {"padding": "20px", "fontSize": "18px", "backgroundColor": "#ff9800"}, "methods": {"click": [{"type": "CALL_METHOD", "payload": {"targetId": "window", "methodName": "$morpheo.appendToDisplay", "args": ["display", "/"]}}]}},
                { "id": "button-4", "type": "button", "properties": {"content": "4"}, "styles": {"padding": "20px", "fontSize": "18px"}, "methods": {"click": [{"type": "CALL_METHOD", "payload": {"targetId": "window", "methodName": "$morpheo.appendToDisplay", "args": ["display", "4"]}}]}},
                { "id": "button-5", "type": "button", "properties": {"content": "5"}, "styles": {"padding": "20px", "fontSize": "18px"}, "methods": {"click": [{"type": "CALL_METHOD", "payload": {"targetId": "window", "methodName": "$morpheo.appendToDisplay", "args": ["display", "5"]}}]}},
                { "id": "button-6", "type": "button", "properties": {"content": "6"}, "styles": {"padding": "20px", "fontSize": "18px"}, "methods": {"click": [{"type": "CALL_METHOD", "payload": {"targetId": "window", "methodName": "$morpheo.appendToDisplay", "args": ["display", "6"]}}]}},
                { "id": "button-multiply", "type": "button", "properties": {"content": "*"}, "styles": {"padding": "20px", "fontSize": "18px", "backgroundColor": "#ff9800"}, "methods": {"click": [{"type": "CALL_METHOD", "payload": {"targetId": "window", "methodName": "$morpheo.appendToDisplay", "args": ["display", "*"]}}]}},
                { "id": "button-1", "type": "button", "properties": {"content": "1"}, "styles": {"padding": "20px", "fontSize": "18px"}, "methods": {"click": [{"type": "CALL_METHOD", "payload": {"targetId": "window", "methodName": "$morpheo.appendToDisplay", "args": ["display", "1"]}}]}},
                { "id": "button-2", "type": "button", "properties": {"content": "2"}, "styles": {"padding": "20px", "fontSize": "18px"}, "methods": {"click": [{"type": "CALL_METHOD", "payload": {"targetId": "window", "methodName": "$morpheo.appendToDisplay", "args": ["display", "2"]}}]}},
                { "id": "button-3", "type": "button", "properties": {"content": "3"}, "styles": {"padding": "20px", "fontSize": "18px"}, "methods": {"click": [{"type": "CALL_METHOD", "payload": {"targetId": "window", "methodName": "$morpheo.appendToDisplay", "args": ["display", "3"]}}]}},
                { "id": "button-subtract", "type": "button", "properties": {"content": "-"}, "styles": {"padding": "20px", "fontSize": "18px", "backgroundColor": "#ff9800"}, "methods": {"click": [{"type": "CALL_METHOD", "payload": {"targetId": "window", "methodName": "$morpheo.appendToDisplay", "args": ["display", "-"]}}]}},
                { "id": "button-0", "type": "button", "properties": {"content": "0"}, "styles": {"padding": "20px", "fontSize": "18px", "gridColumn": "span 1"}, "methods": {"click": [{"type": "CALL_METHOD", "payload": {"targetId": "window", "methodName": "$morpheo.appendToDisplay", "args": ["display", "0"]}}]}},
                { "id": "button-decimal", "type": "button", "properties": {"content": "."}, "styles": {"padding": "20px", "fontSize": "18px"}, "methods": {"click": [{"type": "CALL_METHOD", "payload": {"targetId": "window", "methodName": "$morpheo.appendToDisplay", "args": ["display", "."]}}]}},
                { "id": "button-add", "type": "button", "properties": {"content": "+"}, "styles": {"padding": "20px", "fontSize": "18px", "backgroundColor": "#ff9800"}, "methods": {"click": [{"type": "CALL_METHOD", "payload": {"targetId": "window", "methodName": "$morpheo.appendToDisplay", "args": ["display", "+"]}}]}},
                { "id": "button-equals", "type": "button", "properties": {"content": "="}, "styles": {"padding": "20px", "fontSize": "18px", "backgroundColor": "#4caf50", "color": "white", "gridColumn": "span 1"}, "methods": {"click": [{"type": "GET_PROPERTY", "payload": {"targetId": "display", "propertyName": "value", "resultVariable": "expressionToEvaluate"}}, {"type": "CALL_METHOD", "payload": {"targetId": "window", "methodName": "$morpheo.evaluateExpression", "args": ["$expressionToEvaluate"]}}]}}
              ]
            }
          ]
        }
      ]
    }
)

# --- Actual AI Output for Conditional UI (Captured) ---
MOCK_AI_CONDITIONAL_UI_OUTPUT = json.dumps(
    {
      "app": {
        "name": "Toggle Visibility App",
        "description": "An app with a button to toggle the visibility of a text element.",
        "theme": "light"
      },
      "layout": {
        "type": "singlepage",
        "regions": ["main"]
      },
      "components": [
        {
          "id": "main-container",
          "type": "container",
          "region": "main",
          "styles": {
            "display": "flex",
            "flexDirection": "column",
            "alignItems": "center",
            "justifyContent": "center",
            "height": "100vh",
            "backgroundColor": "#f0f0f0",
            "padding": "20px" # Added padding
          },
          "children": [
              {
                "id": "toggle-button",
                "type": "button",
                "properties": {
                    "content": "Toggle Visibility"
                },
                "styles": {
                    "padding": "10px 20px",
                    "fontSize": "16px",
                    "backgroundColor": "#4CAF50",
                    "color": "white",
                    "border": "none",
                    "borderRadius": "5px",
                    "cursor": "pointer",
                    "marginBottom": "20px" # Added margin
                },
                "methods": {
                    "click": [
                    {
                        "type": "GET_PROPERTY",
                        "payload": {
                        "targetId": "visibility-text",
                        "propertyName": "styles.display",
                        "resultVariable": "currentDisplay"
                        }
                    },
                    {
                        # INCORRECT: AI invented internal logic
                        "type": "SET_PROPERTY",
                        "payload": {
                        "targetId": "visibility-text",
                        "propertyName": "styles.display",
                        "newValue": {
                            "_internal_toggle": ["block", "none"]
                        }
                        }
                    }
                    ]
                }
                },
                {
                "id": "visibility-text",
                "type": "text",
                "properties": {
                    "content": "I am visible"
                },
                "styles": {
                    "fontSize": "20px",
                    "marginTop": "0", # Adjusted margin
                    "display": "block" # Initial state
                }
                }
          ]
        }
      ]
    }
)

# --- Test Functions ---

def test_generate_config_valid_json(component_service, mocker):
    """Test if service correctly parses valid JSON response from AI."""
    # Mock the API call to return valid JSON
    mocker.patch.object(component_service, '_call_gemini_api', return_value=MOCK_VALID_MINIMAL_RESPONSE)
    # Mock post-processing steps for this specific test if needed, or let them run
    mocker.patch.object(component_service, '_process_app_config', side_effect=lambda cfg, req: cfg)
    mocker.patch.object(component_service, '_ensure_input_onchange_handlers', side_effect=lambda comps: None)
    mocker.patch.object(component_service, '_translate_all_ir_methods', side_effect=lambda comps: None)

    result = component_service.generate_app_config("some request")

    assert isinstance(result, dict)
    assert result["app"]["name"] == "Test App"
    assert len(result["components"]) == 1

def test_generate_config_invalid_json(component_service, mocker):
    """Test if service handles invalid JSON and returns fallback."""
    mocker.patch.object(component_service, '_call_gemini_api', return_value=MOCK_INVALID_JSON_RESPONSE)
    # Mock the fallback function to check if it's called (optional)
    mocker.patch.object(component_service, '_create_ai_fallback_app_config', return_value={"fallback": True})

    result = component_service.generate_app_config("some request")

    assert result == {"fallback": True}
    component_service._create_ai_fallback_app_config.assert_called_once_with("Failed to parse JSON response")


def test_schema_validation_passes(component_service, mocker):
    """Test that a structurally valid config passes JSON Schema validation."""
    mocker.patch.object(component_service, '_call_gemini_api', return_value=MOCK_VALID_MINIMAL_RESPONSE)
    mocker.patch.object(component_service, '_process_app_config', side_effect=lambda cfg, req: cfg)
    mocker.patch.object(component_service, '_ensure_input_onchange_handlers', side_effect=lambda comps: None)
    mocker.patch.object(component_service, '_translate_all_ir_methods', side_effect=lambda comps: None)

    app_config = component_service.generate_app_config("some request")

    try:
        validate(instance=app_config, schema=APP_CONFIG_SCHEMA)
    except ValidationError as e:
        pytest.fail(f"Schema validation failed unexpectedly: {e}")

def test_schema_validation_fails_missing_required(component_service, mocker):
    """Test that a config missing required fields fails schema validation."""
    # Example missing 'layout'
    bad_response = json.dumps({
        "app": {"name": "Test App", "description": "A test", "theme": "light"},
        "components": [{"id": "c1", "type": "text"}]
    })
    mocker.patch.object(component_service, '_call_gemini_api', return_value=bad_response)
    mocker.patch.object(component_service, '_process_app_config', side_effect=lambda cfg, req: cfg)
    mocker.patch.object(component_service, '_ensure_input_onchange_handlers', side_effect=lambda comps: None)
    mocker.patch.object(component_service, '_translate_all_ir_methods', side_effect=lambda comps: None)

    app_config = component_service.generate_app_config("some request")

    with pytest.raises(ValidationError) as excinfo:
        validate(instance=app_config, schema=APP_CONFIG_SCHEMA)
    # Check if the error message indicates 'layout' is missing
    assert "'layout' is a required property" in str(excinfo.value)


# --- Custom Rule Validation Tests ---

def validate_component_rules(app_config):
    """Helper function to run custom rule checks based on prompt requirements."""
    components = app_config.get("components", [])
    errors = []
    all_ids = set()

    # Allowed component types (sync with prompt)
    allowed_types = {
        "container", "div", "grid", "card", "header", "footer",
        "text", "p", "h1", "h2", "h3", "h4", "h5", "h6", "span",
        "image", "button", "text-input", "input", "textarea", "checkbox",
        "radio-group", "select", "form", "list", "datagrid", "linechart",
        "barchart", "piechart", "advancedchart", "dataseries", "video", "canvas", "script"
    }

    def check_component_recursive(comps):
        if not isinstance(comps, list):
            return

        for comp in comps:
            if isinstance(comp, str): # Skip string children
                continue
            if not isinstance(comp, dict):
                errors.append(f"Component entry is not an object: {comp}")
                continue

            comp_id = comp.get("id")
            comp_type = comp.get("type")

        # Rule: All components must have an ID
            if not comp_id:
                errors.append(f"Component of type '{comp_type or 'UNKNOWN'}' missing 'id'")
            elif comp_id in all_ids:
                errors.append(f"Duplicate component ID found: {comp_id}")
            else:
                all_ids.add(comp_id)

            # Rule: Component type must be valid
            if not comp_type or comp_type not in allowed_types:
                errors.append(f"Component '{comp_id or 'MISSING_ID'}' has invalid or missing type: '{comp_type}'")

            methods = comp.get("methods", {})
            properties = comp.get("properties", {})

        # Rule: Buttons must have methods.click
            if comp_type == "button":
                if not isinstance(methods, dict) or "click" not in methods:
                errors.append(f"Button '{comp_id}' missing 'methods.click'")

            # Rule: Inputs must have methods.change (unless disabled)
        input_types = ["text-input", "input", "textarea", "checkbox", "radio-group", "select"]
            if comp_type in input_types:
                 # Check if the input is disabled
                 is_disabled = properties.get("disabled", False)
                 # Only enforce the rule if the input is NOT disabled
                 if not is_disabled and (not isinstance(methods, dict) or "change" not in methods):
                    errors.append(f"Input '{comp_id}' (type: {comp_type}) is enabled but missing required 'methods.change'")

            # Rule: List components with items should ideally have itemTemplate
            if comp_type == "list":
                items = properties.get("items")
                # Check if items exist and are non-empty, and if any item is an object (complex)
                if isinstance(items, list) and items and any(isinstance(item, dict) for item in items):
                    if "itemTemplate" not in comp or not isinstance(comp.get("itemTemplate"), dict):
                        errors.append(f"List '{comp_id}' has complex items but is missing a valid 'itemTemplate' object property")

            # Rule: Image component needs src and alt
            if comp_type == "image":
                if "src" not in properties or not properties.get("src"):
                     errors.append(f"Image '{comp_id}' missing required 'src' property")
                if "alt" not in properties or properties.get("alt") is None: # Allow empty string for alt
                     errors.append(f"Image '{comp_id}' missing required 'alt' property")

            # Rule: Check IR Actions in methods
            if isinstance(methods, dict):
                for method_name, actions in methods.items():
                    if not isinstance(actions, list):
                        errors.append(f"Methods entry '{method_name}' for '{comp_id}' must be an array, got {type(actions)}")
                        continue
                    for i, action in enumerate(actions):
                        # Sub-Rule: Actions must have valid 'payload' object
                        if not isinstance(action, dict) or "payload" not in action or not isinstance(action.get("payload"), dict):
                             errors.append(f"Action {i} in '{comp_id}'.methods.{method_name} missing valid 'payload' object")
                             continue # Skip further checks if payload is invalid

                        action_type = action.get("type")
                        payload = action.get("payload", {})

                        # Sub-Rule: Check REMOVE_ITEM payload for itemIdentifier
                        if action_type == "REMOVE_ITEM":
                            if "itemIdentifier" not in payload:
                                errors.append(f"REMOVE_ITEM action {i} in '{comp_id}'.methods.{method_name} missing required 'itemIdentifier' in payload")

                        # Sub-Rule: Check GET_PROPERTY payload
                        if action_type == "GET_PROPERTY":
                            if not payload.get("targetId") or not payload.get("propertyName") or not payload.get("resultVariable"):
                                errors.append(f"GET_PROPERTY action {i} in '{comp_id}'.methods.{method_name} payload missing required fields (targetId, propertyName, resultVariable)")

                        # Sub-Rule: Check GET_EVENT_DATA payload
                        if action_type == "GET_EVENT_DATA":
                             if not payload.get("path") or not payload.get("resultVariable"):
                                errors.append(f"GET_EVENT_DATA action {i} in '{comp_id}'.methods.{method_name} payload missing required fields (path, resultVariable)")

                        # Sub-Rule: Check SET_PROPERTY payload
                        if action_type == "SET_PROPERTY":
                             if not payload.get("targetId") or not payload.get("propertyName") or "newValue" not in payload:
                                errors.append(f"SET_PROPERTY action {i} in '{comp_id}'.methods.{method_name} payload missing required fields (targetId, propertyName, newValue)")

                        # Add checks for other actions (ADD_ITEM, LOG_MESSAGE, CALL_METHOD) similarly
                        if action_type == "ADD_ITEM":
                            if not payload.get("targetId") or "itemValue" not in payload:
                                errors.append(f"ADD_ITEM action {i} in '{comp_id}'.methods.{method_name} payload missing required fields (targetId, itemValue)")
                        if action_type == "LOG_MESSAGE":
                            if "message" not in payload:
                                errors.append(f"LOG_MESSAGE action {i} in '{comp_id}'.methods.{method_name} payload missing required field 'message'")
                        if action_type == "CALL_METHOD":
                            if not payload.get("targetId") or not payload.get("methodName"):
                                errors.append(f"CALL_METHOD action {i} in '{comp_id}'.methods.{method_name} payload missing required fields (targetId, methodName)")

            # Recursively check children
            if "children" in comp:
                check_component_recursive(comp["children"])

    # Start recursive check from top-level components
    check_component_recursive(components)

    if errors:
        raise AssertionError("Custom rule validation failed:\n - " + "\n - ".join(errors))


def test_custom_rules_pass_valid_config(component_service, mocker):
    """Test that a functionally valid config passes custom rules."""
    mocker.patch.object(component_service, '_call_gemini_api', return_value=MOCK_VALID_MINIMAL_RESPONSE)
    mocker.patch.object(component_service, '_process_app_config', side_effect=lambda cfg, req: cfg)
    mocker.patch.object(component_service, '_ensure_input_onchange_handlers', side_effect=lambda comps: None)
    mocker.patch.object(component_service, '_translate_all_ir_methods', side_effect=lambda comps: None)

    app_config = component_service.generate_app_config("some request")
    try:
        validate_component_rules(app_config)
    except AssertionError as e:
        pytest.fail(f"Custom rule validation failed unexpectedly: {e}")


def test_custom_rules_fail_missing_button_click(component_service, mocker):
    """Test that a config missing button click fails custom rules."""
    mocker.patch.object(component_service, '_call_gemini_api', return_value=MOCK_MISSING_BUTTON_CLICK_RESPONSE)
    mocker.patch.object(component_service, '_process_app_config', side_effect=lambda cfg, req: cfg)
    mocker.patch.object(component_service, '_ensure_input_onchange_handlers', side_effect=lambda comps: None)
    mocker.patch.object(component_service, '_translate_all_ir_methods', side_effect=lambda comps: None)

    app_config = component_service.generate_app_config("some request")
    with pytest.raises(AssertionError) as excinfo:
        validate_component_rules(app_config)
    assert "Button 'btn-1' missing 'methods.click'" in str(excinfo.value)

def test_custom_rules_fail_bad_payload(component_service, mocker):
    """Test that a config with bad payload structure fails custom rules."""
    mocker.patch.object(component_service, '_call_gemini_api', return_value=MOCK_BAD_PAYLOAD_RESPONSE)
    mocker.patch.object(component_service, '_process_app_config', side_effect=lambda cfg, req: cfg)
    mocker.patch.object(component_service, '_ensure_input_onchange_handlers', side_effect=lambda comps: None)
    mocker.patch.object(component_service, '_translate_all_ir_methods', side_effect=lambda comps: None)

    app_config = component_service.generate_app_config("some request")
    with pytest.raises(AssertionError) as excinfo:
        validate_component_rules(app_config)
    assert "Action 0 in 'btn-1'.methods.click missing valid 'payload' object" in str(excinfo.value)

# --- Test Validation of Real AI Output ---
def test_validate_real_ai_todo_output(component_service, mocker):
    """Test schema and custom rules against actual AI output for a todo list."""
    mocker.patch.object(component_service, '_call_gemini_api', return_value=MOCK_AI_TODO_OUTPUT)
    mocker.patch.object(component_service, '_process_app_config', side_effect=lambda cfg, req: cfg)
    mocker.patch.object(component_service, '_ensure_input_onchange_handlers', side_effect=lambda comps: None)
    mocker.patch.object(component_service, '_translate_all_ir_methods', side_effect=lambda comps: None)

    app_config = None
    try:
        app_config = component_service.generate_app_config("create a todo list")
    except Exception as e:
        pytest.fail(f"generate_app_config failed unexpectedly on AI output: {e}")

    assert app_config is not None, "generate_app_config returned None unexpectedly"

    # 1. Validate against JSON Schema
    try:
        validate(instance=app_config, schema=APP_CONFIG_SCHEMA)
    except ValidationError as e:
        pytest.fail(f"Schema validation failed for actual AI output: {e}")

    # 2. Validate against Custom Rules
    try:
        validate_component_rules(app_config)
    except AssertionError as e:
        pytest.fail(f"Custom rule validation failed for actual AI output: {e}")

# --- Test Validation of Calculator AI Output ---
def test_validate_real_ai_calculator_output(component_service, mocker):
    """Test schema and custom rules against actual AI output for a calculator."""
    mocker.patch.object(component_service, '_call_gemini_api', return_value=MOCK_AI_CALCULATOR_OUTPUT)
    mocker.patch.object(component_service, '_process_app_config', side_effect=lambda cfg, req: cfg)
    mocker.patch.object(component_service, '_ensure_input_onchange_handlers', side_effect=lambda comps: None)
    mocker.patch.object(component_service, '_translate_all_ir_methods', side_effect=lambda comps: None)

    app_config = None
    try:
        app_config = component_service.generate_app_config("create a calculator")
    except Exception as e:
        pytest.fail(f"generate_app_config failed unexpectedly on AI output: {e}")

    assert app_config is not None, "generate_app_config returned None unexpectedly"

    # 1. Validate against JSON Schema
    try:
        validate(instance=app_config, schema=APP_CONFIG_SCHEMA)
    except ValidationError as e:
        pytest.fail(f"Schema validation failed for actual AI output: {e}")

    # 2. Validate against Custom Rules
    try:
        validate_component_rules(app_config)
    except AssertionError as e:
        pytest.fail(f"Custom rule validation failed for actual AI output: {e}")

# --- Test Validation of Conditional UI AI Output ---
def test_validate_real_ai_conditional_ui_output(component_service, mocker):
    """Test schema and custom rules against actual AI output for a conditional UI."""
    mocker.patch.object(component_service, '_call_gemini_api', return_value=MOCK_AI_CONDITIONAL_UI_OUTPUT)
    mocker.patch.object(component_service, '_process_app_config', side_effect=lambda cfg, req: cfg)
    mocker.patch.object(component_service, '_ensure_input_onchange_handlers', side_effect=lambda comps: None)
    mocker.patch.object(component_service, '_translate_all_ir_methods', side_effect=lambda comps: None)

    app_config = None
    try:
        app_config = component_service.generate_app_config("create a conditional UI")
    except Exception as e:
        pytest.fail(f"generate_app_config failed unexpectedly on AI output: {e}")

    assert app_config is not None, "generate_app_config returned None unexpectedly"

    # 1. Validate against JSON Schema
    try:
        validate(instance=app_config, schema=APP_CONFIG_SCHEMA)
    except ValidationError as e:
        pytest.fail(f"Schema validation failed for actual AI output: {e}")

    # 2. Validate against Custom Rules
    try:
        validate_component_rules(app_config)
    except AssertionError as e:
        pytest.fail(f"Custom rule validation failed for actual AI output: {e}")

# --- TODO: Add Unit Tests for _process_app_config, _ensure_input_onchange_handlers, etc. ---
# These would involve creating small, targeted dictionary inputs and asserting the output
# Example (Conceptual):
# def test_ensure_input_handlers_adds_missing(component_service):
#     input_comps = [{"id": "in1", "type": "text-input", "methods": {}}]
#     component_service._ensure_input_onchange_handlers(input_comps)
#     assert "change" in input_comps[0]["methods"]
#     # Add more assertions about the structure of the added handler