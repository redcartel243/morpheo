"""
Component-Based UI Generation Service

This module provides services for component-based UI generation.
It uses OpenAI to compose components into a complete UI based on user requirements.
"""

import json
import os
import datetime
import re
import time
import random
import logging
from typing import Dict, List, Any, Optional, Tuple, Union

# Import OpenAI correctly
import openai
try:
    from openai import OpenAI  # For newer OpenAI version
except ImportError:
    OpenAI = None  # We'll handle this in the init method

from dotenv import load_dotenv
import traceback
import requests
from uuid import uuid4
import google.generativeai as genai

from .registry import component_registry
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from modules.tools.registry import tool_registry
from .response_validator import response_validator, ResponseValidator
from .response_handler import ResponseHandler

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
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ComponentService:
    """
    Service for component-based UI generation.
    """
    
    def __init__(self, component_registry=None):
        """
        Initialize the ComponentService.
        
        Args:
            component_registry: Optional component registry instance. 
                               If not provided, the default registry will be used.
        """
        # Initialize the OpenAI client with API key from environment variable
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if openai_api_key:
            # Set up the OpenAI client based on available package
            if OpenAI is not None:
                # New OpenAI client style (v1.0.0+)
                self.client = OpenAI(api_key=openai_api_key)
                self.openai_version = "new"
            else:
                # Old OpenAI module style (v0.x)
                openai.api_key = openai_api_key
                self.client = None  # Don't store the module
                self.openai_version = "old"
        else:
            logger.warning("OpenAI API key not found. Some features may not work.")
            self.client = None
            self.openai_version = None
        
        # Use the provided component registry or get the default one
        from .registry import component_registry as default_registry
        self.component_registry = component_registry or default_registry
        
        # Define the template for app generation prompts
        self.app_generation_prompt_template = """
        Generate a modern, interactive UI application configuration based on this request:
        
        "{user_request}"
        
        IMPORTANT: RESPOND WITH VALID JSON ONLY. NO EXPLANATIONS, MARKDOWN, OR TEXT OUTSIDE THE JSON OBJECT.
        
        Available Components:
        {ui_components}
        
        Available App Templates:
        {app_configs}
        
        Your response should be a complete JSON object with the following structure:
        {{
          "app": {{
            "name": "App Name",
            "description": "App Description",
            "theme": "light" or "dark" or custom color scheme
          }},
          "layout": {{
            "type": "singlepage",
            "regions": ["header", "main", "footer"] // or custom regions
          }},
          "components": [
            // Array of component objects
          ]
        }}
        
        Each component in the 'components' array should follow this structure:
        {{
          "id": "unique-id", // Must be unique across all components
          "type": "component-type", // One of the valid types listed above
          "region": "region-name", // Region where this component appears
          "properties": {{ /* Component properties */ }},
          "styles": {{ /* CSS-compatible styles */ }},
          "methods": {{ /* Event handlers and functions */ }},
          "children": [ /* For container components: nested components */ ]
        }}
        
        FINAL REMINDERS:
        1. YOUR RESPONSE MUST BE ONLY VALID JSON, NO TEXT OUTSIDE THE JSON OBJECT
        2. ALL COMPONENT IDs MUST BE UNIQUE
        3. USE ONLY COMPONENT TYPES THAT ARE PROVIDED IN THE AVAILABLE COMPONENTS LIST
        4. USE DIRECT DOM MANIPULATION ($m() SELECTOR) IN ALL METHOD CODE
        5. ENSURE THE JSON IS COMPLETE, WELL-FORMED AND READY TO USE
        """
        
        self.tool_registry = tool_registry
        self._component_connections = []  # Initialize connections list
        self.response_handler = ResponseHandler()  # Add the response handler instance
        
        # Configure Gemini API
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        if gemini_api_key:
            genai.configure(api_key=gemini_api_key)
    
    def _get_matching_template(self, user_request: str) -> Optional[Dict[str, Any]]:
        """
        Find a matching template for a user request based on keywords and similarity.
        Prioritizes certain known templates for specific request types.
        
        Args:
            user_request: The user's request description
            
        Returns:
            Matching template or None if no match found
        """
        # Convert request to lowercase for case-insensitive matching
        request_lower = user_request.lower()
        app_configs = self.component_registry.get_all_app_configs()
        
        # Special handling for population comparison charts - direct match for "population comparison" terms
        if any(term in request_lower for term in ["population comparison", "population chart", 
                                                  "compare population", "us vs europe", 
                                                  "comparing population", "population size"]):
            population_templates = {
                template_id: template for template_id, template in app_configs.items() 
                if template_id == "population-chart" or "population" in template.get("keywords", [])
            }
            
            if population_templates:
                # Return the first population template found (prioritize population-chart)
                if "population-chart" in population_templates:
                    print("Using exact population chart template match")
                    return population_templates["population-chart"]
                else:
                    template_id, template = next(iter(population_templates.items()))
                    print(f"Using population template match: {template_id}")
                    return template
        
        # Try to match by keywords first (most specific)
        for config_id, template in app_configs.items():
            keywords = [k.lower() for k in template.get("keywords", [])]
            if keywords and any(keyword in request_lower for keyword in keywords):
                print(f"Matched template by keyword: {config_id}")
                return template
        
        # Try to match by type/name (less specific)
        for config_id, template in app_configs.items():
            template_type = template.get("type", "").lower()
            template_name = template.get("name", "").lower()
            
            if (template_type and template_type in request_lower) or \
               (template_name and template_name in request_lower):
                print(f"Matched template by type/name: {config_id}")
                return template
        
        # No match found
        return None

    def generate_app_config(self, user_request: str) -> Dict[str, Any]:
        """
        Generate an app configuration based on a user request.
        This method extracts a valid JSON response from Gemini or OpenAI for creating the application.
        
        Args:
            user_request: The user's request description
            
        Returns:
            App configuration dictionary
        """
        try:
            # Apply map preprocessing if available
            original_request = user_request
            if MAP_PROCESSORS_AVAILABLE:
                user_request = preprocess_map_request(user_request)
                if user_request != original_request:
                    print("Map preprocessing applied to user request")

            # Try to match a template first using our improved matching function
            template_match = self._get_matching_template(user_request)
                
            if template_match is not None:
                print(f"Using matching template: {template_match.get('name')}")
                return self._create_template_app_config(template_match, user_request)
                
            # Get the active UI components from config
            ui_components = self._get_ui_components_list()
            
            # Get all available app configs
            app_configs_dict = self.component_registry.get_all_app_configs()
            app_configs = list(app_configs_dict.values())
                
            # Generate prompt for app
            prompt = self._create_app_generation_prompt(user_request, ui_components, app_configs)
                
            # Check if Gemini API key is available
            gemini_api_key = os.getenv("GEMINI_API_KEY")
            if gemini_api_key:
                try:
                    # Make API call to Gemini
                    print("Using Gemini API for app configuration generation")
                    response_text = self._call_gemini_api(prompt)
                except Exception as gemini_error:
                    print(f"Error with Gemini API: {str(gemini_error)}. Falling back to OpenAI.")
                    # Fall back to OpenAI
                    response_text = self._call_openai_api(prompt)
            else:
                # Fall back to OpenAI
                response_text = self._call_openai_api(prompt)
                
            # Process the API response using our enhanced handler
            app_config = self._process_api_response({
                "choices": [{"message": {"content": response_text}}]
            })
                
            # Apply map post-processing if available
            if MAP_PROCESSORS_AVAILABLE:
                app_config_json = json.dumps(app_config)
                processed_config_json = fix_map_configuration(app_config_json)
                if processed_config_json != app_config_json:
                    print("Map post-processing applied to response")
                    app_config = json.loads(processed_config_json)
                
            # Process the app configuration further if needed
            app_config = self._process_app_config(app_config, user_request)
                
            # Validate and post-process the configuration 
            self._process_app_config_imports(app_config)
            self._normalize_component_ids(app_config)
            self._normalize_component_properties(app_config.get("components", []))
                
            # Log the validated response
            with open("openai_request_log.txt", "a", encoding="utf-8") as log_file:
                log_file.write("Validated Response:\n")
                log_file.write(json.dumps(app_config, indent=2))
                log_file.write("\n--- End of Validated Response ---\n\n")
                
            # After processing the app configuration, normalize methods to events
            self._normalize_methods_to_events(app_config.get("components", []))
                
            return app_config
                
        except Exception as e:
            print(f"Error generating app config: {str(e)}")
            traceback.print_exc()
                
            # Create a fallback app configuration that shows error info
            return self._create_ai_fallback_app_config(user_request)
    
    def _call_gemini_api(self, prompt: str) -> str:
        """
        Make an API call to Google's Gemini API.
        
        Args:
            prompt: The prompt to send to Gemini
            
        Returns:
            Response text from Gemini
        """
        try:
            # Log the request
            with open("gemini_request_log.txt", "a", encoding="utf-8") as log_file:
                log_file.write(f"Request Time: {datetime.datetime.now()}\n")
                log_file.write("Prompt:\n")
                log_file.write(prompt)
                log_file.write("\n--- End of Prompt ---\n\n")
            
            # Configure the generation model
            generation_config = {
                "temperature": 0.9,
                "top_p": 1,
                "top_k": 1,
                "max_output_tokens": 8192,
            }
            
            # Safety settings - adjust as needed
            safety_settings = [
                {
                    "category": "HARM_CATEGORY_HARASSMENT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    "category": "HARM_CATEGORY_HATE_SPEECH",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
            ]
            
            # Initialize the model with the correct model name: gemini-2.0-flash
            model = genai.GenerativeModel(
                model_name="gemini-2.0-flash",
                generation_config=generation_config,
                safety_settings=safety_settings
            )
            
            # Generate content
            response = model.generate_content(prompt)
            
            # Extract the response text
            response_text = response.text
            
            # Log the response
            with open("gemini_request_log.txt", "a", encoding="utf-8") as log_file:
                log_file.write("Response:\n")
                log_file.write(response_text)
                log_file.write("\n--- End of Response ---\n\n")
            
            return response_text
            
        except Exception as e:
            print(f"Error calling Gemini API: {str(e)}")
            traceback.print_exc()
            raise
    
    def _call_openai_api(self, prompt: str) -> str:
        """
        Make an API call to OpenAI with robust handling for different API versions.
        
        Args:
            prompt: The prompt to send to OpenAI
            
        Returns:
            Response text from OpenAI
        """
        try:
            openai_api_key = os.getenv("OPENAI_API_KEY")
            if not openai_api_key:
                raise ValueError("OpenAI API key not found")
                
            # Log the request
            with open("openai_request_log.txt", "a", encoding="utf-8") as log_file:
                log_file.write(f"Request Time: {datetime.datetime.now()}\n")
                log_file.write("Prompt:\n")
                log_file.write(prompt)
                log_file.write("\n--- End of Prompt ---\n\n")
            
            messages = [
                {"role": "system", "content": "You are a UI configuration generator assistant. Respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ]
            
            response_text = None
            
            # Try different API calling patterns based on OpenAI version
            if self.openai_version == "new" and self.client:
                # OpenAI Python v1.0+ with client object
                try:
                    response = self.client.chat.completions.create(
                        model="gpt-4-turbo",
                        messages=messages,
                        temperature=0.7,
                        max_tokens=4000
                    )
                    response_text = response.choices[0].message.content
                except Exception as e:
                    print(f"Error with new OpenAI client: {str(e)}")
            
            # If response_text is still None, try alternative methods
            if response_text is None:
                try:
                    # Try modern openai module method
                    response = openai.chat.completions.create(
                        model="gpt-4-turbo",
                        messages=messages,
                        temperature=0.7,
                        max_tokens=4000
                    )
                    if hasattr(response.choices[0].message, 'content'):
                        response_text = response.choices[0].message.content
                    else:
                        response_text = response.choices[0].message["content"]
                except Exception as e1:
                    print(f"Error with chat.completions: {str(e1)}")
                    try:
                        # Try older openai.ChatCompletion
                        if hasattr(openai, 'ChatCompletion'):
                            response = openai.ChatCompletion.create(
                                model="gpt-4-turbo",
                                messages=messages,
                                temperature=0.7,
                                max_tokens=4000
                            )
                            response_text = response.choices[0].message["content"]
                    except Exception as e2:
                        print(f"Error with ChatCompletion: {str(e2)}")
                        try:
                            # Try the oldest openai.Completion
                            response = openai.Completion.create(
                                engine="gpt-4-turbo",
                                prompt=f"System: You are a UI configuration generator assistant. Respond with valid JSON only.\n\nUser: {prompt}",
                                temperature=0.7,
                                max_tokens=4000
                            )
                            response_text = response.choices[0].text
                        except Exception as e3:
                            print(f"Error with all OpenAI methods: {str(e3)}")
                            raise ValueError(f"All OpenAI API methods failed. Latest error: {str(e3)}")
            
            if response_text is None:
                raise ValueError("Failed to get response from OpenAI API")
            
            # Log the response
            with open("openai_request_log.txt", "a", encoding="utf-8") as log_file:
                log_file.write("Response:\n")
                log_file.write(response_text)
                log_file.write("\n--- End of Response ---\n\n")
                
            return response_text
                
        except Exception as e:
            print(f"Error calling OpenAI API: {str(e)}")
            traceback.print_exc()
            raise
    
    def _process_api_response(self, response: Dict[str, Any], is_streaming: bool = False) -> Dict[str, Any]:
        """
        Process the API response to extract the UI configuration.
        
        Args:
            response: The API response
            is_streaming: Whether this was a streaming request
            
        Returns:
            The extracted UI configuration
        """
        try:
            # First, log the response for debugging
            self._log_response(response)
            
            # Use the ResponseHandler to process the response
            processed_response = self.response_handler.handle_response(response, is_streaming)
            
            # Validate the processed response
            if processed_response:
                # Further process the response if needed
                self._validate_action_handlers(processed_response)
                
                # Process methods and update component connections
                if "components" in processed_response:
                    self._process_ai_methods(processed_response["components"])
                    
                return processed_response
            else:
                # If response processing failed, return error recovery
                print("Failed to process API response")
                return self.response_handler._create_error_recovery_response()
                
        except Exception as e:
            # Log the error and return error recovery response
            print(f"Error processing API response: {str(e)}")
            with open("api_error_log.txt", "a") as f:
                f.write(f"Error processing response: {str(e)}\n")
                
            return self.response_handler._create_error_recovery_response()
    
    def _log_response(self, response: Dict[str, Any]) -> None:
        """
        Log the API response for debugging purposes.
        
        Args:
            response: The API response
        """
        try:
            # Create a log entry with timestamp
            log_entry = f"\n\n===== API RESPONSE LOG =====\n"
            log_entry += f"Time: {datetime.datetime.now().isoformat()}\n"
            
            # Add the response content if available
            if response and "choices" in response and len(response["choices"]) > 0:
                if "message" in response["choices"][0] and "content" in response["choices"][0]["message"]:
                    content = response["choices"][0]["message"]["content"]
                    log_entry += f"Response content:\n{content}\n"
                else:
                    log_entry += "No content found in response choices.\n"
            else:
                log_entry += "No choices found in response.\n"
                
            log_entry += "===== END RESPONSE LOG =====\n\n"
            
            # Write to the log file
            with open("api_request_log.txt", "a", encoding="utf-8") as log_file:
                log_file.write(log_entry)
                
        except Exception as e:
            print(f"Error logging API response: {str(e)}")
            # Create a simple error log if the detailed logging fails
            with open("api_error_log.txt", "a") as f:
                f.write(f"Error logging response: {str(e)}\n")
    
    def _extract_components_from_raw_json(self, raw_json: dict) -> list:
        """
        Attempt to extract components from a raw JSON structure, handling various formats.
        
        Args:
            raw_json: The raw JSON object
            
        Returns:
            List of components
        """
        components = []
        
        # First, check direct components list
        if "components" in raw_json and isinstance(raw_json["components"], list):
            return raw_json["components"]
            
        # Check if nested in applicationStructure
        if "applicationStructure" in raw_json and isinstance(raw_json["applicationStructure"], dict):
            app_structure = raw_json["applicationStructure"]
            if "components" in app_structure and isinstance(app_structure["components"], list):
                return app_structure["components"]
        
        # Check if this is already a list of components
        if isinstance(raw_json, list):
            # Check if first item has component-like structure
            if raw_json and isinstance(raw_json[0], dict) and ("type" in raw_json[0] or "id" in raw_json[0]):
                return raw_json
        
        # Check if there's a UI property with components
        if "ui" in raw_json and isinstance(raw_json["ui"], dict):
            ui = raw_json["ui"]
            if "components" in ui and isinstance(ui["components"], list):
                return ui["components"]
        
        # As a last resort, scan all properties for anything that looks like a component list
        for key, value in raw_json.items():
            if isinstance(value, list) and value:
                # Check if this looks like a component list
                if all(isinstance(item, dict) and ("type" in item or "id" in item) for item in value):
                    return value
        
        # If we can't find components, return an error component
        error_component = {
            "id": "error-component",
            "type": "text",
            "region": "main",
            "properties": {
                "content": "Error: Could not extract components from API response."
            },
            "styles": {
                "fontSize": "18px",
                "color": "red",
                "padding": "20px",
                "textAlign": "center"
            }
        }
        
        return [error_component]
    
    def _create_app_generation_prompt(self, user_request: str, ui_components: List[Dict[str, Any]], app_configs: List[Dict[str, Any]]) -> str:
        """
        Create a prompt for generating an app configuration.
        Formats the prompt with information about available UI components and existing app configurations.
        
        Args:
            user_request: The user's request description
            ui_components: List of available UI components
            app_configs: List of available app configurations
            
        Returns:
            Formatted prompt for the AI model
        """
        return self.app_generation_prompt_template.format(
            ui_components=json.dumps(ui_components, indent=2),
            app_configs=json.dumps(app_configs, indent=2),
            user_request=user_request
        )
    
    def _parse_app_configuration(self, generation_text: str) -> Dict[str, Any]:
        """
        Parse the app configuration from the generation text.
        
        Args:
            generation_text: The text generated by the AI
            
        Returns:
            The parsed app configuration
        """
        try:
            # Find the JSON object in the response
            json_start = generation_text.find('{')
            json_end = generation_text.rfind('}') + 1
            
            if json_start != -1 and json_end != -1:
                json_text = generation_text[json_start:json_end]
                # Use the string directly, as it's already Unicode from the OpenAI API
                app_config = json.loads(json_text)
                return app_config
            else:
                raise ValueError("No valid JSON object found in the response")
        except Exception as e:
            print(f"Error parsing app configuration: {str(e)}")
            return self._create_fallback_app_config("fallback")
    
    def _create_fallback_app_config(self, user_request: str) -> Dict[str, Any]:
        """
        Create a minimal fallback app configuration.
        
        Args:
            user_request: The user's request description
            
        Returns:
            A minimal app configuration
        """
        # Actually delegate to the AI fallback config
        return self._create_ai_fallback_app_config(user_request)

    def _create_ai_fallback_app_config(self, user_request: str) -> Dict[str, Any]:
        """
        Create a fallback app configuration when AI generation fails.
        
        Args:
            user_request: The user's request description
            
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
                        "backgroundColor": "white",
                        "padding": "20px",
                        "borderRadius": "5px",
                        "boxShadow": "0 2px 5px rgba(0,0,0,0.1)",
                        "margin": "20px",
                        "maxWidth": "800px",
                        "marginLeft": "auto",
                        "marginRight": "auto"
                    },
                    "children": [
                        {
                            "id": "error-message",
                            "type": "text",
                            "properties": {
                                "content": "We encountered an error while generating your UI",
                                "variant": "h2"
                            },
                            "styles": {
                                "fontSize": "20px",
                                "marginBottom": "15px",
                                "color": "#721c24"
                            }
                        },
                        {
                            "id": "request-details",
                            "type": "text",
                            "properties": {
                                "content": "Your request was: " + user_request,
                                "variant": "p"
                            },
                            "styles": {
                                "marginBottom": "20px",
                                "padding": "10px",
                                "backgroundColor": "#f8f9fa",
                                "borderRadius": "5px"
                            }
                        },
                        {
                            "id": "suggestion-text",
                            "type": "text",
                            "properties": {
                                "content": "Please try again with a more specific request or different wording.",
                                "variant": "p"
                            },
                            "styles": {
                                "marginBottom": "20px"
                            }
                        },
                        {
                            "id": "try-again-button",
                            "type": "button",
                            "properties": {
                                "text": "Try Again"
                            },
                            "styles": {
                                "padding": "10px 20px",
                                "backgroundColor": "#007bff",
                                "color": "white",
                                "border": "none",
                                "borderRadius": "5px",
                                "cursor": "pointer",
                                "fontSize": "16px"
                            },
                            "methods": {
                                "onClick": {
                                    "code": "function(event, $m) { window.history.back(); }",
                                    "affectedComponents": []
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
                        "backgroundColor": "#f8f9fa",
                        "padding": "10px",
                        "textAlign": "center",
                        "marginTop": "20px"
                    },
                    "children": [
                        {
                            "id": "footer-text",
                            "type": "text",
                            "properties": {
                                "content": "© " + str(datetime.datetime.now().year) + " Morpheo UI Generator",
                                "variant": "p"
                            },
                            "styles": {
                                "fontSize": "14px",
                                "color": "#6c757d"
                            }
                        }
                    ]
                }
            ]
        }

    def _create_app_config(self, user_request: str, app_structure: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a complete app configuration based on user request and application structure.
        
        Args:
            user_request: The user's request description
            app_structure: The application structure to use as a base
            
        Returns:
            A complete app configuration dictionary
        """
        # Extract the app name from the user request
        app_name = app_structure.get("app", {}).get("name", f"App for: {user_request[:30]}...")
        
        # Check for a title component
        has_title_component = False
        for component in app_structure.get("components", []):
            if component.get("id") == "title" or component.get("id") == "app-title":
                has_title_component = True
                break
        
        # Setup layout - ensure regions are in the right format
        layout = app_structure.get("layout", {"type": "singlepage", "regions": ["header", "main", "footer"]})
        if "regions" not in layout:
            layout["regions"] = ["header", "main", "footer"]
        
        # Construct the initial app configuration
        app_config = {
            "app": {
                "name": app_name,
                "description": app_structure.get("app", {}).get("description", user_request),
                "theme": app_structure.get("app", {}).get("theme", "light")
            },
            "layout": layout,
            "components": app_structure.get("components", []),
            "backend": {
                "services": app_structure.get("backend", {}).get("services", []),
                "dataFlow": app_structure.get("backend", {}).get("dataFlow", [])
            }
        }
        
        # Add regionStyles for display
        app_config["regionStyles"] = {
            "header": {"minHeight": "80px", "padding": "1rem"},
            "main": {"flex": "1", "padding": "1rem"},
            "footer": {"minHeight": "60px", "padding": "1rem"}
        }
        
        # Process components and AI-defined methods
        self._process_components(app_config["components"])
        self._process_ai_methods(app_config["components"])
        
        # Add componentMethods library for direct DOM manipulation
        app_config["componentMethods"] = {
            # UI updates
            "setText": "function(selector, text) { $m(selector).setProperty('content', text); }",
            "setValue": "function(selector, value) { $m(selector).setProperty('value', value); }",
            "setContent": "function(selector, content) { $m(selector).setProperty('content', content); }",
            
            # Styling
            "setStyle": "function(selector, styleName, value) { $m(selector).setStyle(styleName, value); }",
            "addClass": "function(selector, className) { $m(selector).addClass(className); }",
            "removeClass": "function(selector, className) { $m(selector).removeClass(className); }",
            "show": "function(selector) { $m(selector).show(); }",
            "hide": "function(selector) { $m(selector).hide(); }",
            
            # Animations
            "animate": "function(selector, keyframes, options) { $m(selector).animate(keyframes, options); }",
            "fadeIn": "function(selector, duration = 300) { $m(selector).show(); $m(selector).animate([{opacity: 0}, {opacity: 1}], {duration}); }",
            "fadeOut": "function(selector, duration = 300) { $m(selector).animate([{opacity: 1}, {opacity: 0}], {duration}).onfinish = () => $m(selector).hide(); }",
            
            # Data handling
            "formatNumber": "function(num, decimals = 2) { return Number(num).toFixed(decimals); }",
            "formatCurrency": "function(num, currency = 'USD') { return new Intl.NumberFormat('en-US', {style: 'currency', currency}).format(num); }",
            "formatDate": "function(date, format = 'full') { const d = new Date(date); return format === 'full' ? d.toLocaleString() : d.toLocaleDateString(); }",
            
            # Events
            "emit": "function(selector, eventName, detail) { $m(selector).emit(eventName, detail); }",
            
            # Component interaction
            "updateComponent": "function(selector, updates) { for (const [key, value] of Object.entries(updates)) { $m(selector).setProperty(key, value); } }",
            "updateComponentStyle": "function(selector, styles) { for (const [key, value] of Object.entries(styles)) { $m(selector).setStyle(key, value); } }"
        }
        
        # Add utility functions
        app_config["utils"] = {
            # String utilities
            "formatText": {
                "capitalize": "function(text) { return text.charAt(0).toUpperCase() + text.slice(1); }",
                "truncate": "function(text, length = 50, ending = '...') { return text.length > length ? text.substring(0, length - ending.length) + ending : text; }",
                "slugify": "function(text) { return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }"
            },
            
            # Math utilities
            "calculate": {
                "add": "function(a, b) { return Number(a) + Number(b); }",
                "subtract": "function(a, b) { return Number(a) - Number(b); }",
                "multiply": "function(a, b) { return Number(a) * Number(b); }",
                "divide": "function(a, b) { return b !== 0 ? Number(a) / Number(b) : 0; }"
            },
            
            # Date/time utilities
            "datetime": {
                "now": "function() { return new Date().toISOString(); }",
                "format": "function(date, format = 'yyyy-MM-dd') { const d = new Date(date); return d.toLocaleDateString(); }",
                "timeAgo": "function(date) { const seconds = Math.floor((new Date() - new Date(date)) / 1000); const intervals = {year: 31536000, month: 2592000, week: 604800, day: 86400, hour: 3600, minute: 60, second: 1}; for (const [unit, secondsInUnit] of Object.entries(intervals)) { const interval = Math.floor(seconds / secondsInUnit); if (interval > 1) { return `${interval} ${unit}s ago`; } else if (interval === 1) { return `${interval} ${unit} ago`; } } return 'just now'; }"
            },
            
            # Validation utilities
            "validate": {
                "isEmail": "function(email) { return /^\\S+@\\S+\\.\\S+$/.test(email); }",
                "isNumber": "function(value) { return !isNaN(Number(value)); }",
                "isRequired": "function(value) { return value !== null && value !== undefined && value !== ''; }"
            }
        }
        
        return app_config

    def _process_components(self, components):
        """
        Process components to ensure they have required properties and styles.
        
        Args:
            components: List of component definitions
        """
        if not isinstance(components, list):
            return
            
        for component in components:
            if component.get("type") == "button":
                # Make sure the button has styles
                if "styles" not in component:
                    component["styles"] = {}
                
                # Add default button styles if none exist
                button_styles = component["styles"]
                if not button_styles.get("backgroundColor") and not button_styles.get("background-color"):
                    button_styles["backgroundColor"] = "#3b82f6"  # Default blue
                
                if not button_styles.get("color"):
                    button_styles["color"] = "white"
                
                if not button_styles.get("padding"):
                    button_styles["padding"] = "8px 16px"
                
                if not button_styles.get("borderRadius") and not button_styles.get("border-radius"):
                    button_styles["borderRadius"] = "4px"
                
                if not button_styles.get("cursor"):
                    button_styles["cursor"] = "pointer"
                
                # Make sure button has a text property
                if not component.get("properties"):
                    component["properties"] = {}
                
                if not component["properties"].get("text"):
                    component["properties"]["text"] = "Button"
            
            # Process nested components
            if component.get("children") and isinstance(component["children"], list):
                self._process_components(component["children"])
            
            # Process components in properties.children as well
            if component.get("properties") and component["properties"].get("children") and isinstance(component["properties"]["children"], list):
                self._process_components(component["properties"]["children"])

    def _validate_action_handlers(self, app_config: Dict[str, Any]) -> None:
        """
        Validate and standardize action handlers in components.
        
        Enhanced to:
        1. Use pattern recognition to identify common event handler structures
        2. Check for missing error handling in try/catch blocks
        3. Verify initialization of component values
        4. Augment code with missing validations, initializations, and safety measures
        
        Args:
            app_config: The app configuration to validate
        """
        if not app_config.get("components"):
            return
            
        components = app_config["components"]
        
        # Validate and correct component actions
        for component in components:
            # Check for and add default initializations if needed
            self._ensure_component_initialization(component)
            
            if "events" in component:
                for event_type, event_handler in component["events"].items():
                    if isinstance(event_handler, dict):
                        if "action" in event_handler:
                            # Handle legacy actions using pattern recognition
                            self._transform_legacy_action(component, event_type, event_handler)
                        elif "code" in event_handler:
                            # Validate and augment event handler code
                            code = event_handler["code"]
                            augmented_code = self._augment_handler_code(code, component.get("id", "unknown"), 
                                                                       event_type, event_handler.get("affectedComponents", []))
                            event_handler["code"] = augmented_code
            
            # Process nested components
            if component.get("children") and isinstance(component["children"], list):
                # Recursive processing with temporary config
                temp_config = {"components": component["children"]}
                self._validate_action_handlers(temp_config)
                
            # Process components in properties.children as well
            if component.get("properties") and component["properties"].get("children") and isinstance(component["properties"]["children"], list):
                # Recursive processing with temporary config
                temp_config = {"components": component["properties"]["children"]}
                self._validate_action_handlers(temp_config)

    def _transform_legacy_action(self, component: Dict[str, Any], event_type: str, event_handler: Dict[str, Any]) -> None:
        """
        Transform legacy action-based handlers to modern code-based handlers using pattern recognition.
        
        Args:
            component: The component containing the event handler
            event_type: The type of event (e.g., "click", "change")
            event_handler: The event handler configuration
        """
        action = event_handler["action"]
                        
        # Pattern recognition for common legacy actions
        if action == "changeButtonPosition":
            # This action was for state management
            # Now replace with direct DOM manipulation method
            component["events"][event_type] = {
                "code": "function(event, $m) { $m('#' + event.target.id).setStyle('transform', 'translate(' + Math.random() * 20 + 'px, ' + Math.random() * 20 + 'px)'); }"
            }
        elif action == "toggleVisibility":
            # Replace with DOM manipulation for toggling visibility
            target_id = event_handler.get("targetId", "content")
            component["events"][event_type] = {
                "code": f"function(event, $m) {{ const elem = $m('#{target_id}'); if (elem.getProperty('display') === 'none') {{ elem.show(); }} else {{ elem.hide(); }} }}",
                "affectedComponents": [target_id]
            }
        elif action == "increment" or action == "add" or action.startswith("add") or action.startswith("increment"):
            # Numerical increment pattern
            target_id = event_handler.get("targetId")
            value = event_handler.get("value", 1)
            if target_id:
                component["events"][event_type] = {
                    "code": f"""function(event, $m) {{ 
                        try {{
                            const elem = $m('#{target_id}');
                            const currentValue = parseFloat(elem.getText()) || 0;
                            elem.setText(String(currentValue + {value}));
                        }} catch (error) {{
                            console.error('Error incrementing value:', error);
                        }}
                    }}""",
                    "affectedComponents": [target_id]
                }
        elif action == "decrement" or action == "subtract" or action.startswith("subtract") or action.startswith("decrement"):
            # Numerical decrement pattern
            target_id = event_handler.get("targetId")
            value = event_handler.get("value", 1)
            if target_id:
                component["events"][event_type] = {
                    "code": f"""function(event, $m) {{ 
                        try {{
                            const elem = $m('#{target_id}');
                            const currentValue = parseFloat(elem.getText()) || 0;
                            elem.setText(String(currentValue - {value}));
                        }} catch (error) {{
                            console.error('Error decrementing value:', error);
                        }}
                    }}""",
                    "affectedComponents": [target_id]
                }
        elif action == "setText" or action == "updateText":
            # Text update pattern
            target_id = event_handler.get("targetId")
            text = event_handler.get("text", "")
            if target_id:
                component["events"][event_type] = {
                    "code": f"""function(event, $m) {{ 
                        try {{
                            $m('#{target_id}').setText("{text}");
                        }} catch (error) {{
                            console.error('Error setting text:', error);
                        }}
                    }}""",
                    "affectedComponents": [target_id]
                }

    def _ensure_component_initialization(self, component: Dict[str, Any]) -> None:
        """
        Ensure a component has proper initialization values.
        
        Args:
            component: The component to check and augment
        """
        # Add default initialization method if needed
        component_id = component.get("id")
        component_type = component.get("type")
        
        if not component_id:
            return
            
        # Add initialization method if not present
        if not component.get("methods") or "initialize" not in component.get("methods", {}):
            if not component.get("methods"):
                component["methods"] = {}
                
            # Create appropriate initializer based on component type
            if component_type == "input" or component_type == "textfield":
                # Initialize input components with validation
                component["methods"]["initialize"] = {
                    "code": f"""function(event, $m) {{
                        try {{
                            const input = $m('#{component_id}');
                            input.addEventListener('input', function(e) {{
                                // Basic input validation
                                if (input.getAttribute('data-type') === 'number') {{
                                    const value = input.getValue();
                                    if (value && isNaN(parseFloat(value))) {{
                                        input.setStyle('border', '1px solid red');
                                    }} else {{
                                        input.setStyle('border', '');
                                    }}
                                }}
                            }});
                        }} catch (error) {{
                            console.error('Error initializing input component:', error);
                        }}
                    }}"""
                }
            elif component_type == "button":
                # Add default button initialization if it has events
                if component.get("events") and any(event_type != "initialize" for event_type in component.get("events", {})):
                    component["methods"]["initialize"] = {
                        "code": f"""function(event, $m) {{
                            try {{
                                const button = $m('#{component_id}');
                                button.setProperty('initialized', true);
                            }} catch (error) {{
                                console.error('Error initializing button component:', error);
                            }}
                        }}"""
                    }
            elif component_type in ["select", "dropdown"]:
                # Initialize select components
                component["methods"]["initialize"] = {
                    "code": f"""function(event, $m) {{
                        try {{
                            const select = $m('#{component_id}');
                            select.addEventListener('change', function(e) {{
                                const selectedOption = select.getValue();
                                select.setProperty('selectedOption', selectedOption);
                            }});
                        }} catch (error) {{
                            console.error('Error initializing select component:', error);
                        }}
                    }}"""
                }

    def _augment_handler_code(self, code: str, component_id: str, event_type: str, affected_components: List[str]) -> str:
        """
        Augment handler code with error handling, validation, and safer eval alternatives.
        
        Args:
            code: The original handler code
            component_id: ID of the component
            event_type: The event type (click, change, etc.)
            affected_components: List of components affected by this handler
            
        Returns:
            Augmented handler code
        """
        # Skip if already a function with try/catch
        if "try {" in code and "catch" in code:
            return code
            
        # Extract code body from function if it exists
        code_body = code
        function_match = re.search(r'function\s*\([^)]*\)\s*{([\s\S]*)}', code)
        if function_match:
            code_body = function_match.group(1).strip()
            
        # Check for eval usage and replace with safer alternative
        if "eval(" in code_body:
            code_body = code_body.replace("eval(", "Function('return ' + ")
            code_body = code_body.replace(")", ")()")
            
        # Pattern recognition for form validation
        if event_type == "submit" and any(re.search(r'form|submit|input', code_body, re.IGNORECASE)):
            # Add form validation wrapper
            validation_code = f"""
                // Form validation
                const form = event.target.closest('form');
                if (form) {{
                    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
                    let isValid = true;
                    
                    inputs.forEach(input => {{
                        if (!input.value.trim()) {{
                            isValid = false;
                            $m('#' + input.id).setStyle('border', '1px solid red');
                        }} else {{
                            $m('#' + input.id).setStyle('border', '');
                        }}
                    }});
                    
                    if (!isValid) {{
                        event.preventDefault();
                        return;
                    }}
                }}
            """
            code_body = validation_code + code_body
        
        # Pattern recognition for calculation operations
        if any(re.search(r'Math\.|parseFloat|parseInt|\+|-|\*|/', code_body)) and any(affected_components):
            # Ensure there's validation for numerical operations
            for target_id in affected_components:
                if f"$m('#{target_id}')" in code_body or f'$m("#{target_id}")' in code_body:
                    # Add validation for affected numeric components if not present
                    if not re.search(r'(parseFloat|parseInt|Number)\s*\(', code_body):
                        code_body = re.sub(
                            r'(\$m\([\'"]#' + re.escape(target_id) + r'[\'"]\)\.getText\(\))',
                            r'parseFloat(\1) || 0',
                            code_body
                        )
        
        # Wrap code with try-catch for error handling
        augmented_code = f"""function(event, $m) {{
            try {{
                {code_body}
            }} catch (error) {{
                console.error('Error in {event_type} handler for component {component_id}:', error);
            }}
        }}"""
        
        return augmented_code

    def _process_ai_methods(self, components: List[Dict[str, Any]]) -> None:
        """
        Process AI-defined methods in components, validating and formatting them.
        
        Args:
            components: The list of components to process
        """
        for component in components:
            # Skip if no methods
            if not component.get("methods"):
                continue
            
            component_id = component.get("id", "unknown")
            # Process each method
            for method_name, method_data in component.get("methods", {}).items():
                if not method_data:
                    continue
                
                # Extract the method code
                method_code = ""
                affected_components = []
                
                if isinstance(method_data, dict):
                    method_code = method_data.get("code", "")
                    affected_components = method_data.get("affectedComponents", [])
                elif isinstance(method_data, str):
                    method_code = method_data
                
                # Convert old state-based code to DOM manipulation
                if method_code and "return " in method_code and "state" in method_code:
                    # This is likely old-style state management code, let's convert it
                    method_code = self._convert_state_code_to_dom(method_code, component_id, affected_components)
                
                # Validate and format the method code
                is_valid, formatted_code, detected_components = self._validate_method_code(method_code, component_id)
                
                # If the method is valid, update the component
                if is_valid:
                    if isinstance(method_data, dict):
                        method_data["code"] = formatted_code
                        # Update affected components with any that were detected
                        if detected_components:
                            method_data["affectedComponents"] = list(set(affected_components + detected_components))
                    else:
                        component["methods"][method_name] = {
                            "code": formatted_code,
                            "affectedComponents": detected_components
                        }
                
                # Create component connections for affected components
                if affected_components:
                    self._create_component_connections(component_id, method_name, affected_components)
            
            # Process nested components recursively
            if "children" in component and isinstance(component["children"], list):
                self._process_ai_methods(component["children"])
    
    def _convert_state_code_to_dom(self, method_code: str, component_id: str, affected_components: List[str]) -> str:
        """
        Convert state-based component method code to DOM manipulation code.
        
        Args:
            method_code: The original method code
            component_id: The ID of the component
            affected_components: List of affected component IDs
            
        Returns:
            DOM manipulation code
        """
        # First, check if this is already a function declaration
        if method_code.strip().startswith("function"):
            # Extract just the function body from between the braces
            body_start = method_code.find("{") + 1
            body_end = method_code.rfind("}")
            if body_start > 0 and body_end > body_start:
                method_body = method_code[body_start:body_end].strip()
            else:
                method_body = method_code
        else:
            method_body = method_code
        
        # Replace state updates with direct DOM manipulation
        dom_code = method_body
        
        # Replace state property setting with DOM manipulation
        for component_id in affected_components:
            # Pattern like: state.counter = state.counter + 1;
            state_pattern = re.compile(r'state\.([a-zA-Z0-9_]+)\s*=\s*([^;]+);')
            dom_code = state_pattern.sub(r'$m("#' + component_id + r'").setProperty("\1", \2);', dom_code)
            
            # Pattern like: return { ...state, counter: state.counter + 1 };
            return_pattern = re.compile(r'return\s*{\s*\.\.\.state,\s*([a-zA-Z0-9_]+):\s*([^,}]+)[,}]')
            dom_code = return_pattern.sub(r'$m("#' + component_id + r'").setProperty("\1", \2);', dom_code)
        
        # Remove any remaining return statements with state
        return_state_pattern = re.compile(r'return\s*{\s*\.\.\.state.*};')
        dom_code = return_state_pattern.sub('', dom_code)
        
        # Package into a function
        formatted_code = f"function(event, $m) {{\n  {dom_code}\n}}"
        
        return formatted_code

    def _create_component_connections(self, source_id: str, event_type: str, target_ids: List[str]) -> None:
        """
        Create generic component connections based on method interactions.
        This is a generic approach without hard-coding specific application logic.
        
        Args:
            source_id: The ID of the source component
            event_type: The type of event (e.g., "click", "change")
            target_ids: List of target component IDs that are affected
        """
        # Initialize connections list if not exists
        if not hasattr(self, "_component_connections"):
            self._component_connections = []
            
        # Create a connection for each target component
        for target_id in target_ids:
            clean_target_id = target_id.lstrip('#')
            
            # Add to connections list with default target point
            self._component_connections.append({
                "sourceId": source_id,
                "sourcePoint": event_type,
                "targetId": clean_target_id,
                "targetPoint": "content",  # Default target point
                "transformerFunction": "passthrough"  # Generic transformer
            })

    def _validate_method_code(self, code: str, component_id: str) -> Tuple[bool, str, List[str]]:
        """
        Validate and sanitize method code provided by the AI.
        
        This performs basic analysis to ensure the code doesn't contain harmful operations
        and identifies which components are affected by this method.
        
        Args:
            code: The JavaScript method code
            component_id: ID of the component this method belongs to
            
        Returns:
            Tuple of (is_valid, sanitized_code, affected_component_ids)
        """
        # Initialize return values
        is_valid = True
        sanitized_code = code
        affected_components = []
        
        # Check if code is a proper function
        if not (code.strip().startswith('function') or code.strip().startswith('(') or 
                code.strip().startswith('async function')):
            # Wrap bare code block in a function
            sanitized_code = f"function(event, state) {{\n{code}\n}}"
        
        try:
            # Check for disallowed patterns
            disallowed_patterns = [
                r"document\.cookie",
                r"localStorage\.",
                r"sessionStorage\.",
                r"window\.location",
                r"navigator\.",
                r"fetch\(",
                r"XMLHttpRequest",
                r"eval\(",
                r"setTimeout\(",
                r"setInterval\(",
                r"document\.write",
                r"document\.open",
                r"document\.createElement\("
            ]
            
            for pattern in disallowed_patterns:
                if re.search(pattern, sanitized_code):
                    is_valid = False
                    print(f"Warning: Disallowed pattern '{pattern}' found in method code for {component_id}")
            
            # Extract component IDs referenced in the code
            # Look for patterns like $m("#componentId") or getElementById("componentId")
            component_ref_patterns = [
                r'\$m\([\'"]#?([a-zA-Z0-9_-]+)[\'"]\)',
                r'getElementById\([\'"]([a-zA-Z0-9_-]+)[\'"]\)',
                r'state\.components\.[\'"]?([a-zA-Z0-9_-]+)[\'"]?'
            ]
            
            for pattern in component_ref_patterns:
                matches = re.findall(pattern, sanitized_code)
                affected_components.extend(matches)
            
            # Remove duplicates
            affected_components = list(set(affected_components))
            
            # Remove the current component from affected components
            if component_id in affected_components:
                affected_components.remove(component_id)
                
        except Exception as e:
            is_valid = False
            print(f"Error validating method code for {component_id}: {str(e)}")
        
        return is_valid, sanitized_code, affected_components

    def _repair_json(self, json_str: str) -> str:
        """
        Attempt to fix common JSON syntax errors in the given JSON string.
        
        Args:
            json_str: The JSON string to repair
            
        Returns:
            The repaired JSON string
        """
        # Remove any whitespace at the beginning and end
        json_str = json_str.strip()
        
        # Fix missing commas between properties
        json_str = re.sub(r'}\s*{', '},{', json_str)
        json_str = re.sub(r'"\s*{', '",{', json_str)
        json_str = re.sub(r'}\s*"', '},"', json_str)
        
        # Fix missing commas in arrays
        json_str = re.sub(r']\s*\[', '],[', json_str)
        json_str = re.sub(r'"\s*\[', '",[', json_str)
        json_str = re.sub(r']\s*"', '],"', json_str)
        
        # Fix unquoted property names
        json_str = re.sub(r'([{,]\s*)([a-zA-Z0-9_]+)(\s*:)', r'\1"\2"\3', json_str)
        
        # Fix trailing commas
        json_str = re.sub(r',\s*}', '}', json_str)
        json_str = re.sub(r',\s*]', ']', json_str)
        
        # Fix missing quotes around string values
        json_str = re.sub(r':\s*([a-zA-Z][a-zA-Z0-9_]*)\s*([,}])', r':"\1"\2', json_str)
        
        return json_str

    def _aggressive_json_repair(self, json_str: str) -> str:
        """
        Perform more aggressive JSON repair for cases where standard repair fails.
        This approach attempts to extract partial valid JSON or reconstruct the structure.
        
        Args:
            json_str: The JSON string to repair
            
        Returns:
            The repaired JSON string
        """
        print(f"Attempting aggressive JSON repair on: {json_str[:100]}...")
        
        # Apply basic repairs first
        json_str = self._repair_json(json_str)
        
        try:
            # Try to parse as JSON after basic repairs
            json.loads(json_str)
            return json_str  # If it parses correctly, return it
        except json.JSONDecodeError as e:
            print(f"Basic repair failed. Error: {str(e)}")
            
            # Try extracting only the first complete JSON object
            try:
                # Find the first opening brace
                start_idx = json_str.find('{')
                if start_idx >= 0:
                    # Balance the braces to find a complete JSON object
                    brace_count = 0
                    in_string = False
                    escape_next = False
                    
                    for i in range(start_idx, len(json_str)):
                        char = json_str[i]
                        
                        # Handle string boundaries
                        if char == '"' and not escape_next:
                            in_string = not in_string
                        elif char == '\\' and in_string:
                            escape_next = True
                            continue
                        
                        # Only count braces when not in a string
                        if not in_string:
                            if char == '{':
                                brace_count += 1
                            elif char == '}':
                                brace_count -= 1
                                # If we've balanced all braces, we have a complete object
                                if brace_count == 0:
                                    extracted_json = json_str[start_idx:i+1]
                                    try:
                                        # Verify it's valid JSON
                                        json.loads(extracted_json)
                                        print(f"Successfully extracted balanced JSON object")
                                        return extracted_json
                                    except:
                                        # If not valid, continue to the next method
                                        pass
                        
                        escape_next = False
            except Exception as ex:
                print(f"Error in brace balancing: {str(ex)}")
            
            # Try parsing line by line to find JSON
            try:
                lines = json_str.split('\n')
                for i in range(len(lines)):
                    # Try to find a complete JSON object in consecutive lines
                    for j in range(i, len(lines)):
                        subset = '\n'.join(lines[i:j+1])
                        if '{' in subset and '}' in subset:
                            try:
                                # Check if this subset is valid JSON
                                json.loads(subset)
                                print(f"Found valid JSON across lines {i} to {j}")
                                return subset
                            except:
                                # Not valid, continue
                                pass
            except Exception as ex:
                print(f"Error in line-by-line parsing: {str(ex)}")
            
            # Try to extract specific sections like "app" and "components"
            try:
                app_pattern = r'"app"\s*:\s*{[^{}]*(?:{[^{}]*}[^{}]*)*}'
                app_match = re.search(app_pattern, json_str)
                
                components_pattern = r'"components"\s*:\s*\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\]'
                components_match = re.search(components_pattern, json_str)
                
                if app_match and components_match:
                    # Construct a simplified valid JSON
                    repaired_json = '{'
                    repaired_json += app_match.group(0) + ','
                    repaired_json += components_match.group(0) + ','
                    repaired_json += '"layout": {"type": "singlepage", "regions": ["header", "main", "footer"]}'
                    repaired_json += '}'
                    
                    try:
                        # Verify it's valid
                        json.loads(repaired_json)
                        print("Successfully constructed JSON from app and components sections")
                        return repaired_json
                    except Exception as e:
                        print(f"Error validating constructed JSON: {str(e)}")
            except Exception as ex:
                print(f"Error extracting app/components: {str(ex)}")
            
            # Last resort: check if there's a complete JSON object anywhere in the string
            try:
                pattern = r'{[^{}]*(?:{[^{}]*}[^{}]*)*}'
                matches = re.finditer(pattern, json_str)
                
                for match in matches:
                    candidate = match.group(0)
                    try:
                        parsed = json.loads(candidate)
                        # Check if this looks like a valid app config
                        if isinstance(parsed, dict) and ("app" in parsed or "components" in parsed):
                            print(f"Found valid JSON object with app/components")
                            return candidate
                    except:
                        # Not valid JSON, continue
                        pass
            except Exception as ex:
                print(f"Error in regex pattern matching: {str(ex)}")
            
            # If all else fails, return a minimal valid JSON structure
            print("All repair methods failed, returning minimal structure")
            return json.dumps({
                "app": {"name": "Error Recovery App", "description": "JSON repair failed"},
                "layout": {"type": "singlepage", "regions": ["header", "main", "footer"]},
                "components": []
            })

    def _clean_openai_response(self, response_text: str) -> str:
        """
        Extract JSON from OpenAI's response text with enhanced error recovery.
        
        Args:
            response_text: The raw response text from OpenAI
            
        Returns:
            A cleaned JSON string
        """
        # Log the complete response for debugging
        with open("openai_response_debug.txt", "a", encoding="utf-8") as debug_file:
            debug_file.write("\n\n===== NEW RESPONSE =====\n")
            debug_file.write(f"Time: {datetime.datetime.now().isoformat()}\n")
            debug_file.write("Raw response content:\n")
            debug_file.write(response_text)
            debug_file.write("\n===== END RESPONSE =====\n\n")
            
        # Print response length and first/last characters for debugging
        response_length = len(response_text)
        print(f"Received response of length {response_length} characters")
        if response_length > 0:
            print(f"First 30 chars: {repr(response_text[:30])}")
            print(f"Last 30 chars: {repr(response_text[-30:] if response_length >= 30 else response_text)}")
        else:
            print("WARNING: Received empty response from OpenAI")
            with open("openai_request_log.txt", "a", encoding="utf-8") as log_file:
                log_file.write("\nERROR: Received empty response from OpenAI API\n")
        
        # Check if response is empty
        if not response_text or response_text.strip() == "":
            print("Empty response received from OpenAI, returning minimal structure")
            with open("openai_request_log.txt", "a", encoding="utf-8") as log_file:
                log_file.write("\nEmpty response received from OpenAI. Using generic error recovery UI.\n")
            return '{"components": [], "app": {"name": "Error Recovery App - Empty Response"}}'
        
        # First try to find JSON between ```json and ``` markers
        pattern = r'```(?:json)?\s*([\s\S]*?)\s*```'
        matches = re.findall(pattern, response_text)
        
        if matches:
            # Take the longest match as it's most likely to be the complete JSON
            json_str = max(matches, key=len)
            try:
                # Validate it's proper JSON by parsing it
                json.loads(json_str)
                print("Found valid JSON in code block")
                return json_str
            except json.JSONDecodeError as e:
                # If it's not valid JSON, try another approach
                print(f"JSON in code block is invalid: {e}")
                with open("openai_request_log.txt", "a", encoding="utf-8") as log_file:
                    log_file.write(f"\nJSON in code block is invalid: {e}\nCode block content:\n{json_str}\n")
                print("Trying other approaches")
        
        # Second approach: Look for a JSON structure with opening and closing braces
        try:
            # Find the first opening brace
            start_idx = response_text.find('{')
            if start_idx >= 0:
                # Track opening and closing braces to find the complete JSON object
                brace_count = 0
                in_string = False
                escape_next = False
                end_idx = -1
                
                for i in range(start_idx, len(response_text)):
                    char = response_text[i]
                    
                    # Handle string boundaries, accounting for escaped quotes
                    if char == '"' and not escape_next:
                        in_string = not in_string
                    elif char == '\\' and in_string and not escape_next:
                        escape_next = True
                        continue
                    
                    # Only count braces when not inside a string
                    if not in_string:
                        if char == '{':
                            brace_count += 1
                        elif char == '}':
                            brace_count -= 1
                            # Found the matching closing brace
                            if brace_count == 0:
                                end_idx = i + 1
                                break
                    
                    escape_next = False
                
                if end_idx > start_idx:
                    json_str = response_text[start_idx:end_idx]
                    try:
                        # Validate it's proper JSON
                        json.loads(json_str)
                        print("Found valid JSON by brace matching")
                        return json_str
                    except json.JSONDecodeError as e:
                        # Continue to next approach if this fails
                        print(f"JSON from brace matching is invalid: {e}")
                        with open("openai_request_log.txt", "a", encoding="utf-8") as log_file:
                            log_file.write(f"\nJSON from brace matching is invalid: {e}\nExtracted JSON:\n{json_str}\n")
                        
                        try:
                            # Try repairing the JSON if we have a _repair_json method
                            if hasattr(self, '_repair_json'):
                                repaired_json = self._repair_json(json_str)
                                json.loads(repaired_json)
                                print("Successfully repaired JSON")
                                return repaired_json
                        except Exception as repair_e:
                            print(f"Failed to repair JSON: {repair_e}")
                            with open("openai_request_log.txt", "a", encoding="utf-8") as log_file:
                                log_file.write(f"\nFailed to repair JSON: {repair_e}\n")
        except Exception as e:
            print(f"Error in brace matching: {str(e)}")
            with open("openai_request_log.txt", "a", encoding="utf-8") as log_file:
                log_file.write(f"\nError in brace matching: {str(e)}\n")
        
        # Third approach: Try to use a more lenient JSON parsing method
        try:
            # Use regex to find patterns that look like JSON objects
            object_pattern = r'\{\s*".*\}'
            object_match = re.search(object_pattern, response_text, re.DOTALL)
            
            if object_match:
                json_candidate = object_match.group(0)
                # Clean up common JSON issues
                json_candidate = re.sub(r',\s*}', '}', json_candidate)  # Remove trailing commas
                json_candidate = re.sub(r',\s*]', ']', json_candidate)  # Remove trailing commas in arrays
                
                try:
                    # Validate the cleaned JSON
                    json.loads(json_candidate)
                    print("Found valid JSON with pattern matching")
                    return json_candidate
                except json.JSONDecodeError as e:
                    # Continue to fallback if this fails
                    print(f"Pattern matched JSON is invalid: {e}")
                    with open("openai_request_log.txt", "a", encoding="utf-8") as log_file:
                        log_file.write(f"\nPattern matched JSON is invalid: {e}\nMatched content:\n{json_candidate}\n")
        except Exception as e:
            print(f"Error in pattern matching: {str(e)}")
            with open("openai_request_log.txt", "a", encoding="utf-8") as log_file:
                log_file.write(f"\nError in pattern matching: {str(e)}\n")
        
        # If all extraction methods fail, log this and return a minimal valid structure
        print("No valid JSON found in response, returning generic error recovery UI")
        
        with open("openai_request_log.txt", "a", encoding="utf-8") as log_file:
            log_file.write("\nFailed to extract valid JSON from response. Raw response:\n")
            log_file.write("--- BEGIN RAW RESPONSE ---\n")
            log_file.write(response_text)
            log_file.write("\n--- END RAW RESPONSE ---\n")
            log_file.write("\nUsing generic error recovery UI instead.\n")
        
        # Return a minimal valid JSON structure as fallback
        return '{"components": [], "app": {"name": "Error Recovery App"}}'

    def _normalize_component_properties(self, components: List[Dict[str, Any]]) -> None:
        """
        Normalize component properties to ensure consistent naming.
        Handles cases like text vs content property inconsistencies.
        
        Args:
            components: List of component definitions to normalize
        """
        if not isinstance(components, list):
            return
        
        for component in components:
            if not isinstance(component, dict):
                continue
                
            # Ensure there's a properties object
            if "properties" not in component:
                component["properties"] = {}
                
            props = component["properties"]
            
            # Handle text vs content inconsistency in text components
            if component.get("type") == "text":
                # If both text and content exist, prioritize content
                if "text" in props and "content" not in props:
                    props["content"] = props["text"]
                elif "content" in props and "text" not in props:
                    props["text"] = props["content"]
                elif "text" not in props and "content" not in props:
                    # No text content at all, add default
                    props["content"] = "Text content"
                    props["text"] = "Text content"
            
            # Handle button text/label consistency
            if component.get("type") == "button":
                if "label" in props and "text" not in props:
                    props["text"] = props["label"]
                elif "text" in props and "label" not in props:
                    props["label"] = props["text"]
                elif "text" not in props and "label" not in props:
                    # No text content at all, add default
                    props["text"] = "Button"
                    props["label"] = "Button"
            
            # Handle input placeholder/label consistency
            if component.get("type") == "input":
                if "placeholder" not in props:
                    props["placeholder"] = props.get("label", "Enter text...")
                if "label" not in props:
                    props["label"] = props.get("placeholder", "Input")
            
            # Recursively process children for container components
            if component.get("type") == "container" and "children" in props:
                self._normalize_component_properties(props["children"])

    def create_default_calculator_app(self) -> List[Dict[str, Any]]:
        """
        Create a default calculator app with basic functionality.
        Used as a fallback when OpenAI response doesn't contain valid JSON.
            
        Returns:
            List of components for a calculator app
        """
        # Create the calculator components
        calculator_components = [
            # Header component
            {
                "id": "header",
                    "type": "text",
                    "properties": {
                    "text": "Calculator"
                    },
                    "styles": {
                        "fontSize": "24px",
                        "fontWeight": "bold",
                    "textAlign": "center",
                    "padding": "10px",
                    "color": "#333"
                    }
                },
            # Display component
                {
                "id": "display",
                    "type": "text",
                    "properties": {
                    "text": "0"
                    },
                    "styles": {
                    "width": "100%",
                    "padding": "10px",
                    "marginBottom": "15px",
                    "backgroundColor": "#f0f0f0",
                    "border": "1px solid #ccc",
                    "borderRadius": "4px",
                    "fontSize": "24px",
                    "textAlign": "right"
                }
            },
            # Container for buttons
            {
                "id": "buttons-container",
                "type": "container",
                "styles": {
                    "display": "grid",
                    "gridTemplateColumns": "repeat(4, 1fr)",
                    "gap": "10px",
                    "padding": "10px"
                },
                "children": [
                    # Clear button
                    {
                        "id": "clear-btn",
                        "type": "button",
                        "properties": {
                            "text": "C"
                        },
                        "styles": {
                            "backgroundColor": "#ff6347",
                            "color": "white",
                            "padding": "15px",
                            "fontSize": "18px",
                            "borderRadius": "4px",
                            "cursor": "pointer"
                        },
                        "events": {
                            "click": {
                                "code": "function(event, $m) { $m('#display').setText('0'); }"
                            }
                        }
                    },
                    # Number buttons - 7
                    {
                        "id": "btn-7",
                        "type": "button",
                        "properties": {
                            "text": "7"
                        },
                        "styles": {
                            "padding": "15px",
                            "fontSize": "18px",
                            "borderRadius": "4px",
                            "backgroundColor": "#e0e0e0",
                            "cursor": "pointer"
                        },
                        "events": {
                            "click": {
                                "code": "function(event, $m) { const display = $m('#display'); const currentText = display.getText(); display.setText(currentText === '0' ? '7' : currentText + '7'); }"
                            }
                        }
                    },
                    # Number buttons - 8
                    {
                        "id": "btn-8",
                        "type": "button",
                        "properties": {
                            "text": "8"
                        },
                        "styles": {
                            "padding": "15px",
                            "fontSize": "18px",
                            "borderRadius": "4px",
                            "backgroundColor": "#e0e0e0",
                            "cursor": "pointer"
                        },
                        "events": {
                            "click": {
                                "code": "function(event, $m) { const display = $m('#display'); const currentText = display.getText(); display.setText(currentText === '0' ? '8' : currentText + '8'); }"
                            }
                        }
                    },
                    # Number buttons - 9
                    {
                        "id": "btn-9",
                        "type": "button",
                        "properties": {
                            "text": "9"
                        },
                        "styles": {
                            "padding": "15px",
                            "fontSize": "18px",
                            "borderRadius": "4px",
                            "backgroundColor": "#e0e0e0",
                            "cursor": "pointer"
                        },
                        "events": {
                            "click": {
                                "code": "function(event, $m) { const display = $m('#display'); const currentText = display.getText(); display.setText(currentText === '0' ? '9' : currentText + '9'); }"
                            }
                        }
                    },
                    # Operator - Divide
                    {
                        "id": "btn-divide",
                        "type": "button",
                        "properties": {
                            "text": "÷"
                        },
                        "styles": {
                            "padding": "15px",
                            "fontSize": "18px",
                            "borderRadius": "4px",
                            "backgroundColor": "#4CAF50",
                            "color": "white",
                            "cursor": "pointer"
                        },
                        "events": {
                            "click": {
                                "code": "function(event, $m) { const display = $m('#display'); const currentText = display.getText(); display.setText(currentText + '/'); }"
                            }
                        }
                    },
                    # Remaining number and operator buttons would follow the same pattern
                    # Number buttons - 4, 5, 6, and multiply
                    # Number buttons - 1, 2, 3, and subtract
                    # Number buttons - 0, decimal, equals, and add
                    
                    # Footer with attribution
                    {
                        "id": "footer",
                        "type": "text",
                        "properties": {
                            "text": "© Calculator App"
                        },
                        "styles": {
                            "fontSize": "12px",
                            "textAlign": "center",
                            "color": "#666",
                            "marginTop": "20px"
                        }
                    }
                ]
            }
        ]
        
        return calculator_components

    def _find_matching_template(self, user_request: str) -> Optional[Dict[str, Any]]:
        """
        Find a matching template for the user request.
        
        Args:
            user_request: The user's request description
            
        Returns:
            Matching template if found, otherwise None
        """
        # Get available templates from the registry
        app_configs = self.component_registry.get_all_app_configs()
        
        if not app_configs:
            return None
            
        # Convert request to lowercase for case-insensitive matching
        request_lower = user_request.lower()
        
        # Try to find a matching template based on keywords
        for config_id, template in app_configs.items():
            # Skip templates without keywords
            if not template.get("keywords"):
                continue
                
            # Check if any keywords match in the user request
            keywords = [k.lower() for k in template.get("keywords", [])]
            if any(keyword in request_lower for keyword in keywords):
                return template
                
        # Try to find a matching template based on type/name
        for config_id, template in app_configs.items():
            template_type = template.get("type", "").lower()
            template_name = template.get("name", "").lower()
            
            # Check if the template type or name appears in the request
            if template_type and template_type in request_lower:
                return template
            if template_name and template_name in request_lower:
                return template
                
        # No matching template found
        return None
        
    def _create_template_app_config(self, template_match: Dict[str, Any], user_request: str) -> Dict[str, Any]:
        """
        Create an app configuration based on a matched template.
        
        Args:
            template_match: The matched template configuration
            user_request: The user's request description
            
        Returns:
            App configuration dictionary based on the template
        """
        print(f"Using template: {template_match.get('name')} for request: {user_request}")
        
        # Use the template config directly
        app_config = template_match.get("config", {})
        
        # Add request metadata to the app config
        if "app" in app_config:
            app_config["app"]["requestDescription"] = user_request
        
        # Update the app title if possible to reflect the user request
        if "app" in app_config and user_request:
            # Extract a reasonable title from the user request
            title_words = user_request.split()[:5]  # First 5 words max
            title = " ".join(title_words)
            
            # Capitalize the first letter of each word and append if needed
            if len(title_words) < len(user_request.split()):
                title = title.title() + "..."
            else:
                title = title.title()
                
            # Only update if the title seems reasonable (at least 2 words)
            if len(title_words) >= 2:
                app_config["app"]["name"] = title
        
        return app_config
        
    def _get_ui_components_list(self) -> List[Dict[str, Any]]:
        """
        Get all available UI components information from the registry.
        
        Returns:
            List of component definitions
        """
        # Use the correct method name from ComponentRegistry
        registry_components = self.component_registry.get_all_components()
        
        ui_components = []
        
        # Process registry components into a suitable format
        for component_id, component_info in registry_components.items():
            ui_component = {
                "id": component_id,
                "type": component_info.get("type", ""),
                "properties": component_info.get("properties", {}),
                "examples": component_info.get("examples", [])
            }
            ui_components.append(ui_component)
        
        return ui_components
        
    def _process_app_config(self, app_config: Dict[str, Any], user_request: str) -> Dict[str, Any]:
        """
        Process the app configuration.
        
        Args:
            app_config: The app configuration to process
            user_request: The user's request description
            
        Returns:
            Processed app configuration
        """
        # Ensure app config has required sections
        if "app" not in app_config:
            app_config["app"] = {
                "name": f"App for: {user_request[:30]}...",
                "description": user_request,
                "theme": "light"
            }
            
        if "layout" not in app_config:
            app_config["layout"] = {
                "type": "singlepage",
                "regions": ["header", "main", "footer"]
            }
            
        if "components" not in app_config:
            app_config["components"] = []
            
        return app_config
        
    def _process_app_config_imports(self, app_config: Dict[str, Any]) -> None:
        """
        Process app configuration imports.
        
        Args:
            app_config: The app configuration to process
        """
        # Process imports (placeholder for now)
        pass
        
    def _normalize_component_ids(self, app_config: Dict[str, Any]) -> None:
        """
        Normalize component IDs to ensure they are unique.
        
        Args:
            app_config: The app configuration to process
        """
        if not app_config.get("components"):
            return
            
        # Keep track of existing IDs
        existing_ids = set()
        id_counter = 1
        
        # Function to normalize component IDs recursively
        def normalize_ids(components):
            nonlocal id_counter
            
            for component in components:
                # Generate a unique ID if one doesn't exist or is duplicate
                if "id" not in component or component["id"] in existing_ids:
                    component_type = component.get("type", "component")
                    component["id"] = f"{component_type}-{id_counter}"
                    id_counter += 1
                
                # Add the ID to the set of existing IDs
                existing_ids.add(component["id"])
                
                # Process nested components
                if component.get("children") and isinstance(component["children"], list):
                    normalize_ids(component["children"])
                
                # Process components in properties.children as well
                if component.get("properties") and component["properties"].get("children") and isinstance(component["properties"]["children"], list):
                    normalize_ids(component["properties"]["children"])
        
        # Start the normalization
        normalize_ids(app_config["components"])

    def _process_openai_response(self, response: Dict[str, Any], is_streaming: bool = False) -> Dict[str, Any]:
        """
        Process the OpenAI API response to extract the UI configuration.
        
        Args:
            response: The OpenAI API response
            is_streaming: Whether this was a streaming request
            
        Returns:
            The extracted UI configuration
        """
        try:
            # First, log the response for debugging
            self._log_response(response)
            
            # Use the ResponseHandler to process the response
            processed_response = self.response_handler.handle_response(response, is_streaming)
            
            # Validate the processed response
            if processed_response:
                # Further process the response if needed
                self._validate_action_handlers(processed_response)
                
                # Process methods and update component connections
                if "components" in processed_response:
                    self._process_ai_methods(processed_response["components"])
                    
                return processed_response
            else:
                # If response processing failed, return error recovery
                print("Failed to process OpenAI response")
                return self.response_handler._create_error_recovery_response()
                
        except Exception as e:
            # Log the error and return error recovery response
            print(f"Error processing OpenAI response: {str(e)}")
            with open("openai_error_log.txt", "a") as f:
                f.write(f"Error processing response: {str(e)}\n")
                
            return self.response_handler._create_error_recovery_response()

    def _log_response(self, response: Dict[str, Any]) -> None:
        """
        Log the OpenAI API response for debugging purposes.
        
        Args:
            response: The OpenAI API response
        """
        try:
            # Create a log entry with timestamp
            log_entry = f"\n\n===== OPENAI RESPONSE LOG =====\n"
            log_entry += f"Time: {datetime.datetime.now().isoformat()}\n"
            
            # Add the response content if available
            if response and "choices" in response and len(response["choices"]) > 0:
                if "message" in response["choices"][0] and "content" in response["choices"][0]["message"]:
                    content = response["choices"][0]["message"]["content"]
                    log_entry += f"Response content:\n{content}\n"
                else:
                    log_entry += "No content found in response choices.\n"
            else:
                log_entry += "No choices found in response.\n"
                
            log_entry += "===== END RESPONSE LOG =====\n\n"
            
            # Write to the log file
            with open("openai_request_log.txt", "a", encoding="utf-8") as log_file:
                log_file.write(log_entry)
                
        except Exception as e:
            print(f"Error logging OpenAI response: {str(e)}")
            # Create a simple error log if the detailed logging fails
            with open("openai_error_log.txt", "a") as f:
                f.write(f"Error logging response: {str(e)}\n")

    def _normalize_methods_to_events(self, components: List[Dict[str, Any]]) -> None:
        """
        Normalize methods to events for proper frontend handling.
        This ensures that methods like 'onClick' are properly mapped to events like 'click'.
        
        Args:
            components: List of component definitions to normalize
        """
        if not isinstance(components, list):
            return
        
        for component in components:
            if not isinstance(component, dict):
                continue
            
            # Initialize events dictionary if needed
            if "events" not in component:
                component["events"] = {}
            
            # Check if there are methods to convert
            if "methods" in component and isinstance(component["methods"], dict):
                methods = component["methods"]
                
                # Convert onClick to click
                if "onClick" in methods:
                    # Copy the onClick method to the click event
                    component["events"]["click"] = methods["onClick"]
                
                # Convert other common method names
                method_to_event_map = {
                    "onChange": "change",
                    "onSubmit": "submit",
                    "onBlur": "blur",
                    "onFocus": "focus",
                    "onMouseEnter": "mouseenter",
                    "onMouseLeave": "mouseleave",
                    "onKeyDown": "keydown",
                    "onKeyUp": "keyup"
                }
                
                for method_name, event_name in method_to_event_map.items():
                    if method_name in methods:
                        component["events"][event_name] = methods[method_name]
            
            # Process nested components
            if "children" in component and isinstance(component["children"], list):
                self._normalize_methods_to_events(component["children"])
            
            # Process components in properties.children as well
            if "properties" in component and "children" in component["properties"] and isinstance(component["properties"]["children"], list):
                self._normalize_methods_to_events(component["properties"]["children"])

# Create a singleton instance of the component service
component_service = ComponentService() 