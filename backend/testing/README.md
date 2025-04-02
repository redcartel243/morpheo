# Morpheo Testing Framework

This directory contains the testing framework for validating and testing Morpheo-generated applications.

## Overview

The testing framework provides:

1. **Headless Testing Environment**: A simulated DOM environment that can load and run Morpheo applications without a browser
2. **Test Scenario Generation**: Automatic creation of test scenarios based on application type
3. **User Interaction Simulation**: Ability to simulate clicks, inputs, and other DOM events
4. **State Verification**: Tools to verify component state after interactions

## Components

### Headless Testing Framework

`headless_test_framework.py` implements a simulated DOM environment for running tests:

- `MorpheoTester`: Main class for loading and testing applications
- `DomElement`: Simulates DOM elements with methods like `setStyle`, `setText`, etc.
- `DomEvent`: Represents a DOM event with type, target, and properties

### Test Scenario Generator

`test_scenario_generator.py` provides automatic test scenario generation:

- `TestScenarioGenerator`: Creates appropriate test scenarios based on app structure
- Generated scenarios for common app types: calculator, form, todo list, counter
- Automatic app type detection based on component structure and naming

### Test Runner

`run_tests.py` provides a command-line interface for running tests:

```
python run_tests.py --file app_config.json --type calculator
python run_tests.py --request "Create a calculator app" --type auto
```

## Enhanced Validation in ComponentService

The `_validate_action_handlers` method in `components/service.py` has been enhanced with:

1. **Pattern Recognition**: Identifies common event handler structures
2. **Error Handling Verification**: Checks for and adds missing try/catch blocks
3. **Component Initialization**: Verifies and adds proper component initialization
4. **Safety Enhancements**:
   - Replaces `eval()` with safer alternatives
   - Adds input validation for forms
   - Ensures numerical operations have proper parsing

## Usage Examples

### Basic Usage

```python
from testing.headless_test_framework import MorpheoTester
from testing.test_scenario_generator import TestScenarioGenerator

# Load app configuration
tester = MorpheoTester()
tester.load_app_from_file("calculator_app.json")

# Generate and run test scenario
generator = TestScenarioGenerator(app_config)
test_scenario = generator.generate_calculator_test()
success, errors = tester.run_test_scenario(test_scenario)
```

### Custom Test Scenarios

```python
from testing.headless_test_framework import MorpheoTester, TestScenario, TestStep, DomEvent

# Create custom test steps
test_steps = [
    TestStep(
        event=DomEvent(type="click", target_id="incrementButton"),
        expected_changes={"counterDisplay": {"text": "1"}},
        description="Increment counter once"
    ),
    TestStep(
        event=DomEvent(
            type="input",
            target_id="nameInput",
            properties={"value": "Test User"}
        ),
        expected_changes={"nameInput": {"value": "Test User"}},
        description="Enter user name"
    )
]

# Create and run custom scenario
custom_scenario = TestScenario(
    name="Custom Test",
    description="Custom test scenario",
    steps=test_steps
)

tester = MorpheoTester()
tester.load_app_json(app_config)
success, errors = tester.run_test_scenario(custom_scenario)
```

## Adding New App Types

To add support for a new application type:

1. Create a new generator method in `TestScenarioGenerator`
2. Update the `detect_app_type` method to recognize the new type
3. Add the new type to the `generate_test_for_app_type` method

## Running Tests

You can run tests using:

```
# Run the example tests
python backend/testing/test_example.py

# Run using the test runner
python backend/testing/run_tests.py --file your_app.json
``` 