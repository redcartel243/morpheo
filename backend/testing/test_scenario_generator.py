"""
Test Scenario Generator

This module provides functions to generate test scenarios for common application types.
It creates appropriate interaction sequences and validation criteria based on the
application structure and expected behaviors.
"""

import json
import re
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass

from .headless_test_framework import DomEvent, TestStep, TestScenario, MorpheoTester

class TestScenarioGenerator:
    """
    Generator for common test scenarios based on application structure.
    """
    
    def __init__(self, app_config: Dict[str, Any]):
        """
        Initialize the test scenario generator with an app configuration.
        
        Args:
            app_config: The application configuration
        """
        self.app_config = app_config
        self.components = app_config.get("components", [])
        self.component_map = self._build_component_map()
        
    def _build_component_map(self) -> Dict[str, Any]:
        """Build a map of component ID to component for easier lookup"""
        component_map = {}
        
        def process_components(components: List[Dict[str, Any]]):
            for component in components:
                if "id" in component:
                    component_map[component["id"]] = component
                
                if "children" in component and isinstance(component["children"], list):
                    process_components(component["children"])
                
                if "properties" in component and "children" in component["properties"] and isinstance(component["properties"]["children"], list):
                    process_components(component["properties"]["children"])
        
        process_components(self.components)
        return component_map
    
    def generate_calculator_test(self) -> TestScenario:
        """
        Generate a test scenario for a calculator application.
        
        Returns:
            A test scenario for a calculator app
        """
        # Find calculator-related components
        number_buttons = []
        operation_buttons = []
        display_component = None
        equals_button = None
        clear_button = None
        
        for component_id, component in self.component_map.items():
            component_type = component.get("type", "").lower()
            component_text = component.get("text", "").lower()
            component_id_lower = component_id.lower()
            
            # Identify numeric buttons
            if (component_type == "button" and 
                (component_text.isdigit() or 
                 any(digit in component_id_lower for digit in ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]))):
                number_buttons.append(component_id)
            
            # Identify operation buttons
            elif (component_type == "button" and 
                  (component_text in ["+", "-", "*", "/", "×", "÷"] or
                   any(op in component_id_lower for op in ["add", "plus", "subtract", "minus", "multiply", "divide"]))):
                operation_buttons.append(component_id)
            
            # Identify display element
            elif (component_type in ["div", "span", "label", "input"] and
                  (component_id_lower.startswith("result") or
                   component_id_lower.startswith("display") or
                   component_id_lower.startswith("output") or
                   "result" in component_id_lower or
                   "display" in component_id_lower or
                   "output" in component_id_lower or
                   "screen" in component_id_lower)):
                display_component = component_id
            
            # Identify equals button
            elif (component_type == "button" and
                  (component_text == "=" or
                   component_id_lower.startswith("equal") or
                   "equal" in component_id_lower or
                   "calculate" in component_id_lower or
                   "compute" in component_id_lower)):
                equals_button = component_id
            
            # Identify clear button
            elif (component_type == "button" and
                  (component_text in ["C", "CE", "AC", "Clear"] or
                   component_id_lower.startswith("clear") or
                   "clear" in component_id_lower or
                   "reset" in component_id_lower)):
                clear_button = component_id
        
        # Create test steps based on identified components
        test_steps = []
        
        # If we've found the necessary components, create a basic calculator test
        if number_buttons and display_component and equals_button:
            # 1. Press first number (2)
            first_num_button = next((btn for btn in number_buttons if "2" in btn or "2" in self.component_map[btn].get("text", "")), number_buttons[0])
            test_steps.append(TestStep(
                event=DomEvent(type="click", target_id=first_num_button),
                expected_changes={display_component: {"text": "2"}},
                description="Click on number 2"
            ))
            
            # 2. Press + operation if available
            if operation_buttons:
                add_button = next((btn for btn in operation_buttons if "+" in btn or "add" in btn.lower() or "+" in self.component_map[btn].get("text", "")), operation_buttons[0])
                test_steps.append(TestStep(
                    event=DomEvent(type="click", target_id=add_button),
                    expected_changes={display_component: {"text": "2+"}},
                    description="Click on + operation"
                ))
            
            # 3. Press second number (3)
            second_num_button = next((btn for btn in number_buttons if "3" in btn or "3" in self.component_map[btn].get("text", "")), number_buttons[0])
            test_steps.append(TestStep(
                event=DomEvent(type="click", target_id=second_num_button),
                expected_changes={display_component: {"text": "2+3"}},
                description="Click on number 3"
            ))
            
            # 4. Press equals
            test_steps.append(TestStep(
                event=DomEvent(type="click", target_id=equals_button),
                expected_changes={display_component: {"text": "5"}},
                description="Press equals to calculate result"
            ))
            
            # 5. Press clear if available
            if clear_button:
                test_steps.append(TestStep(
                    event=DomEvent(type="click", target_id=clear_button),
                    expected_changes={display_component: {"text": "0"}},
                    description="Clear calculator"
                ))
        
        return TestScenario(
            name="Basic Calculator Test",
            description="Tests basic calculator operations: 2+3=5",
            steps=test_steps
        )
    
    def generate_form_test(self) -> TestScenario:
        """
        Generate a test scenario for a form application.
        
        Returns:
            A test scenario for a form app
        """
        # Find form-related components
        form_component = None
        input_fields = []
        submit_button = None
        result_component = None
        
        for component_id, component in self.component_map.items():
            component_type = component.get("type", "").lower()
            component_id_lower = component_id.lower()
            
            # Identify form component
            if component_type == "form":
                form_component = component_id
            
            # Identify input fields
            elif component_type in ["input", "textfield", "textarea", "select"]:
                input_fields.append(component_id)
            
            # Identify submit button
            elif (component_type == "button" and
                  (component_id_lower.startswith("submit") or
                   "submit" in component_id_lower or
                   "send" in component_id_lower)):
                submit_button = component_id
            
            # Identify result component (success message, etc.)
            elif component_id_lower.startswith("result") or "message" in component_id_lower or "success" in component_id_lower:
                result_component = component_id
        
        # Create test steps based on identified components
        test_steps = []
        
        # If we've found input fields and submit button, create form test
        if input_fields and submit_button:
            # 1. Fill in each input field
            for i, input_id in enumerate(input_fields):
                input_type = self.component_map[input_id].get("properties", {}).get("type", "text")
                
                # Generate appropriate test value based on input type
                test_value = "Test Value"
                if "email" in input_id.lower() or input_type == "email":
                    test_value = "test@example.com"
                elif "password" in input_id.lower() or input_type == "password":
                    test_value = "Password123"
                elif "number" in input_id.lower() or input_type == "number" or "age" in input_id.lower():
                    test_value = "25"
                elif "phone" in input_id.lower() or "tel" in input_id.lower() or input_type == "tel":
                    test_value = "555-1234"
                
                test_steps.append(TestStep(
                    event=DomEvent(
                        type="input", 
                        target_id=input_id,
                        properties={"value": test_value}
                    ),
                    expected_changes={input_id: {"value": test_value}},
                    description=f"Fill in input field {input_id}"
                ))
            
            # 2. Submit form
            expected_changes = {}
            if result_component:
                # Expect some text in the result component
                expected_changes[result_component] = {"text": lambda text: len(text) > 0}
            
            test_steps.append(TestStep(
                event=DomEvent(type="click", target_id=submit_button),
                expected_changes=expected_changes,
                description="Submit the form"
            ))
        
        return TestScenario(
            name="Form Submission Test",
            description="Tests form input and submission",
            steps=test_steps
        )
    
    def generate_todo_list_test(self) -> TestScenario:
        """
        Generate a test scenario for a todo list application.
        
        Returns:
            A test scenario for a todo list app
        """
        # Find todo-related components
        todo_input = None
        add_button = None
        todo_list = None
        todo_items = []
        
        for component_id, component in self.component_map.items():
            component_type = component.get("type", "").lower()
            component_id_lower = component_id.lower()
            
            # Identify todo input
            if component_type in ["input", "textfield"] and ("todo" in component_id_lower or "task" in component_id_lower):
                todo_input = component_id
            
            # Identify add button
            elif (component_type == "button" and
                  (component_id_lower.startswith("add") or
                   "add" in component_id_lower or
                   "create" in component_id_lower)):
                add_button = component_id
            
            # Identify todo list container
            elif (component_id_lower.startswith("todo-list") or
                  component_id_lower.startswith("todolist") or
                  "todo-list" in component_id_lower or
                  "todolist" in component_id_lower or
                  "tasklist" in component_id_lower or
                  "task-list" in component_id_lower):
                todo_list = component_id
            
            # Identify existing todo items
            elif (component_id_lower.startswith("todo-item") or
                  component_id_lower.startswith("todoitem") or
                  "item" in component_id_lower and ("todo" in component_id_lower or "task" in component_id_lower)):
                todo_items.append(component_id)
        
        # Create test steps
        test_steps = []
        
        # If we've found todo input and add button, create todo test
        if todo_input and add_button:
            # 1. Enter a new todo
            test_steps.append(TestStep(
                event=DomEvent(
                    type="input", 
                    target_id=todo_input,
                    properties={"value": "Test Todo Item"}
                ),
                expected_changes={todo_input: {"value": "Test Todo Item"}},
                description="Enter a new todo task"
            ))
            
            # 2. Click add button
            expected_changes = {}
            if todo_list:
                # Expect some change in the todo list
                expected_changes[todo_list] = {"text": lambda text: "Test Todo Item" in text}
            
            test_steps.append(TestStep(
                event=DomEvent(type="click", target_id=add_button),
                expected_changes=expected_changes,
                description="Add the new todo item"
            ))
            
            # 3. If we have todo items, test checking one off
            if todo_items:
                test_steps.append(TestStep(
                    event=DomEvent(type="click", target_id=todo_items[0]),
                    expected_changes={todo_items[0]: {"properties": {"completed": True}}},
                    description="Mark a todo item as completed"
                ))
        
        return TestScenario(
            name="Todo List Test",
            description="Tests adding and completing todo items",
            steps=test_steps
        )
    
    def generate_counter_test(self) -> TestScenario:
        """
        Generate a test scenario for a counter application.
        
        Returns:
            A test scenario for a counter app
        """
        # Find counter-related components
        counter_display = None
        increment_button = None
        decrement_button = None
        reset_button = None
        
        for component_id, component in self.component_map.items():
            component_type = component.get("type", "").lower()
            component_id_lower = component_id.lower()
            component_text = component.get("text", "").lower()
            
            # Identify counter display
            if (component_id_lower.startswith("counter") or
                "count" in component_id_lower or
                "display" in component_id_lower):
                counter_display = component_id
            
            # Identify increment button
            elif (component_type == "button" and
                 (component_id_lower.startswith("increment") or
                  component_id_lower.startswith("increase") or
                  "+" in component_text or
                  "add" in component_id_lower)):
                increment_button = component_id
            
            # Identify decrement button
            elif (component_type == "button" and
                 (component_id_lower.startswith("decrement") or
                  component_id_lower.startswith("decrease") or
                  "-" in component_text or
                  "subtract" in component_id_lower)):
                decrement_button = component_id
            
            # Identify reset button
            elif (component_type == "button" and
                 (component_id_lower.startswith("reset") or
                  "reset" in component_id_lower or
                  "clear" in component_id_lower)):
                reset_button = component_id
        
        # Create test steps
        test_steps = []
        
        # If we found counter display and increment button
        if counter_display and increment_button:
            # 1. Click increment button
            test_steps.append(TestStep(
                event=DomEvent(type="click", target_id=increment_button),
                expected_changes={counter_display: {"text": "1"}},
                description="Increment counter"
            ))
            
            # 2. Click increment button again
            test_steps.append(TestStep(
                event=DomEvent(type="click", target_id=increment_button),
                expected_changes={counter_display: {"text": "2"}},
                description="Increment counter again"
            ))
            
            # 3. Click decrement button if available
            if decrement_button:
                test_steps.append(TestStep(
                    event=DomEvent(type="click", target_id=decrement_button),
                    expected_changes={counter_display: {"text": "1"}},
                    description="Decrement counter"
                ))
            
            # 4. Click reset button if available
            if reset_button:
                test_steps.append(TestStep(
                    event=DomEvent(type="click", target_id=reset_button),
                    expected_changes={counter_display: {"text": "0"}},
                    description="Reset counter"
                ))
        
        return TestScenario(
            name="Counter Test",
            description="Tests incrementing, decrementing, and resetting a counter",
            steps=test_steps
        )
    
    def detect_app_type(self) -> str:
        """
        Detect the type of application based on components.
        
        Returns:
            String indicating app type: "calculator", "form", "todo", "counter", or "unknown"
        """
        component_ids = list(self.component_map.keys())
        component_texts = [comp.get("text", "").lower() for comp in self.component_map.values()]
        component_types = [comp.get("type", "").lower() for comp in self.component_map.values()]
        
        # Check for calculator
        calc_indicators = ["calculator", "calc", "+", "-", "*", "/", "=", "equals"]
        if any(indicator in " ".join(component_ids).lower() for indicator in calc_indicators) or \
           any(indicator in " ".join(component_texts) for indicator in calc_indicators):
            return "calculator"
        
        # Check for form
        form_indicators = ["form", "submit", "input", "email", "password", "register", "signup", "login"]
        if "form" in component_types or \
           any(indicator in " ".join(component_ids).lower() for indicator in form_indicators):
            return "form"
        
        # Check for todo list
        todo_indicators = ["todo", "task", "list", "item", "complete", "done"]
        if any(indicator in " ".join(component_ids).lower() for indicator in todo_indicators):
            return "todo"
        
        # Check for counter
        counter_indicators = ["counter", "count", "increment", "decrement", "increase", "decrease"]
        if any(indicator in " ".join(component_ids).lower() for indicator in counter_indicators):
            return "counter"
        
        return "unknown"
    
    def generate_test_for_app_type(self, app_type: str = None) -> TestScenario:
        """
        Generate a test scenario based on detected or specified app type.
        
        Args:
            app_type: Optional app type to override detection
            
        Returns:
            Appropriate test scenario
        """
        if app_type is None:
            app_type = self.detect_app_type()
        
        if app_type == "calculator":
            return self.generate_calculator_test()
        elif app_type == "form":
            return self.generate_form_test()
        elif app_type == "todo":
            return self.generate_todo_list_test()
        elif app_type == "counter":
            return self.generate_counter_test()
        else:
            # Default to a simple test that clicks on the first button found
            buttons = [comp_id for comp_id, comp in self.component_map.items() 
                      if comp.get("type", "").lower() == "button"]
            
            if buttons:
                return TestScenario(
                    name="Basic Interaction Test",
                    description="Tests basic button click interaction",
                    steps=[
                        TestStep(
                            event=DomEvent(type="click", target_id=buttons[0]),
                            expected_changes={},
                            description=f"Click on button {buttons[0]}"
                        )
                    ]
                )
            else:
                return TestScenario(
                    name="Empty Test",
                    description="No testable components found",
                    steps=[]
                ) 