"""
OpenAI Response Handler

This module handles responses from OpenAI API, including handling incomplete
or truncated responses, retrying when necessary, and properly assembling
streaming responses.
"""

import json
import re
import logging
import time
from typing import Dict, Any, Optional, Union, List, Tuple

logger = logging.getLogger("morpheo.response_handler")

class ResponseHandler:
    """
    Handles OpenAI API responses, particularly addressing issues with incomplete
    JSON responses and stream truncation.
    
    Based on OpenAI recommendations: https://platform.openai.com/docs/api-reference/responses
    """
    
    def __init__(self):
        self.max_retries = 3
        self.retry_delay = 1  # seconds
        self.last_response = None
        
    def handle_response(self, response: Dict[str, Any], is_streaming: bool = False) -> Dict[str, Any]:
        """
        Process a response from the OpenAI API, handling any errors or incomplete content.
        
        Args:
            response: The raw OpenAI API response
            is_streaming: Whether this was a streaming request
            
        Returns:
            Processed and validated response dictionary
        """
        self.last_response = response
        
        try:
            # Extract content from the response
            if "choices" in response and len(response["choices"]) > 0:
                if "message" in response["choices"][0] and "content" in response["choices"][0]["message"]:
                    content = response["choices"][0]["message"]["content"]
                else:
                    content = self._extract_content_from_streaming(response) if is_streaming else None
                    
                if not content:
                    print("No content found in OpenAI response")
                    return self._create_error_recovery_response()
                
                # Process the content to extract a valid JSON structure
                app_config = self._process_openai_response(content)
                
                # Verify essential structure exists
                if not self._verify_essential_structure(app_config):
                    print("Essential app structure missing in processed response")
                    return self._create_error_recovery_response()
                
                # Post-process the app configuration to fix common issues
                app_config = self._post_process_app_config(app_config)
                
                return app_config
            else:
                print("No choices found in OpenAI response")
                return self._create_error_recovery_response()
                
        except Exception as e:
            print(f"Error processing OpenAI response: {str(e)}")
            return self._create_error_recovery_response()
    
    def _process_openai_response(self, content: str) -> Dict[str, Any]:
        """
        Process the content of an OpenAI response to extract a valid JSON structure.
        
        Args:
            content: The content from the OpenAI response
            
        Returns:
            Extracted and validated app configuration
        """
        try:
            # First try direct JSON parsing
            try:
                app_config = json.loads(content)
                return app_config
            except json.JSONDecodeError:
                # If direct parsing fails, try other methods
                pass
            
            # Try to find JSON within code blocks
            json_matches = re.findall(r'```(?:json)?\s*([\s\S]*?)\s*```', content)
            if json_matches:
                for json_str in json_matches:
                    try:
                        app_config = json.loads(json_str)
                        return app_config
                    except json.JSONDecodeError:
                        continue
            
            # Try to find JSON between curly braces
            brace_pattern = r'(\{[\s\S]*\})'
            brace_matches = re.findall(brace_pattern, content)
            if brace_matches:
                for json_str in brace_matches:
                    try:
                        app_config = json.loads(json_str)
                        if self._is_valid_app_config(app_config):
                            return app_config
                    except json.JSONDecodeError:
                        continue
            
            # If still no valid JSON, try more aggressive methods
            return self._repair_truncated_json(content)
            
        except Exception as e:
            print(f"Error in _process_openai_response: {str(e)}")
            return self._create_error_recovery_response()
    
    def _repair_truncated_json(self, content: str) -> Dict[str, Any]:
        """
        Attempt to repair truncated or malformed JSON content.
        
        Args:
            content: The potentially truncated JSON content
            
        Returns:
            Repaired JSON structure as a dictionary
        """
        try:
            # Find the start of what looks like a JSON object
            json_start = content.find('{')
            if json_start == -1:
                return self._create_error_recovery_response()
                
            content = content[json_start:]
            
            # Check for and fix common JSON errors
            
            # 1. Missing closing braces
            open_braces = content.count('{')
            close_braces = content.count('}')
            if open_braces > close_braces:
                # Add missing closing braces
                content += '}' * (open_braces - close_braces)
            
            # 2. Missing closing brackets
            open_brackets = content.count('[')
            close_brackets = content.count(']')
            if open_brackets > close_brackets:
                # This is trickier - we need to find where to insert the brackets
                # As a simple approach, add them at the end
                content += ']' * (open_brackets - close_brackets)
            
            # 3. Fix trailing commas
            content = re.sub(r',\s*}', '}', content)
            content = re.sub(r',\s*]', ']', content)
            
            # 4. Try to extract components if JSON is still invalid
            try:
                app_config = json.loads(content)
                return app_config
            except json.JSONDecodeError:
                # Extract components section if possible
                components_match = re.search(r'"components"\s*:\s*(\[[\s\S]*?\])(?=,|\})', content)
                if components_match:
                    components_str = components_match.group(1)
                    try:
                        components = json.loads(components_str)
                        # Create a minimal app structure with the extracted components
                        return {
                            "app": {"name": "Extracted App", "description": "App created from extracted components"},
                            "layout": {"type": "singlepage", "regions": ["header", "main", "footer"]},
                            "components": components
                        }
                    except json.JSONDecodeError:
                        pass
            
            # If all else fails, return error recovery response
            return self._create_error_recovery_response()
            
        except Exception as e:
            print(f"Error repairing truncated JSON: {str(e)}")
            return self._create_error_recovery_response()
    
    def _extract_content_from_streaming(self, response: Dict[str, Any]) -> Optional[str]:
        """
        Extract content from a streaming response.
        
        Args:
            response: The streaming response
            
        Returns:
            Extracted content or None if not found
        """
        try:
            if "choices" in response and len(response["choices"]) > 0:
                # Check different streaming response formats
                choice = response["choices"][0]
                if "delta" in choice and "content" in choice["delta"]:
                    return choice["delta"]["content"]
            return None
        except Exception as e:
            print(f"Error extracting content from streaming response: {str(e)}")
            return None
    
    def _verify_essential_structure(self, app_config: Dict[str, Any]) -> bool:
        """
        Verify that the app configuration has the essential structure.
        
        Args:
            app_config: The app configuration to check
            
        Returns:
            True if the essential structure exists, False otherwise
        """
        # Check for app and components sections
        if not isinstance(app_config, dict):
            return False
            
        # At minimum we need components
        if "components" not in app_config or not isinstance(app_config["components"], list):
            return False
            
        return True
    
    def _is_valid_app_config(self, obj: Any) -> bool:
        """
        Check if an object appears to be a valid app configuration.
        
        Args:
            obj: The object to check
            
        Returns:
            True if it appears to be a valid app configuration, False otherwise
        """
        if not isinstance(obj, dict):
            return False
            
        # Check for essential app configuration elements
        has_components = "components" in obj and isinstance(obj["components"], list)
        has_app = "app" in obj and isinstance(obj["app"], dict)
        
        return has_components or has_app
    
    def _create_error_recovery_response(self) -> Dict[str, Any]:
        """
        Create a user-friendly error recovery response.
        
        Returns:
            A minimal but valid app configuration
        """
        return {
            "app": {
                "name": "Error Recovery",
                "description": "We had trouble processing your request",
                "theme": "light"
            },
            "layout": {
                "type": "singlepage",
                "regions": ["header", "main", "footer"]
            },
            "components": [
                {
                    "id": "error-header",
                    "type": "text",
                    "region": "header",
                    "properties": {
                        "content": "Error Processing Request"
                    },
                    "styles": {
                        "fontSize": "24px",
                        "fontWeight": "bold",
                        "textAlign": "center",
                        "padding": "20px",
                        "color": "#d32f2f"
                    }
                },
                {
                    "id": "error-message",
                    "type": "text",
                    "region": "main",
                    "properties": {
                        "content": "We encountered an issue while processing your request. Please try again with more specific instructions."
                    },
                    "styles": {
                        "fontSize": "16px",
                        "textAlign": "center",
                        "padding": "20px",
                        "color": "#333",
                        "lineHeight": "1.5"
                    }
                },
                {
                    "id": "retry-button",
                    "type": "button",
                    "region": "main",
                    "properties": {
                        "text": "Try Again"
                    },
                    "styles": {
                        "display": "block",
                        "margin": "20px auto",
                        "padding": "10px 20px",
                        "backgroundColor": "#2196f3",
                        "color": "white",
                        "border": "none",
                        "borderRadius": "4px",
                        "cursor": "pointer",
                        "fontSize": "16px"
                    }
                }
            ]
        }
    
    def _post_process_app_config(self, app_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Post-process the app configuration to fix common issues and improve the UI.
        
        Args:
            app_config: The app configuration to process
            
        Returns:
            Processed app configuration
        """
        # Ensure app section exists
        if "app" not in app_config:
            app_config["app"] = {
                "name": "Generated App",
                "description": "Application generated from OpenAI response",
                "theme": "light"
            }
        
        # Ensure layout section exists
        if "layout" not in app_config:
            app_config["layout"] = {
                "type": "singlepage",
                "regions": ["header", "main", "footer"]
            }
        
        # Process each component to fix common issues
        self._process_components_recursively(app_config["components"])
        
        return app_config
    
    def _process_components_recursively(self, components: List[Dict[str, Any]], parent_id: str = None) -> None:
        """
        Process components recursively to fix common issues.
        
        Args:
            components: List of components to process
            parent_id: ID of the parent component for context
        """
        if not isinstance(components, list):
            return
            
        for i, component in enumerate(components):
            if not isinstance(component, dict):
                continue
                
            # Ensure component has an ID
            if "id" not in component:
                component_type = component.get("type", "component")
                component["id"] = f"{component_type}-{i}"
            
            # Fix region if missing
            if "region" not in component and parent_id is None:
                component["region"] = "main"
            
            # Process by component type
            component_type = component.get("type")
            
            if component_type == "button":
                self._fix_button_component(component)
            elif component_type == "text":
                self._fix_text_component(component)
            elif component_type == "input":
                self._fix_input_component(component)
            
            # Process children recursively
            if "children" in component and isinstance(component["children"], list):
                self._process_components_recursively(component["children"], component["id"])
    
    def _fix_button_component(self, component: Dict[str, Any]) -> None:
        """
        Fix common issues with button components.
        
        Args:
            component: Button component to fix
        """
        # Ensure properties exists
        if "properties" not in component:
            component["properties"] = {}
        
        # Ensure text property exists
        if "text" not in component["properties"]:
            # Try to derive text from ID
            button_id = component.get("id", "")
            if button_id.startswith("btn-"):
                text = button_id[4:].capitalize()
            else:
                text = "Button"
            component["properties"]["text"] = text
        
        # Add default styles if missing
        if "styles" not in component:
            component["styles"] = {}
        
        styles = component["styles"]
        if not styles.get("backgroundColor") and not styles.get("background-color"):
            styles["backgroundColor"] = "#4CAF50"
        if not styles.get("color"):
            styles["color"] = "white"
        if not styles.get("padding"):
            styles["padding"] = "8px 16px"
        if not styles.get("borderRadius"):
            styles["borderRadius"] = "4px"
        if not styles.get("cursor"):
            styles["cursor"] = "pointer"
        
        # Fix button events - ensure calculator buttons have proper click handlers
        if "events" not in component:
            component["events"] = {}
        
        # Add default click handler if not present
        if "click" not in component["events"]:
            component_id = component.get("id", "")
            
            # For calculator buttons (number buttons)
            if component_id.startswith("btn-") and component_id[4:].isdigit():
                digit = component_id[4:]
                component["events"]["click"] = {
                    "code": f"""function(event, $m) {{
                        try {{
                            const display = $m('#display');
                            const currentText = display.getText();
                            if (currentText === '0') {{
                                display.setText('{digit}');
                            }} else {{
                                display.setText(currentText + '{digit}');
                            }}
                        }} catch (error) {{
                            console.error('Error in button click handler:', error);
                        }}
                    }}""",
                    "affectedComponents": ["display"]
                }
            # For operator buttons
            elif component_id == "btn-add":
                component["events"]["click"] = {
                    "code": """function(event, $m) {
                        try {
                            const display = $m('#display');
                            const currentText = display.getText();
                            display.setText(currentText + '+');
                        } catch (error) {
                            console.error('Error in button click handler:', error);
                        }
                    }""",
                    "affectedComponents": ["display"]
                }
            elif component_id == "btn-subtract":
                component["events"]["click"] = {
                    "code": """function(event, $m) {
                        try {
                            const display = $m('#display');
                            const currentText = display.getText();
                            display.setText(currentText + '-');
                        } catch (error) {
                            console.error('Error in button click handler:', error);
                        }
                    }""",
                    "affectedComponents": ["display"]
                }
            elif component_id == "btn-multiply":
                component["events"]["click"] = {
                    "code": """function(event, $m) {
                        try {
                            const display = $m('#display');
                            const currentText = display.getText();
                            display.setText(currentText + '*');
                        } catch (error) {
                            console.error('Error in button click handler:', error);
                        }
                    }""",
                    "affectedComponents": ["display"]
                }
            elif component_id == "btn-divide":
                component["events"]["click"] = {
                    "code": """function(event, $m) {
                        try {
                            const display = $m('#display');
                            const currentText = display.getText();
                            display.setText(currentText + '/');
                        } catch (error) {
                            console.error('Error in button click handler:', error);
                        }
                    }""",
                    "affectedComponents": ["display"]
                }
            elif component_id == "btn-equals":
                component["events"]["click"] = {
                    "code": """function(event, $m) {
                        try {
                            const display = $m('#display');
                            const expression = display.getText();
                            try {
                                // Use Function instead of eval for better safety
                                const result = Function('"use strict"; return (' + expression + ')')();
                                display.setText(String(result));
                            } catch (evalError) {
                                display.setText('Error');
                                setTimeout(() => display.setText('0'), 1000);
                            }
                        } catch (error) {
                            console.error('Error in equals button handler:', error);
                        }
                    }""",
                    "affectedComponents": ["display"]
                }
            elif component_id == "btn-clear":
                component["events"]["click"] = {
                    "code": """function(event, $m) {
                        try {
                            $m('#display').setText('0');
                        } catch (error) {
                            console.error('Error in clear button handler:', error);
                        }
                    }""",
                    "affectedComponents": ["display"]
                }
            elif component_id == "btn-decimal":
                component["events"]["click"] = {
                    "code": """function(event, $m) {
                        try {
                            const display = $m('#display');
                            const currentText = display.getText();
                            if (!currentText.includes('.')) {
                                display.setText(currentText + '.');
                            }
                        } catch (error) {
                            console.error('Error in decimal button handler:', error);
                        }
                    }""",
                    "affectedComponents": ["display"]
                }
            else:
                # Generic button handler
                component["events"]["click"] = {
                    "code": """function(event, $m) {
                        try {
                            console.log("Button clicked");
                        } catch (error) {
                            console.error('Error in button click handler:', error);
                        }
                    }"""
                }
    
    def _fix_text_component(self, component: Dict[str, Any]) -> None:
        """
        Fix common issues with text components.
        
        Args:
            component: Text component to fix
        """
        # Ensure properties exists
        if "properties" not in component:
            component["properties"] = {}
        
        # Ensure content property exists
        if "content" not in component["properties"] and "text" not in component["properties"]:
            component["properties"]["content"] = "Text"
        elif "text" in component["properties"] and "content" not in component["properties"]:
            component["properties"]["content"] = component["properties"]["text"]
        elif "content" in component["properties"] and "text" not in component["properties"]:
            component["properties"]["text"] = component["properties"]["content"]
    
    def _fix_input_component(self, component: Dict[str, Any]) -> None:
        """
        Fix common issues with input components.
        
        Args:
            component: Input component to fix
        """
        # Ensure properties exists
        if "properties" not in component:
            component["properties"] = {}
        
        # Ensure placeholder exists
        if "placeholder" not in component["properties"]:
            component["properties"]["placeholder"] = "Enter text..."
        
        # Add default events for form functionality
        if "events" not in component:
            component["events"] = {}
        
        if "change" not in component["events"]:
            component["events"]["change"] = {
                "code": """function(event, $m) {
                    try {
                        const value = event.target.value;
                        console.log("Input changed:", value);
                    } catch (error) {
                        console.error('Error in input change handler:', error);
                    }
                }"""
            } 