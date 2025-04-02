"""
Example Tests for the Morpheo Testing Framework

This module demonstrates how to use the Morpheo testing framework 
to test different application types programmatically.
"""

import os
import sys
import json
from typing import Dict, Any, List

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from testing.headless_test_framework import MorpheoTester, DomEvent, TestStep, TestScenario
from testing.test_scenario_generator import TestScenarioGenerator
from components.service import ComponentService

def test_calculator_app():
    """Test a calculator application."""
    print("\n===== Testing Calculator App =====")
    
    # Create a simple calculator app using the ComponentService
    component_service = ComponentService()
    app_config = component_service.generate_app_config("Create a simple calculator app")
    
    # Save the app configuration for reference
    with open("calculator_app_test.json", "w") as f:
        json.dump(app_config, f, indent=2)
    
    # Initialize tester with app configuration
    tester = MorpheoTester()
    tester.load_app_json(app_config)
    
    # Generate test scenario
    scenario_generator = TestScenarioGenerator(app_config)
    test_scenario = scenario_generator.generate_calculator_test()
    
    # Run test scenario
    success, errors = tester.run_test_scenario(test_scenario)
    
    # Print results
    print_test_results(success, errors)
    
    return success

def test_form_app():
    """Test a form application."""
    print("\n===== Testing Form App =====")
    
    # Create a simple form app using the ComponentService
    component_service = ComponentService()
    app_config = component_service.generate_app_config("Create a contact form with name, email, and message fields")
    
    # Save the app configuration for reference
    with open("form_app_test.json", "w") as f:
        json.dump(app_config, f, indent=2)
    
    # Initialize tester with app configuration
    tester = MorpheoTester()
    tester.load_app_json(app_config)
    
    # Generate test scenario
    scenario_generator = TestScenarioGenerator(app_config)
    test_scenario = scenario_generator.generate_form_test()
    
    # Run test scenario
    success, errors = tester.run_test_scenario(test_scenario)
    
    # Print results
    print_test_results(success, errors)
    
    return success

def test_counter_app():
    """Test a counter application."""
    print("\n===== Testing Counter App =====")
    
    # Create a simple counter app using the ComponentService
    component_service = ComponentService()
    app_config = component_service.generate_app_config("Create a counter app with increment and decrement buttons")
    
    # Save the app configuration for reference
    with open("counter_app_test.json", "w") as f:
        json.dump(app_config, f, indent=2)
    
    # Initialize tester with app configuration
    tester = MorpheoTester()
    tester.load_app_json(app_config)
    
    # Generate test scenario
    scenario_generator = TestScenarioGenerator(app_config)
    test_scenario = scenario_generator.generate_counter_test()
    
    # Run test scenario
    success, errors = tester.run_test_scenario(test_scenario)
    
    # Print results
    print_test_results(success, errors)
    
    return success

def test_todo_app():
    """Test a todo list application."""
    print("\n===== Testing Todo List App =====")
    
    # Create a simple todo app using the ComponentService
    component_service = ComponentService()
    app_config = component_service.generate_app_config("Create a todo list app with the ability to add and remove tasks")
    
    # Save the app configuration for reference
    with open("todo_app_test.json", "w") as f:
        json.dump(app_config, f, indent=2)
    
    # Initialize tester with app configuration
    tester = MorpheoTester()
    tester.load_app_json(app_config)
    
    # Generate test scenario
    scenario_generator = TestScenarioGenerator(app_config)
    test_scenario = scenario_generator.generate_todo_list_test()
    
    # Run test scenario
    success, errors = tester.run_test_scenario(test_scenario)
    
    # Print results
    print_test_results(success, errors)
    
    return success

def test_custom_scenario():
    """Test with a custom test scenario."""
    print("\n===== Testing Custom Scenario =====")
    
    # Create a simple counter app using the ComponentService
    component_service = ComponentService()
    app_config = component_service.generate_app_config("Create a counter app with increment and decrement buttons")
    
    # Initialize tester with app configuration
    tester = MorpheoTester()
    tester.load_app_json(app_config)
    
    # Create a custom test scenario
    # First, identify component IDs - this would typically be done by inspecting the app_config
    counter_display = None
    increment_button = None
    decrement_button = None
    
    # Simplified component ID detection for this example
    for component in app_config.get("components", []):
        if "counter" in component.get("id", "").lower():
            counter_display = component["id"]
        elif "increment" in component.get("id", "").lower() or "increase" in component.get("id", "").lower():
            increment_button = component["id"]
        elif "decrement" in component.get("id", "").lower() or "decrease" in component.get("id", "").lower():
            decrement_button = component["id"]
    
    # Create a test scenario
    test_steps = []
    
    # Check if we found the necessary components
    if counter_display and increment_button:
        # Click increment button 3 times
        for i in range(3):
            test_steps.append(TestStep(
                event=DomEvent(type="click", target_id=increment_button),
                expected_changes={counter_display: {"text": str(i+1)}},
                description=f"Increment counter to {i+1}"
            ))
        
        # Click decrement button once
        if decrement_button:
            test_steps.append(TestStep(
                event=DomEvent(type="click", target_id=decrement_button),
                expected_changes={counter_display: {"text": "2"}},
                description="Decrement counter once"
            ))
    
    custom_scenario = TestScenario(
        name="Custom Counter Test",
        description="Tests incrementing counter multiple times and decrementing once",
        steps=test_steps
    )
    
    # Run test scenario
    success, errors = tester.run_test_scenario(custom_scenario)
    
    # Print results
    print_test_results(success, errors)
    
    return success

def print_test_results(success: bool, errors: List[str]):
    """Print test results."""
    print("\n----- Test Results -----")
    if success:
        print("✅ All tests passed")
    else:
        print(f"❌ Tests failed with {len(errors)} errors:")
        for i, error in enumerate(errors):
            print(f"  {i+1}. {error}")

def run_all_tests():
    """Run all example tests."""
    print("Running all example tests...")
    
    all_success = True
    
    # Test calculator app
    if not test_calculator_app():
        all_success = False
    
    # Test form app
    if not test_form_app():
        all_success = False
    
    # Test counter app
    if not test_counter_app():
        all_success = False
    
    # Test todo app
    if not test_todo_app():
        all_success = False
    
    # Test custom scenario
    if not test_custom_scenario():
        all_success = False
    
    print("\n===== All Tests Complete =====")
    if all_success:
        print("✅ All test suites passed")
    else:
        print("❌ Some test suites failed")
    
    return all_success

if __name__ == "__main__":
    run_all_tests() 