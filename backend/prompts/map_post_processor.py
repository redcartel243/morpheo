"""
Map Post-Processor

This module processes AI-generated map configurations to ensure they use the proper Map component
rather than containers with placeholders.
"""

import json
import re
import sys

def fix_map_configuration(config_json_str):
    """
    Transforms an AI-generated map configuration to use the proper Map component.
    
    Args:
        config_json_str (str): The JSON string containing the AI-generated configuration
        
    Returns:
        str: The transformed JSON string with proper Map components
    """
    try:
        # Parse the JSON
        if not isinstance(config_json_str, str):
            return config_json_str
            
        # Try to find a JSON object in the response text
        json_match = re.search(r'({[\s\S]*})', config_json_str)
        if not json_match:
            return config_json_str
            
        json_str = json_match.group(1)
        config = json.loads(json_str)
        
        # Check if this is a map application
        app_name = config.get('app', {}).get('name', '')
        if not app_name or not any(map_term in app_name.lower() for map_term in ['map', 'location', 'navigation']):
            return config_json_str
            
        # Determine geographic region (defaulting to Barcelona)
        region = 'Barcelona'
        for city in ['Barcelona', 'Madrid', 'Paris', 'London', 'New York', 'Tokyo']:
            if city.lower() in app_name.lower():
                region = city
                break
                
        # Set default coordinates based on region
        default_coordinates = {
            'Barcelona': {
                'center': [41.3851, 2.1734],
                'markers': [
                    {'position': [41.3851, 2.1734], 'title': 'Barcelona Center'},
                    {'position': [41.4036, 2.1744], 'title': 'Sagrada Familia'},
                    {'position': [41.4145, 2.1527], 'title': 'Park Güell'}
                ]
            },
            'Madrid': {
                'center': [40.4168, -3.7038],
                'markers': [
                    {'position': [40.4168, -3.7038], 'title': 'Madrid Center'},
                    {'position': [40.4138, -3.6921], 'title': 'Prado Museum'},
                    {'position': [40.4180, -3.7143], 'title': 'Royal Palace'}
                ]
            },
            'Paris': {
                'center': [48.8566, 2.3522],
                'markers': [
                    {'position': [48.8566, 2.3522], 'title': 'Paris Center'},
                    {'position': [48.8584, 2.2945], 'title': 'Eiffel Tower'},
                    {'position': [48.8606, 2.3376], 'title': 'Louvre Museum'}
                ]
            },
            'London': {
                'center': [51.5074, -0.1278],
                'markers': [
                    {'position': [51.5074, -0.1278], 'title': 'London Center'},
                    {'position': [51.5007, -0.1246], 'title': 'Big Ben'},
                    {'position': [51.5014, -0.1419], 'title': 'Buckingham Palace'}
                ]
            },
            'New York': {
                'center': [40.7128, -74.0060],
                'markers': [
                    {'position': [40.7128, -74.0060], 'title': 'New York Center'},
                    {'position': [40.7484, -73.9857], 'title': 'Empire State Building'},
                    {'position': [40.7580, -73.9855], 'title': 'Times Square'}
                ]
            },
            'Tokyo': {
                'center': [35.6762, 139.6503],
                'markers': [
                    {'position': [35.6762, 139.6503], 'title': 'Tokyo Center'},
                    {'position': [35.6586, 139.7454], 'title': 'Tokyo Tower'},
                    {'position': [35.7100, 139.8107], 'title': 'Tokyo Skytree'}
                ]
            }
        }.get(region, {
            'center': [41.3851, 2.1734],  # Default to Barcelona
            'markers': [{'position': [41.3851, 2.1734], 'title': 'Center'}]
        })
        
        # Check if a direct Map component already exists
        has_direct_map = False
        
        def find_map_component(components):
            nonlocal has_direct_map
            if not components:
                return
                
            for i, component in enumerate(components):
                if component.get('type', '').lower() == 'map':
                    has_direct_map = True
                    # Ensure the Map component has all required properties
                    if 'properties' not in component:
                        component['properties'] = {}
                    
                    props = component['properties']
                    if 'center' not in props:
                        props['center'] = default_coordinates['center']
                    if 'zoom' not in props:
                        props['zoom'] = 12
                    if 'markers' not in props:
                        props['markers'] = default_coordinates['markers']
                    if 'interactive' not in props:
                        props['interactive'] = True
                
                # Recursively search in children
                if 'children' in component:
                    find_map_component(component['children'])
                    
        # Check if components exist in the configuration
        if 'components' in config:
            find_map_component(config['components'])
            
        # If no direct map component found, look for containers with placeholders
        if not has_direct_map and 'components' in config:
            def process_components(components):
                if not components:
                    return
                    
                for i, component in enumerate(components):
                    # Check if this is a container with placeholder text for a map
                    is_map_placeholder = False
                    
                    if component.get('type', '').lower() == 'container':
                        # Check for text children with map-related content
                        if 'children' in component:
                            for child in component['children']:
                                if child.get('type', '').lower() == 'text':
                                    text_content = child.get('properties', {}).get('content', '').lower()
                                    if any(term in text_content for term in ['map', 'placeholder']):
                                        is_map_placeholder = True
                                        break
                    
                    if is_map_placeholder:
                        # Replace the container with a proper Map component
                        map_component = {
                            'type': 'Map',
                            'properties': {
                                'center': default_coordinates['center'],
                                'zoom': 12,
                                'markers': default_coordinates['markers'],
                                'interactive': True
                            }
                        }
                        
                        # Transfer any style or className properties
                        if 'style' in component:
                            map_component['style'] = component['style']
                        if 'className' in component:
                            map_component['className'] = component['className']
                            
                        components[i] = map_component
                    elif 'children' in component:
                        # Recursively process children
                        process_components(component['children'])
            
            process_components(config['components'])
            
        # Return the modified JSON
        return json.dumps(config)
        
    except Exception as e:
        print(f"Error in map post-processing: {e}", file=sys.stderr)
        return config_json_str

def main():
    """
    Main function to test the map configuration fixer.
    """
    # Example of a bad configuration
    bad_config = '''
    {
      "app": {
        "name": "Barcelona Map"
      },
      "components": [
        {
          "type": "container",
          "children": [
            {
              "type": "text",
              "properties": {
                "content": "Map placeholder"
              }
            }
          ]
        }
      ]
    }
    '''
    
    # Fix the configuration
    fixed_config = fix_map_configuration(bad_config)
    
    print("Original:")
    print(bad_config)
    print("\nFixed:")
    print(fixed_config)

if __name__ == "__main__":
    main() 