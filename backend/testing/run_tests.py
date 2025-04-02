#!/usr/bin/env python
"""
Test Runner for Morpheo Applications

This script demonstrates the use of the headless testing framework to run tests
against Morpheo-generated applications.
"""

import os
import sys
import json
import argparse
from typing import List, Dict, Any, Optional

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from testing.headless_test_framework import MorpheoTester, TestScenario
from testing.test_scenario_generator import TestScenarioGenerator
from components.service import ComponentService

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Run tests on Morpheo applications')
    parser.add_argument('--file', '-f', type=str, help='Path to app JSON file')
    parser.add_argument('--request', '-r', type=str, help='User request to generate app from')
    parser.add_argument('--type', '-t', type=str, choices=['calculator', 'form', 'todo', 'counter', 'auto'],
                        default='auto', help='App type for test scenario generation')
    parser.add_argument('--verbose', '-v', action='store_true', help='Enable verbose output')
    
    return parser.parse_args()

def generate_app_from_request(request: str) -> Dict[str, Any]:
    """
    Generate an app configuration from a user request.
    
    Args:
        request: The user request string
        
    Returns:
        Generated app configuration
    """
    service = ComponentService()
    app_config = service.generate_app_config(request)
    return app_config

def load_app_from_file(file_path: str) -> Dict[str, Any]:
    """
    Load an app configuration from a JSON file.
    
    Args:
        file_path: Path to the JSON file
        
    Returns:
        Loaded app configuration
    """
    with open(file_path, 'r') as f:
        return json.load(f)

def print_test_results(success: bool, errors: List[str], verbose: bool):
    """
    Print test results to the console.
    
    Args:
        success: Whether all tests passed
        errors: List of error messages
        verbose: Whether to print verbose output
    """
    print("\n===== TEST RESULTS =====")
    if success:
        print("✅ ALL TESTS PASSED")
    else:
        print(f"❌ TESTS FAILED: {len(errors)} errors")
        if verbose or len(errors) <= 5:
            for i, error in enumerate(errors):
                print(f"{i+1}. {error}")
        else:
            for i, error in enumerate(errors[:5]):
                print(f"{i+1}. {error}")
            print(f"... and {len(errors) - 5} more errors (use --verbose to see all)")
    
def main():
    """Main function to run tests."""
    args = parse_arguments()
    
    # Get app configuration
    app_config = None
    if args.file:
        print(f"Loading app configuration from file: {args.file}")
        app_config = load_app_from_file(args.file)
    elif args.request:
        print(f"Generating app configuration from request: '{args.request}'")
        app_config = generate_app_from_request(args.request)
    else:
        print("ERROR: Either --file or --request must be specified")
        sys.exit(1)
    
    if not app_config:
        print("ERROR: Failed to load or generate app configuration")
        sys.exit(1)
    
    # Initialize tester
    tester = MorpheoTester()
    tester.load_app_json(app_config)
    
    # Generate test scenario
    scenario_generator = TestScenarioGenerator(app_config)
    
    app_type = args.type
    if app_type == 'auto':
        app_type = scenario_generator.detect_app_type()
        print(f"Detected app type: {app_type}")
    
    test_scenario = scenario_generator.generate_test_for_app_type(app_type)
    
    print(f"\nRunning test scenario: {test_scenario.name}")
    print(f"Description: {test_scenario.description}")
    print(f"Steps: {len(test_scenario.steps)}")
    
    # Run test scenario
    success, errors = tester.run_test_scenario(test_scenario)
    
    # Print results
    print_test_results(success, errors, args.verbose)
    
    # Return exit code based on test success
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main()) 