"""
Response Validator and Transformer for Morpheo AI

This module handles validation and transformation of AI-generated component structures
to ensure they follow best practices and can be properly processed by the frontend.

Key functions:
- Validate JSON structure
- Add missing initial state values
- Convert JavaScript expressions to proper JSON format
- Ensure position behaviors have proper random functions
"""

import json
import re
import random
import logging
from typing import Dict, Any, Optional, List, Union

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ResponseValidator:
    """
    Validates and transforms AI-generated response structures to ensure they're
    properly formatted and include necessary state information.
    """
    
    def __init__(self):
        """Initialize the validator"""
        pass
    
    def validate_and_transform(self, response_text: str) -> Dict[str, Any]:
        """
        Main entry point - validate and transform an AI response
        
        Args:
            response_text: The raw text response from the AI
            
        Returns:
            A properly validated and transformed component structure
        """
        try:
            # First try to parse the response as JSON
            try:
                structure = json.loads(response_text)
            except json.JSONDecodeError as e:
                # Try to extract the JSON portion if parsing fails
                json_match = re.search(r'({[\s\S]*})', response_text)
                if json_match:
                    try:
                        structure = json.loads(json_match.group(1))
                    except json.JSONDecodeError:
                        # If that fails, try to fix common issues in the JSON
                        fixed_json = self._fix_json_syntax(response_text)
                        structure = json.loads(fixed_json)
                else:
                    raise ValueError(f"Could not extract valid JSON from response: {e}")
            
            # Extract application structure if wrapped
            if "applicationStructure" in structure:
                app_structure = structure["applicationStructure"]
            else:
                app_structure = structure
            
            # Flatten nested components
            self._flatten_nested_components(app_structure)
            
            # Validate and transform the structure
            self._validate_structure(app_structure)
            self._ensure_initial_state(app_structure)
            self._transform_javascript_expressions(app_structure)
            self._check_for_position_behaviors(app_structure)
            
            # Return the transformed structure
            if "applicationStructure" in structure:
                structure["applicationStructure"] = app_structure
                return structure
            else:
                return app_structure
            
        except Exception as e:
            logger.error(f"Error validating response: {e}")
            # Return a basic error structure
            return self._create_fallback_structure("Error validating AI response")
    
    def _validate_structure(self, structure: Dict[str, Any]) -> None:
        """
        Validate the basic structure of the application
        
        Args:
            structure: The application structure to validate
            
        Raises:
            ValueError if required fields are missing
        """
        # Check for required fields
        if "components" not in structure or not isinstance(structure["components"], list):
            raise ValueError("Structure missing required 'components' array")
        
        # Check for connections field
        if "connections" not in structure:
            structure["connections"] = []
        
        # Check for layout field and ensure it's properly formatted
        if "layout" not in structure:
            structure["layout"] = {
                "type": "container",
                "regions": ["header", "main", "footer"]
            }
        elif not isinstance(structure["layout"], dict):
            structure["layout"] = {
                "type": "container",
                "regions": ["header", "main", "footer"]
            }
        elif "regions" not in structure["layout"]:
            structure["layout"]["regions"] = ["header", "main", "footer"]
        elif isinstance(structure["layout"]["regions"], dict):
            # If regions is an object with keys, convert it to an array of the keys
            structure["layout"]["regions"] = list(structure["layout"]["regions"].keys())
        elif not isinstance(structure["layout"]["regions"], list):
            structure["layout"]["regions"] = ["header", "main", "footer"]
        
        # Valid component types
        valid_types = ["text", "button", "input", "select", "checkbox", "toggle", "image", "container"]
        
        # Check each component has required fields and fix invalid component types
        for i, component in enumerate(structure["components"]):
            if "type" not in component:
                raise ValueError(f"Component at index {i} missing required 'type' field")
            
            # Fix invalid component types
            if component["type"] == "ui":
                # Determine the actual type based on properties
                if "text" in component.get("properties", {}):
                    # If it has a text property, it's likely a text display component
                    component["type"] = "text"
                    # Make sure it uses the correct property name for text components
                    if "text" in component["properties"] and "content" not in component["properties"]:
                        component["properties"]["content"] = component["properties"]["text"]
                elif "value" in component.get("properties", {}) or "placeholder" in component.get("properties", {}):
                    # If it has value or placeholder, it's likely an input
                    component["type"] = "input"
                else:
                    # Default to text for unknown ui components
                    component["type"] = "text"
                    
                # Log the type conversion
                logger.info(f"Converted generic 'ui' component to '{component['type']}' at index {i}")
            
            if "properties" not in component:
                component["properties"] = {}
            
            # Ensure each component has a region
            if "region" not in component:
                component["region"] = "main"
    
    def _ensure_initial_state(self, structure: Dict[str, Any]) -> None:
        """
        Ensure the structure has proper initial state values
        
        Args:
            structure: The application structure to validate
        """
        # Create initialState if it doesn't exist
        if "initialState" not in structure:
            structure["initialState"] = {}
        
        # Check for buttons with position-related properties
        has_position_component = False
        for component in structure["components"]:
            # Check for components that need position
            if component.get("type") == "button" and any(
                p in str(component.get("properties", {})).lower() 
                for p in ["position", "move", "location", "random"]
            ):
                has_position_component = True
                
                # Check styles for position properties
                styles = component.get("styles", {})
                if isinstance(styles, dict) and any(
                    p in styles for p in ["position", "top", "left", "bottom", "right"]
                ):
                    has_position_component = True
                
                # Check for position-related behaviors
                if "behaviors" in component:
                    for behavior in component.get("behaviors", []):
                        if behavior.get("type", "").lower() in ["position", "animation", "move"]:
                            has_position_component = True
        
        # If we have position components but no position state, add it
        if has_position_component:
            # Add initial position state with random but valid initial values
            if "position" not in structure["initialState"]:
                structure["initialState"]["position"] = {
                    "top": f"{random.randint(10, 50)}%",
                    "left": f"{random.randint(10, 50)}%"
                }
            
            # Add initial button size state
            if "buttonSize" not in structure["initialState"]:
                structure["initialState"]["buttonSize"] = {
                    "width": "120px",
                    "height": "40px"
                }
            
            # Add initial button color state
            if "buttonColor" not in structure["initialState"]:
                structure["initialState"]["buttonColor"] = {
                    "background": "#3b82f6",
                    "text": "#ffffff"
                }
            
        # Look for state references in component properties
        for component in structure["components"]:
            self._check_property_state_references(component, structure["initialState"])
    
    def _check_property_state_references(self, component: Dict[str, Any], initial_state: Dict[str, Any]) -> None:
        """
        Check component properties for state references and ensure they exist in initial state
        
        Args:
            component: The component to check
            initial_state: The initial state dictionary to update
        """
        properties = component.get("properties", {})
        styles = component.get("styles", {})
        
        # Check properties for template variables or state references
        for key, value in properties.items():
            if isinstance(value, str):
                # Check for template variables {{varName}}
                template_vars = re.findall(r'{{([^{}]+)}}', value)
                for var in template_vars:
                    parts = var.split('.')
                    if len(parts) > 1:
                        # Create nested state objects if needed
                        current = initial_state
                        for i, part in enumerate(parts[:-1]):
                            if part not in current:
                                current[part] = {}
                            current = current[part]
                        
                        # Add default value if final part is missing
                        if parts[-1] not in current:
                            # Pick a sensible default based on property name
                            if any(p in parts[-1].lower() for p in ["count", "number", "index"]):
                                current[parts[-1]] = 0
                            elif any(p in parts[-1].lower() for p in ["text", "label", "content"]):
                                current[parts[-1]] = "Default Text"
                            elif any(p in parts[-1].lower() for p in ["enabled", "visible", "active"]):
                                current[parts[-1]] = True
                            else:
                                current[parts[-1]] = ""
        
        # Also check styles for template variables
        for key, value in styles.items():
            if isinstance(value, str):
                template_vars = re.findall(r'{{([^{}]+)}}', value)
                for var in template_vars:
                    parts = var.split('.')
                    if len(parts) > 1:
                        # Create nested state objects if needed
                        current = initial_state
                        for i, part in enumerate(parts[:-1]):
                            if part not in current:
                                current[part] = {}
                            current = current[part]
                        
                        # Add position-specific defaults
                        if parts[-1] not in current:
                            if parts[-1] in ["top", "bottom", "y"]:
                                current[parts[-1]] = f"{random.randint(10, 80)}%"
                            elif parts[-1] in ["left", "right", "x"]:
                                current[parts[-1]] = f"{random.randint(10, 80)}%"
                            elif parts[-1] in ["width", "height"]:
                                current[parts[-1]] = "100px"
                            else:
                                current[parts[-1]] = "0px"
    
    def _transform_javascript_expressions(self, structure: Dict[str, Any]) -> None:
        """
        Transform any JavaScript expressions in the structure to valid JSON
        
        Args:
            structure: The application structure to transform
        """
        # Check connections for JavaScript expressions
        for connection in structure.get("connections", []):
            if "transformerFunction" in connection:
                # Check if it's a JavaScript expression instead of a named function
                transformer = connection["transformerFunction"]
                if isinstance(transformer, str) and (
                    "=>" in transformer or 
                    "function" in transformer or 
                    "Math.random" in transformer
                ):
                    # Replace with an appropriate named function
                    if "random" in transformer.lower():
                        connection["transformerFunction"] = "randomPosition"
                    elif "Math.floor" in transformer or "Math.ceil" in transformer:
                        connection["transformerFunction"] = "randomNumber"
                    elif "!" in transformer:
                        connection["transformerFunction"] = "negate"
                    elif "+" in transformer:
                        connection["transformerFunction"] = "add"
                    elif "-" in transformer:
                        connection["transformerFunction"] = "subtract"
                    elif "*" in transformer:
                        connection["transformerFunction"] = "multiply"
                    elif "/" in transformer:
                        connection["transformerFunction"] = "divide"
                    else:
                        # Default to identity function
                        connection["transformerFunction"] = "identity"
                    
                    # Log the transformation
                    logger.info(f"Transformed JavaScript expression to named function: {transformer} -> {connection['transformerFunction']}")
        
        # Check component properties for JavaScript expressions
        for component in structure.get("components", []):
            properties = component.get("properties", {})
            for key, value in list(properties.items()):
                if isinstance(value, str) and (
                    "=>" in value or 
                    "function" in value or 
                    "Math.random" in value
                ):
                    # Replace with a reasonable default
                    if "random" in value.lower():
                        properties[key] = "Will be randomized"
                    else:
                        properties[key] = "Dynamic value"
    
    def _check_for_position_behaviors(self, structure: Dict[str, Any]) -> None:
        """
        Check for components that need position behavior and add it if missing
        
        Args:
            structure: The application structure to transform
        """
        # Ensure the structure has regionStyles for proper component positioning
        if "regionStyles" not in structure:
            structure["regionStyles"] = {
                "main": {
                    "position": "relative",
                    "height": "100vh",
                    "width": "100%",
                    "backgroundColor": "#f5f5f5",
                    "overflow": "hidden"
                }
            }
        
        # Look for components that should have position behavior
        for component in structure.get("components", []):
            if component.get("type") == "button":
                # Ensure the button has styles
                if "styles" not in component:
                    component["styles"] = {}
                
                # Ensure position styling is set
                styles = component["styles"]
                if "position" not in styles:
                    styles["position"] = "absolute"
                
                # Ensure the button is visible with appropriate styling
                if "display" not in styles:
                    styles["display"] = "block"
                
                # If using absolute positioning, ensure top and left are set
                if styles.get("position") == "absolute" and ("top" not in styles or "left" not in styles):
                    styles["top"] = f"{random.randint(20, 60)}%"
                    styles["left"] = f"{random.randint(20, 60)}%"
                
                # Add some basic styling if not present
                if "backgroundColor" not in styles:
                    styles["backgroundColor"] = "#3b82f6"
                if "color" not in styles:
                    styles["color"] = "#ffffff"
                if "padding" not in styles:
                    styles["padding"] = "10px 20px"
                if "borderRadius" not in styles:
                    styles["borderRadius"] = "5px"
                if "cursor" not in styles:
                    styles["cursor"] = "pointer"
                if "zIndex" not in styles:
                    styles["zIndex"] = "10"
                
                # Ensure properties include visible text
                if "properties" not in component:
                    component["properties"] = {}
                if "text" not in component["properties"] and "label" not in component["properties"]:
                    component["properties"]["text"] = "Click Me!"
                
                # Check for position-related properties
                if any(p in str(component).lower() for p in ["position", "move", "random", "location"]):
                    # Check if the component already has position behavior
                    has_position_behavior = False
                    has_style_behavior = False
                    
                    if "behaviors" in component:
                        for behavior in component.get("behaviors", []):
                            if behavior.get("type", "").lower() in ["position", "animation", "move"]:
                                has_position_behavior = True
                            if behavior.get("type", "").lower() in ["style", "appearance"]:
                                has_style_behavior = True
                    else:
                        component["behaviors"] = []
                    
                    # If no position behavior, add one
                    if not has_position_behavior:
                        component["behaviors"].append({
                            "type": "position",
                            "options": {
                                "useRandomPosition": True
                            }
                        })
                    
                    # If no style behavior, add one
                    if not has_style_behavior:
                        component["behaviors"].append({
                            "type": "style",
                            "options": {
                                "useRandomStyles": True,
                                "properties": ["size", "color"]
                            }
                        })
                        
                    # Also ensure there's a connection from click to position update
                    source_id = None
                    for i, comp in enumerate(structure.get("components", [])):
                        if comp.get("id") == component.get("id"):
                            source_id = str(i)
                            break
                    
                    if source_id is not None:
                        # Initialize connections if not exists
                        if "connections" not in structure:
                            structure["connections"] = []
                        
                        # Check if a similar connection already exists
                        has_position_connection = False
                        for conn in structure.get("connections", []):
                            if conn.get("sourceId") == source_id and conn.get("sourcePoint") == "click":
                                has_position_connection = True
                                break
                        
                        if not has_position_connection:
                            structure.get("connections", []).append({
                                "sourceId": source_id,
                                "sourcePoint": "click",
                                "targetId": source_id,
                                "targetPoint": "position",
                                "transformerFunction": "randomPosition"
                            })
    
    def _fix_json_syntax(self, json_str: str) -> str:
        """
        Fix common JSON syntax issues in the AI response
        
        Args:
            json_str: The JSON string to fix
            
        Returns:
            Fixed JSON string
        """
        # Try to extract the JSON object
        matches = re.findall(r'({[\s\S]*})', json_str)
        if matches:
            json_str = matches[0]
        
        # Fix JavaScript expressions
        json_str = re.sub(r'(\w+\s*:\s*)function\s*\(', r'\1"function(', json_str)
        json_str = re.sub(r'(\w+\s*:\s*)\(.*\)\s*=>\s*', r'\1"', json_str)
        
        # Fix trailing commas
        json_str = re.sub(r',\s*([}\]])', r'\1', json_str)
        
        # Fix missing quotes around property names
        json_str = re.sub(r'([{,]\s*)(\w+)(\s*:)', r'\1"\2"\3', json_str)
        
        # Fix Math.random expressions
        json_str = re.sub(r'Math\.random\(\)\s*\*\s*\d+', '"randomValue"', json_str)
        json_str = re.sub(r'Math\.floor\(.*?\)', '"randomValue"', json_str)
        
        return json_str
    
    def _create_fallback_structure(self, error_message: str) -> Dict[str, Any]:
        """
        Create a fallback application structure when validation fails
        
        Args:
            error_message: The error message to display
            
        Returns:
            A simple fallback application structure
        """
        return {
            "components": [
                {
                    "type": "text",
                    "properties": {
                        "text": "Error Processing AI Response"
                    },
                    "styles": {
                        "fontSize": "24px",
                        "fontWeight": "bold",
                        "margin": "20px 0"
                    }
                },
                {
                    "type": "text",
                    "properties": {
                        "text": error_message
                    },
                    "styles": {
                        "fontSize": "16px",
                        "margin": "10px 0",
                        "color": "red"
                    }
                },
                {
                    "type": "button",
                    "properties": {
                        "label": "Try Again"
                    },
                    "styles": {
                        "padding": "10px 20px",
                        "margin": "20px 0",
                        "backgroundColor": "#3b82f6",
                        "color": "white",
                        "border": "none",
                        "borderRadius": "5px",
                        "cursor": "pointer"
                    }
                }
            ],
            "connections": [],
            "initialState": {}
        }

    def _flatten_nested_components(self, structure: Dict[str, Any]) -> None:
        """
        Flatten nested components so they're all at the top level
        
        Args:
            structure: The application structure to transform
        """
        if "components" not in structure:
            structure["components"] = []
            return
            
        flattened_components = []
        
        # Process each top-level component
        for component in structure["components"]:
            # Add the component itself to the flattened list
            flattened_components.append(component)
            
            # Check if the component has nested components
            if "components" in component and isinstance(component["components"], list):
                # Get the parent component's region
                parent_region = component.get("region", "main")
                parent_id = component.get("id", "container")
                
                # Process each nested component
                for nested_component in component["components"]:
                    # If region is not specified, use the parent's region
                    if "region" not in nested_component:
                        nested_component["region"] = parent_region
                    
                    # Special handling for buttons
                    if nested_component.get("type") == "button":
                        # Ensure button has styles
                        if "styles" not in nested_component:
                            nested_component["styles"] = {}
                            
                        # Ensure button has visible styles
                        styles = nested_component["styles"]
                        if "position" not in styles:
                            styles["position"] = "absolute"
                        if "display" not in styles:
                            styles["display"] = "block"
                        
                        # Ensure button has position if absolute
                        if styles.get("position") == "absolute" and ("top" not in styles or "left" not in styles):
                            if "top" not in styles:
                                styles["top"] = "40%"
                            if "left" not in styles:
                                styles["left"] = "40%"
                                
                        # Make sure button is visible
                        if "zIndex" not in styles:
                            styles["zIndex"] = "10"
                            
                        # Ensure events for position update
                        if "events" in nested_component and "onClick" in nested_component["events"]:
                            onClick = nested_component["events"]["onClick"]
                            if onClick.get("action") == "updatePosition":
                                onClick["action"] = "updateState"
                                onClick["params"] = {
                                    "key": f"{nested_component.get('id', 'button')}.position",
                                    "value": {
                                        "x": "random",
                                        "y": "random"
                                    }
                                }
                                
                        # Ensure behaviors for position and style
                        if "behaviors" not in nested_component:
                            nested_component["behaviors"] = []
                        
                        # Check if behaviors exist already
                        has_position_behavior = False
                        has_style_behavior = False
                        
                        for behavior in nested_component["behaviors"]:
                            if behavior.get("type") == "position":
                                has_position_behavior = True
                            if behavior.get("type") == "style":
                                has_style_behavior = True
                                
                        # Add behaviors if missing
                        if not has_position_behavior:
                            nested_component["behaviors"].append({
                                "type": "position",
                                "options": {
                                    "useRandomPosition": True
                                }
                            })
                            
                        if not has_style_behavior:
                            nested_component["behaviors"].append({
                                "type": "style",
                                "options": {
                                    "useRandomStyles": True,
                                    "properties": ["size", "color"]
                                }
                            })
                        
                    # Add a parentId property to maintain relationship
                    nested_component["parentId"] = parent_id
                    
                    # Add the nested component to the flattened list
                    flattened_components.append(nested_component)
                
                # Remove the nested components from the parent
                del component["components"]
        
        # Replace the structure's components with the flattened list
        structure["components"] = flattened_components


# Create a singleton instance
response_validator = ResponseValidator() 