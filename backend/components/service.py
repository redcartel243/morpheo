"""
Component-Based UI Generation Service

This module provides services for component-based UI generation.
It uses AI (Gemini or OpenAI) to compose components into a complete UI based on user requirements.
The service no longer relies on templates, instead fully embracing AI-driven component configuration.
"""

import json
import os
import datetime
import re
import time
import random
import logging
import copy
from typing import Dict, List, Any, Optional, Tuple, Union
from pydantic import ValidationError

from dotenv import load_dotenv
import traceback
import requests
from uuid import uuid4

# Properly handle Gemini SDK imports
try:
    from google import genai
    from google.genai import types as genai_types
    GEMINI_CLIENT_AVAILABLE = True
    print("Successfully imported google.genai")
except ImportError:
    genai = None
    genai_types = None
    GEMINI_CLIENT_AVAILABLE = False
    print("Failed to import google.genai - Gemini features will be disabled")


from .registry import component_registry
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from modules.tools.registry import tool_registry

# Import Pydantic Schemas
from .schemas import AppConfig # Import the root (full) schema
from .api_schemas import ApiAppConfig # Import the simplified schema for API calls

# Import map processing if available
try:
    # Add the root directory to the path to find the prompts folder
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sys.path.append(root_dir)
    from prompts.preprocess_map_prompt import preprocess_map_request
    from prompts.map_post_processor import fix_map_configuration
    MAP_PROCESSORS_AVAILABLE = True
    print("Map processing functions successfully imported from", os.path.join(root_dir, "prompts"))
except ImportError:
    print("Warning: Map processors not available. Map component fixes will be disabled.")
    MAP_PROCESSORS_AVAILABLE = False
    
    # Define dummy functions
    def preprocess_map_request(request_text):
        return request_text
        
    def fix_map_configuration(config_json):
        return config_json

# Load environment variables
load_dotenv()

# Initialize OpenAI client
#client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define cleaning functions at module level
# Recursive function to remove 'default' keys from schema
def remove_defaults(schema_dict):
    if isinstance(schema_dict, dict):
        if "default" in schema_dict:
            del schema_dict["default"]
        for key, value in list(schema_dict.items()):
            remove_defaults(value)
    elif isinstance(schema_dict, list):
        for item in schema_dict:
            remove_defaults(item)
            
# Recursive function to remove 'title' keys from schema
def remove_titles(schema_dict):
    if isinstance(schema_dict, dict):
        if "title" in schema_dict:
            del schema_dict["title"]
        for key, value in list(schema_dict.items()):
            remove_titles(value)
    elif isinstance(schema_dict, list):
        for item in schema_dict:
            remove_titles(item)

class ComponentService:
    """
    Service for AI-driven component-based UI generation using the NEW google.genai SDK.
    """
    
    # Keywords to identify camera-based applications
    CAMERA_RELATED_KEYWORDS = [
        "camera", "webcam", "video", "face recognition", "face detect", 
        "facial", "image processing", "object detection", "photo capture",
        "selfie", "picture taking", "media capture"
    ]
    
    max_retries = 2 # Maximum retries for JSON decode errors
    
    def __init__(self, component_registry=None):
        """Initializes the ComponentService, setting up the Gemini client."""
        self.component_registry = component_registry
        self.client = None
        # Assign potentially None types module here
        self.genai_types = genai_types 
        self.error_count = 0 
        
        # Only try to initialize client if genai was imported
        if genai:
            try:
                self.client = genai.Client()
                print("NEW google.genai SDK Client initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize google.genai Client: {e}")
                print(f"Error: Failed to initialize google.genai Client: {e}. Check API Key and env vars.")
                self.client = None # Ensure client is None on init error
            else:
                if not os.getenv("GOOGLE_API_KEY"):
                     logger.warning("GOOGLE_API_KEY environment variable not set. Client might not be functional.")
                     print("Warning: GOOGLE_API_KEY environment variable not set.")
                     # Keep client instance for now, let calls fail later if needed
        else:
            print("google.genai library not found or failed to import. Gemini features disabled.")
            # Ensure client is None if genai module itself is missing
            self.client = None
    
    def generate_app_config(self, prompt: str, use_search: bool = True) -> Dict[str, Any]:
        """
        Generate a full application config based on the user's prompt.
        
        Args:
            prompt: The user's prompt describing the app they want to build
            use_search: Whether to enable Google search capability (if available)
            
        Returns:
            Dictionary containing the full application configuration
        """
        
        # Check if the required libraries are available
        if not self.client or not self.genai_types:
            logger.error("Gemini client or types module not available. Cannot generate config.")
            return self._create_ai_fallback_app_config("Gemini client not initialized.")
            
        # --- Generate API Response Phase ---
        try:
            print(f"Using NEW SDK with model: gemini-2.0-flash")
            
            # First convert Pydantic model to schema dictionary
            api_schema_dict = ApiAppConfig.model_json_schema()
            
            # Instead of complex inlining, let's switch to a simpler approach:
            # Just flatten the schema to a primitive dict without nested references
            simplified_schema = self._simplify_schema_for_api(api_schema_dict)
            
            print(f"Generated simplified schema for API")
            
            # Configure generation using types.GenerateContentConfig
            config = self.genai_types.GenerateContentConfig(
                response_mime_type="application/json", 
                response_schema=simplified_schema
            )
            
            print(f"Calling Gemini API with simplified schema")
            
            gemini_response = self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt, 
                config=config
            )
            
            response_text = gemini_response.text 
            
            # Log the response
            with open("gemini_request_log.txt", "a", encoding="utf-8") as log_file:
                log_file.write(f"Request Time: {datetime.datetime.now()} (Tool Call Success)\n")
                log_file.write("Function Call Args (as JSON):\n")
                log_file.write(prompt)
                log_file.write("\n--- End of Prompt ---\n\n")
                log_file.write("Response:\n")
                log_file.write(response_text)
                log_file.write("\n--- End of Response ---\n\n")
        except Exception as e:
            print(f"Error during NEW SDK generate_content call: {str(e)}")
            traceback.print_exc()
            return self._create_ai_fallback_app_config(f"Gemini API failed: {str(e)}")
        
        # --- Process Response Phase ---
        try:
            # Check for empty response
            if not response_text:
                return self._create_ai_fallback_app_config("Empty response from Gemini API")
            
            # Parse the response JSON
            try:
                app_config_dict = json.loads(response_text)
            except json.JSONDecodeError as json_err:
                print(f"JSON decode error: {str(json_err)}. Response: {response_text[:100]}...")
                return self._create_ai_fallback_app_config("Failed to parse JSON response from Gemini API")
                
            # Validate required component elements
            if not self._validate_required_component_elements(app_config_dict):
                print("Validation failed for required component elements")
                return self._create_ai_fallback_app_config("Generated components missing required elements")
                
            # Validate against the full schema
            try:
                validated_app_config = AppConfig.model_validate(app_config_dict)
                print("Successfully validated app config with Pydantic model")
            except ValidationError as validation_error:
                print(f"Validation error: {str(validation_error)}")
                # Still return the app_config_dict even if validation fails
                print("Returning unvalidated app config (validation failed)")
                return app_config_dict
                
            # Check for disallowed $m usage
            if "components" in app_config_dict and self._check_for_disallowed_m_usage(app_config_dict["components"]):
                print("Found disallowed $m usage, using fallback")
                return self._create_ai_fallback_app_config("Generated components contain disallowed $m() usage")
                
            # Post-process component methods if necessary
            if "components" in app_config_dict:
                self._post_process_component_methods(app_config_dict["components"], app_config_dict["components"])
                
            # Fallbacks
            if not app_config_dict.get("app_name"):
                print("No app_name provided, adding default")
                app_config_dict["app_name"] = "Generated App"
                
            # Return the final configuration
            return app_config_dict
            
        except Exception as processing_error:
            print(f"Error processing Gemini response: {str(processing_error)}")
            traceback.print_exc()
            return self._create_ai_fallback_app_config(f"Error processing API response: {str(processing_error)}")
    
    def _simplify_schema_for_api(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a simplified schema that avoids circular references and nested complexity.
        This creates a basic schema rather than trying to preserve full structure.
        
        Args:
            schema: The original complex schema dictionary
            
        Returns:
            A simplified schema without complex references
        """
        # Create a basic schema structure for the API component config with non-empty property definitions
        simplified = {
            "type": "object",
            "properties": {
                "app_name": {"type": "string"},
                "components": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "type": {"type": "string"},
                            "properties": {
                                "type": "object",
                                "properties": {
                                    "content": {"type": "string"},
                                    "value": {"type": "string"},
                                    "placeholder": {"type": "string"}
                                }
                            },
                            "styles": {
                                "type": "object",
                                "properties": {
                                    "backgroundColor": {"type": "string"},
                                    "color": {"type": "string"},
                                    "padding": {"type": "string"},
                                    "margin": {"type": "string"}
                                }
                            },
                            "methods": {
                                "type": "object",
                                "properties": {
                                    "click": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "type": {"type": "string"},
                                                "targetId": {"type": "string"},
                                                "propertyName": {"type": "string"}
                                            }
                                        }
                                    },
                                    "change": {
                                        "type": "array",
                                        "items": {
                                            "type": "object", 
                                            "properties": {
                                                "type": {"type": "string"},
                                                "targetId": {"type": "string"},
                                                "propertyName": {"type": "string"}
                                            }
                                        }
                                    }
                                }
                            },
                            "events": {
                                "type": "object",
                                "properties": {
                                    "onClick": {"type": "string"},
                                    "onChange": {"type": "string"}
                                }
                            },
                            "children": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "id": {"type": "string"},
                                        "type": {"type": "string"},
                                        "properties": {
                                            "type": "object",
                                            "properties": {
                                                "content": {"type": "string"}
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "required": ["id", "type"]
                    }
                }
            },
            "required": ["app_name", "components"]
        }
        
        return simplified

    def _clean_schema_for_api(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        """
        Clean a JSON schema by removing problematic keys and inlining $ref references.
        
        Args:
            schema: The schema dictionary to clean
            
        Returns:
            The cleaned schema dictionary
        """
        # Make a deep copy to avoid modifying the original
        cleaned = copy.deepcopy(schema)
        
        # First, extract all definitions from $defs section
        defs = cleaned.pop("$defs", {})
        
        def _clean_node(node):
            if not isinstance(node, dict):
                return node
                
            # Remove problematic keys
            if "default" in node:
                del node["default"]
            
            # Handle $ref references by inlining the definition
            if "$ref" in node and isinstance(node["$ref"], str):
                ref_path = node["$ref"]
                # Extract the reference name from the path (e.g., "#/$defs/ApiAppComponent" -> "ApiAppComponent")
                if ref_path.startswith("#/$defs/"):
                    ref_name = ref_path.split("/")[-1]
                    if ref_name in defs:
                        # Replace the reference with the inlined definition
                        ref_def = copy.deepcopy(defs[ref_name])
                        # Clean the inlined definition recursively
                        inlined_def = _clean_node(ref_def)
                        # Remove the $ref key
                        del node["$ref"]
                        # Merge the definition into the current node
                        node.update(inlined_def)
            else:
                        print(f"Warning: Reference '{ref_name}' not found in schema definitions")
                        # Remove the invalid reference
                        del node["$ref"]
            
            # Recursively clean nested schemas
            for key, value in list(node.items()):
                if isinstance(value, dict):
                    node[key] = _clean_node(value)
                elif isinstance(value, list):
                    node[key] = [_clean_node(item) if isinstance(item, dict) else item for item in value]
                    
            return node
        
        # Clean the schema starting from the root
        return _clean_node(cleaned)

    def _validate_required_component_elements(self, config_dict: Dict[str, Any]) -> bool:
        """
        Validates that the generated components have the required properties and methods.
        
        Args:
            config_dict: The parsed response dictionary
            
        Returns:
            bool: True if all required elements are present, False otherwise
        """
        if not config_dict.get("components"):
            return False
            
        components = config_dict.get("components", [])
        missing_elements = False
        
        for component in components:
            comp_type = component.get("type", "")
            comp_id = component.get("id", "unknown")
            
            # Check for properties based on component type
            if comp_type in ["text", "h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "label", "button"]:
                if not component.get("properties", {}).get("content"):
                    print(f"Missing content property in {comp_type} component: {comp_id}")
                    missing_elements = True
                    
            if comp_type in ["input", "textarea", "text-input"]:
                if not component.get("properties", {}).get("placeholder"):
                    print(f"Missing placeholder property in {comp_type} component: {comp_id}")
                    missing_elements = True
                    
            # Check for methods on interactive components
            if comp_type in ["button"]:
                if not component.get("methods", {}).get("click"):
                    print(f"Missing click method in button component: {comp_id}")
                    missing_elements = True
        
        return not missing_elements
    
    def _call_gemini_api(self, prompt: str, use_search: bool = False) -> str:
        """
        Make an API call to Google's Gemini API for standard text generation.
        NOTE: This function is NOT for structured output (use generate_app_config for that).
        
        Args:
            prompt: The prompt to send to Gemini
            use_search: Whether to enable Google search capability
            
        Returns:
            Response text from Gemini
        """
        if not self.client: # Check if module is configured
            raise ValueError("Gemini API is not configured.")
        
        try:
            # Log the request
            with open("gemini_request_log.txt", "a", encoding="utf-8") as log_file:
                log_file.write(f"Request Time: {datetime.datetime.now()}\n")
                log_file.write("Prompt:\n")
                log_file.write(prompt)
                log_file.write("\n--- End of Prompt ---\n\n")
            
            # Generate content directly without getting the model first
            generation_config = self.genai_types.GenerationConfig(
                temperature=0.9,
                        top_p=1,
                top_k=1,
                max_output_tokens=8192,
            )
                
            # Tool configuration for search (if requested)
            search_tool = None
            if use_search: # Correct indentation for this block
                print("Gemini Search Enabled for this call.")
                try:
                    google_search_retrieval = self.client.protos.GoogleSearchRetrieval()
                    search_tool = [self.client.protos.Tool(google_search_retrieval=google_search_retrieval)]
                except AttributeError as e:
                    print(f"Warning: Could not construct GoogleSearchRetrieval tool (AttributeError: {e}). Search might not work.")
                    search_tool = None 
                except Exception as e:
                    print(f"Warning: Error constructing GoogleSearchRetrieval tool: {e}. Search might not work.")
                    search_tool = None 
            
            # Generate content directly using client.models.generate_content
            response = self.client.models.generate_content(
                model="gemini-2.0-flash", # Direct model name
                contents=prompt,
                config=generation_config
            )
                
            # Extract the response text INSIDE the try block
            response_text = response.text
            
            # Log the response INSIDE the try block
            with open("gemini_request_log.txt", "a", encoding="utf-8") as log_file:
                    log_file.write("Response:\n")
                    log_file.write(response_text)
                    log_file.write("\n--- End of Response ---\n\n")
        
            return response_text # Return from INSIDE the try block
        
        except Exception as e:
            print(f"Error calling Gemini API in _call_gemini_api: {str(e)}")
            traceback.print_exc()
            raise
    
    
            
    def _check_for_disallowed_m_usage(self, components: List[Dict[str, Any]]) -> bool:
        """Recursively checks component methods for disallowed '$m(' usage."""
        if not components:
            return False

        for component in components:
            if not isinstance(component, dict):
                continue

            if "methods" in component and isinstance(component["methods"], dict):
                for method_name, method_info in component["methods"].items():
                    method_code = None
                    if isinstance(method_info, str):
                        method_code = method_info
                    elif isinstance(method_info, dict) and "code" in method_info:
                        method_code = method_info["code"]
                    
                    if method_code and "$m(" in method_code:
                        print(f"Disallowed '$m(' usage found in component '{component.get('id', '?')}' method '{method_name}'")
                        return True # Found disallowed usage
            
            # Process children recursively
            if "children" in component and isinstance(component["children"], list):
                 # Correct Python way to filter for dictionaries (representing ComponentChild)
                 childComponents = [c for c in component["children"] if isinstance(c, dict)]
                 if childComponents:
                    if self._check_for_disallowed_m_usage(childComponents):
                        return True # Found in children
        
        return False # No disallowed usage found in this branch

    def _create_enhanced_prompt(self, user_request: str, ui_components: List[Dict[str, Any]], is_camera_app: bool) -> str:
        """
        Create a comprehensive prompt for generating an app configuration.
        This method generates a detailed prompt with extensive context and examples,
        leveraging Gemini's large context window to provide comprehensive guidance.
        
        Args:
            user_request: The user's request description
            ui_components: List of available UI components
            is_camera_app: Whether the request is for a camera-based application
            
        Returns:
            A detailed prompt string
        """
        # Simplify has_search check
        has_search = GEMINI_CLIENT_AVAILABLE
        
        # Load base prompt template
        base_template_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", "gemini_prompt_template.md")
        if os.path.exists(base_template_path):
            with open(base_template_path, "r", encoding="utf-8") as f:
                base_template = f.read()
        else:
            # Fall back to default template if file doesn't exist
            base_template = """
        # MORPHEO UI CONFIGURATION GENERATOR

        ## USER REQUEST
{{user_request}}

        ## AVAILABLE COMPONENTS
        
        Here is a list of available base components. Use these as building blocks. 
        Remember to use generic components; the AI provides the specific logic.
        
        - **text**: Displays text content. Can be styled for headings (e.g., `fontSize: '24px', fontWeight: 'bold'`), paragraphs, labels, etc. 
          - Properties: `content` (string), `variant` (optional string, e.g., 'h1', 'p', 'label')
        - **container**: A flexible layout element to group other components. Supports flexbox/grid styles.
          - Properties: None specific, relies on children and styles.
        - **button**: An interactive button.
          - Properties: `content` (string, button text), `variant` (optional string for style theme)
        - **text-input**: Field for single-line text entry.
          - Properties: `placeholder` (string), `value` (string), `label` (string), `type` (string, e.g., 'text', 'password', 'email')
        - **textarea**: Field for multi-line text entry.
          - Properties: `placeholder` (string), `value` (string), `label` (string), `rows` (number)
        - **list**: Displays a list of items. Items can be simple strings or complex component structures.
          - Properties: `items` (array), `renderItem` (optional function string to customize item display)
        - **image**: Displays an image.
          - Properties: `src` (string URL), `alt` (string)
        - **video**: Displays video, potentially from a camera feed.
          - Properties: `src` (string URL), `useCamera` (boolean), `facingMode` (string 'user'/'environment'), `autoPlay` (boolean), `muted` (boolean)
        - **canvas**: A drawing surface, often used as an overlay for video or for custom visualizations.
          - Properties: `width` (number), `height` (number), `overlayFor` (string, ID of element to overlay), `transparent` (boolean)
        - **checkbox**: A checkbox input.
          - Properties: `label` (string), `checked` (boolean)
        - **radio**: A radio button input (usually grouped).
          - Properties: `label` (string), `checked` (boolean), `value` (string), `name` (string for grouping)
        - **select**: A dropdown selection input.
          - Properties: `label` (string), `options` (array of {value: string, label: string}), `value` (string)
        - **map**: Displays an interactive map.
          - Properties: `latitude`, `longitude`, `zoom`, `markers` (array), `apiKey` (string)
        - **script**: Embeds custom JavaScript logic (Use sparingly! Prefer component methods).
          - Properties: `content` (string of JS code) or `src` (string URL)
        
        *(This list might not be exhaustive, adapt based on the user request if other logical components seem necessary, but prefer these common ones)*

        ## CORE PRINCIPLES
        Morpheo is an AI-driven component system with these fundamental principles:
        
        1. **Zero Application-Specific Logic**: 
           - No hardcoded calculator logic, form validation, or app-specific functionality
           - All application behavior must be generated by you (the AI), not pre-built
        
        2. **Pure AI-Driven Generation**:
           - You analyze requests and determine needed components
           - You create connections and transformations
           - You apply behaviors appropriate to the use case
        
        3. **Generic Component System**:
           - Components are generic building blocks
           - Behaviors should be reusable across applications
           - Component behavior should adapt to the specific context
        
        ## YOUR TASK
        Generate a complete JSON configuration for a UI application that satisfies the user's request.
        
        DO NOT use templates or predefined application structures. Instead:
        - Analyze what components would best serve the user's needs
        - Create a component tree with appropriate nesting and organization
        - Define component properties, styles, and methods

        ## DYNAMIC UPDATES & INTERACTIONS: INTERMEDIATE REPRESENTATION (IR)
        
        **IMPORTANT: DO NOT GENERATE JAVASCRIPT STRINGS FOR METHODS.**
        
        Instead, for component `methods`, define the logic using a structured **Intermediate Representation (IR)**. Each event handler (e.g., `click`, `change`) should map to an **array of action objects**.
        
        **IR Structure:**
        - Each method (e.g., `"click"`) maps to an array `[]` of action objects.
        - Each action object has a `"type"` field indicating the action (e.g., `"GET_PROPERTY"`, `"IF"`, `"ADD_COMPONENT"`).
        - Other fields provide parameters for the action (e.g., `targetId`, `propertyName`, `value`, `condition`, `config`).
        
        **Available IR Action Types:**
        
        *   **Data Manipulation:**
            *   `GET_PROPERTY`: Reads a property from a component.
                *   Params: `targetId` (string), `propertyName` (string), `assignTo` (string, variable name).
            *   `SET_PROPERTY`: Writes a property to a component.
                *   Params: `targetId` (string), `propertyName` (string), `value` (Value object).
            *   `GET_EVENT_DATA`: Extracts data from the triggering event.
                *   Params: `path` (string, e.g., "target.value", "key"), `assignTo` (string).
            *   `SET_VARIABLE`: Sets a temporary variable.
                *   Params: `variableName` (string), `value` (Value object).
        *   **Component Lifecycle:**
            *   `ADD_COMPONENT`: Adds a new component dynamically.
                *   Params: `parentId` (string), `config` (Component config object, can contain nested IR methods), `assignIdTo` (optional string, variable name for the new ID).
            *   `REMOVE_COMPONENT`: Removes a component.
                *   Params: `targetId` (Value object or string selector).
            *   `UPDATE_COMPONENT`: Merges multiple property/style updates.
                *   Params: `targetId` (string), `updates` (object: { properties: {...}, styles: {...} }).
        *   **Interaction & Logic:**
            *   `CALL_METHOD`: Calls another component's method.
                *   Params: `targetId` (string), `methodName` (string), `args` (array of Value objects).
            *   `IF`: Conditional execution.
                *   Params: `condition` (Condition object), `then` (array of actions), `else` (optional array of actions).
            *   `GENERATE_ID`: Creates a unique ID string.
                *   Params: `assignTo` (string).
        *   **Debugging:**
            *   `LOG`: Outputs values to the console.
                *   Params: `message` (Value object or string literal).

        **Value Representation (for `value`, `args`, `message` fields):**
        
        - `{ "type": "LITERAL", "value": "string" | 123 | true | null }`
        - `{ "type": "VARIABLE", "name": "varName" }` (References a variable set by `assignTo` or `SET_VARIABLE`).
        - `{ "type": "CONTEXT", "path": "selfId" | "parentId" | "event" }` (`parentId` refers to the component containing the one whose method is executing).
        - `{ "type": "PROPERTY_REF", "targetId": "#id", "propertyName": "prop" }` (Direct reference).

        **Condition Representation (for `IF` condition):**
        
        - `{ "type": "EQUALS" | "NOT_EQUALS" | "GREATER_THAN" | ... , "left": Value, "right": Value }`
        - `{ "type": "TRUTHY" | "FALSY", "value": Value }`
        - `{ "type": "AND" | "OR", "conditions": [ Condition, Condition, ... ] }`
        - `{ "type": "NOT", "condition": Condition }`
        
        **Example IR: Todo List Add Button Click**
        ```json
        {
          "id": "add-button",
          "type": "button",
          "properties": { "content": "Add Task" },
          "methods": {
            "click": [
              { 
                "type": "GET_PROPERTY", 
                "targetId": "#new-todo-input", 
                "propertyName": "value", 
                "assignTo": "taskText" 
              },
              {
                "type": "IF",
                "condition": { "type": "TRUTHY", "value": { "type": "VARIABLE", "name": "taskText" } },
                "then": [
                  { "type": "GENERATE_ID", "assignTo": "newIdPrefix" },
                  { 
                    "type": "ADD_COMPONENT", 
                    "parentId": "#todo-list",
                    "config": {
                      "id": { "type": "EXPRESSION", "code": "'todo-' + newIdPrefix" }, // Placeholder for translator
              "type": "container",
                      "styles": { "display": "flex", "alignItems": "center", "padding": "5px 0", "borderBottom": "1px solid #eee" },
              "children": [
                {
                          "id": { "type": "EXPRESSION", "code": "'cb-' + newIdPrefix" },
                          "type": "checkbox", 
                          "styles": { "marginRight": "10px" } 
                        },
                        { 
                          "id": { "type": "EXPRESSION", "code": "'text-' + newIdPrefix" },
                  "type": "text",
                          "properties": { "content": { "type": "VARIABLE", "name": "taskText" } } 
                        },
                        { 
                          "id": { "type": "EXPRESSION", "code": "'delete-' + newIdPrefix" },
                          "type": "button", 
                          "properties": { "content": "Delete" },
                          "methods": {
                            "click": [ // Nested IR!
                              { 
                                "type": "REMOVE_COMPONENT", 
                                "targetId": { "type": "CONTEXT", "path": "parentId" } // Removes the whole list item container
                              }
                            ]
                          } 
                        }
                      ]
                    }
                  },
                  { 
                    "type": "SET_PROPERTY", 
                    "targetId": "#new-todo-input", 
                    "propertyName": "value", 
                    "value": { "type": "LITERAL", "value": "" } 
                  }
                ]
              }
            ]
          }
        }
        ```

        **Example IR: Simple Counter Button Click**
        ```json
        {
          "id": "counter-button",
          "type": "button",
          "properties": { "content": "Click me: 0", "count": 0 }, // Store state in properties
          "methods": {
            "click": [
              {
                "type": "GET_PROPERTY",
                "targetId": "#counter-button", // Reference self
                "propertyName": "count",
                "assignTo": "currentCount"
              },
              { 
                "type": "SET_VARIABLE", // Need to calculate new value
                "variableName": "newCount",
                // Simple expressions might need a specific action type later
                "value": { "type": "EXPRESSION", "code": "currentCount + 1" } 
              },
              {
                "type": "SET_PROPERTY",
                "targetId": "#counter-button",
                "propertyName": "count",
                "value": { "type": "VARIABLE", "name": "newCount" }
              },
              {
                "type": "SET_PROPERTY",
                "targetId": "#counter-button",
                "propertyName": "content", // Update button text
                "value": { "type": "EXPRESSION", "code": "'Click me: ' + newCount" } 
              }
            ]
          }
        }
        ```

        ## COMPONENT METHOD AND EVENT HANDLING

        - Define interactions within the `methods` property of components using the **Intermediate Representation (IR)** shown above.
        - Each event (e.g., `click`) maps to an array of IR action objects.
        - **DO NOT generate JavaScript code strings directly in the methods.**
        - Place logic on the component it most closely relates to.
        - Keep IR sequences focused on specific tasks.

        ## CRITICAL REQUIREMENTS FOR COMPONENTS
        
        ALL components must include these elements:
        
        1. **Properties with visible content:**
           - Text components must have: `"properties": {"content": "Some text"}`
           - Buttons must have: `"properties": {"content": "Button Text"}`
           - Inputs must have: `"properties": {"placeholder": "Enter text..."}`
           - Images must have: `"properties": {"src": "url", "alt": "description"}`
        
        2. **Interactive components must have methods:**
           - Buttons REQUIRE click handlers: `"methods": {"click": [...]}`
           - Inputs should have change/input handlers: `"methods": {"change": [...]}`
        
        3. **Todo app specific requirements:**
           - Task input field needs a placeholder property
           - Add button needs text content AND a click handler that:
             - Gets the input value
             - Creates a new task item
             - Adds it to the todo list
             - Clears the input field
           - Todo items should have delete functionality
        
        FAILURE TO INCLUDE PROPERTIES AND METHODS WILL RESULT IN A NON-FUNCTIONAL UI!
        
        ## RESPONSE FORMAT
        Your response should be a complete JSON object. Ensure the `methods` field for components follows the **IR structure** described above.
        ```json
        {
          "app": { ... },
          "layout": { ... },
          "components": [
            {
              "id": "unique-id",
              "type": "component-type",
              // ... other properties ...
              "methods": { 
                "click": [ /* Array of IR action objects */ ],
                "change": [ /* Array of IR action objects */ ] 
                // ... other events ...
              },
              "children": [ ... ]
            }
          ]
        }
        ```

        ## RESPONSE FORMAT
        You MUST call the `ApiAppConfig` function with the generated configuration data as arguments. The arguments MUST conform to the `ApiAppConfig` schema.
        ```json
        {
          "app": { ... }, // Conforms to ApiAppInfo
          "layout": { ... }, // Conforms to ApiLayout
          "components": [ // Conforms to list[ApiComponent]
            {
              "id": "unique-id",
              "type": "component-type",
              // ... other properties ...
              "methods": { 
                "click": [ /* Array of IR action objects */ ],
                "change": [ /* Array of IR action objects */ ] 
                // ... other events ...
              },
              "children": [ ... ]
            }
          ]
        }
        ```

        IMPORTANT: DO NOT RESPOND WITH RAW JSON. YOU MUST CALL THE `ApiAppConfig` FUNCTION USING THE GENERATED CONFIGURATION AS ARGUMENTS. NO EXPLANATIONS OR OTHER TEXT.
"""
        
        # Load camera instructions if needed
        camera_instructions = ""
        if is_camera_app:
            camera_template_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", "camera_media_instructions.md")
            if os.path.exists(camera_template_path):
                with open(camera_template_path, "r", encoding="utf-8") as f:
                    # Just load the important parts (we don't need the complete file)
                    camera_instructions_content = f.read()
                    # Extract the key sections
                    camera_instructions = "\n## CAMERA AND MEDIA PROCESSING REQUIREMENTS\n\n"
                    camera_instructions += "When implementing camera-based applications or applications requiring media input:\n\n"
                    camera_instructions += "1. **ALWAYS use the proper video component type**:\n"
                    camera_instructions += "   ```json\n"
                    camera_instructions += "   {\n"
                    camera_instructions += '     "id": "media-input",\n'
                    camera_instructions += '     "type": "video", \n'
                    camera_instructions += '     "properties": {\n'
                    camera_instructions += '       "useCamera": true,\n'
                    camera_instructions += '       "facingMode": "user",\n'
                    camera_instructions += '       "autoPlay": true,\n'
                    camera_instructions += '       "muted": true\n'
                    camera_instructions += '     }\n'
                    camera_instructions += "   }\n"
                    camera_instructions += "   ```\n\n"
                    camera_instructions += "2. **ALWAYS add canvas overlay for visualizations**:\n"
                    camera_instructions += "3. **NEVER use static images or placeholder divs** for camera views\n"
                    camera_instructions += "4. **ALWAYS implement proper camera access** using the MediaDevices API\n"
                    camera_instructions += "5. **ALWAYS provide status feedback** during camera initialization and processing\n"
                    camera_instructions += "6. **USE generic terminology** like \"Media Analysis\" or \"Object Detection\" instead of domain-specific terms\n"
                    camera_instructions += "7. **IMPLEMENT proper cleanup** when stopping camera access\n"
        
        # Prepare the component list as a JSON string
        components_json = json.dumps(ui_components, indent=2)
        
        # Replace placeholder values in the template
        prompt = base_template.replace("{{user_request}}", user_request)
        
        # Insert camera instructions if this is a camera-based application
        if is_camera_app and camera_instructions:
            # Find the CORE PRINCIPLES section and insert camera instructions after it
            core_principles_end = prompt.find("## YOUR TASK")
            if core_principles_end != -1:
                prompt = prompt[:core_principles_end] + camera_instructions + prompt[core_principles_end:]
        
        # Log the prompt to a file for debugging
        with open("prompt_log.txt", "a", encoding="utf-8") as log_file:
            log_file.write(f"--- Prompt at {datetime.datetime.now()} ---\n")
            log_file.write(prompt)
            log_file.write("\n--- End of Prompt ---\n\n")
        
        return prompt
    
    def _create_ai_fallback_app_config(self, error_message: str) -> Dict[str, Any]:
        """
        Create a fallback app configuration when AI generation fails.
        
        Args:
            error_message: The error message to display
            
        Returns:
            A simple fallback app configuration
        """
        return {
            "app": {
                "name": "Error Handling App",
                "description": "A fallback UI was created because the AI generation failed",
                "theme": "light"
            },
            "layout": {
                "type": "singlepage",
                "regions": ["header", "main", "footer"]
            },
            "components": [
                {
                    "id": "header-container",
                    "type": "container",
                    "region": "header",
                    "styles": {
                        "backgroundColor": "#f8d7da",
                        "color": "#721c24",
                        "padding": "15px",
                        "textAlign": "center",
                        "borderRadius": "5px",
                        "margin": "10px"
                    },
                    "children": [
                        {
                            "id": "header-title",
                            "type": "text",
                            "properties": {
                                "content": "Error Generating UI",
                                "variant": "h1"
                            },
                            "styles": {
                                "fontSize": "24px",
                                "fontWeight": "bold",
                                "marginBottom": "10px"
                            }
                        }
                    ]
                },
                {
                    "id": "error-container",
                    "type": "container",
                    "region": "main",
                    "styles": {
                        "backgroundColor": "#fff",
                        "border": "1px solid #f5c6cb",
                        "borderRadius": "5px",
                        "padding": "20px",
                        "margin": "20px",
                        "textAlign": "left"
                    },
                    "children": [
                        {
                            "id": "error-title",
                            "type": "text",
                            "properties": {
                                "content": "The AI encountered an error:",
                                "variant": "h2"
                            },
                            "styles": {
                                "fontSize": "18px",
                                "marginBottom": "10px",
                                "color": "#721c24"
                            }
                        },
                        {
                            "id": "error-message",
                            "type": "text",
                            "properties": {
                                "content": error_message,
                                "variant": "p"
                            },
                            "styles": {
                                "fontFamily": "monospace",
                                "padding": "15px",
                                "backgroundColor": "#f8f9fa",
                                "borderRadius": "4px",
                                "overflowX": "auto"
                            }
                        },
                        {
                            "id": "retry-button",
                            "type": "button",
                            "properties": {
                                "text": "Try Again"
                            },
                            "styles": {
                                "marginTop": "20px",
                                "padding": "10px 15px",
                                "backgroundColor": "#0d6efd",
                                "color": "white",
                                "border": "none",
                                "borderRadius": "4px",
                                "cursor": "pointer"
                            },
                            "methods": {
                                "onClick": {
                                    "code": "function(event, $m) { window.location.reload(); }"
                                }
                            }
                        }
                    ]
                },
                {
                    "id": "footer-container",
                    "type": "container",
                    "region": "footer",
                    "styles": {
                        "padding": "10px",
                        "textAlign": "center",
                        "borderTop": "1px solid #f5c6cb",
                        "marginTop": "20px",
                        "color": "#6c757d",
                        "fontSize": "12px"
                    },
                    "children": [
                        {
                            "id": "footer-text",
                            "type": "text",
                            "properties": {
                                "content": "Please try a different request or check the system logs.",
                                "variant": "p"
                            }
                        }
                    ]
                }
            ]
        }

    def _extract_json_from_text(self, text: str) -> str:
        """
        Extract JSON content from text that may contain markdown, explanations, etc.
        Also cleans common escaping issues before returning.
        
        Args:
            text: The text to extract JSON from
            
        Returns:
            The extracted JSON content as a string, or empty string if none found
        """
        json_content = ""
        
        # 1. Try extracting from markdown code blocks
        json_pattern_markdown = r'```(?:json)?\s*(\{[\s\S]*?\})\s*```'
        match_markdown = re.search(json_pattern_markdown, text, re.DOTALL)
        if match_markdown:
            json_content = match_markdown.group(1).strip()
            print("Extracted JSON from markdown block.")
        
        # 2. If no markdown match, check if the whole text looks like JSON
        elif text.strip().startswith('{') and text.strip().endswith('}'):
            json_content = text.strip()
            print("Assuming entire text is JSON.")
        
        # 3. Fallback: Find the largest JSON-like object within the text
        else:
            json_pattern_object = r'(\{[\s\S]*\})'
            matches_object = re.findall(json_pattern_object, text)
            if matches_object:
                json_content = max(matches_object, key=len).strip()
                print("Extracted largest JSON-like object from text.")
        
        if not json_content:
            print("ERROR: No JSON content could be extracted.")
            return ""
        
        # --- Apply Cleaning Steps --- 
        cleaned_content = json_content
        
        # Replace invalid \' with ' 
        cleaned_content = cleaned_content.replace("\\'", "'")
        
        # NEW: Aggressively replace invalid backslashes NOT part of standard JSON escapes
        # This aims to fix errors like "Invalid \escape"
        did_regex_work = False
        try:
            pattern = r'\\([^"\\/bfnrtu])' # Pattern to find \ followed by a non-escape char
            replacement = r'\\\\\1'  # Replace with \\ followed by the char
            
            # Use re.subn to get count and limit potential runaway replacements
            cleaned_content, num_replacements = re.subn(pattern, replacement, cleaned_content, count=10000) 
            if num_replacements > 0:
                print(f"Applied aggressive backslash cleaning via regex ({num_replacements} replacements).")
            did_regex_work = True
        except re.error as e:
            print(f"Warning: Regex error during aggressive backslash cleaning: {e}. Falling back to loop.")
            # Fallback to loop-based cleaning if regex fails
            new_content = []
            i = 0
            n = len(cleaned_content)
            escaped_count = 0
            while i < n:
                char = cleaned_content[i]
                if char == '\\' and i + 1 < n:
                    next_char = cleaned_content[i+1]
                    # Check if the next character is NOT a valid JSON escape character
                    if next_char not in '"\\/bfnrtu': 
                        # Invalid escape sequence: escape the backslash
                        new_content.append('\\') # Append the first (now escaped) backslash
                        new_content.append('\\') # Append the second backslash
                        new_content.append(next_char) # Append the character that followed
                        escaped_count += 1
                        i += 2 # Skip original \ and the next char
                    else:
                        # Valid escape sequence (e.g., \", \\, \n) or start of unicode (\u)
                        new_content.append(char) # Append original backslash
                        new_content.append(next_char) # Append the valid following character
                        i += 2 # Skip both
                else:
                    # Not a backslash or end of string
                    new_content.append(char)
                    i += 1
            cleaned_content = "".join(new_content)
            if escaped_count > 0:
                print(f"Applied aggressive backslash cleaning via loop fallback ({escaped_count} escapes fixed).")
        except Exception as e_other:
            # Catch other potential errors during regex processing
            print(f"Warning: Non-regex error during aggressive backslash cleaning: {e_other}")

        # Fix common unicode escape sequence issues (keep this)
        cleaned_content = self._fix_unicode_escapes(cleaned_content)
        
        print(f"Cleaned JSON content after all cleaning (first 100 chars): {cleaned_content[:100]}...")
        return cleaned_content

    def _fix_unicode_escapes(self, json_string: str) -> str:
        """
        Fix Unicode escape sequences in JSON strings that might cause parsing errors.
        
        Args:
            json_string: The JSON string to fix
            
        Returns:
            The fixed JSON string
        """
        # This regex finds Unicode escape patterns \uXXXX that aren't already properly escaped
        pattern = r'([^\\]|^)\\u([0-9a-fA-F]{4})'
        
        # Function to replace each match with a properly escaped version
        def replace_escape(match):
            prefix = match.group(1)  # The character before \u, or empty string if at the beginning
            code = match.group(2)    # The 4 hex digits after \u
            return f"{prefix}\\\\u{code}"  # Add proper escaping for JSON
        
        # Apply the fix
        try:
            # First attempt: try fixing double backslashes in Unicode sequences
            fixed_json = re.sub(pattern, replace_escape, json_string)
            
            # Test if the JSON is valid now
            json.loads(fixed_json)
            return fixed_json
        except json.JSONDecodeError:
            # If still failing, try a more aggressive approach:
            # Replace all Unicode escapes with the actual Unicode characters
            try:
                # This pattern matches all Unicode escape sequences
                unicode_pattern = r'\\u([0-9a-fA-F]{4})'
                
                # Replace each \uXXXX with the actual Unicode character
                def replace_with_unicode(match):
                    return chr(int(match.group(1), 16))
                
                fixed_json = re.sub(unicode_pattern, replace_with_unicode, json_string)
                return fixed_json
            except Exception:
                # If all else fails, return the original string
                return json_string

    def _normalize_methods_to_events(self, components: List[Dict[str, Any]]) -> None:
        """
        Normalize component methods and event handlers.
        
        Args:
            components: List of components to process
        """
        if not components:
            return
        
        for component in components:
            if not isinstance(component, dict):
                continue
            
            # Normalize methods object
            if "methods" in component and isinstance(component["methods"], dict):
                methods = component["methods"]
                
                # Ensure all methods have the correct structure
                for method_name, method_info in methods.items():
                    if isinstance(method_info, str):
                        # Convert string method to proper structure
                        methods[method_name] = {
                            "code": method_info,
                            "affectedComponents": [component.get("id", "")]
                        }
                    elif isinstance(method_info, dict) and "code" in method_info:
                        # Fix method code format to ensure it's properly wrapped
                        code = method_info["code"]
                        if code.startswith("function(") and not code.startswith("function(event, $m)"):
                            # Replace the function declaration with the correct parameter list
                            code = "function(event, $m)" + code[code.find("{"):]
                            method_info["code"] = code
                        # Ensure affected components exists
                        if "affectedComponents" not in method_info:
                            method_info["affectedComponents"] = [component.get("id", "")]
            
            # Process children recursively
            if "children" in component and isinstance(component["children"], list):
                self._normalize_methods_to_events(component["children"])
        
        # --- Add post-processing step to replace addChild --- 
        self._post_process_component_methods(components, components) # Pass full list here too
        # --- End post-processing step --- 

    def _post_process_component_methods(self, components: List[Dict[str, Any]], all_components: List[Dict[str, Any]], parent_id_map: Optional[Dict[str, str]] = None) -> None:
        """Recursively processes component methods, translating IR to JS."""
        if not components:
            return
            
        # Build parent map if not provided (for top level)
        if parent_id_map is None:
            parent_id_map = {}
            queue = [(comp, None) for comp in components]
            visited = set()
            while queue:
                 comp, p_id = queue.pop(0)
                 if not isinstance(comp, dict) or comp.get('id') in visited:
                     continue
                 comp_id = comp.get('id')
                 visited.add(comp_id)
                 parent_id_map[comp_id] = p_id
                 if isinstance(comp.get('children'), list):
                     for child in comp['children']:
                         if isinstance(child, dict) and child.get('id'):
                             queue.append((child, comp_id))
                             
        for component in components:
            if not isinstance(component, dict):
                continue
            
            component_id = component.get("id")
            parent_id = parent_id_map.get(component_id)

            if "methods" in component and isinstance(component["methods"], dict):
                processed_methods = {}
                for method_name, method_ir in component["methods"].items():
                    # Check if it looks like our IR (an array)
                    if isinstance(method_ir, list):
                        print(f"Translating IR for method: {component_id}.{method_name}")
                        try:
                            # Translate the IR array to a JS function body string
                            js_code_body = self._translate_ir_to_js(method_ir, component_id, parent_id)
                            # Wrap the body in a function signature
                            js_function_string = f"function(event) {{\n{js_code_body}\n}}"
                            processed_methods[method_name] = js_function_string
                        except Exception as e:
                            print(f"ERROR during IR translation for {component_id}.{method_name}: {e}")
                            # Keep original IR or replace with error comment?
                            processed_methods[method_name] = f"// Error translating IR: {e}"
                    else:
                         # If it's not a list, maybe it's old format or invalid - keep it for now?
                         print(f"Warning: Method {component_id}.{method_name} is not in expected IR list format. Keeping original.")
                         processed_methods[method_name] = method_ir 
                         
                # Replace original methods with processed ones
                component["methods"] = processed_methods

            # Process children recursively
            if "children" in component and isinstance(component["children"], list):
                 childComponents = [c for c in component["children"] if isinstance(c, dict)]
                 if childComponents:
                    self._post_process_component_methods(childComponents, all_components, parent_id_map) # Pass map down

    # --- NEW: IR Translation --- 
    def _translate_ir_to_js(self, ir_actions: List[Dict[str, Any]], component_id: str, parent_id: Optional[str] = None) -> str:
        """Translates an array of IR action objects into a JavaScript function body string."""
        js_lines = []
        declared_vars = set() # Keep track of variables declared with 'const'
        temp_var_count = 0

        def get_temp_var_name():
            nonlocal temp_var_count
            temp_var_count += 1
            return f"__ir_temp_{temp_var_count}"

        def translate_value(value_obj: Any) -> str:
            """Translates an IR value object into a JS expression string."""
            if not isinstance(value_obj, dict) or "type" not in value_obj:
                # Assume literal if not a valid value object for simplicity, quote strings
                return json.dumps(value_obj) 

            val_type = value_obj.get("type")
            if val_type == "LITERAL":
                return json.dumps(value_obj.get("value"))
            elif val_type == "VARIABLE":
                var_name = value_obj.get("name")
                if var_name in declared_vars:
                    return var_name
                else:
                    print(f"Warning: IR referenced undeclared variable '{var_name}'. Treating as null.")
                    return "null"
            elif val_type == "CONTEXT":
                path = value_obj.get("path")
                if path == "selfId":
                    return json.dumps(component_id)
                elif path == "parentId":
                    return json.dumps(parent_id) if parent_id else "null"
                elif path == "event":
                    return "event" # Pass the event object directly
                else:
                    print(f"Warning: Unknown IR context path '{path}'. Treating as null.")
                    return "null"
            elif val_type == "PROPERTY_REF":
                 # Directly translate to getComponentProperty for simplicity
                 target_id_val = json.dumps(value_obj.get("targetId", component_id))
                 prop_name_val = json.dumps(value_obj.get("propertyName"))
                 return f"getComponentProperty({target_id_val}, {prop_name_val})"
            elif val_type == "EXPRESSION":
                 # WARNING: Executing arbitrary code from AI is risky.
                 # For now, only allow very simple, safe expressions or specific cases.
                 # Example: ID generation (handle within GENERATE_ID action instead)
                 print(f"Warning: Direct IR EXPRESSION translation is limited/unsafe: {value_obj.get('code')}")
                 # return value_obj.get("code", "null") # Avoid for now
                 return "null" # Safer default
            else:
                print(f"Warning: Unknown IR value type '{val_type}'. Treating as null.")
                return "null"
        
        # Function to translate condition objects recursively
        def translate_condition(cond_obj: Dict[str, Any]) -> str:
            cond_type = cond_obj.get("type")
            if not cond_type:
                print("Warning: Condition object missing type. Returning false.")
                return "false"

            if cond_type in ["EQUALS", "NOT_EQUALS", "GREATER_THAN", "GREATER_THAN_EQUALS", "LESS_THAN", "LESS_THAN_EQUALS"]:
                left_js = translate_value(cond_obj.get("left"))
                right_js = translate_value(cond_obj.get("right"))
                op_map = {
                    "EQUALS": "===",
                    "NOT_EQUALS": "!==",
                    "GREATER_THAN": ">",
                    "GREATER_THAN_EQUALS": ">=",
                    "LESS_THAN": "<",
                    "LESS_THAN_EQUALS": "<="
                }
                op = op_map.get(cond_type, "===") # Default to equals
                return f"({left_js} {op} {right_js})"
            
            elif cond_type == "TRUTHY":
                value_js = translate_value(cond_obj.get("value"))
                return f"(!!{value_js})" # Explicit boolean conversion
            elif cond_type == "FALSY":
                value_js = translate_value(cond_obj.get("value"))
                return f"(!{value_js})"
            
            elif cond_type == "AND":
                conditions_js = [translate_condition(c) for c in cond_obj.get("conditions", [])]
                return f"({' && '.join(conditions_js) if conditions_js else 'true'})" # Default to true if empty
            elif cond_type == "OR":
                conditions_js = [translate_condition(c) for c in cond_obj.get("conditions", [])]
                return f"({' || '.join(conditions_js) if conditions_js else 'false'})" # Default to false if empty
            elif cond_type == "NOT":
                condition_js = translate_condition(cond_obj.get("condition", {}))
                return f"(!{condition_js})"
            
            else:
                print(f"Warning: Unknown condition type '{cond_type}'. Returning false.")
                return "false"
        
        # Helper function to translate a Python config dict to a JS object literal string
        # This needs to handle nested IR methods recursively
        def translate_config_to_js_object(config_dict: Dict[str, Any], current_comp_id: str, current_parent_id: Optional[str]) -> str:
            js_pairs = []
            if not isinstance(config_dict, dict):
                return json.dumps(config_dict) # Return primitive as JSON

            nested_methods = config_dict.get("methods")
            nested_children = config_dict.get("children")
            nested_component_id = config_dict.get("id") # Get ID for nested context

            for key, value in config_dict.items():
                key_js = json.dumps(key)
                value_js = "null" # Default
                
                if key == "methods" and isinstance(value, dict):
                    # Recursively translate nested methods
                    method_pairs = []
                    for method_name, method_ir in value.items():
                         # Nested methods need their own context - ID might be dynamic
                         # For now, pass the parent's context. Need better way if ID is generated.
                         nested_comp_id_for_method = translate_value(nested_component_id) if nested_component_id else "'unknown_nested_id'"
                         parent_id_for_method = json.dumps(current_comp_id) # The component being added TO is the parent here

                         if isinstance(method_ir, list):
                             # Translate the IR list to JS function body
                             js_body = self._translate_ir_to_js(method_ir, nested_comp_id_for_method, parent_id_for_method)
                             # Wrap in function signature
                             js_func = f"function(event) {{\n{js_body}\n}}"
                             method_pairs.append(f"{json.dumps(method_name)}: {js_func}")
                         else:
                             # Handle non-IR methods? Or log error?
                             print(f"Warning: Nested method '{method_name}' in ADD_COMPONENT config is not IR list. Skipping.")
                             method_pairs.append(f"{json.dumps(method_name)}: null") 
                             
                    value_js = f"{{{', '.join(method_pairs)}}}"
                    
                elif key == "children" and isinstance(value, list):
                     # Recursively translate children configs
                     children_js = []
                     for child_config in value:
                         children_js.append(translate_config_to_js_object(child_config, nested_component_id or current_comp_id, nested_component_id or current_comp_id)) 
                     value_js = f"[{', '.join(children_js)}]"
                     
                elif key == "id" and isinstance(value, dict) and value.get("type") == "EXPRESSION":
                     # Handle simple ID expressions carefully
                     # Ideally, use GENERATE_ID action before ADD_COMPONENT
                     id_code = value.get("code", "'error-generating-id'")
                     # Basic check for safety - only allow specific patterns if needed
                     if "Date.now()" in id_code or "Math.random()" in id_code: # Allow simple dynamic IDs
                         value_js = id_code
                     else:
                         print(f"Warning: Potentially unsafe EXPRESSION in nested ID: {id_code}. Using literal.")
                         value_js = json.dumps(id_code) # Treat as string literal if unsure
                         
                else:
                    # Handle other properties using translate_value (handles LITERAL, VARIABLE etc.)
                    value_js = translate_value(value)
                    
                js_pairs.append(f"{key_js}: {value_js}")
                
            return f"{{{', '.join(js_pairs)}}}"

        # --- Main Action Loop --- 
        for action in ir_actions:
            action_type = action.get("type")
            line = "" # Reset line for each action
            assign_to_var = action.get("assignTo")
            
            # Determine variable assignment prefix (const or just assignment)
            var_assignment = ""
            if assign_to_var:
                 if assign_to_var not in declared_vars:
                      var_assignment = f"const {assign_to_var} = "
                      declared_vars.add(assign_to_var)
                 else:
                      # Variable already declared, just assign
                      var_assignment = f"{assign_to_var} = "
                      
            try:
                # --- Handle IF action --- 
                if action_type == "IF":
                    condition_obj = action.get("condition")
                    then_actions = action.get("then")
                    else_actions = action.get("else") # Optional

                    if not condition_obj or not isinstance(then_actions, list):
                         print("Warning: Skipping invalid IF action (missing condition or then block).")
                         js_lines.append("// Skipped invalid IF action")
                         continue # Skip this action
                         
                    condition_js = translate_condition(condition_obj)
                    
                    # Recursively translate the 'then' block
                    # Pass current declared_vars to maintain scope, but changes won't propagate back up easily yet
                    # Need a more robust scope handling mechanism for nested blocks later
                    then_js_body = self._translate_ir_to_js(then_actions, component_id, parent_id) # Simplified call for now
                    then_block = "\n".join([f"  {l}" for l in then_js_body.splitlines()]) # Indent
                    
                    if_statement = f"if ({condition_js}) {{\n{then_block}\n}}"
                    
                    # Handle optional 'else' block
                    if isinstance(else_actions, list):
                         else_js_body = self._translate_ir_to_js(else_actions, component_id, parent_id) # Simplified call
                         else_block = "\n".join([f"  {l}" for l in else_js_body.splitlines()]) # Indent
                         if_statement += f" else {{\n{else_block}\n}}"
                         
                    # Add the whole multi-line statement
                    js_lines.append(if_statement)
                    assign_to_var = None # IF doesn't assign directly
                    line = None # We added directly to js_lines
                    
                elif action_type == "GET_PROPERTY":
                    target_id_js = json.dumps(action.get("targetId"))
                    prop_name_js = json.dumps(action.get("propertyName"))
                    line = f"getComponentProperty({target_id_js}, {prop_name_js})"
                
                elif action_type == "SET_PROPERTY":
                    target_id_js = json.dumps(action.get("targetId"))
                    prop_name_js = json.dumps(action.get("propertyName"))
                    value_js = translate_value(action.get("value"))
                    line = f"setComponentProperty({target_id_js}, {prop_name_js}, {value_js})"
                
                elif action_type == "LOG":
                    message_js = translate_value(action.get("message"))
                    line = f"console.log({message_js})"

                elif action_type == "GET_EVENT_DATA":
                    path = action.get("path", "")
                    # Basic safety check for path
                    if re.match(r'^[a-zA-Z0-9_\.\[\]]+\Z', path):
                         line = f"event.{path}" 
                    else:
                         print(f"Warning: Invalid characters in GET_EVENT_DATA path: {path}. Returning null.")
                         line = "null"
                         
                elif action_type == "SET_VARIABLE":
                     var_name = action.get("variableName")
                     value_js = translate_value(action.get("value"))
                     if var_name:
                         if var_name not in declared_vars:
                             js_lines.append(f"let {var_name};") # Declare with let if not declared
                             declared_vars.add(var_name)
                         line = f"{var_name} = {value_js}" # Assignment only, no semicolon needed here
                         assign_to_var = None # Handled variable assignment directly
                     else:
                         print("Warning: SET_VARIABLE missing variableName.")
                         line = "null" 
                         
                elif action_type == "GENERATE_ID":
                     line = f"\'morpheo-id-\' + Date.now() + \'-\' + Math.random().toString(36).substring(2, 7)" 
                     
                # --- Placeholder Actions --- 
                    
                elif action_type == "ADD_COMPONENT":
                    parent_id_js = json.dumps(action.get("parentId"))
                    config_dict = action.get("config")
                    
                    if not parent_id_js or not isinstance(config_dict, dict):
                        print("Warning: Skipping invalid ADD_COMPONENT action (missing parentId or config).")
                        js_lines.append("// Skipped invalid ADD_COMPONENT action")
                        continue
                        
                    # Translate the config object (recursively handles nested methods/children)
                    config_js_string = translate_config_to_js_object(config_dict, component_id, parent_id)
                    
                    line = f"addComponent({parent_id_js}, {config_js_string})"
                    
                    assign_id_to = action.get("assignIdTo")
                    if assign_id_to:
                        # NOTE: addComponent on the frontend doesn't return the ID.
                        # The AI should ideally use GENERATE_ID action first and assign the result
                        # to a variable, then use that variable in the config's 'id' field.
                        # We won't try to assign result here.
                        print(f"Warning: 'assignIdTo' used with ADD_COMPONENT. Frontend function does not return ID. Use GENERATE_ID action first.")
                    assign_to_var = None # ADD_COMPONENT itself doesn't return a value to assign

                elif action_type == "REMOVE_COMPONENT":
                    target_id_js = translate_value(action.get("targetId")) # targetId can be a value object
                    line = f"removeComponent({target_id_js})"
                    assign_to_var = None # removeComponent doesn't assign
                    
                elif action_type == "CALL_METHOD":
                    target_id_js = json.dumps(action.get("targetId"))
                    method_name_js = json.dumps(action.get("methodName"))
                    args_list = action.get("args", [])
                    
                    # Translate each argument in the args list
                    translated_args = []
                    if isinstance(args_list, list):
                        for arg_value in args_list:
                            translated_args.append(translate_value(arg_value))
                    else:
                        print(f"Warning: 'args' for CALL_METHOD is not a list: {args_list}. Using empty args.")
                        
                    # Join translated args with commas
                    args_js_string = ", ".join(translated_args)
                    
                    # Construct the call
                    line = f"callComponentMethod({target_id_js}, {method_name_js}{(', ' + args_js_string) if args_js_string else ''})"
                    
                    # Handle assignment if the called method is intended to return a value
                    # Note: The current frontend setup for callComponentMethod might not directly 
                    # support synchronous returns easily. This assumes the function call itself 
                    # is what's needed, potentially triggering async updates elsewhere.
                    # If synchronous returns are needed, the frontend implementation and maybe 
                    # the IR spec would need changes (e.g., using async/await and Promises).
                    if not assign_to_var:
                        pass # No assignment needed
                    else:
                        # If assignment is requested, proceed, but acknowledge limitations.
                        method_name_for_log = action.get("methodName", "unknown")
                        print(f"Warning: Assigning result from CALL_METHOD ('{method_name_for_log}'). Ensure frontend supports return values if needed.")
                    
                elif action_type == "UPDATE_COMPONENT":
                     target_id_js = json.dumps(action.get("targetId"))
                     updates_dict = action.get("updates", {})
                     js_update_pairs = []
                     
                     # Translate properties if they exist
                     properties_dict = updates_dict.get("properties")
                     if isinstance(properties_dict, dict):
                         prop_pairs = []
                         for key, value_obj in properties_dict.items():
                             prop_pairs.append(f"{json.dumps(key)}: {translate_value(value_obj)}")
                         if prop_pairs:
                             js_update_pairs.append(f"properties: {{ {', '.join(prop_pairs)} }}")
                     
                     # Translate styles if they exist
                     styles_dict = updates_dict.get("styles")
                     if isinstance(styles_dict, dict):
                         style_pairs = []
                         for key, value_obj in styles_dict.items():
                             style_pairs.append(f"{json.dumps(key)}: {translate_value(value_obj)}")
                         if style_pairs:
                              js_update_pairs.append(f"styles: {{ {', '.join(style_pairs)} }}")
                              
                     # Construct the updates object string
                     updates_js_string = f"{{ {', '.join(js_update_pairs)} }}"
                     
                     line = f"updateComponent({target_id_js}, {updates_js_string})"
                     assign_to_var = None # updateComponent doesn't assign
                     
                else:
                    print(f"Warning: Unknown IR action type: {action_type}")
                    line = f"// Unknown IR action: {action_type}"
                    assign_to_var = None

                # Append the generated line with assignment if needed
                if line is not None:
                     if assign_to_var:
                         js_lines.append(f"{var_assignment}{line};")
                     elif line: # Only append if line is not empty
                         js_lines.append(f"{line};")
                    
            except Exception as e:
                 print(f"ERROR translating IR action: {action}. Error: {e}")
                 traceback.print_exc() # Print full traceback for debugging
                 js_lines.append(f"// Error translating action: {action_type}: {e}")
        
        return "\n".join(js_lines)
        
    def generate_search_response(self, query: str) -> str:
        """
        Generate a response using Gemini with Google search capability.
        NOTE: Uses standard text generation, not structured output.
        
        Args:
            query: The search query
            
        Returns:
            Response text from Gemini with search results incorporated
        """
        if not self.client: # Check if module is configured
            return "Error: Gemini API is not configured."
            
        try:
            print(f"Generating search response for query: {query}")
            
            # Configure tools for search
            search_tool = None
            try:
                 # Assuming client.protos is correct - needs verification if errors persist
                 google_search_retrieval = self.client.protos.GoogleSearchRetrieval()
                 search_tool = [self.client.protos.Tool(google_search_retrieval=google_search_retrieval)]
                 print("Google Search tool configured.")
            except AttributeError as e:
                 logger.warning(f"Could not construct GoogleSearchRetrieval tool (AttributeError: {e}). Search disabled.")
            except Exception as e:
                 logger.warning(f"Error constructing GoogleSearchRetrieval tool: {e}. Search disabled.")

            # Generate content directly - remove tool_config parameter for now
            response = self.client.models.generate_content(
                model="gemini-2.0-flash", 
                contents=query
            )
            return response.text
            
        except Exception as e:
            error_message = f"Error generating search response: {str(e)}"
            print(error_message)
            traceback.print_exc()
            return error_message

    def _get_ui_components_list(self) -> List[Dict[str, Any]]:
        """
        Get the list of UI components from the registry.
        
        Returns:
            A list of component definitions
        """
        components_list = []
        
        try:
            # Ensure component_registry is properly initialized
            if self.component_registry is None:
                from .registry import component_registry as default_registry
                self.component_registry = default_registry
                if self.component_registry is None:
                    print("Warning: Could not initialize component registry. Using empty components list.")
                    return self._get_fallback_components()

            # Get all registered components from the component registry
            # The ComponentRegistry class has a get_all_components method
            if hasattr(self.component_registry, 'get_all_components'):
                registry_components = self.component_registry.get_all_components()
            elif hasattr(self.component_registry, 'components'):
                registry_components = self.component_registry.components
            else:
                print("Warning: Could not access components from registry. Using fallback components list.")
                return self._get_fallback_components()
            
            # Process the components
            for component_name, component_info in registry_components.items():
                if not component_info:
                    continue
                    
                # Extract the basic component information
                # Handle variability in property naming
                properties = component_info.get("properties", component_info.get("defaultProps", {}))
                
                component_def = {
                    "type": component_name,
                    "description": component_info.get("description", ""),
                    "properties": properties,
                    "category": component_info.get("category", "basic")
                }
                
                components_list.append(component_def)
            
            # If no components were found, use fallback
            if not components_list:
                print("Warning: No components found in registry. Using fallback components list.")
                return self._get_fallback_components()
        
        except Exception as e:
            print(f"Error getting component list: {str(e)}")
            # Return fallback components on error
            return self._get_fallback_components()
            
        return components_list
        
    def _get_fallback_components(self) -> List[Dict[str, Any]]:
        """
        Create a fallback list of basic components when the registry is unavailable.
        
        Returns:
            A list of basic component definitions
        """
        return [
            {
                "type": "text",
                "description": "Displays text content in various styles and formats.",
                "properties": {
                    "content": {"type": "string", "description": "The text content to display"},
                    "variant": {"type": "string", "description": "The HTML element variant to use"}
                },
                "category": "basic"
            },
            {
                "type": "container",
                "description": "A flexible container that can hold other components.",
                "properties": {},
                "category": "basic"
            },
            {
                "type": "button",
                "description": "An interactive button that triggers actions.",
                "properties": {
                    "text": {"type": "string", "description": "The button text"},
                    "variant": {"type": "string", "description": "Button style variant"}
                },
                "category": "basic"
            },
            {
                "type": "input",
                "description": "A text input field for user data entry.",
                "properties": {
                    "placeholder": {"type": "string", "description": "Placeholder text"},
                    "label": {"type": "string", "description": "Label for the input"},
                    "value": {"type": "string", "description": "Current input value"},
                    "type": {"type": "string", "description": "Input type"}
                },
                "category": "basic"
            }
        ]
        
    def _process_app_config(self, app_config: Dict[str, Any], user_request: str) -> Dict[str, Any]:
        """
        Process the app configuration after it's been generated by the AI.
        
        Args:
            app_config: The app configuration to process
            user_request: The original user request
            
        Returns:
            Processed app configuration
        """
        # Ensure app section exists
        if "app" not in app_config:
            app_config["app"] = {
                "name": "Generated Application",
                "description": user_request,
                "theme": "light"
            }
        
        # Add user request as the description if not present
        if "description" not in app_config["app"]:
            app_config["app"]["description"] = user_request
            
        # Ensure layout section exists
        if "layout" not in app_config:
            app_config["layout"] = {
                "type": "singlepage",
                "regions": ["main"]
            }
            
        # Ensure the components list exists
        if "components" not in app_config:
            app_config["components"] = []
            
        # Clean up any formatting issues in components
        self._sanitize_components(app_config.get("components", []))
            
        return app_config
        
    def _process_app_config_imports(self, app_config: Dict[str, Any]) -> None:
        """
        Process any imports or external dependencies in the app configuration.
        
        Args:
            app_config: The app configuration to process
        """
        # Check if app_config has imports section
        if "imports" not in app_config:
            return
            
        # Process the imports (libraries, external resources, etc.)
        # This is a placeholder - implement based on your actual import requirements
        # For example, you might need to add script tags, stylesheets, etc.
        pass
        
    def _normalize_component_ids(self, app_config: Dict[str, Any]) -> None:
        """
        Ensure all components have unique IDs.
        
        Args:
            app_config: The app configuration to process
        """
        # Get the components list
        components = app_config.get("components", [])
        
        # Track used IDs to avoid duplicates
        used_ids = set()
        
        # Recursively assign unique IDs to all components
        def ensure_unique_ids(components_list):
            for component in components_list:
                if not isinstance(component, dict):
                    continue
                    
                # If component has no ID or ID is already used, generate a new one
                if "id" not in component or not component["id"] or component["id"] in used_ids:
                    # Generate a unique ID based on component type
                    component_type = component.get("type", "component")
                    new_id = f"{component_type}-{str(uuid4())[:8]}"
                    component["id"] = new_id
                    
                # Add ID to used IDs set
                used_ids.add(component["id"])
                
                # Process children recursively
                if "children" in component and isinstance(component["children"], list):
                    ensure_unique_ids(component["children"])
                    
        # Start the recursive ID normalization
        ensure_unique_ids(components)
        
    def _normalize_component_properties(self, components: List[Dict[str, Any]]) -> None:
        """
        Normalize component properties to ensure compatibility.
        
        Args:
            components: List of components to process
        """
        if not components:
            return
            
        for component in components:
            if not isinstance(component, dict):
                continue
                
            # Ensure component has basic required properties
            if "type" not in component:
                component["type"] = "container"
                
            if "properties" not in component and "props" in component:
                # Rename props to properties for consistency
                component["properties"] = component.pop("props")
                
            if "properties" not in component:
                component["properties"] = {}
                
            if "styles" not in component:
                component["styles"] = {}
                
            # Convert any string values that should be objects to actual objects
            for prop_name, prop_value in component.get("properties", {}).items():
                if prop_name in ["style", "options"] and isinstance(prop_value, str):
                    try:
                        # Try to parse JSON string as object
                        component["properties"][prop_name] = json.loads(prop_value)
                    except json.JSONDecodeError:
                        # If parsing fails, keep as string
                        pass
                        
            # Process children recursively
            if "children" in component and isinstance(component["children"], list):
                self._normalize_component_properties(component["children"])
                
    def _sanitize_components(self, components: List[Dict[str, Any]]) -> None:
        """
        Clean up component definitions to ensure they're valid.
        
        Args:
            components: List of components to sanitize
        """
        if not components:
            return
            
        for i in range(len(components)):
            # Skip if not a dict
            if not isinstance(components[i], dict):
                continue
                
            component = components[i]
            
            # Fix component type if it's invalid
            if "type" not in component or not component["type"]:
                component["type"] = "container"
                
            # Ensure component has an ID
            if "id" not in component or not component["id"]:
                component["id"] = f"{component.get('type', 'component')}-{str(uuid4())[:8]}"
                
            # Process children recursively
            if "children" in component and isinstance(component["children"], list):
                self._sanitize_components(component["children"])
            elif "children" in component and not isinstance(component["children"], list):
                # Fix invalid children field
                component["children"] = []

    def _is_camera_based_request(self, user_request: str) -> bool:
        """
        Determine if the user request is related to camera-based functionality.
        
        Args:
            user_request: The user's request description
            
        Returns:
            True if the request appears to involve camera functionality, False otherwise
        """
        # Convert request to lowercase for case-insensitive matching
        request_lower = user_request.lower()
        
        # Check if any camera-related keywords are present in the request
        for keyword in self.CAMERA_RELATED_KEYWORDS:
            if keyword in request_lower:
                return True
                
        # Check for media capture implications
        media_patterns = [
            r"take\s+(?:a\s+)?(?:photo|picture|selfie)",
            r"capture\s+(?:an\s+)?image",
            r"record\s+(?:a\s+)?video",
            r"detect\s+(?:objects|people|faces)",
            r"scan\s+(?:objects|documents|codes|qr)",
            r"recognize\s+(?:objects|people|faces|text)"
        ]
        
        for pattern in media_patterns:
            if re.search(pattern, request_lower):
                return True
                
        return False

    def _fix_camera_component_issues(self, app_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process and fix any issues related to camera-based applications.
        
        Args:
            app_config: The app configuration to process
            
        Returns:
            Processed app configuration
        """
        # Extract components
        components = app_config.get("components", [])
        
        # Function to find camera view containers and fix them
        def process_components(components_list):
            for component in components_list:
                # Process nested children recursively
                children = component.get("children", [])
                if children:
                    process_components(children)
                
                # Check if this component needs to be fixed
                component_id = component.get("id", "")
                component_type = component.get("type", "")
                
                # Look for static camera containers that should be video elements
                if component_type == "container" and any(keyword in component_id.lower() for keyword in ["camera", "video", "webcam"]):
                    # Check if this container has a static background or image 
                    styles = component.get("styles", {})
                    has_background_image = "backgroundImage" in styles or "background-image" in styles
                    
                    if has_background_image or not any(child.get("type") == "video" for child in children):
                        # Convert to a proper video component if no video child exists
                        if not children:
                            # Replace the container with a video element
                            component["type"] = "video"
                            component["properties"] = component.get("properties", {})
                            component["properties"]["useCamera"] = True
                            component["properties"]["facingMode"] = "user"
                            component["properties"]["autoPlay"] = True
                            component["properties"]["muted"] = True
                            component["properties"]["width"] = "100%"
                            component["properties"]["height"] = "100%"
                            
                            # Create a canvas overlay as a sibling
                            parent = component.get("_parent", None)
                            if parent and isinstance(parent, dict) and "children" in parent:
                                canvas_overlay = {
                                    "id": f"{component_id}-overlay",
                                    "type": "canvas",
                                    "properties": {
                                        "overlayFor": component_id,
                                        "transparent": True
                                    },
                                    "styles": {
                                        "position": "absolute",
                                        "top": "0",
                                        "left": "0",
                                        "width": "100%",
                                        "height": "100%",
                                        "pointerEvents": "none"
                                    }
                                }
                                parent["children"].append(canvas_overlay)
                        
                # Domain-specific language fixing
                if "face" in component_id.lower() or "recognition" in component_id.lower():
                    # Rename to use generic terminology
                    if "face-detection" in component_id.lower():
                        component["id"] = component_id.replace("face-detection", "object-detection")
                    elif "face" in component_id.lower():
                        component["id"] = component_id.replace("face", "object")
                    
                    # Fix button text or component properties with domain-specific terms
                    if component_type == "button" and "properties" in component:
                        props = component["properties"]
                        if "text" in props and "face" in props["text"].lower():
                            props["text"] = props["text"].replace("Face", "Object").replace("face", "object")
                    
                    # Fix method contents
                    if "methods" in component:
                        methods = component["methods"]
                        for method_name, method_code in methods.items():
                            if isinstance(method_code, str) and "face" in method_code.lower():
                                # Replace domain-specific language in method code
                                methods[method_name] = method_code.replace("Face", "Object").replace("face", "object")
        
        # Add parent references to make it easier to add siblings
        def add_parent_refs(components_list, parent=None):
            for component in components_list:
                component["_parent"] = parent
                if "children" in component and component["children"]:
                    add_parent_refs(component["children"], component)
        
        # Remove parent references to avoid serialization issues
        def remove_parent_refs(components_list):
            for component in components_list:
                if "_parent" in component:
                    del component["_parent"]
                if "children" in component and component["children"]:
                    remove_parent_refs(component["children"])
        
        # Fix app name and description
        if "app" in app_config:
            app_info = app_config["app"]
            if "name" in app_info and "face" in app_info["name"].lower():
                app_info["name"] = app_info["name"].replace("Face Recognition", "Media Analysis").replace("face recognition", "media analysis")
            
            if "description" in app_info and "face" in app_info["description"].lower():
                app_info["description"] = app_info["description"].replace("face recognition", "media analysis").replace("Face Recognition", "Media Analysis")
        
        # Add parent references, process components, then remove parent references
        add_parent_refs(components)
        process_components(components)
        remove_parent_refs(components)
        
        return app_config

# Create a singleton instance of the component service
component_service = ComponentService()