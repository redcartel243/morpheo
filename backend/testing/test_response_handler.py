"""
Tests for the ResponseHandler functionality

This module tests that the ResponseHandler correctly handles incomplete or truncated
JSON responses from the OpenAI API.
"""

import os
import sys
import json
import unittest
from typing import Dict, Any

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from components.response_handler import ResponseHandler

class TestResponseHandler(unittest.TestCase):
    """Test cases for the ResponseHandler class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.handler = ResponseHandler()
        
        # Create a test directory if it doesn't exist
        os.makedirs("backend/testing/test_outputs", exist_ok=True)
    
    def test_handle_complete_response(self):
        """Test handling a complete, valid response."""
        # Create a complete response
        complete_response = {
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "app": {
                            "name": "Test App",
                            "description": "A test application"
                        },
                        "layout": {
                            "type": "singlepage",
                            "regions": ["header", "main", "footer"]
                        },
                        "components": []
                    })
                }
            }]
        }
        
        # Process the response
        result = self.handler.handle_response(complete_response)
        
        # Verify the result
        self.assertIsNotNone(result)
        self.assertEqual(result["app"]["name"], "Test App")
        self.assertEqual(len(result["layout"]["regions"]), 3)
    
    def test_handle_incomplete_json(self):
        """Test handling an incomplete JSON response."""
        # Create an incomplete response (truncated JSON)
        incomplete_response = {
            "choices": [{
                "message": {
                    "content": """{
                        "app": {
                            "name": "Incomplete App",
                            "description": "An incomplete application"
                        },
                        "layout": {
                            "type": "singlepage",
                            "regions": ["header", "main"
                    """
                }
            }]
        }
        
        # Process the response
        result = self.handler.handle_response(incomplete_response)
        
        # Verify the result - should have repaired the JSON
        self.assertIsNotNone(result)
        self.assertIn("app", result)
        self.assertIn("layout", result)
        self.assertEqual(result["app"]["name"], "Incomplete App")
    
    def test_handle_calculator_with_truncated_function(self):
        """Test handling a calculator app with a truncated function."""
        # This example is based on the real truncated response we saw
        truncated_response = {
            "choices": [{
                "message": {
                    "content": """{
  "app": {
    "name": "Basic Calculator",
    "description": "A simple calculator with basic arithmetic operations.",
    "theme": "light"
  },
  "layout": {
    "type": "singlepage",
    "regions": ["header", "main", "footer"]
  },
  "components": [
    {
      "id": "display",
      "type": "input",
      "region": "main",
      "properties": {
        "placeholder": "0"
      },
      "styles": {
        "width": "100%",
        "textAlign": "right"
      }
    },
    {
      "id": "button-plus",
      "type": "button",
      "region": "main",
      "properties": {
        "text": "+"
      },
      "styles": {
        "padding": "10px"
      },
      "methods": {
        "onClick": {
          "code": "function(event, $m) { $m('#display').setValue($m('#display').getValue"""
                }
            }]
        }
        
        # Process the response
        result = self.handler.handle_response(truncated_response)
        
        # Verify the result - should have repaired the truncated function
        self.assertIsNotNone(result)
        self.assertIn("app", result)
        self.assertIn("components", result)
        self.assertEqual(result["app"]["name"], "Basic Calculator")
        
        # Verify that components are preserved
        self.assertTrue(len(result["components"]) > 0)
        
        # Save the repaired response for manual inspection
        with open("backend/testing/test_outputs/repaired_calculator.json", "w") as f:
            json.dump(result, f, indent=2)
    
    def test_handle_malformed_json(self):
        """Test handling malformed JSON with syntax errors."""
        # Create a response with syntax errors
        malformed_response = {
            "choices": [{
                "message": {
                    "content": """{
                        "app": {
                            "name": "Malformed App",
                            "description": "A malformed application"
                        },
                        "components": [
                            { "id": "component1" "type": "text" },
                            { "id": "component2", "type": "button", }
                        ]
                    }"""
                }
            }]
        }
        
        # Process the response
        result = self.handler.handle_response(malformed_response)
        
        # Verify the result - should have repaired the JSON
        self.assertIsNotNone(result)
        self.assertIn("app", result)
        
        # Save the repaired response for manual inspection
        with open("backend/testing/test_outputs/repaired_malformed.json", "w") as f:
            json.dump(result, f, indent=2)
    
    def test_handle_missing_closing_braces(self):
        """Test handling JSON with missing closing braces."""
        # Create a response with missing closing braces
        unclosed_response = {
            "choices": [{
                "message": {
                    "content": """{
                        "app": {
                            "name": "Unclosed App",
                            "description": "An app with unclosed braces"
                        },
                        "layout": {
                            "type": "singlepage",
                            "regions": ["header", "main", "footer"
                        },
                        "components": [
                            {
                                "id": "header",
                                "type": "text",
                                "properties": {
                                    "content": "Header"
                    """
                }
            }]
        }
        
        # Process the response
        result = self.handler.handle_response(unclosed_response)
        
        # Verify the result - should have repaired the JSON
        self.assertIsNotNone(result)
        self.assertIn("app", result)
        self.assertEqual(result["app"]["name"], "Unclosed App")
        
        # Save the repaired response for manual inspection
        with open("backend/testing/test_outputs/repaired_unclosed.json", "w") as f:
            json.dump(result, f, indent=2)

if __name__ == "__main__":
    unittest.main() 