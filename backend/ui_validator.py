from typing import List, Dict, Any, Tuple
import copy
import uuid
import json
import re

def is_ui_config_complete(ui_config: Dict[str, Any], app_type: str) -> Tuple[bool, List[str]]:
    """
    Validate if an AI-generated UI configuration is complete and functional.
    Returns a tuple of (is_complete, missing_elements)
    """
    missing_elements = []
    
    # Check for required top-level fields
    required_top_level = ["components", "layout", "theme", "functionality"]
    for field in required_top_level:
        if field not in ui_config or not ui_config[field]:
            missing_elements.append(f"Missing top-level field: {field}")
    
    # Check if there are any components
    if "components" in ui_config and isinstance(ui_config["components"], list):
        if len(ui_config["components"]) == 0:
            missing_elements.append("No components found")
    else:
        missing_elements.append("Invalid components field")
        
    # Check functionality type
    if "functionality" in ui_config and isinstance(ui_config["functionality"], dict):
        if "type" not in ui_config["functionality"] or not ui_config["functionality"]["type"]:
            missing_elements.append("Missing functionality type")
        elif ui_config["functionality"]["type"] != app_type and app_type != "generic":
            missing_elements.append(f"Functionality type mismatch: expected {app_type}, got {ui_config['functionality']['type']}")
    
    # App-specific validations
    if app_type == "calculator":
        # Check for calculator display
        has_display = False
        has_number_buttons = False
        has_operator_buttons = False
        
        for component in ui_config.get("components", []):
            if component.get("type") == "input" and component.get("props", {}).get("role") == "display":
                has_display = True
            if component.get("type") == "button" and component.get("props", {}).get("value", "").isdigit():
                has_number_buttons = True
            if component.get("type") == "button" and component.get("props", {}).get("value") in ["+", "-", "*", "/"]:
                has_operator_buttons = True
                
            # Check children recursively
            def check_children(children):
                nonlocal has_display, has_number_buttons, has_operator_buttons
                for child in children:
                    if isinstance(child, dict):
                        if child.get("type") == "input" and child.get("props", {}).get("role") == "display":
                            has_display = True
                        if child.get("type") == "button" and child.get("props", {}).get("value", "").isdigit():
                            has_number_buttons = True
                        if child.get("type") == "button" and child.get("props", {}).get("value") in ["+", "-", "*", "/"]:
                            has_operator_buttons = True
                        if child.get("children"):
                            check_children(child["children"])
            
            if component.get("children"):
                check_children(component["children"])
        
        if not has_display:
            missing_elements.append("Calculator missing display input")
        if not has_number_buttons:
            missing_elements.append("Calculator missing number buttons")
        if not has_operator_buttons:
            missing_elements.append("Calculator missing operator buttons")
    
    elif app_type == "todo":
        # Check for todo list essentials
        has_input = False
        has_add_button = False
        has_list = False
        
        for component in ui_config.get("components", []):
            if component.get("type") == "input" and not component.get("props", {}).get("role") == "display":
                has_input = True
            if component.get("type") == "button" and "add" in str(component.get("props", {}).get("action", "")).lower():
                has_add_button = True
            if component.get("type") == "list":
                has_list = True
                
            # Check children recursively
            def check_children(children):
                nonlocal has_input, has_add_button, has_list
                for child in children:
                    if isinstance(child, dict):
                        if child.get("type") == "input" and not child.get("props", {}).get("role") == "display":
                            has_input = True
                        if child.get("type") == "button" and "add" in str(child.get("props", {}).get("action", "")).lower():
                            has_add_button = True
                        if child.get("type") == "list":
                            has_list = True
                        if child.get("children"):
                            check_children(child["children"])
            
            if component.get("children"):
                check_children(component["children"])
        
        if not has_input:
            missing_elements.append("Todo app missing input field")
        if not has_add_button:
            missing_elements.append("Todo app missing add button")
        if not has_list:
            missing_elements.append("Todo app missing list component")
    
    elif app_type == "canvas":
        # Check for canvas essentials
        has_canvas = False
        has_color_picker = False
        has_clear_button = False
        
        for component in ui_config.get("components", []):
            if component.get("type") == "canvas":
                has_canvas = True
            if component.get("type") == "input" and component.get("props", {}).get("type") == "color":
                has_color_picker = True
            if component.get("type") == "button" and "clear" in str(component.get("props", {}).get("action", "")).lower():
                has_clear_button = True
                
            # Check children recursively
            def check_children(children):
                nonlocal has_canvas, has_color_picker, has_clear_button
                for child in children:
                    if isinstance(child, dict):
                        if child.get("type") == "canvas":
                            has_canvas = True
                        if child.get("type") == "input" and child.get("props", {}).get("type") == "color":
                            has_color_picker = True
                        if child.get("type") == "button" and "clear" in str(child.get("props", {}).get("action", "")).lower():
                            has_clear_button = True
                        if child.get("children"):
                            check_children(child["children"])
            
            if component.get("children"):
                check_children(component["children"])
        
        if not has_canvas:
            missing_elements.append("Canvas app missing canvas element")
        if not has_color_picker:
            missing_elements.append("Canvas app missing color picker")
        if not has_clear_button:
            missing_elements.append("Canvas app missing clear button")
    
    # Return result
    return len(missing_elements) == 0, missing_elements

def merge_template_with_ai_config(ai_config: Dict[str, Any], template_config: Dict[str, Any], missing_elements: List[str]) -> Dict[str, Any]:
    """
    Merge an AI-generated config with a template to fill in missing parts
    """
    result_config = copy.deepcopy(ai_config)
    
    # If missing top-level fields, copy from template
    if "Missing top-level field: components" in missing_elements:
        result_config["components"] = template_config["components"]
    if "Missing top-level field: layout" in missing_elements:
        result_config["layout"] = template_config["layout"]
    if "Missing top-level field: theme" in missing_elements:
        result_config["theme"] = template_config["theme"]
    if "Missing top-level field: functionality" in missing_elements:
        result_config["functionality"] = template_config["functionality"]
    
    # App-specific merges
    if "Calculator missing display input" in missing_elements:
        # Find the display input in the template
        for component in template_config["components"]:
            if component.get("type") == "container":
                for child in component.get("children", []):
                    if child.get("type") == "input" and child.get("props", {}).get("role") == "display":
                        # Add this display to the AI config
                        result_config["components"].append(child)
                        break
    
    if "Calculator missing number buttons" in missing_elements or "Calculator missing operator buttons" in missing_elements:
        # Find the keypad in the template
        for component in template_config["components"]:
            if component.get("type") == "container":
                for child in component.get("children", []):
                    if child.get("id") == "calculator-keypad":
                        # Add this keypad to the AI config
                        result_config["components"].append(child)
                        break
    
    if "Todo app missing input field" in missing_elements or "Todo app missing add button" in missing_elements:
        # Find the input container in the template
        for component in template_config["components"]:
            if component.get("type") == "container":
                for child in component.get("children", []):
                    if child.get("id") == "todo-input-container":
                        # Add this input container to the AI config
                        result_config["components"].append(child)
                        break
    
    if "Todo app missing list component" in missing_elements:
        # Find the list in the template
        for component in template_config["components"]:
            if component.get("type") == "container":
                for child in component.get("children", []):
                    if child.get("type") == "list":
                        # Add this list to the AI config
                        result_config["components"].append(child)
                        break
    
    if "Canvas app missing canvas element" in missing_elements:
        # Find the canvas in the template
        for component in template_config["components"]:
            if component.get("type") == "container":
                for child in component.get("children", []):
                    if child.get("type") == "canvas":
                        # Add this canvas to the AI config
                        result_config["components"].append(child)
                        break
    
    if "Canvas app missing color picker" in missing_elements or "Canvas app missing clear button" in missing_elements:
        # Find the toolbar in the template
        for component in template_config["components"]:
            if component.get("type") == "container":
                for child in component.get("children", []):
                    if child.get("id") == "canvas-toolbar":
                        # Add this toolbar to the AI config
                        result_config["components"].append(child)
                        break
    
    return result_config

def create_error_ui(prompt: str, error_message: str) -> Dict[str, Any]:
    """
    Create a default UI config for error cases
    """
    return {
        "components": [
            {
                "type": "container",
                "id": f"error-container-{uuid.uuid4()}",
                "props": {
                    "className": "error-container"
                },
                "children": [
                    {
                        "type": "text",
                        "id": f"error-text-{uuid.uuid4()}",
                        "props": {
                            "text": f"Error generating UI: {error_message}",
                            "variant": "heading"
                        },
                        "children": [],
                        "styles": {
                            "color": "red",
                            "marginBottom": "16px"
                        },
                        "events": {}
                    },
                    {
                        "type": "text",
                        "id": f"prompt-text-{uuid.uuid4()}",
                        "props": {
                            "text": f"Your prompt: {prompt}"
                        },
                        "children": [],
                        "styles": {
                            "marginBottom": "16px"
                        },
                        "events": {}
                    }
                ],
                "styles": {
                    "padding": "16px",
                    "border": "1px solid red",
                    "borderRadius": "4px"
                },
                "events": {}
            }
        ],
        "layout": {
            "type": "flex",
            "config": {}
        },
        "theme": {
            "colors": {},
            "typography": {},
            "spacing": {}
        },
        "functionality": {
            "type": "default",
            "config": {}
        }
    }

def attempt_json_repair(incomplete_json: str) -> Tuple[bool, Dict[str, Any] or str]:
    """
    Attempts to repair incomplete JSON strings
    Returns a tuple of (success, repaired_json_object or error_message)
    """
    try:
        # First try to parse as is
        try:
            return True, json.loads(incomplete_json)
        except json.JSONDecodeError:
            pass
        
        # Try to find and fix common JSON issues
        
        # 1. Check for unclosed braces/brackets
        open_braces = incomplete_json.count('{')
        close_braces = incomplete_json.count('}')
        open_brackets = incomplete_json.count('[')
        close_brackets = incomplete_json.count(']')
        
        # If we have unclosed braces or brackets, try to add them
        repaired_json = incomplete_json
        
        # Add missing closing braces
        if open_braces > close_braces:
            repaired_json += '}' * (open_braces - close_braces)
        
        # Add missing closing brackets
        if open_brackets > close_brackets:
            repaired_json += ']' * (open_brackets - close_brackets)
        
        # 2. Check for trailing commas
        repaired_json = re.sub(r',\s*([}\]])', r'\1', repaired_json)
        
        # 3. Check for missing commas between elements
        repaired_json = re.sub(r'(["\d])\s*{', r'\1, {', repaired_json)
        repaired_json = re.sub(r'(["\d])\s*\[', r'\1, [', repaired_json)
        
        # 4. Check for unquoted property names
        repaired_json = re.sub(r'([{,])\s*([a-zA-Z0-9_]+)\s*:', r'\1 "\2":', repaired_json)
        
        # 5. Fix missing quotes around string values
        repaired_json = re.sub(r':\s*([a-zA-Z][a-zA-Z0-9_]*)\s*([,}])', r': "\1"\2', repaired_json)
        
        # 6. Fix truncated strings (missing closing quotes)
        # Find strings that start with a quote but don't end with one before a comma or brace
        repaired_json = re.sub(r':\s*"([^"]*?)([,}])', r': "\1"\2', repaired_json)
        
        # 7. Fix invalid escape sequences in regular expressions
        # This specifically targets the common pattern of unescaped forward slashes in regex patterns
        repaired_json = re.sub(r'(if\s*\(!\/)([^\/]+)(\/)([^\/]+)(\/\.test)', r'\1\2\\\3\4\5', repaired_json)
        
        # 8. Fix other invalid escape sequences
        repaired_json = re.sub(r'\\([^"\\/bfnrtu])', r'\\\\\1', repaired_json)
        
        # 9. Fix missing colons in key-value pairs
        repaired_json = re.sub(r'"([^"]+)"\s+(["{[])', r'"\1": \2', repaired_json)
        
        # 10. Fix truncated arrays
        if repaired_json.count('[') > repaired_json.count(']'):
            # Find the last open bracket without a matching close bracket
            last_open = repaired_json.rindex('[')
            next_close = repaired_json.find(']', last_open)
            if next_close == -1:
                # No closing bracket found, add one at the end
                repaired_json += ']'
        
        # 11. Fix regex pattern escaping in JSON strings
        # This is a more comprehensive approach to fix regex patterns in JSON
        def fix_regex_escapes(match):
            regex_pattern = match.group(1)
            # Double escape backslashes
            fixed_pattern = regex_pattern.replace('\\', '\\\\')
            # Escape forward slashes
            fixed_pattern = fixed_pattern.replace('/', '\\/')
            return f'"{fixed_pattern}"'
        
        # Look for regex patterns in JSON strings
        repaired_json = re.sub(r'"(\/[^"]*\/[gimuy]*)"', fix_regex_escapes, repaired_json)
        
        # 12. Fix specific issue with calculator regex pattern
        repaired_json = repaired_json.replace('!/^[0-9+\\-*/.()]+$/', '!/^[0-9+\\\\-*\\\\/.()]+$/')
        
        # Try to parse the repaired JSON
        try:
            return True, json.loads(repaired_json)
        except json.JSONDecodeError as e:
            # If repair failed, try a more aggressive approach for specific errors
            if "Expecting ',' delimiter" in str(e):
                # Try to insert a comma at the error position
                pos = e.pos
                repaired_json = repaired_json[:pos] + ',' + repaired_json[pos:]
                try:
                    return True, json.loads(repaired_json)
                except json.JSONDecodeError:
                    pass
            
            # If all repairs failed, return the error
            return False, f"JSON repair failed: {str(e)}"
    
    except Exception as e:
        return False, f"Error during JSON repair: {str(e)}"

def extract_partial_json(text: str) -> str:
    """
    Attempts to extract a partial JSON object from text that might contain non-JSON content
    """
    # Try to find JSON between code blocks
    if "```json" in text:
        parts = text.split("```json")
        if len(parts) > 1:
            json_part = parts[1].split("```")[0].strip()
            return json_part
    
    # Try to find JSON between regular code blocks
    if "```" in text:
        parts = text.split("```")
        if len(parts) > 1:
            json_part = parts[1].strip()
            return json_part
    
    # Look for JSON-like structure (starting with { and containing key-value pairs)
    match = re.search(r'({[\s\S]*})', text)
    if match:
        return match.group(1)
    
    # If we can identify a partial JSON structure with unclosed braces
    # Count opening and closing braces
    open_braces = text.count('{')
    close_braces = text.count('}')
    
    if open_braces > close_braces:
        # Find the position of the first opening brace
        first_brace = text.find('{')
        if first_brace >= 0:
            # Extract from the first opening brace to the end
            partial_json = text[first_brace:]
            # Add missing closing braces
            partial_json += '}' * (open_braces - close_braces)
            return partial_json
    
    # Try to extract the largest JSON-like structure
    # This is useful when the response contains multiple JSON objects
    json_like_parts = re.findall(r'({[^{}]*(?:{[^{}]*}[^{}]*)*})', text)
    if json_like_parts:
        # Return the largest JSON-like structure
        return max(json_like_parts, key=len)
    
    # If all else fails, return the original text
    return text 