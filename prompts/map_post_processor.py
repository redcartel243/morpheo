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
                'center': {'lat': 41.3851, 'lng': 2.1734},
                'markers': [
                    {'position': {'lat': 41.3851, 'lng': 2.1734}, 'title': 'Barcelona Center'},
                    {'position': {'lat': 41.4036, 'lng': 2.1744}, 'title': 'Sagrada Familia'},
                    {'position': {'lat': 41.4145, 'lng': 2.1527}, 'title': 'Park Güell'}
                ]
            },
            'Madrid': {
                'center': {'lat': 40.4168, 'lng': -3.7038},
                'markers': [
                    {'position': {'lat': 40.4168, 'lng': -3.7038}, 'title': 'Madrid Center'},
                    {'position': {'lat': 40.4138, 'lng': -3.6921}, 'title': 'Prado Museum'},
                    {'position': {'lat': 40.4180, 'lng': -3.7143}, 'title': 'Royal Palace'}
                ]
            },
            'Paris': {
                'center': {'lat': 48.8566, 'lng': 2.3522},
                'markers': [
                    {'position': {'lat': 48.8566, 'lng': 2.3522}, 'title': 'Paris Center'},
                    {'position': {'lat': 48.8584, 'lng': 2.2945}, 'title': 'Eiffel Tower'},
                    {'position': {'lat': 48.8606, 'lng': 2.3376}, 'title': 'Louvre Museum'}
                ]
            },
            'London': {
                'center': {'lat': 51.5074, 'lng': -0.1278},
                'markers': [
                    {'position': {'lat': 51.5074, 'lng': -0.1278}, 'title': 'London Center'},
                    {'position': {'lat': 51.5007, 'lng': -0.1246}, 'title': 'Big Ben'},
                    {'position': {'lat': 51.5014, 'lng': -0.1419}, 'title': 'Buckingham Palace'}
                ]
            },
            'New York': {
                'center': {'lat': 40.7128, 'lng': -74.0060},
                'markers': [
                    {'position': {'lat': 40.7128, 'lng': -74.0060}, 'title': 'New York Center'},
                    {'position': {'lat': 40.7484, 'lng': -73.9857}, 'title': 'Empire State Building'},
                    {'position': {'lat': 40.7580, 'lng': -73.9855}, 'title': 'Times Square'}
                ]
            },
            'Tokyo': {
                'center': {'lat': 35.6762, 'lng': 139.6503},
                'markers': [
                    {'position': {'lat': 35.6762, 'lng': 139.6503}, 'title': 'Tokyo Center'},
                    {'position': {'lat': 35.6586, 'lng': 139.7454}, 'title': 'Tokyo Tower'},
                    {'position': {'lat': 35.7100, 'lng': 139.8107}, 'title': 'Tokyo Skytree'}
                ]
            }
        }.get(region, {
            'center': {'lat': 41.3851, 'lng': 2.1734},  # Default to Barcelona
            'markers': [{'position': {'lat': 41.3851, 'lng': 2.1734}, 'title': 'Center'}]
        })
        
        # Function to convert array coordinates to object format
        def convert_coordinates(component):
            if not component or not isinstance(component, dict):
                return
                
            # Convert center coordinates if in array format
            if 'properties' in component and 'center' in component['properties']:
                center = component['properties']['center']
                if isinstance(center, list) and len(center) >= 2:
                    component['properties']['center'] = {
                        'lat': center[0],
                        'lng': center[1]
                    }
                elif not isinstance(center, dict) or 'lat' not in center or 'lng' not in center:
                    # Set default if missing or invalid
                    component['properties']['center'] = default_coordinates['center']
            
            # Convert marker positions if in array format
            if 'properties' in component and 'markers' in component['properties']:
                markers = component['properties']['markers']
                if isinstance(markers, list):
                    for marker in markers:
                        if isinstance(marker, dict) and 'position' in marker:
                            pos = marker['position']
                            if isinstance(pos, list) and len(pos) >= 2:
                                marker['position'] = {
                                    'lat': pos[0],
                                    'lng': pos[1]
                                }
                            elif not isinstance(pos, dict) or 'lat' not in pos or 'lng' not in pos:
                                marker['position'] = default_coordinates['markers'][0]['position']
                
            # Process children recursively
            if 'children' in component and isinstance(component['children'], list):
                for child in component['children']:
                    convert_coordinates(child)
        
        # Process all components to fix coordinate formats
        if 'components' in config and isinstance(config['components'], list):
            for component in config['components']:
                convert_coordinates(component)
        
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