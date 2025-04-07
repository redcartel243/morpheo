# Morpheo Testing Framework

This directory contains automated testing tools for the Morpheo framework.

## Overview

The testing framework is designed to:

1. Automate the testing of Morpheo's AI-driven component generation
2. Validate that the generated components behave as expected
3. Ensure consistency across different generators and platforms

## Key Components

- **run_tests.py**: Main entry point for executing test suites
- **headless_test_framework.py**: Core framework for running tests without a browser
- **test_response_handler.py**: Handles and validates responses from the generation service
- **test_scenario_generator.py**: Creates test scenarios for different application types

## Archive

The `archive` directory contains outdated test files that are no longer in active use:

- **test_template_registry.py.old**: Tests for the deprecated template-based approach
- **test_template_selection.py.old**: Tests for the deprecated template selection methods

These files are kept for reference but should not be used in new development.

## Usage

To run the full test suite:

```bash
python run_tests.py
```

To run a specific test:

```bash
python run_tests.py --test=scenario1
```

## Adding Tests

New tests should follow the standard pattern:

1. Create a test scenario in `test_scenario_generator.py`
2. Define the expected output structure
3. Create validation rules for the output
4. Run the test using the test framework

Example:

```python
def test_calculator_app():
    # Define test parameters
    prompt = "Create a calculator app"
    expected_components = ["calculator", "display", "buttons"]
    
    # Run the test
    result = test_framework.run_test(prompt, expected_components)
    
    # Validate results
    assert result.success, "Test failed"
    assert all(comp in result.components for comp in expected_components), "Missing components"
```

## Configuration

The testing framework can be configured through environment variables or a configuration file. See `config.json` for available options. 