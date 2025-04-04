"""
AI Integration Module for Map Component Processing

This module provides functions to ensure that AI-generated map configurations
use the proper map component structure rather than placeholders.
"""

import os
import json
import sys

# Import our map processing functions
try:
    from prompts.preprocess_map_prompt import preprocess_map_request
    from prompts.map_post_processor import fix_map_configuration
    MAP_PROCESSORS_AVAILABLE = True
except ImportError:
    print("Warning: Map processors not available. Map component fixes will be disabled.")
    MAP_PROCESSORS_AVAILABLE = False
    
    # Define dummy functions
    def preprocess_map_request(request_text):
        return request_text
        
    def fix_map_configuration(config_json):
        return config_json

class MapProcessorMiddleware:
    """
    Middleware for preprocessing map-related prompts and post-processing map configurations.
    This can be integrated with various AI services and frameworks.
    """
    
    @staticmethod
    def process_prompt(prompt):
        """
        Process a prompt before sending it to the AI service.
        
        Args:
            prompt (str): The original prompt text
            
        Returns:
            str: The processed prompt
        """
        if not MAP_PROCESSORS_AVAILABLE:
            return prompt
            
        try:
            original_prompt = prompt
            processed_prompt = preprocess_map_request(prompt)
            if processed_prompt != original_prompt:
                print("Map preprocessing applied")
            return processed_prompt
        except Exception as e:
            print(f"Error in map prompt preprocessing: {e}", file=sys.stderr)
            return prompt
    
    @staticmethod
    def process_response(response):
        """
        Process an AI response to fix map configurations.
        
        Args:
            response (str): The AI-generated response
            
        Returns:
            str: The processed response
        """
        if not MAP_PROCESSORS_AVAILABLE or not isinstance(response, str):
            return response
            
        try:
            original_response = response
            processed_response = fix_map_configuration(response)
            if processed_response != original_response:
                print("Map post-processing applied")
            return processed_response
        except Exception as e:
            print(f"Error in map response post-processing: {e}", file=sys.stderr)
            return response

# Example usage
def process_ai_interaction(prompt):
    """
    Example function showing how to use the map processors in an AI interaction.
    
    Args:
        prompt (str): User prompt
        
    Returns:
        str: Processed AI response
    """
    # Step 1: Preprocess the user prompt
    processed_prompt = MapProcessorMiddleware.process_prompt(prompt)
    
    # Step 2: Send to AI service (simulated here)
    raw_response = f"{{ \"app\": {{ \"name\": \"Barcelona Map\" }}, \"components\": [{{ \"type\": \"container\", \"children\": [{{ \"type\": \"text\", \"properties\": {{ \"content\": \"Map placeholder\" }} }}] }}] }}"
    
    # Step 3: Post-process the AI response
    processed_response = MapProcessorMiddleware.process_response(raw_response)
    
    return processed_response

if __name__ == "__main__":
    # Test the processing
    test_prompt = "Create a map of Barcelona showing major tourist attractions"
    result = process_ai_interaction(test_prompt)
    print("Original prompt:", test_prompt)
    print("Result:", result) 