import os
import sys
import json
from dotenv import load_dotenv
from components.service import ComponentService

# Load environment variables
load_dotenv()

def test_service():
    """Test the component service in isolation"""
    service = ComponentService()
    
    # Test getting components
    print("Testing component registry access...")
    try:
        ui_components = service.component_registry.get_components_for_selection()
        app_configs = service.component_registry.get_app_configs_for_selection()
        
        print(f"Type of ui_components: {type(ui_components)}")
        print(f"Length of ui_components: {len(ui_components)}")
        print(f"ui_components: {ui_components}")
        
        print(f"\nType of app_configs: {type(app_configs)}")
        print(f"Length of app_configs: {len(app_configs)}")
        print(f"app_configs: {app_configs}")
        
    except Exception as e:
        print(f"Error in component registry: {str(e)}")
        import traceback
        traceback.print_exc()
    
    # Test the for loop that's failing
    print("\nTesting component iteration...")
    try:
        if ui_components and isinstance(ui_components, list):
            for i, component in enumerate(ui_components):
                print(f"Component {i} type: {type(component)}")
                if isinstance(component, dict):
                    print(f"  Component keys: {component.keys()}")
                else:
                    print(f"  Component (non-dict): {component}")
                
                # Test the name access that might be failing
                try:
                    name = component['name']
                    print(f"  Component name: {name}")
                except Exception as e:
                    print(f"  Error accessing name: {str(e)}")
                
                # Test the description access that might be failing
                try:
                    desc = component['description']
                    print(f"  Component description: {desc}")
                except Exception as e:
                    print(f"  Error accessing description: {str(e)}")
                
                # Test the properties access that might be failing
                try:
                    if 'properties' in component:
                        props = component['properties']
                        print(f"  Component properties: {props}")
                        
                        # Try iterating properties
                        for prop_name, prop_info in props.items():
                            print(f"    Property {prop_name}: {prop_info}")
                    else:
                        print("  No properties found")
                except Exception as e:
                    print(f"  Error accessing properties: {str(e)}")
    except Exception as e:
        print(f"Error in component iteration: {str(e)}")
        import traceback
        traceback.print_exc()
    
    # Test prompt creation
    print("\nTesting prompt creation...")
    try:
        user_request = "Simple calculator app"
        prompt = service._create_app_generation_prompt(user_request, ui_components, app_configs)
        
        print(f"Successfully created prompt with {len(prompt)} characters")
        print(f"Prompt starts with: {prompt[:100]}...")
        
    except Exception as e:
        print(f"Error creating prompt: {str(e)}")
        import traceback
        traceback.print_exc()
    
if __name__ == "__main__":
    test_service() 