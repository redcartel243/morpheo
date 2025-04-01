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
from openai import OpenAI
from dotenv import load_dotenv
import traceback

from .registry import component_registry
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from modules.tools.registry import tool_registry
from .response_validator import response_validator

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
    
    def __init__(self):
        """Initialize the component service."""
        self.component_registry = component_registry
        self.tool_registry = tool_registry
        self._component_connections = []  # Initialize connections list
    
    def generate_app_config(self, user_request: str) -> Dict[str, Any]:
        """
        Generate an app configuration based on a user request.
        This method extracts a valid JSON response from OpenAI for creating the application.
        
        Args:
            user_request: The user's request description
            
        Returns:
            App configuration dictionary
        """
        try:
            # Try to match a template first - Inline the template matching logic
            template_match = None
            
            # Get available templates from the registry
            app_configs = self.component_registry.get_all_app_configs()
            
            if app_configs:
                # Convert request to lowercase for case-insensitive matching
                request_lower = user_request.lower()
                
                # Try to find a matching template based on keywords
                for config_id, template in app_configs.items():
                    # Check if any keywords match in the user request
                    keywords = [k.lower() for k in template.get("keywords", [])]
                    if keywords and any(keyword in request_lower for keyword in keywords):
                        template_match = template
                        break
                
                # If no keyword match, try to find a matching template based on type/name
                if template_match is None:
                    for config_id, template in app_configs.items():
                        template_type = template.get("type", "").lower()
                        template_name = template.get("name", "").lower()
                        
                        # Check if the template type or name appears in the request
                        if (template_type and template_type in request_lower) or \
                           (template_name and template_name in request_lower):
                            template_match = template
                            break
            
            if template_match is not None:
                print(f"Using matching template: {template_match.get('name')}")
                return self._create_template_app_config(template_match, user_request)
            
            # Get the active UI components from config
            ui_components = self._get_ui_components_list()
            app_configs = []
            
            # Generate prompt for app
            prompt = self._create_app_generation_prompt(user_request, ui_components, app_configs)
            
            # Make the API call using the JSON mode for structured outputs
            client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            
            # Define the JSON schema for the app configuration
            json_schema = {
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
                            "regions": {
                                "type": "array",
                                "items": {"type": "string"}
                            }
                        },
                        "required": ["type", "regions"]
                    },
                    "components": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "type": {"type": "string"},
                                "region": {"type": "string"},
                                "properties": {"type": "object"},
                                "styles": {"type": "object"},
                                "methods": {"type": "object"},
                                "children": {"type": "array"}
                            },
                            "required": ["id", "type", "region"]
                        }
                    }
                },
                "required": ["app", "layout", "components"]
            }
            
            # Make API call with the structured output parameter
            response = client.chat.completions.create(
                model="gpt-4o",  # or another suitable model
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": "You are a UI generator that creates complete, valid JSON configurations for web applications."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=4096
            )
            
            # Extract and parse the JSON response
            response_text = response.choices[0].message.content
            
            # Log the response for debugging
            print("Received response from OpenAI")
            with open("openai_request_log.txt", "a", encoding="utf-8") as log_file:
                log_file.write("\nResponse:\n")
                log_file.write(response_text)
                log_file.write("\n--- End of Component-Based UI Generation Response ---\n\n")
            
            # Parse the JSON response
            try:
                app_config = json.loads(response_text)
                print("Successfully parsed JSON response")
            except json.JSONDecodeError as e:
                print(f"Error parsing JSON response: {e}")
                app_config = self._clean_openai_response(response_text)
                if isinstance(app_config, str):
                    try:
                        app_config = json.loads(app_config)
                    except:
                        print("Failed to parse cleaned response, using fallback")
                        return self._create_ai_fallback_app_config(user_request)
            
            # Log the extracted JSON
            with open("openai_request_log.txt", "a", encoding="utf-8") as log_file:
                log_file.write(f"Extracted JSON:\n{json.dumps(app_config)}\n\n")
            
            # Process the app configuration
            app_config = self._process_app_config(app_config, user_request)
            
            # Log the repaired JSON
            with open("openai_request_log.txt", "a", encoding="utf-8") as log_file:
                log_file.write(f"Repaired JSON:\n{json.dumps(app_config)}\n\n")
            
            # Validate and post-process the configuration
            self._process_app_config_imports(app_config)
            self._normalize_component_ids(app_config)
            self._normalize_component_properties(app_config.get("components", []))
            self._validate_action_handlers(app_config)
            
            # Process AI methods
            if app_config.get("components"):
                self._process_ai_methods(app_config["components"])
            
            # Log the validated response
            with open("openai_request_log.txt", "a", encoding="utf-8") as log_file:
                log_file.write("Validated Response:\n")
                log_file.write(json.dumps(app_config, indent=2))
                log_file.write("\n--- End of Validated Response ---\n\n")
            
            return app_config
            
        except Exception as e:
            print(f"Error generating app config: {str(e)}")
            traceback.print_exc()
            
            # Create a fallback app configuration that shows error info
            return self._create_ai_fallback_app_config(user_request)
    
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
    
    def _create_app_generation_prompt(self, user_request: str, ui_components: List[Dict[str, Any]], app_configs: List[Dict[str, Any]], matching_template: Optional[Dict[str, Any]] = None) -> str:
        """
        Create a prompt for app configuration generation.
        
        Args:
            user_request: The user's request description
            ui_components: Available UI components
            app_configs: Available app configurations
            matching_template: Optional template info (deprecated, kept for backward compatibility)
            
        Returns:
            A prompt string
        """
        # Build a comprehensive prompt with all required information
        prompt = f"Generate a modern, interactive UI application configuration based on this request:\n\n\"{user_request}\"\n\n"
        prompt += "IMPORTANT: RESPOND WITH VALID JSON ONLY. NO EXPLANATIONS, MARKDOWN, OR TEXT OUTSIDE THE JSON OBJECT.\n\n"
        
        prompt += "===== APPLICATION STRUCTURE =====\n"
        prompt += "Your response should be a complete JSON object with this structure:\n\n"
        prompt += "{\n"
        prompt += '  "app": {\n'
        prompt += '    "name": "App Name",\n'
        prompt += '    "description": "App Description",\n'
        prompt += '    "theme": "light" or "dark" or custom color scheme\n'
        prompt += "  },\n"
        prompt += '  "layout": {\n'
        prompt += '    "type": "singlepage",\n'
        prompt += '    "regions": ["header", "main", "footer"] // or custom regions\n'
        prompt += "  },\n"
        prompt += '  "components": [\n'
        prompt += "    /* Array of component objects */\n"
        prompt += "  ]\n"
        prompt += "}\n\n"
        
        prompt += "===== COMPONENT DEFINITION =====\n"
        prompt += "Each component in the 'components' array should follow this structure:\n\n"
        prompt += "{\n"
        prompt += '  "id": "unique-id", // Must be unique across all components\n'
        prompt += '  "type": "component-type", // One of the valid types listed below\n'
        prompt += '  "region": "region-name", // Region where this component appears\n'
        prompt += '  "properties": { /* Component properties */ },\n'
        prompt += '  "styles": { /* CSS-compatible styles */ },\n'
        prompt += '  "methods": { /* Event handlers and functions */ },\n'
        prompt += '  "children": [ /* For container components: nested components */ ]\n'
        prompt += "}\n\n"
        
        prompt += "===== AVAILABLE COMPONENT TYPES =====\n"
        prompt += "- text: For displaying text with properties like 'content'\n"
        prompt += "- button: Interactive buttons with properties like 'text'\n"
        prompt += "- input: Text input fields with properties like 'placeholder', 'label'\n"
        prompt += "- checkbox: Toggle elements with properties like 'label', 'checked'\n"
        prompt += "- container: Grouping element that can contain child components\n"
        prompt += "- image: Visual elements with properties like 'alt'\n\n"
        
        prompt += "===== DETAILED STYLING =====\n"
        prompt += "Be creative with styles! You can use:\n"
        prompt += "- All modern CSS properties (camelCase format, e.g., 'backgroundColor' not 'background-color')\n"
        prompt += "- CSS gradients (e.g., 'background: linear-gradient(135deg, #6e8efb, #a777e3)')\n"
        prompt += "- Box shadows for depth (e.g., 'boxShadow: 0 4px 6px rgba(0,0,0,0.1)')\n"
        prompt += "- Border radius for rounded corners (e.g., 'borderRadius: '8px')\n"
        prompt += "- Responsive units like rem, vh, vw (e.g., 'height: '10vh')\n"
        prompt += "- Modern layouts using flexbox or grid (e.g., 'display: 'flex', 'justifyContent: 'space-between')\n\n"
        
        prompt += "===== INTERACTIVE BEHAVIORS =====\n"
        prompt += "Use methods to create interactive behavior. Each method should be a JavaScript function:\n\n"
        prompt += '{\n'
        prompt += '  "methods": {\n'
        prompt += '    "onClick": {\n'
        prompt += '      "code": "function(event, $m) { /* JavaScript code that manipulates components */ }",\n'
        prompt += '      "affectedComponents": ["id-of-component-changed-by-this-method"]\n'
        prompt += '    }\n'
        prompt += '  }\n'
        prompt += '}\n\n'
        
        prompt += "===== DOM MANIPULATION API =====\n"
        prompt += "Use the $m() selector function in your methods to directly manipulate components:\n\n"
        prompt += "- $m('#component-id').setProperty('propertyName', value) - Update a property\n"
        prompt += "- $m('#component-id').getProperty('propertyName') - Read a property value\n"
        prompt += "- $m('#component-id').setStyle('styleName', value) - Change a style property\n"
        prompt += "- $m('#component-id').addClass('className') - Add a CSS class\n"
        prompt += "- $m('#component-id').removeClass('className') - Remove a CSS class\n"
        prompt += "- $m('#component-id').show() - Make a component visible\n"
        prompt += "- $m('#component-id').hide() - Hide a component\n"
        prompt += "- $m('#component-id').toggle() - Toggle visibility\n"
        prompt += "- $m('#component-id').setText(value) - Shorthand for text components\n"
        prompt += "- $m('#component-id').getValue() - Get input value\n"
        prompt += "- $m('#component-id').setValue(value) - Set input value\n"
        prompt += "- $m('#component-id').animate(keyframesObject, options) - Apply CSS animations\n"
        prompt += "- Example: $m('#btn').animate({opacity: [0, 1], transform: ['scale(0.9)', 'scale(1)']}, {duration: 300})\n"
        prompt += "- Pre-built animations: $m('#component-id').fadeIn(), $m('#component-id').fadeOut(), $m('#component-id').slideIn()\n\n"
        
        prompt += "===== CREATING MODERN UIs =====\n"
        prompt += "Create intuitive, visually appealing interfaces by:\n"
        prompt += "- Using consistent color schemes (primary, secondary, accent colors)\n"
        prompt += "- Implementing clear visual hierarchy\n"
        prompt += "- Adding interactive feedback (hover states, click animations)\n"
        prompt += "- Using appropriate spacing and alignment\n"
        prompt += "- Designing for different screen sizes with responsive styles\n"
        prompt += "- Grouping related elements with container components\n\n"
        
        prompt += "===== VISUAL ELEMENTS =====\n"
        prompt += "For visual elements that require images:\n"
        prompt += "- Use CSS styling (colors, gradients, patterns) for most visual effects\n"
        prompt += "- Use themed background colors that match the application purpose\n"
        prompt += "- Only use image URLs if explicitly provided by the user\n"
        prompt += "- Never use placeholder paths like 'path/to/image.jpg'\n"
        prompt += "- Implement visual elements with CSS or unicode characters where possible\n\n"
        
        prompt += "===== COMPONENT EXAMPLES =====\n"
        prompt += "Button with hover effect:\n"
        prompt += '{\n'
        prompt += '  "id": "submit-btn",\n'
        prompt += '  "type": "button",\n'
        prompt += '  "properties": { "text": "Submit" },\n'
        prompt += '  "styles": {\n'
        prompt += '    "padding": "12px 24px",\n'
        prompt += '    "backgroundColor": "#4CAF50",\n'
        prompt += '    "color": "white",\n'
        prompt += '    "border": "none",\n'
        prompt += '    "borderRadius": "4px",\n'
        prompt += '    "cursor": "pointer",\n'
        prompt += '    "transition": "all 0.3s ease"\n'
        prompt += '  },\n'
        prompt += '  "methods": {\n'
        prompt += '    "onMouseEnter": {\n'
        prompt += '      "code": "function(event, $m) { $m(\'#submit-btn\').setStyle(\'transform\', \'scale(1.05)\'); }"\n'
        prompt += '    },\n'
        prompt += '    "onMouseLeave": {\n'
        prompt += '      "code": "function(event, $m) { $m(\'#submit-btn\').setStyle(\'transform\', \'scale(1)\'); }"\n'
        prompt += '    }\n'
        prompt += '  }\n'
        prompt += '}\n\n'
        
        prompt += "===== FINAL REMINDERS =====\n"
        prompt += "1. YOUR RESPONSE MUST BE ONLY VALID JSON, NO TEXT OUTSIDE THE JSON OBJECT\n"
        prompt += "2. ALL COMPONENT IDs MUST BE UNIQUE\n"
        prompt += "3. DON'T USE PLACEHOLDER IMAGE PATHS\n"
        prompt += "4. USE DIRECT DOM MANIPULATION ($m() SELECTOR) IN ALL METHOD CODE\n"
        prompt += "5. ENSURE THE JSON IS COMPLETE, WELL-FORMED AND READY TO USE\n\n"
        
        prompt += "Now, generate a complete, modern, interactive UI configuration that fulfills the request."
        
        return prompt
    
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
        Create a generic, user-friendly error recovery UI when the AI response fails.
        This system provides meaningful feedback and retry options without app-specific logic.
        
        Args:
            user_request: The user's request description
            
        Returns:
            A generic error recovery UI configuration
        """
        # Basic app structure with helpful recovery components
        app_config = {
            "app": {
                "name": "Error Recovery",
                "description": user_request,
                "theme": "light"
            },
            "layout": {
                "type": "singlepage",
                "regions": ["header", "main", "footer"]
            },
            "components": [],
            "regionStyles": {
                "main": {
                    "position": "relative",
                    "height": "calc(100vh - 200px)",
                    "width": "100%",
                    "backgroundColor": "#f8f9fa",
                    "overflow": "auto",
                    "padding": "20px"
                },
                "header": {
                    "height": "80px",
                    "width": "100%",
                    "backgroundColor": "#ffffff",
                    "boxShadow": "0 2px 4px rgba(0,0,0,0.1)",
                    "display": "flex",
                    "alignItems": "center",
                    "justifyContent": "center"
                },
                "footer": {
                    "height": "60px",
                    "width": "100%",
                    "backgroundColor": "#f8f8f8",
                    "borderTop": "1px solid #ddd",
                    "display": "flex",
                    "alignItems": "center",
                    "justifyContent": "center",
                    "padding": "10px"
                }
            }
        }
        
        # Add informative header
        header_title = {
            "id": "header-title",
            "type": "text",
            "region": "header",
            "properties": {
                "content": "We're working on your request"
            },
            "styles": {
                "fontSize": "24px",
                "fontWeight": "bold",
                "padding": "20px",
                "textAlign": "center",
                "color": "#333333"
            }
        }
        app_config["components"].append(header_title)
        
        # Add explanation card
        explanation_card = {
            "id": "explanation-card",
            "type": "container",
            "region": "main",
            "styles": {
                "backgroundColor": "#ffffff",
                "padding": "20px",
                "borderRadius": "8px",
                "boxShadow": "0 2px 8px rgba(0,0,0,0.1)",
                "marginBottom": "20px"
            },
            "children": [
                {
                    "id": "explanation-title",
                    "type": "text",
                    "properties": {
                        "content": "We're having trouble processing your request"
                    },
                    "styles": {
                        "fontSize": "18px",
                        "fontWeight": "bold",
                        "color": "#333",
                        "marginBottom": "12px"
                    }
                },
                {
                    "id": "explanation-text",
                    "type": "text",
                    "properties": {
                        "content": "Our AI is still learning to understand complex requests. You can try again with more specific instructions about what you want to build."
                    },
                    "styles": {
                        "fontSize": "16px",
                        "color": "#555",
                        "lineHeight": "1.5",
                        "marginBottom": "16px"
                    }
                }
            ]
        }
        app_config["components"].append(explanation_card)
        
        # Add user request display
        request_display = {
            "id": "request-card",
            "type": "container",
            "region": "main",
            "styles": {
                "backgroundColor": "#f0f7ff",
                "padding": "16px",
                "borderRadius": "8px",
                "borderLeft": "4px solid #3b82f6",
                "marginBottom": "20px"
            },
            "children": [
                {
                    "id": "request-label",
                    "type": "text",
                    "properties": {
                        "content": "Your request:"
                    },
                    "styles": {
                        "fontSize": "14px",
                        "fontWeight": "bold",
                        "color": "#3b82f6",
                        "marginBottom": "8px"
                    }
                },
                {
                    "id": "request-content",
                    "type": "text",
                    "properties": {
                        "content": user_request
                    },
                    "styles": {
                        "fontSize": "16px",
                        "color": "#333",
                        "fontStyle": "italic"
                    }
                }
            ]
        }
        app_config["components"].append(request_display)
        
        # Add tips for better results
        tips_container = {
            "id": "tips-container",
            "type": "container",
            "region": "main",
            "styles": {
                "backgroundColor": "#ffffff",
                "padding": "20px",
                "borderRadius": "8px",
                "boxShadow": "0 2px 8px rgba(0,0,0,0.1)",
                "marginBottom": "20px"
            },
            "children": [
                {
                    "id": "tips-title",
                    "type": "text",
                    "properties": {
                        "content": "Tips for better results:"
                    },
                    "styles": {
                        "fontSize": "18px",
                        "fontWeight": "bold",
                        "color": "#333",
                        "marginBottom": "12px"
                    }
                },
                {
                    "id": "tip-1",
                    "type": "text",
                    "properties": {
                        "content": "• Be specific about what components you need (buttons, inputs, text fields)"
                    },
                    "styles": {
                        "fontSize": "15px",
                        "color": "#555",
                        "marginBottom": "8px"
                    }
                },
                {
                    "id": "tip-2",
                    "type": "text",
                    "properties": {
                        "content": "• Describe the functionality you want (what should happen when buttons are clicked)"
                    },
                    "styles": {
                        "fontSize": "15px",
                        "color": "#555",
                        "marginBottom": "8px"
                    }
                },
                {
                    "id": "tip-3",
                    "type": "text",
                    "properties": {
                        "content": "• Mention any specific layout or design preferences"
                    },
                    "styles": {
                        "fontSize": "15px",
                        "color": "#555",
                        "marginBottom": "8px"
                    }
                }
            ]
        }
        app_config["components"].append(tips_container)
        
        # Add retry button
        retry_button = {
            "id": "retry-button",
            "type": "button",
            "region": "main",
            "properties": {
                "text": "Try Again"
            },
            "styles": {
                "padding": "12px 24px",
                "margin": "10px auto",
                "backgroundColor": "#3b82f6",
                "color": "white",
                "border": "none",
                "borderRadius": "6px",
                "cursor": "pointer",
                "fontSize": "16px",
                "display": "block",
                "fontWeight": "500",
                "boxShadow": "0 2px 4px rgba(59, 130, 246, 0.25)",
                "transition": "all 0.2s ease"
            }
        }
        app_config["components"].append(retry_button)
        
        # Add footer
        footer_text = {
            "id": "footer-text",
            "type": "text",
            "region": "footer",
            "properties": {
                "content": "© Morpheo - AI-Powered UI Generator"
            },
            "styles": {
                "fontSize": "14px",
                "color": "#666",
                "textAlign": "center"
            }
        }
        app_config["components"].append(footer_text)
        
        return app_config

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
        
        Args:
            app_config: The app configuration to validate
        """
        if not app_config.get("components"):
            return
            
        components = app_config["components"]
        
        # Validate and correct component actions
        for component in components:
            if "events" in component:
                for event_type, event_handler in component["events"].items():
                    if isinstance(event_handler, dict) and "action" in event_handler:
                        action = event_handler["action"]
                        
                        # Handle legacy actions here if needed
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
        
    def _create_template_app_config(self, template: Dict[str, Any], user_request: str) -> Dict[str, Any]:
        """
        Create an app configuration based on a template.
        
        Args:
            template: The template to use
            user_request: The user's request description
            
        Returns:
            App configuration dictionary
        """
        # Use the template to create an app config
        app_config = {
            "app": {
                "name": template.get("name", "Template App"),
                "description": user_request,
                "theme": template.get("theme", "light")
            },
            "layout": template.get("layout", {"type": "singlepage", "regions": ["header", "main", "footer"]}),
            "components": template.get("components", [])
        }
        return app_config
        
    def _get_ui_components_list(self) -> List[Dict[str, Any]]:
        """
        Get a list of available UI components.
        
        Returns:
            List of UI component definitions
        """
        # Use the proper method to get all components from the registry
        # instead of assuming the registry has a values() method
        components = []
        for component_type in self.component_registry.get_all_ui_components().values():
            components.extend(component_type)
        return components
        
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

# Create a singleton instance of the component service
component_service = ComponentService() 