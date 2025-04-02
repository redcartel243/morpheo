"""
Headless Testing Framework for Morpheo Applications

This module provides infrastructure for testing Morpheo-generated applications
without needing a browser environment. It simulates DOM events and component
state changes to verify application behavior.
"""

import json
import re
import sys
import os
from typing import Dict, List, Any, Optional, Callable, Tuple, Union
from dataclasses import dataclass
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("morpheo_test")

# Add parent directory to path to import from the backend package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from components.service import ComponentService

@dataclass
class DomEvent:
    """Represents a simulated DOM event"""
    type: str
    target_id: str
    properties: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.properties is None:
            self.properties = {}

@dataclass
class TestStep:
    """A single step in a test scenario"""
    event: DomEvent
    expected_changes: Dict[str, Any]
    description: str = ""

@dataclass
class TestScenario:
    """A complete test scenario with multiple steps"""
    name: str
    description: str
    steps: List[TestStep]
    setup_steps: List[TestStep] = None
    
    def __post_init__(self):
        if self.setup_steps is None:
            self.setup_steps = []

class DomElement:
    """Simulates a DOM element for testing purposes"""
    
    def __init__(self, component_id: str, properties: Dict[str, Any]):
        self.id = component_id
        self.properties = properties or {}
        self.style = {}
        self.value = ""
        self.text_content = ""
        self.children = []
        self.event_listeners = {}
        self.attributes = {}
        
    def set_style(self, prop: str, value: str) -> 'DomElement':
        """Set a style property"""
        self.style[prop] = value
        return self
        
    def get_style(self, prop: str) -> str:
        """Get a style property"""
        return self.style.get(prop, "")
        
    def set_property(self, prop: str, value: Any) -> 'DomElement':
        """Set a DOM property"""
        self.properties[prop] = value
        return self
        
    def get_property(self, prop: str) -> Any:
        """Get a DOM property"""
        return self.properties.get(prop)
        
    def set_text(self, text: str) -> 'DomElement':
        """Set text content"""
        self.text_content = text
        return self
        
    def get_text(self) -> str:
        """Get text content"""
        return self.text_content
        
    def set_value(self, value: str) -> 'DomElement':
        """Set input value"""
        self.value = value
        return self
        
    def get_value(self) -> str:
        """Get input value"""
        return self.value
        
    def add_event_listener(self, event_type: str, callback: Callable) -> None:
        """Add an event listener"""
        if event_type not in self.event_listeners:
            self.event_listeners[event_type] = []
        self.event_listeners[event_type].append(callback)
        
    def trigger_event(self, event_type: str, event_data: Dict[str, Any] = None) -> None:
        """Trigger an event on this element"""
        if event_data is None:
            event_data = {}
            
        event = {
            "type": event_type,
            "target": {
                "id": self.id,
                "value": self.value
            },
            **event_data
        }
        
        if event_type in self.event_listeners:
            for callback in self.event_listeners[event_type]:
                callback(event)
                
    def set_attribute(self, name: str, value: str) -> 'DomElement':
        """Set an attribute"""
        self.attributes[name] = value
        return self
        
    def get_attribute(self, name: str) -> str:
        """Get an attribute"""
        return self.attributes.get(name, "")
        
    def querySelector(self, selector: str) -> Optional['DomElement']:
        """Simulate querySelector - very basic implementation"""
        # Only support ID selectors for now
        if selector.startswith('#'):
            element_id = selector[1:]
            if element_id == self.id:
                return self
            # Not found
            return None
        return None
        
    def querySelectorAll(self, selector: str) -> List['DomElement']:
        """Simulate querySelectorAll - very basic implementation"""
        result = []
        if self.querySelector(selector):
            result.append(self.querySelector(selector))
        return result
        
    def closest(self, selector: str) -> Optional['DomElement']:
        """Simulate closest - very basic implementation"""
        return self.querySelector(selector)
        
    def show(self) -> 'DomElement':
        """Show the element"""
        self.style['display'] = 'block'
        return self
        
    def hide(self) -> 'DomElement':
        """Hide the element"""
        self.style['display'] = 'none'
        return self

class MorpheoTester:
    """
    Headless testing framework for Morpheo applications.
    
    This class provides an environment for testing Morpheo-generated applications
    without a browser, simulating the DOM, events, and component interactions.
    """
    
    def __init__(self):
        self.component_service = ComponentService()
        self.dom_elements = {}
        self.event_handlers = {}
        self.component_methods = {}
        self.current_app_config = None
        
    def load_app_json(self, app_json: Union[str, Dict]) -> None:
        """
        Load an application configuration for testing.
        
        Args:
            app_json: Either a JSON string or a dictionary with app configuration
        """
        if isinstance(app_json, str):
            try:
                self.current_app_config = json.loads(app_json)
            except json.JSONDecodeError:
                logger.error("Failed to parse app JSON")
                raise
        else:
            self.current_app_config = app_json
            
        # Initialize DOM elements and extract handlers
        self._initialize_from_config()
        
    def load_app_from_file(self, file_path: str) -> None:
        """
        Load an application configuration from a JSON file.
        
        Args:
            file_path: Path to the JSON configuration file
        """
        try:
            with open(file_path, 'r') as f:
                app_json = json.load(f)
                self.load_app_json(app_json)
        except Exception as e:
            logger.error(f"Failed to load app from file: {str(e)}")
            raise
    
    def _initialize_from_config(self) -> None:
        """Initialize testing environment from loaded configuration"""
        if not self.current_app_config or not self.current_app_config.get("components"):
            logger.error("No valid app configuration loaded")
            return
            
        # Reset state
        self.dom_elements = {}
        self.event_handlers = {}
        self.component_methods = {}
        
        # Process components
        self._process_components(self.current_app_config.get("components", []))
        
        # Run initialization methods
        self._run_initialization()
        
    def _process_components(self, components: List[Dict[str, Any]], parent_id: str = None) -> None:
        """
        Process components to extract DOM elements, event handlers and methods.
        
        Args:
            components: List of component configurations
            parent_id: ID of parent component, if any
        """
        for component in components:
            component_id = component.get("id")
            if not component_id:
                continue
                
            # Create DOM element
            self.dom_elements[component_id] = DomElement(
                component_id=component_id,
                properties=component.get("properties", {})
            )
            
            # Set initial text
            if "text" in component:
                self.dom_elements[component_id].set_text(component["text"])
                
            # Extract event handlers
            if "events" in component and isinstance(component["events"], dict):
                for event_type, handler in component["events"].items():
                    if isinstance(handler, dict) and "code" in handler:
                        if component_id not in self.event_handlers:
                            self.event_handlers[component_id] = {}
                        self.event_handlers[component_id][event_type] = handler["code"]
            
            # Extract methods
            if "methods" in component and isinstance(component["methods"], dict):
                for method_name, method_data in component["methods"].items():
                    method_code = ""
                    if isinstance(method_data, dict) and "code" in method_data:
                        method_code = method_data["code"]
                    elif isinstance(method_data, str):
                        method_code = method_data
                        
                    if method_code:
                        if component_id not in self.component_methods:
                            self.component_methods[component_id] = {}
                        self.component_methods[component_id][method_name] = method_code
            
            # Process nested components
            if "children" in component and isinstance(component["children"], list):
                self._process_components(component["children"], component_id)
                
            if "properties" in component and "children" in component["properties"] and isinstance(component["properties"]["children"], list):
                self._process_components(component["properties"]["children"], component_id)
    
    def _run_initialization(self) -> None:
        """Run initialization methods for all components"""
        for component_id, methods in self.component_methods.items():
            if "initialize" in methods:
                self._execute_js_function(
                    component_id, 
                    methods["initialize"], 
                    {"type": "initialize", "target": {"id": component_id}}
                )
    
    def _selector_function(self, selector: str) -> Optional[DomElement]:
        """
        Implementation of the $m selector function used in JavaScript handlers.
        
        Args:
            selector: CSS-like selector (only supports #id format)
            
        Returns:
            DomElement if found, None otherwise
        """
        if selector.startswith('#'):
            element_id = selector[1:]
            return self.dom_elements.get(element_id)
        return None
    
    def _execute_js_function(self, component_id: str, code: str, event_data: Dict[str, Any]) -> Any:
        """
        Execute JS code in our simulated environment.
        
        Args:
            component_id: ID of the component
            code: JavaScript code to execute
            event_data: Event data to pass to the function
            
        Returns:
            Result of the execution, if any
        """
        try:
            # Extract function body
            function_match = re.match(r'function\s*\([^)]*\)\s*{([\s\S]*)}', code)
            if function_match:
                function_body = function_match.group(1).strip()
            else:
                function_body = code
                
            # This is a simplified simulator - we're not actually running JS code
            # Instead, we interpret common patterns and simulate their effects
            
            # Simulate $m selector calls - pattern: $m('#elementId').method()
            selector_calls = re.findall(r'\$m\([\'"]([^\'"]*)[\'"]\)\.([a-zA-Z]+)\(([^)]*)\)', function_body)
            for selector, method, args_str in selector_calls:
                target_element = self._selector_function(selector)
                if target_element:
                    # Parse arguments (simplified)
                    args = []
                    if args_str.strip():
                        # Very basic argument parsing - doesn't handle nested structures well
                        args = [arg.strip(' \'"') for arg in args_str.split(',')]
                    
                    # Call the appropriate method on the element
                    if method == 'setText' and args:
                        target_element.set_text(args[0])
                    elif method == 'setValue' and args:
                        target_element.set_value(args[0])
                    elif method == 'setStyle' and len(args) >= 2:
                        target_element.set_style(args[0], args[1])
                    elif method == 'setProperty' and len(args) >= 2:
                        target_element.set_property(args[0], args[1])
                    elif method == 'show':
                        target_element.show()
                    elif method == 'hide':
                        target_element.hide()
            
            # Simulate reading text content - pattern: $m('#elementId').getText()
            get_text_calls = re.findall(r'\$m\([\'"]([^\'"]*)[\'"]\)\.getText\(\)', function_body)
            for selector in get_text_calls:
                target_element = self._selector_function(selector)
                if target_element:
                    # Just simulating the read - not actually replacing in code
                    text = target_element.get_text()
                    logger.debug(f"Read text from {selector}: {text}")
            
            # Simulate reading values - pattern: $m('#elementId').getValue()
            get_value_calls = re.findall(r'\$m\([\'"]([^\'"]*)[\'"]\)\.getValue\(\)', function_body)
            for selector in get_value_calls:
                target_element = self._selector_function(selector)
                if target_element:
                    # Just simulating the read - not actually replacing in code
                    value = target_element.get_value()
                    logger.debug(f"Read value from {selector}: {value}")
                    
            # Log that the function executed
            logger.debug(f"Executed handler for component {component_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error executing code for component {component_id}: {str(e)}")
            return False
    
    def trigger_event(self, event: DomEvent) -> bool:
        """
        Trigger an event on a component.
        
        Args:
            event: The DOM event to trigger
            
        Returns:
            True if the event was handled, False otherwise
        """
        component_id = event.target_id
        if component_id not in self.event_handlers or event.type not in self.event_handlers[component_id]:
            logger.debug(f"No handler for {event.type} event on component {component_id}")
            return False
            
        # Prepare event data
        event_data = {
            "type": event.type,
            "target": {
                "id": component_id,
                **event.properties
            }
        }
        
        # Execute handler
        code = self.event_handlers[component_id][event.type]
        return self._execute_js_function(component_id, code, event_data)
    
    def get_component_state(self, component_id: str) -> Dict[str, Any]:
        """
        Get the current state of a component.
        
        Args:
            component_id: ID of the component
            
        Returns:
            Dictionary with component state
        """
        if component_id not in self.dom_elements:
            return {}
            
        element = self.dom_elements[component_id]
        return {
            "text": element.get_text(),
            "value": element.get_value(),
            "style": element.style,
            "properties": element.properties,
            "attributes": element.attributes
        }
    
    def run_test_scenario(self, scenario: TestScenario) -> Tuple[bool, List[str]]:
        """
        Run a complete test scenario.
        
        Args:
            scenario: The test scenario to run
            
        Returns:
            Tuple of (success, list of error messages)
        """
        logger.info(f"Running test scenario: {scenario.name}")
        logger.info(f"Description: {scenario.description}")
        
        success = True
        errors = []
        
        # Run setup steps
        for i, step in enumerate(scenario.setup_steps):
            logger.info(f"Running setup step {i+1}")
            if step.description:
                logger.info(f"Description: {step.description}")
                
            # Trigger event
            self.trigger_event(step.event)
        
        # Run test steps
        for i, step in enumerate(scenario.steps):
            logger.info(f"Running test step {i+1}")
            if step.description:
                logger.info(f"Description: {step.description}")
                
            # Trigger event
            self.trigger_event(step.event)
            
            # Verify expected changes
            for component_id, expected_state in step.expected_changes.items():
                actual_state = self.get_component_state(component_id)
                
                # Check each expected property
                for prop, expected_value in expected_state.items():
                    if prop == "text":
                        actual_value = actual_state.get("text", "")
                        if actual_value != expected_value:
                            success = False
                            error_msg = f"Step {i+1}: Component {component_id} text mismatch. Expected: '{expected_value}', Actual: '{actual_value}'"
                            errors.append(error_msg)
                            logger.error(error_msg)
                    elif prop == "value":
                        actual_value = actual_state.get("value", "")
                        if actual_value != expected_value:
                            success = False
                            error_msg = f"Step {i+1}: Component {component_id} value mismatch. Expected: '{expected_value}', Actual: '{actual_value}'"
                            errors.append(error_msg)
                            logger.error(error_msg)
                    elif prop == "style":
                        for style_prop, style_value in expected_value.items():
                            actual_style = actual_state.get("style", {}).get(style_prop)
                            if actual_style != style_value:
                                success = False
                                error_msg = f"Step {i+1}: Component {component_id} style.{style_prop} mismatch. Expected: '{style_value}', Actual: '{actual_style}'"
                                errors.append(error_msg)
                                logger.error(error_msg)
                    elif prop == "properties":
                        for prop_name, prop_value in expected_value.items():
                            actual_prop = actual_state.get("properties", {}).get(prop_name)
                            if actual_prop != prop_value:
                                success = False
                                error_msg = f"Step {i+1}: Component {component_id} property.{prop_name} mismatch. Expected: '{prop_value}', Actual: '{actual_prop}'"
                                errors.append(error_msg)
                                logger.error(error_msg)
        
        return success, errors 