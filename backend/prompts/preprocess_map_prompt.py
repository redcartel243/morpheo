"""
Map Prompt Preprocessor

This module enhances map-related prompts to ensure proper map component usage.
"""

import re
import json
import os
import sys

def preprocess_map_request(prompt):
    """
    Enhance map-related prompts with specific instructions for using the Map component.
    
    Args:
        prompt (str): The original user prompt
        
    Returns:
        str: Enhanced prompt with explicit Map component instructions
    """
    # Check if this is a map-related prompt
    map_keywords = ['map', 'location', 'geographic', 'directions', 'navigation']
    is_map_related = any(keyword.lower() in prompt.lower() for keyword in map_keywords)
    
    if not is_map_related:
        return prompt
        
    # Extract location from prompt if possible
    location_match = re.search(r'map\s+of\s+([a-zA-Z\s]+)', prompt, re.IGNORECASE)
    location = location_match.group(1) if location_match else None
    
    # Create specific instructions for map usage
    map_instructions = """
IMPORTANT: When creating a map application:
1. Use the Map component DIRECTLY - not inside containers with placeholders.
2. The Map component requires these properties:
   - center: [latitude, longitude] array
   - zoom: number (between 1-20)
   - markers: array of {position: [lat, lng], title: string} objects
   - interactive: boolean

Example correct implementation:
{
  "type": "Map",
  "properties": {
    "center": [41.3851, 2.1734],
    "zoom": 12,
    "markers": [
      {"position": [41.3851, 2.1734], "title": "Barcelona Center"}
    ],
    "interactive": true
  }
}

DO NOT create containers with placeholders for maps - use the Map component directly.
"""
    
    # Add location-specific information if available
    if location:
        # Default coordinates for common locations
        if location.lower() == 'barcelona':
            map_instructions += f"""
For {location}, use these coordinates:
- center: [41.3851, 2.1734]
- Popular places:
  - Sagrada Familia: [41.4036, 2.1744]
  - Park Güell: [41.4145, 2.1527]
  - Casa Batlló: [41.3917, 2.1650]
"""
        elif location.lower() == 'madrid':
            map_instructions += f"""
For {location}, use these coordinates:
- center: [40.4168, -3.7038]
- Popular places:
  - Prado Museum: [40.4138, -3.6921]
  - Royal Palace: [40.4180, -3.7143]
  - Plaza Mayor: [40.4154, -3.7074]
"""
    
    # Combine with original prompt
    enhanced_prompt = f"{prompt}\n\n{map_instructions}"
    return enhanced_prompt

def main():
    """
    Main function to test the preprocessor.
    """
    test_prompt = "Create a map of Barcelona showing major tourist attractions"
    enhanced = preprocess_map_request(test_prompt)
    print("Original:", test_prompt)
    print("\nEnhanced:", enhanced)

if __name__ == "__main__":
    main() 