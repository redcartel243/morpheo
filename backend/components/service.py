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
                # Check for API key *after* successful initialization attempt
                if not os.getenv("GOOGLE_API_KEY"):
                     logger.warning("GOOGLE_API_KEY environment variable not set. Client might not be functional.")
                     print("Warning: GOOGLE_API_KEY environment variable not set.")
                     # Keep client instance for now, let calls fail later if needed
            except Exception as e: # Catch specific initialization errors
                logger.error(f"Failed to initialize google.genai Client: {e}")
                print(f"Error: Failed to initialize google.genai Client: {e}. Check API Key and env vars.")
                self.client = None # Ensure client is None on init error
        else: # This else corresponds to `if genai:`
            print("google.genai library not found or failed to import. Gemini features disabled.")
            # Ensure client is None if genai module itself is missing
            self.client = None
    
    def generate_app_config(self, user_request: str) -> Optional[str]:
        """
        Generate a complete application configuration (now as React code) based on the user's request.
        
        Args:
            user_request: A description of the application the user wants to create
            
        Returns:
            A string containing the generated React component code, or None if generation fails.
        """
        component_code: Optional[str] = None
        error_message: Optional[str] = None
        prompt: str = ""
        response_text: str = ""

        try:
            # Step 1: Create the prompt
            prompt = self._create_enhanced_prompt(user_request, [], False)
            if not prompt:
                logger.error("Prompt creation failed (template likely missing). Cannot generate UI.")
                self.error_count += 1
                # No need to proceed further, return None from the function
                # The finally block will still execute for logging if needed
                return None 

            # Step 2: Call the API
            response_text = self._call_gemini_api(prompt)
            if not response_text or not response_text.strip():
                logger.warning("Empty response received from Gemini API.")
                self.error_count += 1
                # No need to proceed further
                return None 

            # Step 3: Attempt to extract React code
            match = re.search(r"```(?:typescript|javascript|jsx|tsx)?\n(.*?)```", response_text, re.DOTALL | re.IGNORECASE)
            if match:
                component_code = match.group(1).strip()
                logger.info(f"Successfully extracted component code ({len(component_code)} chars).")
            else:
                logger.warning("Code block ```...``` not found. Assuming entire response is code.")
                potential_code = response_text.strip()
                # Basic check if it looks like React code
                if ("import React" in potential_code or "=> {" in potential_code or "export const" in potential_code):
                    component_code = potential_code
                    logger.info(f"Using fallback response as component code ({len(component_code)} chars).")
                else:
                    logger.warning("Fallback content doesn't strongly resemble React code.")
                    error_message = "AI did not return a recognizable React code block."
                    # component_code remains None
            
            # Step 4: Check extraction result and handle errors
            if component_code:
                self.error_count = 0 # Reset error count on success
                # Return the successfully extracted code
                return component_code
            else:
                # If component_code is still None, it means extraction failed
                if not error_message:
                     error_message = "Code extraction failed for unknown reasons."
                logger.error(f"Failed to extract valid component code. Error: {error_message}")
                self.error_count += 1
                return None # Indicate failure

        except Exception as e:
            # Catch any exception during prompt creation, API call, or extraction
            logger.error(f"Exception during AI interaction or code processing: {e}")
            traceback.print_exc()
            self.error_count += 1
            error_message = f"Exception: {e}" # Store error for finally block logging
            return None # Indicate failure
        
        finally:
            # This block executes regardless of whether an exception occurred or return was called in try/except
            log_content = {
                "timestamp": datetime.datetime.now().isoformat(),
                "user_request": user_request,
                "prompt_sent_preview": (prompt[:200] + '...') if prompt else "(Prompt creation failed)",
                "raw_response_preview": (response_text[:200] + '...') if response_text else "(No response)",
                "extracted_code_preview": (component_code[:200] + '...') if component_code else "(None)",
                "final_status": "Success" if component_code else "Failure",
                "error_message": error_message if error_message else None
            }
            try:
                # Append structured log entry
                with open("morpheo_generation_log.jsonl", "a", encoding="utf-8") as log_file:
                    log_file.write(json.dumps(log_content) + "\n")
                
                # Also write detailed debug log if needed (can be large)
                with open("openai_response_debug.txt", "w", encoding="utf-8") as debug_file:
                    debug_file.write("--- Prompt Sent ---\n")
                    debug_file.write(prompt + "\n")
                    debug_file.write("\n--- Raw Response ---\n")
                    debug_file.write(response_text + "\n")
                    debug_file.write("\n--- Extracted Component Code ---\n")
                    debug_file.write(component_code if component_code else "(None)")
                    if error_message:
                        debug_file.write(f"\n\n--- ERROR ---\n{error_message}")
            except Exception as log_e:
                logger.error(f"Error writing to logs in finally block: {log_e}")
                
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
    
    def _call_gemini_api(self, prompt_text: str) -> str:
        """Call the Gemini API with the given prompt text."""
        print("Calling Gemini API with prompt length:", len(prompt_text))
        
        # Save prompt to file for debugging
        with open("gemini_request_log.txt", "a") as f:
            f.write(f"\nRequest Time: {datetime.datetime.now()}\n")
            f.write(f"Function Call Args (as JSON):\n{prompt_text}\n")
            f.write("--- End of Prompt ---\n\n")
        
        response_text = ""
        
        try:
            # Make the API call with minimal parameters
            print("Calling generate_content with model gemini-2.0-flash")
            response = self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt_text
            )
            
            try:
                # Primary way to get text
                response_text = response.text
            except ValueError: # Handle cases where .text might raise ValueError
                print("Could not get text directly, checking candidates...")
                response_text = ""
                # Try alternative ways to get the response text
                if hasattr(response, 'candidates') and len(response.candidates) > 0:
                    if hasattr(response.candidates[0], 'content') and hasattr(response.candidates[0].content, 'parts') and len(response.candidates[0].content.parts) > 0:
                        response_text = response.candidates[0].content.parts[0].text
                    else: # Correct indentation for this else
                        print("Cannot find text in candidates structure")
                        response_text = "" # Assign empty string instead of returning
                else: # Correct indentation for this else
                    print("Response has no candidates")
                    response_text = "" # Assign empty string
            
            # Log the response only if we got something
            if response_text:
                 with open("gemini_request_log.txt", "a") as f:
                     f.write(f"Response:\n{response_text}\n")
                     f.write("--- End of Response ---\n\n")
            
            return response_text # Return the response text (or empty string if failed)
        
        except Exception as api_e: # Catch exceptions from the generate_content call
            print(f"Initial API call error: {str(api_e)}")
            traceback.print_exc()
            response_text = "" # Ensure response_text is empty for fallback
                
        # --- Fallback Logic --- 
        # Only attempt fallback if the initial call failed (response_text is empty)
        if not response_text:
            try:
                print("Trying fallback model gemini-1.5-flash")
                response = self.client.models.generate_content(
                    model="gemini-1.5-flash",
                    contents=prompt_text
                )
                
                # Try to get text from the fallback model
                try:
                    response_text = response.text
                except AttributeError:
                    if hasattr(response, 'candidates') and len(response.candidates) > 0:
                        if hasattr(response.candidates[0], 'content') and hasattr(response.candidates[0].content, 'parts') and len(response.candidates[0].content.parts) > 0:
                            response_text = response.candidates[0].content.parts[0].text
                        else:
                             response_text = "" # Fallback failed to find text
                    else:
                        response_text = "" # Fallback failed to find candidates
                
                # Log the fallback response if successful
                if response_text:
                    with open("gemini_request_log.txt", "a") as f:
                        f.write(f"Fallback Response:\n{response_text}\n")
                        f.write("--- End of Fallback Response ---\n\n")
                
                return response_text # Return fallback result (or empty string)
                
            except Exception as fallback_e:
                print(f"Fallback API call also failed: {str(fallback_e)}")
                traceback.print_exc()
                return "" # Return empty string if fallback also fails
        else:
            # If initial call succeeded, return its result (already in response_text)
            return response_text
    
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
        Creates the prompt for the AI, now using the new template for direct code generation.
        Removes logic related to injecting component lists or old JSON structures.
        
        Args:
            user_request: The user's request text.
            ui_components: (No longer used in this simplified version)
            is_camera_app: (No longer used in this simplified version)
            
        Returns:
            The final prompt string to send to the AI.
        """
        # Load the new prompt template
        prompt_template = ""
        template_path = ""
        try:
            # Construct the path relative to the current file's directory
            current_dir = os.path.dirname(os.path.abspath(__file__))
            # Go up one level from components/ to the backend/ directory
            template_path = os.path.join(current_dir, '..', 'gemini_prompt_template.md')
            with open(template_path, "r", encoding="utf-8") as f:
                prompt_template = f.read()
        except FileNotFoundError:
            logger.error(f"ERROR: Prompt template not found at {template_path}")
            # Fallback to a very basic instruction if template is missing
            prompt_template = ("You are a helpful AI. Generate a React functional component using Chakra UI v3 "
                             "based on the user request below.\n\nOutput Requirements:\n"
                             "- Valid React functional component code as a string, enclosed in ```typescript ... ```.\n"
                             "- Include all necessary imports from react and @chakra-ui/react.\n"
                             "- Use Chakra UI v3 components and style props.\n"
                             "- Use standard React hooks for state and event handlers.")

        # Construct the final prompt by adding the user request
        # This assumes the template is structured to guide the AI and we just need to append the specific request.
        final_prompt = prompt_template + f"\n\n## User Request:\n\n```text\n{user_request}\n```"

        # --- OLD Logic Removed ---
        # (Removed logic that formatted component lists, schemas, etc.)
        # --- End OLD Logic ---

        logger.info("Created enhanced prompt for direct React code generation.")
        return final_prompt

    # NEW: Method to create prompt for modifying existing code
    def _create_modification_prompt(self, modification_prompt: str, current_code: str) -> str:
        """
        Creates the prompt for the AI to modify existing React component code.

        Args:
            modification_prompt: The user's instruction for how to modify the code.
            current_code: The existing React component code string.

        Returns:
            The final prompt string to send to the AI for modification.
        """
        prompt_template = ""
        template_path = ""
        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            template_path = os.path.join(current_dir, '..', 'gemini_prompt_template.md')
            with open(template_path, "r", encoding="utf-8") as f:
                prompt_template = f.read()
        except FileNotFoundError:
            logger.error(f"ERROR: Prompt template not found at {template_path}")
            prompt_template = (
                "You are a helpful AI. Modify the provided React functional component using Chakra UI v3 "
                "based on the user request below.\n\nOutput Requirements:\n"
                "- Valid React functional component code as a string, enclosed in ```typescript ... ```.\n"
                "- Include all necessary imports from react and @chakra-ui/react.\n"
                "- Use Chakra UI v3 components and style props.\n"
                "- Use standard React hooks for state and event handlers.\n"
                "- Return the COMPLETE modified component code, not just the changes."
            )

        final_prompt = (
            f"{prompt_template}\n\n"
            f"## Task: Modify Existing Component\n\n"
            f"Please modify the following React component code based on the user's request.\n"
            f"Ensure the output is the complete, modified component code, including all necessary imports and structure.\n\n"
            f"### User Modification Request:\n\n"
            f"```text\n{modification_prompt}\n```\n\n"
            f"### Current Component Code:\n\n"
            f"```typescript\n{current_code}\n```\n\n"
            f"### Modified Component Code Output:\n\n"
            f"(Return the complete modified code in a ```typescript block below)"
        )

        logger.info("Created modification prompt for React code.")
        return final_prompt

    # NEW: Method to handle modification requests
    def modify_app_config(self, modification_prompt: str, current_code: str) -> Optional[str]:
        """
        Modify an existing React component code string based on a user prompt.

        Args:
            modification_prompt: A description of the desired modifications.
            current_code: The current React component code string.

        Returns:
            A string containing the modified React component code, or None if modification fails.
        """
        modified_component_code: Optional[str] = None
        error_message: Optional[str] = None
        prompt: str = ""
        response_text: str = ""

        try:
            prompt = self._create_modification_prompt(modification_prompt, current_code)
            if not prompt:
                logger.error("Modification prompt creation failed (template likely missing).")
                self.error_count += 1
                return None

            response_text = self._call_gemini_api(prompt)
            if not response_text or not response_text.strip():
                logger.warning("Empty response received from Gemini API during modification.")
                self.error_count += 1
                return None

            match = re.search(r"```(?:typescript|javascript|jsx|tsx)?\n(.*?)```", response_text, re.DOTALL | re.IGNORECASE)
            if match:
                modified_component_code = match.group(1).strip()
                logger.info(f"Successfully extracted modified component code ({len(modified_component_code)} chars).")
            else:
                logger.warning("Code block ```...``` not found in modification response. Assuming entire response is code.")
                potential_code = response_text.strip()
                if ("import React" in potential_code or "=> {" in potential_code or "export const" in potential_code):
                    modified_component_code = potential_code
                    logger.info(f"Using fallback response as modified component code ({len(modified_component_code)} chars).")
                else:
                    logger.warning("Fallback modification content doesn't strongly resemble React code.")
                    error_message = "AI did not return a recognizable React code block for modification."

            if modified_component_code:
                self.error_count = 0
                return modified_component_code
            else:
                if not error_message:
                    error_message = "Code extraction failed after modification for unknown reasons."
                logger.error(f"Failed to extract valid modified component code. Error: {error_message}")
                self.error_count += 1
                return None

        except Exception as e:
            logger.error(f"Exception during AI modification or code processing: {e}")
            traceback.print_exc()
            self.error_count += 1
            error_message = f"Exception during modification: {e}"
            return None

        finally:
            log_content = {
                "timestamp": datetime.datetime.now().isoformat(),
                "modification_prompt": modification_prompt,
                "current_code_preview": (current_code[:200] + '...') if current_code else "(None)",
                "prompt_sent_preview": (prompt[:200] + '...') if prompt else "(Prompt creation failed)",
                "raw_response_preview": (response_text[:200] + '...') if response_text else "(No response)",
                "extracted_modified_code_preview": (modified_component_code[:200] + '...') if modified_component_code else "(None)",
                "final_status": "Success" if modified_component_code else "Failure",
                "error_message": error_message if error_message else None
            }
            try:
                with open("morpheo_generation_log.jsonl", "a", encoding="utf-8") as log_file:
                    log_file.write(json.dumps(log_content) + "\n")
            except Exception as log_e:
                logger.error(f"Error writing modification logs in finally block: {log_e}")

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
        # This aims to fix errors like "Invalid \\escape"
        did_regex_work = False
        try:
            pattern = r'\\([^"\\/bfnrtu])' # Pattern to find \\ followed by a non-escape char
            replacement = r'\\\\\1'  # Replace with \\\\ followed by the char
            
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
                        i += 2 # Skip original \\ and the next char
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

    def _process_app_config(self, app_config: Dict[str, Any], user_request: str) -> Dict[str, Any]:
        """
        Process the app configuration after it's been generated by the AI.
        
        Args:
            app_config: The app configuration to process
            user_request: The original user request
            
        Returns:
            Processed app configuration
        """
        # Ensure app section exists with initialState
        if "app" not in app_config:
            app_config["app"] = {
                "name": "Generated Application",
                "description": user_request,
                "initialState": {}
            }
        elif "initialState" not in app_config["app"]:
            app_config["app"]["initialState"] = {}
            
        # Ensure layout section exists with proper structure
        if "layout" not in app_config:
            app_config["layout"] = {
                "type": "VStack",
                "props": {
                    "align": "center",
                    "justify": "center",
                    "spacing": 4,
                    "minH": "100vh"
                }
            }
            
        # Process components
        if "components" not in app_config:
            app_config["components"] = []
            
        # Convert dictionary components to list if needed
        if isinstance(app_config["components"], dict):
            components_list = []
            for comp_id, comp_data in app_config["components"].items():
                if isinstance(comp_data, dict):
                    comp_data["id"] = comp_id
                    components_list.append(comp_data)
            app_config["components"] = components_list
            
        # Process each component
        for component in app_config["components"]:
            # Ensure basic props
            if "props" not in component:
                component["props"] = {}
                
            # Convert any $morpheo.expression to $js
            if "props" in component:
                for key, value in component["props"].items():
                    if isinstance(value, dict) and "$morpheo.expression" in value:
                        component["props"][key] = {
                            "$js": value["$morpheo.expression"]
                        }
                        
            # Handle parentId by nesting in parent's children
            if "parentId" in component:
                parent_id = component["parentId"]
                for potential_parent in app_config["components"]:
                    if potential_parent.get("id") == parent_id:
                        if "children" not in potential_parent["props"]:
                            potential_parent["props"]["children"] = []
                        if isinstance(potential_parent["props"]["children"], list):
                            potential_parent["props"]["children"].append(component)
                del component["parentId"]
                
        # Clean up any remaining formatting issues
        self._sanitize_components(app_config["components"])
            
        return app_config
        
    def _sanitize_components(self, components: Union[List[Dict[str, Any]], Dict[str, Dict[str, Any]]]) -> None:
        """
        Sanitize a list or dictionary of components recursively.
        Ensures basic structure like type and id.
        
        Args:
            components: List or dictionary of components to sanitize
        """
        if not components:
            return
        
        component_items = []
        if isinstance(components, dict):
            # If it's a dict, iterate over its values
            component_items = components.values()
        elif isinstance(components, list):
            # If it's a list, iterate over its items directly
            component_items = components
        else:
            # If it's neither a list nor a dict, log an error or handle appropriately
            # For now, just return to avoid errors
            print(f"Warning: _sanitize_components received unexpected type: {type(components)}")
            return

        for component in component_items:
            # Skip if not a dict (e.g., if a list contains non-dict items)
            if not isinstance(component, dict):
                continue
            
            # Fix component type if it's invalid
            if "type" not in component or not component["type"]:
                component["type"] = "container" # Use a sensible default like 'container'
                
            # Ensure component has an ID
            if "id" not in component or not component["id"]:
                component["id"] = f"{component.get('type', 'component')}-{str(uuid4())[:8]}"
            
            # Process children recursively if they exist and are a list or dict
            if "children" in component:
                children_data = component["children"]
                if isinstance(children_data, (list, dict)):
                     self._sanitize_components(children_data)
                # Optionally handle non-list/dict children (e.g., convert strings to text components, etc.)
                # elif isinstance(children_data, str):
                #     # Example: convert string child to a Text component
                #     component["children"] = [{"type": "text", "id": f"text-{str(uuid4())[:8]}", "props": {"children": children_data}}]
                # else: # Clear invalid children
                #     component["children"] = [] # or None, depending on desired behavior

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

    def _fix_missing_app_config_fields(self, app_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Add any missing required fields to the app configuration.
        
        Args:
            app_config: The original app configuration
        
        Returns:
            The updated app configuration with required fields
        """
        if not app_config.get("app"):
            app_name = app_config.get("app_name", "Generated App")
            app_config["app"] = {
                "title": app_name
            }
        
        if not app_config.get("layout"):
            app_config["layout"] = {
                "type": "flex",
                "direction": "vertical"
            }
        
        return app_config
        
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

# Create a singleton instance of the component service
component_service = ComponentService()